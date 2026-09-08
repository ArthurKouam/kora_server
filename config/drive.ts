import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * Dev : disque local (storage/uploads, servi sous /uploads).
 * Prod : Cloudflare R2 via l'API S3 — activer avec DRIVE_DISK=r2.
 */
const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK', 'fs') as 'fs' | 'r2',

  services: {
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads',
      visibility: 'private',
    }),

    r2: services.s3({
      credentials: {
        accessKeyId: env.get('R2_KEY', ''),
        secretAccessKey: env.get('R2_SECRET', ''),
      },
      region: 'auto',
      bucket: env.get('R2_BUCKET', ''),
      endpoint: env.get('R2_ENDPOINT', ''),
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
