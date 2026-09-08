import encryption from '@adonisjs/core/services/encryption'

/**
 * Tokens de confirmation d'entretien pour les candidats (sans compte).
 * Chiffrés avec APP_KEY : opaques, non falsifiables, sans stockage.
 */
export default class InterviewTokenService {
  static encode(kind: 'invite' | 'slots', interviewOrRequestId: string): string {
    return encryption.encrypt(JSON.stringify({ k: kind, id: interviewOrRequestId }))
  }

  static decode(token: string): { kind: 'invite' | 'slots'; id: string } | null {
    try {
      const decrypted = encryption.decrypt<string>(token)
      if (!decrypted) return null
      const payload = JSON.parse(decrypted)
      if (
        payload &&
        typeof payload === 'object' &&
        (payload.k === 'invite' || payload.k === 'slots') &&
        typeof payload.id === 'string'
      ) {
        return { kind: payload.k, id: payload.id }
      }
      return null
    } catch {
      return null
    }
  }
}
