import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Permission } from '#services/authorization'
import { can } from '#services/authorization'

/**
 * RBAC global : vérifie que le rôle de l'utilisateur couvre la permission
 * demandée. Les règles contextuelles liées à une ressource (assignation,
 * propriété) sont du ressort des Bouncers, pas de ce middleware.
 *
 * Usage dans routes.ts :
 *   router.post(...).use(middleware.permission(['jobs.create']))
 */
export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { permission: Permission[] }) {
    const user = ctx.auth.use('web').getUserOrFail()
    const allowed = options.permission.some((permission) => can(user.role, permission))

    if (!allowed) {
      return ctx.response.forbidden({ error: 'Insufficient permissions' })
    }

    await next()
  }
}
