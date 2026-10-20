import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import Organization from '#models/organization'
import Payment from '#models/payment'
import Plan from '#models/plan'
import PlanService from '#services/plan_service'
import NotchPayService, { NotchPayError, isNotchPayPaymentStatus } from '#services/notchpay_service'
import { buildCsv, UTF8_BOM } from '#services/csv'
import {
  checkoutValidator,
  confirmValidator,
  exportApplicationsValidator,
} from '#validators/billing'

/**
 * Borne haute/basse d'une journée, au format attendu par PostgreSQL.
 *
 * `toSQL()` est typé `string | null` par Luxon, alors que le validateur impose
 * déjà un format ISO court : la DateTime est donc toujours valide et la valeur
 * de repli n'est jamais atteinte.
 */
function sqlDayBoundary(isoDate: string, edge: 'startOf' | 'endOf'): string {
  const date = DateTime.fromISO(isoDate)
  const bounded = edge === 'startOf' ? date.startOf('day') : date.endOf('day')
  return bounded.toSQL() ?? bounded.toISO() ?? isoDate
}

export default class BillingController {
  /**
   * GET /billing/plans
   * Plans publics, pour la page tarifs. `enterprise` est inclus : il n'est pas
   * achetable mais doit être affiché.
   */
  async plans({ response }: HttpContext) {
    const plans = await PlanService.allPlans()

    return response.ok(
      plans.map((plan) => ({
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        priceXaf: plan.priceXaf,
        priceXafYearly: plan.priceXafYearly,
        durationDays: plan.durationDays,
        maxActiveJobs: plan.maxActiveJobs,
        maxMembers: plan.maxMembers,
        features: plan.features,
        isPublic: plan.isPublic,
        isPurchasable: plan.isPurchasable(),
        contactEmail: plan.contactEmail,
      }))
    )
  }

  /**
   * GET /billing/subscription
   * Plan courant + consommation. Alimente le bandeau et le compteur
   * « 3 / 5 offres actives ».
   */
  async subscription({ auth, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const usage = await PlanService.usage(organization)

    return response.ok({
      plan: usage.plan
        ? {
            id: usage.plan.id,
            slug: usage.plan.slug,
            name: usage.plan.name,
            durationDays: usage.plan.durationDays,
          }
        : null,
      isActive: usage.isActive,
      expiresAt: usage.expiresAt,
      remainingDays: usage.remainingDays,
      isExpiringSoon: usage.isExpiringSoon,
      usage: {
        activeJobs: usage.activeJobs,
        members: usage.members,
      },
      limits: usage.limits,
      capabilities: usage.capabilities,
    })
  }

  /**
   * GET /billing/payments
   * Historique de facturation.
   */
  async payments({ auth, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const payments = await Payment.query()
      .where('organization_id', organization.id)
      .preload('plan')
      .orderBy('created_at', 'desc')
      .limit(50)

    return response.ok(
      payments.map((payment) => ({
        id: payment.id,
        reference: payment.notchpayReference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        planName: payment.plan?.name ?? null,
        durationDays: payment.durationDays,
        paidAt: payment.paidAt?.toISO() ?? null,
        createdAt: payment.createdAt.toISO(),
      }))
    )
  }

  /**
   * POST /billing/checkout
   * Crée la transaction chez NotchPay et renvoie l'URL de paiement hébergé.
   *
   * Le montant vient du plan en base, jamais du payload.
   */
  async checkout({ auth, request, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    const payload = await request.validateUsing(checkoutValidator)

    const plan = await Plan.find(payload.planId)

    if (!plan || !plan.isActive) {
      return response.notFound({ error: 'Plan not found' })
    }

    if (!plan.isPublic || plan.priceXaf === null) {
      return response.forbidden({
        error: 'Ce plan n’est pas achetable en ligne. Contactez-nous pour un devis.',
        contactEmail: plan.contactEmail,
      })
    }

    /**
     * Montant et durée viennent du plan, jamais du payload. `null` = cette
     * formule n'existe pas pour ce forfait (pas d'offre annuelle, par exemple).
     */
    const period = payload.period ?? 'monthly'
    const terms = PlanService.checkoutTerms(plan, period)

    if (!terms) {
      return response.forbidden({
        error: 'Cette formule n’est pas disponible pour ce forfait. Contactez-nous.',
        contactEmail: plan.contactEmail,
      })
    }

    const user = auth.use('web').getUserOrFail()

    /**
     * Une seule transaction en cours à la fois : évite d'accumuler des
     * paiements partiels si le client reclique sur « payer ».
     *
     * Le filtre est volontairement strict, car réutiliser n'importe quel
     * paiement en attente bloquait définitivement les suivants :
     * - même forfait, sinon on renvoie le client vers un autre montant ;
     * - moins de 3 h, durée de vie d'une transaction chez NotchPay : au-delà,
     *   le lien est mort et le client ne pourrait plus payer ;
     * - toujours `pending` après resynchronisation, sinon on renvoie vers une
     *   transaction abandonnée.
     */
    const reusable = await Payment.query()
      .where('organization_id', organization.id)
      .where('plan_id', plan.id)
      .where('duration_days', terms.durationDays)
      .whereIn('status', ['pending', 'processing'])
      .where('created_at', '>', DateTime.now().minus({ hours: 3 }).toSQL()!)
      .orderBy('created_at', 'desc')
      .first()

    if (reusable?.authorizationUrl) {
      /**
       * Le statut en base peut être en retard (webhook non reçu ou non
       * configuré) : on redemande l'état réel avant de renvoyer le lien.
       * NotchPay injoignable = on réutilise le lien existant, une création
       * échouerait de la même façon.
       */
      try {
        await this.syncPayment(reusable)
      } catch (error) {
        logger.warn(
          { err: error, paymentId: reusable.id },
          'Resynchronisation du paiement impossible, réutilisation du lien existant'
        )
      }

      /**
       * Déjà payé : le forfait vient d'être activé par la resynchronisation.
       * Renvoyer l'URL de la page NotchPay ferait payer une seconde fois.
       */
      if (reusable.status === 'complete') {
        return response.ok({
          reference: reusable.notchpayReference,
          authorizationUrl: null,
          amount: reusable.amount,
          currency: reusable.currency,
          status: reusable.status,
          reused: true,
        })
      }

      if (reusable.status === 'pending' || reusable.status === 'processing') {
        return response.ok({
          reference: reusable.notchpayReference,
          authorizationUrl: reusable.authorizationUrl,
          amount: reusable.amount,
          currency: reusable.currency,
          status: reusable.status,
          reused: true,
        })
      }
    }

    try {
      /**
       * Référence générée une seule fois : c'est celle qu'on envoie à NotchPay
       * et qui revient dans le callback (`trxref`). L'ancien code en générait
       * une seconde pour la colonne `order_reference`, donc la valeur stockée
       * ne correspondait à rien de ce que NotchPay pouvait renvoyer.
       */
      const orderReference = this.buildOrderReference(organization.id)

      const created = await NotchPayService.createPayment({
        amount: terms.amount,
        currency: 'XAF',
        customer: {
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          email: user.email,
          phone: payload.phone ?? organization.phone ?? null,
        },
        description: `KoraHire — forfait ${plan.name}${
          period === 'yearly' ? ' (12 mois)' : ''
        }`,
        reference: orderReference,
        metadata: {
          organizationId: organization.id,
          planId: plan.id,
          planSlug: plan.slug,
          period,
        },
      })

      const payment = await Payment.create({
        organizationId: organization.id,
        planId: plan.id,
        /**
         * `id` est l'identifiant NotchPay de la transaction, `orderReference`
         * le nôtre : les deux sont conservés, car le retour du client peut
         * porter l'un ou l'autre (cf. `Payment.findByAnyReference`).
         */
        notchpayReference: created.transaction.id ?? created.transaction.reference,
        orderReference,
        amount: terms.amount,
        currency: 'XAF',
        durationDays: terms.durationDays,
        // Un statut hors contrainte ferait échouer l'insertion : on retombe sur
        // `pending`, la resynchronisation corrigera le tir.
        status: isNotchPayPaymentStatus(created.transaction.status)
          ? created.transaction.status
          : 'pending',
        authorizationUrl: created.authorizationUrl,
        customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        customerEmail: user.email,
        customerPhone: payload.phone ?? organization.phone ?? null,
        payload: created.transaction,
      })

      return response.created({
        reference: payment.notchpayReference,
        authorizationUrl: payment.authorizationUrl,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reused: false,
      })
    } catch (error) {
      if (!(error instanceof NotchPayError)) throw error

      /**
       * Tracé systématiquement : sans cela, une clé absente ou refusée se
       * présentait au client comme un simple « réessayez » et personne ne
       * pouvait voir la cause côté serveur.
       */
      logger.error(
        { statusCode: error.statusCode, code: error.code, body: error.body },
        'Création du paiement NotchPay impossible'
      )

      // Erreur de notre côté : un 422 laisserait croire à une saisie fautive.
      if (
        error.code === 'not_configured' ||
        error.statusCode === 401 ||
        error.statusCode === 403
      ) {
        return response.badGateway({
          error: 'Le paiement en ligne est indisponible. Contactez le support.',
          code: 'payment_provider_misconfigured',
        })
      }

      if (error.code === 'unreachable' || error.statusCode >= 500) {
        return response.serviceUnavailable({
          error:
            'Le service de paiement est momentanément indisponible. Réessayez dans un instant.',
        })
      }

      return response.unprocessableEntity({
        error: 'Le paiement n’a pas pu être initialisé. Vérifiez le numéro saisi et réessayez.',
      })
    }
  }

  /**
   * POST /billing/confirm
   * Retour du client depuis la page NotchPay.
   *
   * Le `status` de l'URL est ignoré : on redemande l'état à l'API. Sans ça,
   * n'importe qui appellerait cet endpoint avec une référence et
   * s'attribuerait un plan.
   */
  async confirm({ auth, request, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    const payload = await request.validateUsing(confirmValidator)

    /**
     * `reference` et `trxref` peuvent désigner la même transaction sous deux
     * identifiants différents : on cherche sur les deux, sans org pour la
     * route de retour (elle est déjà scopée par le tenant de l'utilisateur).
     */
    const payment = await Payment.findByAnyReference(
      [payload.reference, payload.trxref],
      organization.id
    )

    if (!payment) {
      return response.notFound({ error: 'Paiement introuvable' })
    }

    const status = await this.syncPayment(payment)

    if (status !== 'complete') {
      return response.ok({
        status,
        activated: false,
        message: 'Le paiement n’est pas encore confirmé.',
      })
    }

    if (!payment.planId) {
      return response.unprocessableEntity({ error: 'Plan introuvable pour ce paiement' })
    }

    const plan = await Plan.find(payment.planId)

    if (!plan) {
      return response.unprocessableEntity({ error: 'Plan introuvable pour ce paiement' })
    }

    await PlanService.activate(organization, plan, payment.durationDays)

    return response.ok({
      status,
      activated: true,
      plan: { id: plan.id, name: plan.name, slug: plan.slug },
      expiresAt: organization.planExpiresAt?.toISO() ?? null,
    })
  }

  /**
   * GET /billing/payments/:reference
   * État d'une transaction, pour que le frontend puisse sonder sans
   * déclencher d'activation.
   */
  async showPayment({ auth, params, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const payment = await Payment.findByAnyReference([String(params.reference)], organization.id)

    if (!payment) {
      return response.notFound({ error: 'Paiement introuvable' })
    }

    const status = await this.syncPayment(payment)

    return response.ok({
      reference: payment.notchpayReference,
      amount: payment.amount,
      currency: payment.currency,
      status,
      paidAt: payment.paidAt?.toISO() ?? null,
    })
  }

  /**
   * GET /billing/applications/export
   *
   * Volontairement hors du blocage à l'expiration : une organisation qui a
   * payé doit pouvoir récupérer ses données même après la fin de son
   * abonnement. Perdre l'accès à ses propres CV ferait perdre le client.
   */
  async exportApplications({ auth, request, response }: HttpContext) {
    const organization = await this.scopedOrganization(auth)
    if (!organization) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    const payload = await request.validateUsing(exportApplicationsValidator)

    const query = db
      .query()
      .from('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .join('candidates', 'candidates.id', 'applications.candidate_id')
      .where('jobs.organization_id', organization.id)
      .select(
        'applications.id',
        'applications.status',
        'applications.applied_at',
        'applications.source',
        'jobs.title as job_title',
        'candidates.first_name',
        'candidates.last_name',
        'candidates.email',
        'candidates.phone'
      )

    if (payload.jobId) {
      query.where('applications.job_id', payload.jobId)
    }
    if (payload.status) {
      query.where('applications.status', payload.status)
    }
    if (payload.from) {
      query.where('applications.applied_at', '>=', sqlDayBoundary(payload.from, 'startOf'))
    }
    if (payload.to) {
      query.where('applications.applied_at', '<=', sqlDayBoundary(payload.to, 'endOf'))
    }

    const rows = await query.orderBy('applications.applied_at', 'desc')

    const headers = [
      'Candidature',
      'Poste',
      'Nom',
      'Prénom',
      'Email',
      'Téléphone',
      'Statut',
      'Source',
      'Date de candidature',
    ]

    const csv = buildCsv(
      headers,
      rows.map((row: any) => [
        row.id,
        row.job_title,
        row.last_name,
        row.first_name,
        row.email,
        row.phone,
        row.status,
        row.source,
        DateTime.fromSQL(row.applied_at).toFormat('yyyy-LL-dd HH:mm'),
      ])
    )

    const filename = `korahire-candidatures-${DateTime.now().toFormat('yyyyLLdd-HHmm')}.csv`

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(UTF8_BOM + csv)
  }

  /**
   * Recale une transaction sur l'état réel côté NotchPay et active le forfait
   * s'il vient d'être payé. Idempotent : appelé par `confirm`, `showPayment`,
   * `checkout` et le webhook.
   */
  private async syncPayment(payment: Payment): Promise<string> {
    if (!payment.notchpayReference) {
      throw new NotchPayError('Référence NotchPay absente pour ce paiement.', 500)
    }

    const transaction = await NotchPayService.retrievePayment(payment.notchpayReference)
    const previousStatus = payment.status

    // Statut et `paid_at` (dates ISO 8601) portés par le modèle, partagés avec
    // le webhook : une seule conversion, un seul filtre de statuts.
    const status = payment.applyProviderTransaction(transaction)
    payment.payload = transaction
    await payment.save()

    if (status === 'complete' && previousStatus !== 'complete') {
      const plan = await Plan.find(payment.planId)

      if (plan) {
        const organization = await Organization.find(payment.organizationId)
        if (organization) {
          await PlanService.activate(organization, plan, payment.durationDays)
        }
      }
    }

    return status
  }

  /** Référence interne non devinable, liée à l'organisation. */
  private buildOrderReference(organizationId: string): string {
    const short = organizationId.replace(/-/g, '').slice(0, 8)
    const random = Math.random().toString(36).slice(2, 10)
    return `kor_${short}_${random}`
  }

  /**
   * Tenant dérivé de l'utilisateur authentifié, jamais d'un paramètre.
   * Renvoie `null` si l'utilisateur n'est rattaché à aucune organisation : à
   * chaque appelant de traiter le cas, sinon un 500 au lieu d'un 403.
   */
  private async scopedOrganization(auth: HttpContext['auth']): Promise<Organization | null> {
    const user = auth.use('web').getUserOrFail()

    if (!user.organizationId) return null

    return Organization.find(user.organizationId)
  }
}
