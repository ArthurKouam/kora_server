import * as abilities from '#abilities/main'
import policies from '#policies/main'
import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Crée une instance Bouncer pour la requête HTTP en cours.
 * Les règles contextuelles liées aux ressources sont définies dans
 * `app/policies/*` et appelées depuis les contrôleurs via `ctx.bouncer`.
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const bouncer = new Bouncer<any, typeof abilities, typeof policies>(
      () => (ctx.auth.user as any) ?? null,
      abilities,

      policies as any
    ).setContainerResolver(ctx.containerResolver)

    ctx.bouncer = bouncer

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    bouncer: Bouncer<any, typeof abilities, typeof policies>
  }
}
