import TeamInvitation from '#models/team_invitation'
import User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import {
  generateTeamInvitationToken,
  hashTeamInvitationToken,
  normalizeTeamInvitationEmail,
  TEAM_INVITATION_TTL_DAYS,
} from '#services/team_invitation_tokens'

export const TEAM_INVITATION_ROLES = [
  'admin',
  'recruiter',
  'hiring_manager',
  'interviewer',
] as const

export type TeamInvitationRole = (typeof TEAM_INVITATION_ROLES)[number]

type SqlError = Error & { code?: string }

export interface NewTeamInvitationData {
  firstName?: string
  lastName?: string
  password?: string
  passwordConfirmation?: string
}

export type CreateTeamInvitationResult =
  | { ok: true; invitation: TeamInvitation; token: string }
  | { ok: false; reason: 'duplicate' | 'already_member' | 'other_organization' }

export type ResendTeamInvitationResult =
  | { ok: true; invitation: TeamInvitation; token: string }
  | { ok: false; reason: 'not_found' | 'not_pending' | 'expired' }

export type CancelTeamInvitationResult =
  | { ok: true; invitation: TeamInvitation; idempotent: boolean }
  | { ok: false; reason: 'not_found' | 'accepted' | 'not_pending' }

export type AcceptTeamInvitationResult =
  | {
      ok: true
      invitation: TeamInvitation
      user: User
      idempotent: boolean
    }
  | {
      ok: false
      reason:
        | 'not_found'
        | 'gone'
        | 'unauthorized'
        | 'forbidden'
        | 'other_organization'
        | 'registration_required'
        | 'invalid_state'
    }

function isMissingRegistration(data: NewTeamInvitationData): boolean {
  return !data.firstName || !data.lastName || !data.password || !data.passwordConfirmation
}

export default class TeamInvitationService {
  static async expirePending(organizationId: string, client?: TransactionClientContract) {
    await TeamInvitation.query({ client })
      .where('organization_id', organizationId)
      .where('status', 'pending')
      .where('expires_at', '<=', DateTime.now().toSQL()!)
      .update({ status: 'expired' })
  }

  static async findUserByEmail(email: string, client?: TransactionClientContract, lock = false) {
    const query = User.query({ client }).whereRaw('LOWER(email) = ?', [email])
    if (lock) query.forUpdate()
    return query.first()
  }

  static async findUsersByEmail(email: string, client?: TransactionClientContract) {
    return User.query({ client }).whereRaw('LOWER(email) = ?', [email]).forUpdate()
  }

  static async create(
    inviter: User,
    email: string,
    role: TeamInvitationRole
  ): Promise<CreateTeamInvitationResult> {
    const organizationId = inviter.organizationId
    if (!organizationId) return { ok: false, reason: 'already_member' }

    const normalizedEmail = normalizeTeamInvitationEmail(email)
    const token = generateTeamInvitationToken()
    const now = DateTime.now()

    let otherOrganization = false
    try {
      const invitation = await TeamInvitation.transaction(async (trx) => {
        await this.expirePending(organizationId, trx)

        const existingUser = await this.findUserByEmail(normalizedEmail, trx, true)
        if (existingUser?.organizationId === organizationId) {
          return null
        }
        if (existingUser?.organizationId) {
          otherOrganization = true
          return null
        }

        return TeamInvitation.create(
          {
            organizationId,
            invitedBy: inviter.id,
            email: normalizedEmail,
            role,
            status: 'pending',
            deliveryStatus: 'pending',
            tokenHash: hashTeamInvitationToken(token),
            deliveryError: null,
            expiresAt: now.plus({ days: TEAM_INVITATION_TTL_DAYS }),
            sentAt: null,
            acceptedAt: null,
            cancelledAt: null,
          },
          { client: trx }
        )
      })

      if (otherOrganization) return { ok: false, reason: 'other_organization' }
      if (!invitation) return { ok: false, reason: 'already_member' }
      return { ok: true, invitation, token }
    } catch (error) {
      if ((error as SqlError).code === '23505') {
        return { ok: false, reason: 'duplicate' }
      }
      throw error
    }
  }

  static async list(organizationId: string) {
    await this.expirePending(organizationId)
    return TeamInvitation.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
  }

  static async members(organizationId: string) {
    return User.query().where('organization_id', organizationId).orderBy('created_at', 'asc')
  }

  static async findScoped(organizationId: string, invitationId: string) {
    return TeamInvitation.query()
      .where('id', invitationId)
      .where('organization_id', organizationId)
      .first()
  }

  static async findPublic(token: string) {
    const tokenHash = hashTeamInvitationToken(token)
    const invitation = await TeamInvitation.query()
      .where('token_hash', tokenHash)
      .preload('organization')
      .first()
    if (!invitation) return null

    if (invitation.status === 'pending' && invitation.expiresAt <= DateTime.now()) {
      const updated = await TeamInvitation.query()
        .where('id', invitation.id)
        .where('status', 'pending')
        .update({ status: 'expired' })
      if (updated) invitation.status = 'expired'
      else await invitation.refresh()
    }

    return invitation
  }

  static async resend(
    organizationId: string,
    invitationId: string
  ): Promise<ResendTeamInvitationResult> {
    const token = generateTeamInvitationToken()
    return TeamInvitation.transaction(async (trx) => {
      const invitation = await TeamInvitation.query({ client: trx })
        .where('id', invitationId)
        .where('organization_id', organizationId)
        .forUpdate()
        .first()

      if (!invitation) return { ok: false as const, reason: 'not_found' as const }
      if (invitation.status !== 'pending') {
        return { ok: false as const, reason: 'not_pending' as const }
      }
      if (invitation.expiresAt <= DateTime.now()) {
        invitation.status = 'expired'
        await invitation.save()
        return { ok: false as const, reason: 'expired' as const }
      }

      invitation.tokenHash = hashTeamInvitationToken(token)
      invitation.deliveryStatus = 'pending'
      invitation.deliveryError = null
      invitation.sentAt = null
      await invitation.save()
      return { ok: true as const, invitation, token }
    })
  }

  static async cancel(
    organizationId: string,
    invitationId: string
  ): Promise<CancelTeamInvitationResult> {
    return TeamInvitation.transaction(async (trx) => {
      const invitation = await TeamInvitation.query({ client: trx })
        .where('id', invitationId)
        .where('organization_id', organizationId)
        .forUpdate()
        .first()

      if (!invitation) return { ok: false as const, reason: 'not_found' as const }
      if (invitation.status === 'cancelled') {
        return { ok: true as const, invitation, idempotent: true }
      }
      if (invitation.status === 'accepted') {
        return { ok: false as const, reason: 'accepted' as const }
      }
      if (invitation.status !== 'pending') {
        return { ok: false as const, reason: 'not_pending' as const }
      }
      if (invitation.expiresAt <= DateTime.now()) {
        invitation.status = 'expired'
        await invitation.save()
        return { ok: false as const, reason: 'not_pending' as const }
      }

      invitation.status = 'cancelled'
      invitation.cancelledAt = DateTime.now()
      await invitation.save()
      return { ok: true as const, invitation, idempotent: false }
    })
  }

  static async accept(
    token: string,
    data: NewTeamInvitationData,
    sessionUser: User | null
  ): Promise<AcceptTeamInvitationResult> {
    const tokenHash = hashTeamInvitationToken(token)

    try {
      return await TeamInvitation.transaction(async (trx) => {
        const invitation = await TeamInvitation.query({ client: trx })
          .where('token_hash', tokenHash)
          .preload('organization')
          .forUpdate()
          .first()

        if (!invitation) return { ok: false as const, reason: 'not_found' as const }

        if (invitation.status === 'accepted') {
          const matchingUsers = await this.findUsersByEmail(invitation.email, trx)
          if (matchingUsers.length > 1) {
            return { ok: false as const, reason: 'invalid_state' as const }
          }
          const existingUser = matchingUsers[0]
          if (!existingUser) return { ok: false as const, reason: 'gone' as const }
          if (
            !sessionUser ||
            sessionUser.id !== existingUser.id ||
            normalizeTeamInvitationEmail(sessionUser.email) !== invitation.email
          ) {
            return { ok: false as const, reason: 'unauthorized' as const }
          }
          if (
            existingUser.organizationId &&
            existingUser.organizationId !== invitation.organizationId
          ) {
            return { ok: false as const, reason: 'other_organization' as const }
          }
          if (existingUser.organizationId !== invitation.organizationId) {
            return { ok: false as const, reason: 'invalid_state' as const }
          }
          return { ok: true as const, invitation, user: existingUser, idempotent: true }
        }

        if (invitation.status === 'cancelled' || invitation.status === 'expired') {
          return { ok: false as const, reason: 'gone' as const }
        }

        if (invitation.expiresAt <= DateTime.now()) {
          invitation.status = 'expired'
          await invitation.save()
          return { ok: false as const, reason: 'gone' as const }
        }

        const matchingUsers = await this.findUsersByEmail(invitation.email, trx)
        if (matchingUsers.length > 1) {
          return { ok: false as const, reason: 'invalid_state' as const }
        }
        const existingUser = matchingUsers[0]
        if (existingUser && !sessionUser) {
          return { ok: false as const, reason: 'unauthorized' as const }
        }
        // Une invitation pour une nouvelle adresse professionnelle crée son compte
        // directement, même si un autre utilisateur est encore connecté dans ce
        // navigateur. La session n'est nécessaire que lorsqu'un compte existe déjà
        // pour l'adresse invitée : elle prouve alors que son titulaire l'accepte.
        if (
          existingUser &&
          sessionUser &&
          (existingUser.id !== sessionUser.id ||
            normalizeTeamInvitationEmail(sessionUser.email) !== invitation.email)
        ) {
          return { ok: false as const, reason: 'forbidden' as const }
        }

        let user = existingUser
        if (user) {
          if (user.organizationId === invitation.organizationId) {
            invitation.status = 'accepted'
            invitation.acceptedAt = DateTime.now()
            await invitation.save()
            return { ok: true as const, invitation, user, idempotent: false }
          }
          if (user.organizationId) {
            return { ok: false as const, reason: 'other_organization' as const }
          }

          user.organizationId = invitation.organizationId
          user.role = invitation.role
          await user.save()
        } else {
          if (isMissingRegistration(data)) {
            return { ok: false as const, reason: 'registration_required' as const }
          }

          user = await User.create(
            {
              firstName: data.firstName!,
              lastName: data.lastName!,
              email: invitation.email,
              password: data.password!,
              organizationId: invitation.organizationId,
              role: invitation.role,
              emailVerifiedAt: DateTime.now(),
            },
            { client: trx }
          )
        }

        invitation.status = 'accepted'
        invitation.acceptedAt = DateTime.now()
        await invitation.save()
        return { ok: true as const, invitation, user, idempotent: false }
      })
    } catch (error) {
      if ((error as SqlError).code === '23505') {
        return { ok: false as const, reason: 'invalid_state' as const }
      }
      throw error
    }
  }
}
