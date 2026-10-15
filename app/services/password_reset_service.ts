import db from '@adonisjs/lucid/services/db'
import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'

/**
 * Réinitialisation du mot de passe de l'équipe staff (guard `web`).
 *
 * Le token n'est jamais stocké en clair, la réponse HTTP est identique que
 * l'email existe ou non, et la réinitialisation révoque les sessions en cours.
 * Le hachage du mot de passe est fait par le hook `beforeSave` de `User`.
 */

export const PASSWORD_RESET_TTL_MINUTES = 60
const MAX_REQUESTS_PER_HOUR = 5

export type PasswordResetFailure = 'invalid' | 'expired' | 'used' | 'rate_limited'

export type PasswordResetLookup =
  { ok: true; token: PasswordResetToken } | { ok: false; reason: PasswordResetFailure }

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * `null` signifie « aucun compte pour cette adresse » : la couche HTTP répond
 * alors comme dans le cas nominal, sans révéler l'existence du compte.
 */
export interface PasswordResetRequestResult {
  token: string
  email: string
  firstName: string | null
  organizationId: string | null
}

export async function requestPasswordReset(
  email: string,
  requestIp: string | null
): Promise<PasswordResetRequestResult | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await User.query().whereRaw('LOWER(email) = ?', [normalizedEmail]).first()

  if (!user) {
    return null
  }

  const oneHourAgo = DateTime.now().minus({ hours: 1 })
  const recent = await PasswordResetToken.query()
    .where('user_id', user.id)
    .where('created_at', '>', oneHourAgo.toSQL()!)

  if (recent.length >= MAX_REQUESTS_PER_HOUR) {
    throw new Error('PASSWORD_RESET_RATE_LIMITED')
  }

  // Un seul lien valide à la fois.
  await PasswordResetToken.query()
    .where('user_id', user.id)
    .whereNull('used_at')
    .where('expires_at', '>', DateTime.now().toSQL()!)
    .update({ expiresAt: DateTime.now().toSQL()! })

  const token = generatePasswordResetToken()
  await PasswordResetToken.create({
    userId: user.id,
    email: user.email,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: DateTime.now().plus({ minutes: PASSWORD_RESET_TTL_MINUTES }),
    requestIp,
  })

  return {
    token,
    email: user.email,
    firstName: user.firstName,
    organizationId: user.organizationId,
  }
}

/** Résout un token en clair vers un enregistrement utilisable, sans le consommer. */
export async function findPasswordResetToken(token: string): Promise<PasswordResetLookup> {
  if (!token) {
    return { ok: false, reason: 'invalid' }
  }

  const record = await PasswordResetToken.query()
    .where('token_hash', hashPasswordResetToken(token))
    .first()

  if (!record) {
    return { ok: false, reason: 'invalid' }
  }
  if (record.usedAt) {
    return { ok: false, reason: 'used' }
  }
  if (record.expiresAt <= DateTime.now()) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, token: record }
}

/** Consomme le token et applique le nouveau mot de passe. */
export async function resetPassword(token: string, password: string): Promise<PasswordResetLookup> {
  const lookup = await findPasswordResetToken(token)
  if (!lookup.ok) {
    return lookup
  }

  const { token: record } = lookup

  // `used_at IS NULL` rend la revendication atomique : un lien ne sert qu'une fois.
  const claimed = await PasswordResetToken.query()
    .where('id', record.id)
    .whereNull('used_at')
    .update({ usedAt: DateTime.now().toSQL()! })

  if (!claimed.length) {
    return { ok: false, reason: 'used' }
  }

  const user = await User.find(record.userId)
  if (!user) {
    return { ok: false, reason: 'invalid' }
  }

  user.password = password
  await user.save()

  // Révocation des sessions et jetons existants.
  await db.query().from('remember_me_tokens').where('tokenable_id', user.id).delete()
  await db.query().from('auth_access_tokens').where('tokenable_id', user.id).delete()

  return { ok: true, token: record }
}
