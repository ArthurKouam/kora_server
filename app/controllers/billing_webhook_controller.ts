import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import notchpayConfig from '#config/notchpay'
import Payment from '#models/payment'
import PlanService from '#services/plan_service'
import NotchPayService from '#services/notchpay_service'

/**
 * Webhook NotchPay.
 *
 * Le flux est délibérément inverse de celui d'un contrôleur classique :
 * on répond 200 avant de traiter. Notch Pay réémet avec un backoff croissant
 * tant qu'il n'a pas reçu de 200, donc un traitement lent en inline
 * provoquerait une cascade de retries. Le travail part dans une transaction.
 *
 * Route publique : aucune authentification, la confiance repose entièrement
 * sur la vérification HMAC du corps brut.
 */
export default class BillingWebhookController {
  /**
   * POST /billing/webhooks/notchpay
   */
  async handle({ request, response }: HttpContext) {
    /**
     * La signature porte sur le corps BRUT. Adonis a déjà parsé le JSON sous
     * `request.body()`, ce qui ne suffit pas : re-sérialiser ne reproduit pas
     * les octets d'origine, et un espace ou un guillemet réécrit changerait
     * le HMAC. `request.raw()` retourne le texte tel que reçu.
     *
     * S'il est absent (content-type non JSON, corps non lu), on refuse :
     * vérifier sur une re-sérialisation laisserait passer un corps forgé.
     */
    const rawBody = request.raw()

    if (!rawBody) {
      return response.badRequest({ error: 'Raw body unavailable' })
    }

    const signature = request.header('x-notch-signature')

    /**
     * Sans clé de hachage, aucune signature ne peut être vérifiée : tous les
     * webhooks seraient rejetés en 400 et le client paierait sans jamais voir
     * son forfait activé. On répond non-2xx (donc NotchPay réessaiera une fois
     * la configuration corrigée) et on trace explicitement.
     */
    if (!notchpayConfig.isWebhookConfigured) {
      logger.error(
        'NOTCHPAY_HASH_KEY est absente : les webhooks NotchPay ne peuvent pas être vérifiés'
      )
      return response.serviceUnavailable({ error: 'Webhook signature cannot be verified' })
    }

    if (!NotchPayService.verifyWebhookSignature(rawBody, signature)) {
      // 400 explicite : la doc impose de refuser une signature invalide.
      return response.badRequest({ error: 'Invalid signature' })
    }

    let event: {
      id?: string
      type?: string
      created_at?: string
      data?: {
        id?: string
        reference?: string
        status?: string
        completed_at?: string | null
        amount?: number
        currency?: string
      }
    }

    try {
      event = JSON.parse(rawBody)
    } catch {
      return response.badRequest({ error: 'Invalid JSON payload' })
    }

    if (!event.id || !event.type) {
      return response.badRequest({ error: 'Missing event id or type' })
    }

    /**
     * Idempotence par contrainte unique sur `event_id`. Si l'insert échoue,
     * l'événement a déjà été traité : on répond 200 sans rien refaire.
     */
    const inserted = await db
      .insertQuery()
      .table('webhook_events')
      .insert({
        provider: 'notchpay',
        event_id: event.id,
        event_type: event.type,
        payload: rawBody,
        received_at: DateTime.now(),
        created_at: DateTime.now(),
      })
      .onConflict('event_id')
      .ignore()
      .returning('id')

    if (!inserted.length) {
      return response.ok({ received: true, duplicate: true })
    }

    // Événements sans effet sur l'abonnement : on les trace et on sort.
    if (!event.type.startsWith('payment.')) {
      await this.markProcessed(event.id)
      return response.ok({ received: true, ignored: true })
    }

    /**
     * Le webhook porte l'identifiant NotchPay (`data.id`) et peut porter notre
     * référence (`data.reference`) : `findByAnyReference` accepte les deux.
     */
    const references = [event.data?.id, event.data?.reference]

    if (!references.some(Boolean)) {
      await this.markProcessed(event.id, 'No payment identifier in event')
      return response.ok({ received: true, ignored: true })
    }

    const payment = await Payment.findByAnyReference(references, undefined)

    if (!payment) {
      // Transaction inconnue : on le note sans échouer, le webhook ne sera
      // pas rejoué pour autant.
      await this.markProcessed(event.id, `Unknown payment ${references.filter(Boolean).join(', ')}`)
      return response.ok({ received: true, matched: false })
    }

    try {
      const previousStatus = payment.status

      payment.payload = event.data ?? null
      // Statut validé et `completed_at` converti (ISO 8601) : un statut hors
      // contrainte faisait échouer tout le traitement.
      const status = payment.applyProviderTransaction({
        status: event.data?.status ?? 'pending',
        completed_at: event.data?.completed_at ?? null,
      })
      await payment.save()

      // `previousStatus` évite d'écraser une échéance déjà prolongée si la
      // même notification arrive deux fois par un autre chemin.
      if (status === 'complete' && previousStatus !== 'complete' && payment.planId) {
        const organization = await payment.related('organization').query().first()
        const plan = await payment.related('plan').query().first()

        if (organization && plan) {
          await PlanService.activate(organization, plan, payment.durationDays)
        }
      }

      await this.markProcessed(event.id)
      return response.ok({ received: true, matched: true, status })
    } catch (error) {
      await this.markProcessed(event.id, error instanceof Error ? error.message : 'Unknown error')
      // On renvoie quand même 200 : l'échec est tracé, et faire non-2xx
      // déclencherait une cascade de retries sur un événement déjà invalide.
      return response.ok({ received: true, error: 'processing_failed' })
    }
  }

  private async markProcessed(eventId: string, error?: string) {
    await db
      .query()
      .from('webhook_events')
      .where('event_id', eventId)
      .update({
        processed: true,
        error: error ?? null,
        attempts: db.raw('attempts + 1'),
        processed_at: DateTime.now(),
        updated_at: DateTime.now(),
      })
  }
}
