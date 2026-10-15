import limiter from '@adonisjs/limiter/services/main'
import { hashInformationRequestToken } from '#services/information_request_tokens'
import { hashPasswordResetToken } from '#services/password_reset_service'
import { hashTeamInvitationToken } from '#services/team_invitation_tokens'

/**
 * Middlewares de rate limiting HTTP (clé = IP du consommateur).
 *
 * - login / signup : protection brute-force des endpoints d'authentification
 * - careerApply    : spam de candidatures (l'OTP a en plus sa propre limite par email)
 * - otpVerify      : tentative de deviner un code (les tentatives sont aussi
 *                    comptées par token côté OtpService)
 */
export const loginThrottle = limiter.define('login', () => {
  const limit = limiter.allowRequests(5).every('1 minute')
  limit.blockFor('2 minutes')
  return limit
})

export const signupThrottle = limiter.define('signup', () => {
  return limiter.allowRequests(5).every('10 minutes')
})

/** Limite par IP ; la limite par utilisateur est dans le service. */
export const forgotPasswordThrottle = limiter.define('forgot-password', () => {
  const limit = limiter.allowRequests(5).every('10 minutes')
  limit.blockFor('30 minutes')
  return limit
})

/** Clé sur le lien : un lien volé reste limité même depuis une autre IP. */
export const passwordResetThrottle = limiter.define('password-reset', (ctx) =>
  limiter
    .allowRequests(10)
    .every('10 minutes')
    .usingKey(hashPasswordResetToken(String(ctx.params.token)))
)

export const careerApplyThrottle = limiter.define('career-apply', () => {
  return limiter.allowRequests(10).every('10 minutes')
})

export const otpVerifyThrottle = limiter.define('otp-verify', () => {
  return limiter.allowRequests(10).every('1 minute')
})

export const otpResendThrottle = limiter.define('otp-resend', () => {
  return limiter.allowRequests(5).every('10 minutes')
})

/**
 * Liste publique des offres d'une organisation : endpoint non authentifié et
 * paginé, mais la pagination borne déjà le coût par requête. Le plafond protège
 * surtout du scraping massif plutôt que de l'usage humain.
 */
export const careerListThrottle = limiter.define('career-list', () => {
  return limiter.allowRequests(60).every('1 minute')
})

export const informationRequestGetIpThrottle = limiter.define('information-request-get-ip', () =>
  limiter.allowRequests(60).every('1 minute')
)

export const informationRequestGetTokenThrottle = limiter.define(
  'information-request-get-token',
  (ctx) =>
    limiter
      .allowRequests(30)
      .every('1 minute')
      .usingKey(hashInformationRequestToken(String(ctx.params.token)))
)

export const informationRequestPostIpThrottle = limiter.define('information-request-post-ip', () =>
  limiter.allowRequests(10).every('10 minutes')
)

export const informationRequestPostTokenThrottle = limiter.define(
  'information-request-post-token',
  (ctx) =>
    limiter
      .allowRequests(5)
      .every('10 minutes')
      .usingKey(hashInformationRequestToken(String(ctx.params.token)))
)

export const teamInvitationGetIpThrottle = limiter.define('team-invitation-get-ip', (ctx) => {
  ctx.response.header('Cache-Control', 'no-store')
  ctx.response.header('Referrer-Policy', 'no-referrer')
  return limiter.allowRequests(60).every('1 minute')
})

export const teamInvitationGetTokenThrottle = limiter.define('team-invitation-get-token', (ctx) => {
  ctx.response.header('Cache-Control', 'no-store')
  ctx.response.header('Referrer-Policy', 'no-referrer')
  return limiter
    .allowRequests(30)
    .every('1 minute')
    .usingKey(hashTeamInvitationToken(String(ctx.params.token)))
})

export const teamInvitationPostIpThrottle = limiter.define('team-invitation-post-ip', (ctx) => {
  ctx.response.header('Cache-Control', 'no-store')
  ctx.response.header('Referrer-Policy', 'no-referrer')
  return limiter.allowRequests(10).every('10 minutes')
})

export const teamInvitationPostTokenThrottle = limiter.define(
  'team-invitation-post-token',
  (ctx) => {
    ctx.response.header('Cache-Control', 'no-store')
    ctx.response.header('Referrer-Policy', 'no-referrer')
    return limiter
      .allowRequests(5)
      .every('10 minutes')
      .usingKey(hashTeamInvitationToken(String(ctx.params.token)))
  }
)
