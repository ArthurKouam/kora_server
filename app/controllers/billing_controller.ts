import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import Payment from '#models/payment'
import Plan from '#models/plan'
import PlanService from '#services/plan_service'
import NotchPayService, { NotchPayError } from '#services/notchpay_service'
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

    const user = auth.use('web').getUserOrFail()

    // Une seule transaction en cours à la fois : évite d'accumuler des
    // paiements partiels si le client reclique sur « payer ».
    const existing = await Payment.query()
      .where('organization_id', organization.id)
      .whereIn('status', ['pending', 'processing'])
      .orderBy('created_at', 'desc')
      .first()

    if (existing) {
      return response.ok({
        reference: existing.notchpayReference,
        authorizationUrl: existing.authorizationUrl,
        amount: existing.amount,
        currency: existing.currency,
        status: existing.status,
        reused: true,
      })
    }

    try {
      const created = await NotchPayService.createPayment({
        amount: plan.priceXaf,
        currency: 'XAF',
        customer: {
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          email: user.email,
          phone: payload.phone ?? organization.phone ?? null,
        },
        description: `KoraHire — forfait ${plan.name}`,
        reference: this.buildOrderReference(organization.id),
        metadata: {
          organizationId: organization.id,
          planId: plan.id,
          planSlug: plan.slug,
        },
      })

      const payment = await Payment.create({
        organizationId: organization.id,
        planId: plan.id,
        notchpayReference: created.transaction.reference,
        orderReference: created.transaction.trxref ?? this.buildOrderReference(organization.id),
        amount: plan.priceXaf,
        currency: 'XAF',
        status: created.transaction.status,
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
      if (error instanceof NotchPayError) {
        return response.unprocessableEntity({
          error: 'Le paiement n’a pas pu être initialisé. Réessayez dans un instant.',
        })
      }
      throw error
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

    const payment = await Payment.query()
      .where('organization_id', organization.id)
      .where('notchpay_reference', payload.reference)
      .preload('plan')
      .first()

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

    if (!payment.plan) {
      return response.unprocessableEntity({ error: 'Plan introuvable pour ce paiement' })
    }

    await PlanService.activate(organization, payment.plan)

    return response.ok({
      status,
      activated: true,
      plan: { id: payment.plan.id, name: payment.plan.name, slug: payment.plan.slug },
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

    const payment = await Payment.query()
      .where('organization_id', organization.id)
      .where('notchpay_reference', String(params.reference))
      .first()

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
   * Recale une transaction sur l'état réel côté NotchPay et l'active si
   * elle vient d'être payée. Idempotent : appelé aussi bien par `confirm`
   * que par le webhook.
   */
  private async syncPayment(payment: Payment): Promise<string> {
    const transaction = await NotchPayService.retrievePayment(payment.notchpayReference!)
    const previousStatus = payment.status

    payment.status = transaction.status
    payment.payload = transaction
    payment.paidAt =
      transaction.status === 'complete'
        ? DateTime.fromSQL(transaction.completed_at ?? DateTime.now().toSQL())
        : payment.paidAt
    await payment.save()

    if (transaction.status === 'complete' && previousStatus !== 'complete') {
      const plan = await Plan.find(payment.planId)
      if (plan) {
        const organization = await Organization.find(payment.organizationId)
        if (organization) {
          await PlanService.activate(organization, plan)
        }
      }
    }

    return transaction.status
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
