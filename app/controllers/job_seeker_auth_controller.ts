import JobSeeker from '#models/job_seeker'
import JobSeekerProfile from '#models/job_seeker_profile'
import Mailer from '#services/mailer'
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
  findPasswordResetToken,
  findVerificationToken,
  issuePasswordResetToken,
  issueVerificationToken,
} from '#services/job_seeker_tokens'
import {
  jobSeekerForgotPasswordValidator,
  jobSeekerLoginValidator,
  jobSeekerResendVerificationValidator,
  jobSeekerResetPasswordValidator,
  jobSeekerSignupValidator,
  jobSeekerVerifyEmailValidator,
} from '#validators/job_seeker'
import JobSeekerTransformer from '#transformers/job_seeker_transformer'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const GUARD = 'job_seeker_web' as const

function frontendUrl(path: string): string {
  return `${env.get('FRONTEND_URL').replace(/\/$/, '')}${path}`
}

export default class JobSeekerAuthController {
  /**
   * POST /job-seeker/auth/signup
   * Crée le compte + son profil maître, envoie le lien de vérification et
   * ne connecte pas l'utilisateur tant que l'email n'est pas confirmé.
   */
  async signup({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(jobSeekerSignupValidator)
    const email = payload.email.trim().toLowerCase()

    const jobSeeker = await JobSeeker.create({
      email,
      password: payload.password,
      status: 'active',
    })

    await JobSeekerProfile.create({
      jobSeekerId: jobSeeker.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
    })

    const token = await issueVerificationToken(jobSeeker.id)
    await Mailer.sendJobSeekerVerification({
      to: email,
      firstName: payload.firstName,
      verificationUrl: frontendUrl(`/candidat/verifier-email?token=${encodeURIComponent(token)}`),
      expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
    })

    await jobSeeker.load('profile')

    return response.created(
      await serialize({
        user: JobSeekerTransformer.transform(jobSeeker),
        message:
          'Votre compte est créé. Vérifiez votre boîte email pour confirmer votre adresse avant de postuler.',
      })
    )
  }

  /** POST /job-seeker/auth/login */
  async login({ auth, request, response, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(jobSeekerLoginValidator)

    let jobSeeker: JobSeeker
    try {
      jobSeeker = await JobSeeker.verifyCredentials(email.trim().toLowerCase(), password)
    } catch {
      return response.unauthorized({ error: 'Email ou mot de passe incorrect.' })
    }

    if (jobSeeker.status !== 'active') {
      return response.forbidden({ error: 'Ce compte est désactivé.' })
    }

    if (jobSeeker.emailVerifiedAt === null) {
      return response.forbidden({
        error: 'Confirmez votre adresse email avant de vous connecter.',
        code: 'email_not_verified',
      })
    }

    jobSeeker.lastLoginAt = DateTime.now()
    await jobSeeker.save()

    await auth.use(GUARD).login(jobSeeker)
    await jobSeeker.load('profile')

    return serialize({ user: JobSeekerTransformer.transform(jobSeeker) })
  }

  /** POST /job-seeker/auth/logout */
  async logout({ auth, response }: HttpContext) {
    await auth.use(GUARD).logout()
    return response.noContent()
  }

  /** GET /job-seeker/me */
  async me({ auth, serialize }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    await jobSeeker.load('profile')

    return serialize({ user: JobSeekerTransformer.transform(jobSeeker) })
  }

  /**
   * POST /job-seeker/auth/verify-email
   * Le lien est à usage unique. Rejouer un lien déjà consommé sur un compte
   * vérifié reste idempotent pour ne pas bloquer un utilisateur qui recharge.
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { token } = await request.validateUsing(jobSeekerVerifyEmailValidator)
    const lookup = await findVerificationToken(token)

    if (!lookup.ok) {
      if (lookup.reason === 'used') {
        return response.ok({ verified: true, message: 'Adresse email déjà confirmée.' })
      }
      return response.unprocessableEntity({
        error:
          lookup.reason === 'expired'
            ? 'Ce lien a expiré. Demandez un nouveau lien.'
            : 'Lien de vérification invalide.',
      })
    }

    const jobSeeker = await JobSeeker.find(lookup.token.jobSeekerId)
    if (!jobSeeker) {
      return response.unprocessableEntity({ error: 'Lien de vérification invalide.' })
    }

    jobSeeker.emailVerifiedAt = DateTime.now()
    await jobSeeker.save()

    lookup.token.consumedAt = DateTime.now()
    await lookup.token.save()

    return response.ok({ verified: true, message: 'Votre adresse email est confirmée.' })
  }

  /**
   * POST /job-seeker/auth/resend-verification
   * Réponse générique : on ne révèle pas si l'adresse correspond à un compte.
   */
  async resendVerification({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(jobSeekerResendVerificationValidator)
    const jobSeeker = await JobSeeker.query()
      .whereRaw('lower(email) = ?', [email.trim().toLowerCase()])
      .first()

    if (jobSeeker && jobSeeker.emailVerifiedAt === null && jobSeeker.status === 'active') {
      await jobSeeker.load('profile')
      const token = await issueVerificationToken(jobSeeker.id)
      await Mailer.sendJobSeekerVerification({
        to: jobSeeker.email,
        firstName: jobSeeker.profile?.firstName ?? null,
        verificationUrl: frontendUrl(`/candidat/verifier-email?token=${encodeURIComponent(token)}`),
        expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
      })
    }

    return response.ok({
      message:
        'Si un compte non vérifié existe pour cette adresse, un nouvel email vient de partir.',
    })
  }

  /** POST /job-seeker/auth/forgot-password */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(jobSeekerForgotPasswordValidator)
    const jobSeeker = await JobSeeker.query()
      .whereRaw('lower(email) = ?', [email.trim().toLowerCase()])
      .first()

    if (jobSeeker && jobSeeker.status === 'active') {
      try {
        await jobSeeker.load('profile')
        const token = await issuePasswordResetToken(jobSeeker.id, request.ip())
        await Mailer.sendJobSeekerPasswordReset({
          to: jobSeeker.email,
          firstName: jobSeeker.profile?.firstName ?? null,
          resetUrl: frontendUrl(
            `/candidat/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`
          ),
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        })
      } catch (error) {
        if ((error as Error).message !== 'PASSWORD_RESET_RATE_LIMITED') throw error
        return response.tooManyRequests({
          error: 'Trop de demandes. Réessayez dans quelques minutes.',
        })
      }
    }

    return response.ok({
      message:
        'Si un compte existe pour cette adresse, un email de réinitialisation vient de partir.',
    })
  }

  /** POST /job-seeker/auth/reset-password */
  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = await request.validateUsing(jobSeekerResetPasswordValidator)
    const lookup = await findPasswordResetToken(token)

    if (!lookup.ok) {
      return response.unprocessableEntity({
        error:
          lookup.reason === 'expired'
            ? 'Ce lien a expiré. Demandez un nouveau lien.'
            : 'Lien de réinitialisation invalide ou déjà utilisé.',
      })
    }

    const jobSeeker = await JobSeeker.find(lookup.token.jobSeekerId)
    if (!jobSeeker) {
      return response.unprocessableEntity({ error: 'Lien de réinitialisation invalide.' })
    }

    jobSeeker.password = password
    await jobSeeker.save()

    lookup.token.usedAt = DateTime.now()
    await lookup.token.save()

    return response.ok({ message: 'Votre mot de passe a été mis à jour.' })
  }
}
