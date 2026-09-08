import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

/**
 * Store `redis` : recommandé en production (compteurs partagés entre instances).
 * Store `database` : repli possible via LIMITER_STORE=database (table rate_limits).
 * Store `memory` : utile pour les tests.
 */
const limiterConfig = defineConfig({
  default: env.get('LIMITER_STORE', 'redis') as 'redis' | 'database' | 'memory',

  stores: {
    redis: stores.redis({}),

    database: stores.database({
      tableName: 'rate_limits',
    }),

    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
