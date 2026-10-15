import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Mailer from '#services/mailer'
import {
  findPasswordResetToken,
  PASSWORD_RESET_TTL_MINUTES,
  requestPasswordReset,
  resetPassword,
} from '#services/password_reset_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'

/**
 * Flux « mot de passe oublié » — routes publiques sous `/auth` :
 *   POST /auth/forgot-password        → envoie l'email
 *   GET  /auth/reset-password/:token  → état du lien
 *   POST /auth/reset-password/:token  → applique le nouveau mot de passe
 *
 * `forgot-password` répond toujours 202 avec le même message : l'existence du
 * compte ne doit pas être observable.
 */
export default class PasswordResetController {
  async forgot({ request, response }: HttpContext) {
    const payload = await request.validateUsing(forgotPasswordValidator)
    const requestIp = request.ip() || null

    let requested: Awaited<ReturnType<typeof requestPasswordReset>> = null
    try {
      requested = await requestPasswordReset(payload.email, requestIp)
    } catch (error) {
      if (error instanceof Error && error.message === 'PASSWORD_RESET_RATE_LIMITED') {
        // Limite horaire par utilisateur, en complément du middleware par IP.
        return response.tooManyRequests({
          message: 'Trop de demandes. Réessayez dans quelques minutes.',
        })
      }
      throw error
    }

    if (requested) {
      const frontendUrl = env.get('FRONTEND_URL').replace(/\/$/, '')

      // Un échec d'envoi ne doit pas faire échouer la requête.
      await Mailer.sendPasswordReset({
        to: requested.email,
        firstName: requested.firstName,
        resetUrl: `${frontendUrl}/reset-password/${requested.token}`,
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        organizationId: requested.organizationId,
      })
    }

    return response.accepted({
      message:
        'Si un compte existe avec cette adresse, un email de réinitialisation vient d’être envoyé.',
    })
  }

  async show({ params, response }: HttpContext) {
    const lookup = await findPasswordResetToken(params.token)

    if (!lookup.ok) {
      return response.gone({
        status: lookup.reason,
        message: 'Ce lien de réinitialisation n’est plus valide.',
      })
    }

    return response.ok({
      status: 'valid',
      email: maskEmail(lookup.token.email),
      expiresAt: lookup.token.expiresAt.toISO(),
    })
  }

  async update({ params, request, response }: HttpContext) {
    const lookup = await findPasswordResetToken(params.token)

    if (!lookup.ok) {
      return response.gone({
        status: lookup.reason,
        message: 'Ce lien de réinitialisation n’est plus valide.',
      })
    }

    const payload = await request.validateUsing(resetPasswordValidator)
    const result = await resetPassword(params.token, payload.password)

    if (!result.ok) {
      return response.gone({
        status: result.reason,
        message: 'Ce lien de réinitialisation n’est plus valide.',
      })
    }

    return response.ok({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' })
  }
}

/** Email assez précis pour confirmer le lien, pas assez pour révéler l'adresse. */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  const visible = localPart.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(localPart.length - visible.length, 1))}@${domain}`
}
