import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Organization from '#models/organization'

/**
 * Charge le tenant (`organization`) du user authentifié et le pose sur le
 * contexte. Évite que chaque contrôleur refasse le même `Organization.find`.
 *
 * Usage :
 *   router.get('/', [controllers.X, 'index']).use(middleware.requireOrganization())
 */
export default class RequireOrganizationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('web').getUserOrFail()

    if (!user.organizationId) {
      return ctx.response.forbidden({ error: 'User does not belong to any organization' })
    }

    const organization = await Organization.find(user.organizationId)

    if (!organization) {
      return ctx.response.forbidden({ error: 'Organization not found' })
    }

    ctx.organization = organization

    return next()
  }
}
