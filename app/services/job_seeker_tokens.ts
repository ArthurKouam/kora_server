import JobSeekerVerificationToken from '#models/job_seeker_verification_token'
import JobSeekerPasswordResetToken from '#models/job_seeker_password_reset_token'
import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'

/**
 * Jetons à usage unique du portail candidat.
 *
 * Comme pour le staff, seuls les hachés sont stockés : une fuite de la base ne
 * permet pas de rejouer un lien de vérification ou de réinitialisation.
 */

export const EMAIL_VERIFICATION_TTL_HOURS = 24
export const PASSWORD_RESET_TTL_MINUTES = 60
const MAX_PASSWORD_RESET_PER_HOUR = 5

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type TokenFailure = 'invalid' | 'expired' | 'used' | 'rate_limited'
export type VerificationLookup =
  | { ok: true; token: JobSeekerVerificationToken }
  | { ok: false; reason: TokenFailure }

export async function issueVerificationToken(jobSeekerId: string): Promise<string> {
  // Un seul lien valide à la fois : un renvoi invalide le précédent.
  await JobSeekerVerificationToken.query()
    .where('job_seeker_id', jobSeekerId)
    .whereNull('consumed_at')
    .update({ consumed_at: DateTime.now().toSQL()! })

  const token = generateToken()
  await JobSeekerVerificationToken.create({
    jobSeekerId,
    tokenHash: hashToken(token),
    expiresAt: DateTime.now().plus({ hours: EMAIL_VERIFICATION_TTL_HOURS }),
  })
  return token
}

export async function findVerificationToken(token: string): Promise<VerificationLookup> {
  if (!token) return { ok: false, reason: 'invalid' }

  const record = await JobSeekerVerificationToken.query()
    .where('token_hash', hashToken(token))
    .first()

  if (!record) return { ok: false, reason: 'invalid' }
  if (record.consumedAt) return { ok: false, reason: 'used' }
  if (record.expiresAt <= DateTime.now()) return { ok: false, reason: 'expired' }

  return { ok: true, token: record }
}

export type ResetLookup =
  | { ok: true; token: JobSeekerPasswordResetToken }
  | { ok: false; reason: TokenFailure }

export async function issuePasswordResetToken(
  jobSeekerId: string,
  requestIp: string | null
): Promise<string> {
  const oneHourAgo = DateTime.now().minus({ hours: 1 })
  const recent = await JobSeekerPasswordResetToken.query()
    .where('job_seeker_id', jobSeekerId)
    .where('created_at', '>', oneHourAgo.toSQL()!)

  if (recent.length >= MAX_PASSWORD_RESET_PER_HOUR) {
    throw new Error('PASSWORD_RESET_RATE_LIMITED')
  }

  await JobSeekerPasswordResetToken.query()
    .where('job_seeker_id', jobSeekerId)
    .whereNull('used_at')
    .where('expires_at', '>', DateTime.now().toSQL()!)
    .update({ expires_at: DateTime.now().toSQL()! })

  const token = generateToken()
  await JobSeekerPasswordResetToken.create({
    jobSeekerId,
    tokenHash: hashToken(token),
    expiresAt: DateTime.now().plus({ minutes: PASSWORD_RESET_TTL_MINUTES }),
    requestIp,
  })
  return token
}

export async function findPasswordResetToken(token: string): Promise<ResetLookup> {
  if (!token) return { ok: false, reason: 'invalid' }

  const record = await JobSeekerPasswordResetToken.query()
    .where('token_hash', hashToken(token))
    .first()

  if (!record) return { ok: false, reason: 'invalid' }
  if (record.usedAt) return { ok: false, reason: 'used' }
  if (record.expiresAt <= DateTime.now()) return { ok: false, reason: 'expired' }

  return { ok: true, token: record }
}
