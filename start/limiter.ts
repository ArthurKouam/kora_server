import limiter from '@adonisjs/limiter/services/main'

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

export const careerApplyThrottle = limiter.define('career-apply', () => {
  return limiter.allowRequests(10).every('10 minutes')
})

export const otpVerifyThrottle = limiter.define('otp-verify', () => {
  return limiter.allowRequests(10).every('1 minute')
})
