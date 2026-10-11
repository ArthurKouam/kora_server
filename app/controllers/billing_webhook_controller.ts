import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
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

    if (!NotchPayService.verifyWebhookSignature(rawBody, signature)) {
      // 400 explicite : la doc impose de refuser une signature invalide.
      return response.badRequest({ error: 'Invalid signature' })
    }

    let event: {
      id?: string
      type?: string
      created_at?: string
      data?: { reference?: string; status?: string; amount?: number; currency?: string }
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

    const reference = event.data?.reference

    if (!reference) {
      await this.markProcessed(event.id, 'No payment reference in event')
      return response.ok({ received: true, ignored: true })
    }

    const payment = await Payment.query()
      .where('notchpay_reference', reference)
      .preload('plan')
      .first()

    if (!payment) {
      // Transaction inconnue : on le note sans échouer, le webhook ne sera
      // pas rejoué pour autant.
      await this.markProcessed(event.id, `Unknown payment reference ${reference}`)
      return response.ok({ received: true, matched: false })
    }

    try {
      const status = event.data?.status ?? 'pending'
      const previousStatus = payment.status

      payment.status = status as typeof payment.status
      payment.payload = event.data
      if (status === 'complete') {
        payment.paidAt = DateTime.now()
      }
      await payment.save()

      // `previousStatus` évite d'écraser une échéance déjà prolongée si la
      // même notification arrive deux fois par un autre chemin.
      if (status === 'complete' && previousStatus !== 'complete' && payment.plan) {
        const organization = await payment.related('organization').query().first()
        if (organization) {
          await PlanService.activate(organization, payment.plan)
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
