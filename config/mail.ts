import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { SMTPConfig } from '@adonisjs/mail/types'
import { JSONTransport } from '@adonisjs/mail/transports/json'

/**
 * Dev : driver "json" — les emails ne sont pas envoyés, le contenu est
 * journalisé par l'application (table emails + logger).
 * Prod : SMTP (variables SMTP_*).
 */
const smtpConfig: SMTPConfig = {
  host: String(env.get('SMTP_HOST', '')),
  port: Number(env.get('SMTP_PORT', '587')),
}

if (env.get('SMTP_USERNAME')) {
  smtpConfig.auth = {
    type: 'login',
    user: String(env.get('SMTP_USERNAME')),
    pass: String(env.get('SMTP_PASSWORD', '')),
  }
}

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER', 'json') as 'json' | 'smtp',

  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'no-reply@korahire.local'),
    name: env.get('MAIL_FROM_NAME', 'Korahire'),
  },

  mailers: {
    json: () => new JSONTransport(),
    smtp: transports.smtp(smtpConfig),
  } as any,
})

export default mailConfig as any
