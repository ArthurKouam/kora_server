import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/queue'

export default defineConfig({
  default: env.get('QUEUE_DRIVER'),
  adapters: {
    redis: drivers.redis({ connectionName: 'main' }),
    sync: drivers.sync(),
  },
  queues: {
    emails: { adapter: env.get('QUEUE_DRIVER') },
    maintenance: { adapter: env.get('QUEUE_DRIVER') },
  },
  worker: {
    concurrency: 5,
    idleDelay: '2s',
    stalledThreshold: '30s',
    stalledInterval: '30s',
    maxStalledCount: 1,
    gracefulShutdown: true,
  },
  locations: ['./app/jobs/**/*.{ts,js}'],
})
