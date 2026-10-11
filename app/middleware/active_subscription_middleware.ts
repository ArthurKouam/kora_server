import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Permission } from '#services/authorization'
import Organization from '#models/organization'
import PlanService from '#services/plan_service'

/**
 * Blocage à l'expiration de l'abonnement.
 *
 * Politique retenue : **lecture seule**. L'organisation qui n'a plus de
 * forfait peut continuer à consulter ses offres, ses candidatures, ses
 * entretiens et ses statistiques — et surtout à exporter ses données (route
 * déclarée hors de ce middleware). Seul ce qui écrit est refusé.
 *
 * Une organisation sans `plan_expires_at` n'a jamais été facturée : elle
 * n'est pas bloquée, sinon toute inscription nouvelle serait morte-née.
 *
 * Usage :
 *   router.post(...).use(middleware.activeSubscription(['jobs.create']))
 */
export default class ActiveSubscriptionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { write: Permission[] }) {
    const user = ctx.auth.use('web').getUserOrFail()

    if (!user.organizationId) {
      return ctx.response.forbidden({ error: 'User does not belong to any organization' })
    }

    // On ne vérifie que si l'une des permissions demandées est en écriture.
    if (!options.write || options.write.length === 0) {
      return next()
    }

    const organization = await Organization.find(user.organizationId)

    if (!organization) {
      return ctx.response.forbidden({ error: 'Organization not found' })
    }

    if (PlanService.isActive(organization)) {
      return next()
    }

    const plan = await PlanService.forOrganization(organization)

    return ctx.response.paymentRequired({
      error: plan
        ? `Votre abonnement ${plan.name} a expiré. Renouvelez-le pour continuer à recruter.`
        : 'Votre abonnement a expiré. Renouvelez-le pour continuer à recruter.',
      code: 'subscription_expired',
      planSlug: plan?.slug ?? null,
      // Le frontend peut ouvrir directement la page de facturation.
      billingUrl: '/settings/billing',
    })
  }
}
