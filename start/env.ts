/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  FRONTEND_URL: Env.schema.string({ format: 'url', tld: false }),

  // Queues
  QUEUE_DRIVER: Env.schema.enum(['redis', 'sync'] as const),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database
  DB_CONNECTION: Env.schema.enum(['postgres', 'sqlite'] as const),

  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),

  /**
   * NotchPay (Mobile Money).
   *
   * Optionnelles : l'application doit démarrer sans elles (développement,
   * tests, instance sans paiement en ligne), mais une tentative de paiement
   * échoue alors avec un message explicite plutôt qu'un 401 obscur. Les
   * déclarer ici permet au passage de valider leur format quand elles sont
   * présentes — un `NOTCHPAY_MODE` mal orthographié est ainsi détecté au boot.
   */
  NOTCHPAY_MODE: Env.schema.enum.optional(['sandbox', 'production'] as const),
  NOTCHPAY_PUBLIC_KEY: Env.schema.string.optional(),
  NOTCHPAY_SECRET_KEY: Env.schema.string.optional(),
  NOTCHPAY_HASH_KEY: Env.schema.string.optional(),
})
