import hash from '@adonisjs/core/services/hash'
import { randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import CandidateVerificationToken from '#models/candidate_verification_token'

export type OtpVerifyResult =
  { ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' }

const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
const OTP_MAX_REQUESTS_PER_HOUR = 5

/**
 * Codes OTP à usage unique pour la vérification de l'email candidat.
 * Le code n'est jamais stocké en clair (hash scrypt) ; un nouveau code
 * invalide les précédents ; le nombre de demandes et de tentatives est limité.
 */
export default class OtpService {
  /**
   * Génère et envoie (par l'appelant) un nouvel OTP. Retourne le code en clair.
   */
  static async request(email: string, type: string): Promise<string> {
    const oneHourAgo = DateTime.now().minus({ minutes: 60 })

    const recent = await CandidateVerificationToken.query()
      .where('email', email.toLowerCase())
      .where('type', type)
      .where('created_at', '>', oneHourAgo.toSQL()!)

    // Rate limiting : max 5 demandes / heure / email
    if (recent.length >= OTP_MAX_REQUESTS_PER_HOUR) {
      throw new Error('OTP_RATE_LIMITED')
    }

    // Invalide les codes précédents non consommés
    for (const token of recent) {
      if (!token.verifiedAt && token.expiresAt > DateTime.now()) {
        token.expiresAt = DateTime.now()
        await token.save()
      }
    }

    const code = String(randomInt(100000, 1000000))
    await CandidateVerificationToken.create({
      email: email.toLowerCase(),
      type,
      tokenHash: await hash.make(code),
      expiresAt: DateTime.now().plus({ minutes: OTP_TTL_MINUTES }),
      attempts: 0,
    })

    return code
  }

  /**
   * Vérifie un code. Consomme le token en cas de succès.
   */
  static async verify(email: string, code: string, type: string): Promise<OtpVerifyResult> {
    const token = await CandidateVerificationToken.query()
      .where('email', email.toLowerCase())
      .where('type', type)
      .whereNull('verified_at')
      .orderBy('created_at', 'desc')
      .first()

    if (!token || token.expiresAt <= DateTime.now()) {
      return { ok: false, reason: 'expired' }
    }

    if (token.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: 'too_many_attempts' }
    }

    token.attempts += 1

    const valid = await hash.verify(token.tokenHash, code.trim())

    if (!valid) {
      await token.save()
      return { ok: false, reason: 'invalid' }
    }

    token.verifiedAt = DateTime.now()
    await token.save()
    return { ok: true }
  }
}
