import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Organization from '#models/organization'
import PlanService from '#services/plan_service'

/**
 * Verrouille une capacité payante, déclarée dans `plans.features`.
 *
 * Distinct d'`activeSubscription` (« l'abonnement est-il à jour ? ») : ici la
 * question est « ce forfait inclut-il la capacité ? ». 402, pas 403 — c'est un
 * appel à l'achat, et le frontend lit `code` pour ouvrir la facturation.
 */
export default class PlanFeatureMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { feature: string; label?: string }) {
    const user = ctx.auth.use('web').getUserOrFail()

    if (!user.organizationId) {
      return ctx.response.forbidden({ error: 'User does not belong to any organization' })
    }

    const organization = await Organization.find(user.organizationId)

    if (!organization) {
      return ctx.response.forbidden({ error: 'Organization not found' })
    }

    const [granted, plan] = await Promise.all([
      PlanService.hasFeature(organization, options.feature),
      PlanService.forOrganization(organization),
    ])

    if (granted) {
      return next()
    }

    const requiredPlan = await PlanService.firstPlanWithFeature(options.feature)

    return ctx.response.paymentRequired({
      error: plan
        ? `Le « ${options.label ?? options.feature} » n'est pas inclus dans votre forfait ${plan.name}.`
        : `Le « ${options.label ?? options.feature} » n'est pas inclus dans votre forfait.`,
      code: 'plan_feature_required',
      feature: options.feature,
      requiredPlan: requiredPlan
        ? { slug: requiredPlan.slug, name: requiredPlan.name, priceXaf: requiredPlan.priceXaf }
        : null,
      billingUrl: '/settings/billing',
    })
  }
}
