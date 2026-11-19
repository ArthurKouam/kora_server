import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Organization from '#models/organization'
import ApiKeyService from '#services/api_key_service'
import PlanService from '#services/plan_service'

const BEARER = /^Bearer\s+(.+)$/i

/**
 * Authentifie les appels à l'API externe par clé d'organisation.
 *
 * Distinct du guard `web` : un appelant machine n'a ni session ni cookie, et la
 * clé appartient à l'organisation plutôt qu'à un utilisateur. Le middleware ne
 * modifie donc pas les guards existants ; il pose le tenant et la clé sur le
 * contexte pour les contrôleurs.
 */
export default class ApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const match = BEARER.exec((ctx.request.header('authorization') ?? '').trim())

    if (!match) {
      return ctx.response.unauthorized({
        error: 'En-tête Authorization: Bearer <clé> requis.',
        code: 'missing_api_key',
      })
    }

    const key = await ApiKeyService.findActive(match[1])

    if (!key) {
      return ctx.response.unauthorized({
        error: 'Clé API invalide ou révoquée.',
        code: 'invalid_api_key',
      })
    }

    const organization = await Organization.find(key.organizationId)

    if (!organization) {
      return ctx.response.unauthorized({
        error: 'Clé API invalide ou révoquée.',
        code: 'invalid_api_key',
      })
    }

    // Une organisation qui repasse sur un forfait inférieur perd l'accès : le
    // contrôle se fait à chaque requête, pas seulement à la création de la clé.
    if (!(await PlanService.hasFeature(organization, 'api'))) {
      return ctx.response.paymentRequired({
        error: "L'accès API n'est pas inclus dans votre forfait.",
        code: 'plan_feature_required',
        feature: 'api',
        billingUrl: '/settings/billing',
      })
    }

    ctx.organization = organization
    ctx.apiKey = key

    await ApiKeyService.touch(key)

    return next()
  }
}
