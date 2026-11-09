import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'web',

  guards: {
    /**
     * Token-based guard for stateless API authentication.
     */
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user'),
      }),
    }),

    /**
     * Token-based guard for candidate API authentication.
     */
    candidate_api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'candidateSessions',
        model: () => import('#models/candidate'),
      }),
    }),

    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
       */
      useRememberMeTokens: true,
      rememberMeTokensAge: '1 years',
      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),

    /**
     * Guard dédié au portail candidat (Job Seeker).
     *
     * Il est volontairement séparé de `web` et de `candidate_api` : un
     * candidat ne doit jamais hériter des permissions du staff, et inversement.
     * Pas de remember-me pour ce guard : un cookie de session classique suffit
     * et limite la durée d'exposition d'une session candidate.
     */
    job_seeker_web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/job_seeker'),
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
