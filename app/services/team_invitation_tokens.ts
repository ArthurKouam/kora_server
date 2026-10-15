import encryption from '@adonisjs/core/services/encryption'
import { createHash, randomBytes } from 'node:crypto'

const PURPOSE = 'team-invitation'

export const TEAM_INVITATION_TTL_DAYS = 7

export function generateTeamInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashTeamInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function encryptTeamInvitationToken(token: string): string {
  return encryption.encrypt(token, { purpose: PURPOSE })
}

export function decryptTeamInvitationToken(payload: string): string | null {
  return encryption.decrypt<string>(payload, PURPOSE)
}

export function normalizeTeamInvitationEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase()
}

export function maskTeamInvitationEmail(email: string): string {
  const normalized = normalizeTeamInvitationEmail(email)
  const [local, domain] = normalized.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`
}
