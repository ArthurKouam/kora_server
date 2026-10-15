import TeamInvitation from '#models/team_invitation'
import { sendTeamInvitationEmail } from '#services/team_invitation_email'
import {
  decryptTeamInvitationToken,
  hashTeamInvitationToken,
} from '#services/team_invitation_tokens'
import env from '#start/env'
import { exponentialBackoff, Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

interface Payload {
  invitationId: string
  encryptedToken: string
  expectedTokenHash: string
}

export default class SendTeamInvitationEmail extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
    retry: { backoff: exponentialBackoff({ baseDelay: '2s', maxDelay: '10m', jitter: true }) },
    timeout: '30s',
    failOnTimeout: false,
  }

  async execute() {
    const invitation = await TeamInvitation.query()
      .where('id', this.payload.invitationId)
      .preload('organization')
      .preload('inviter')
      .first()

    if (
      !invitation ||
      invitation.status !== 'pending' ||
      invitation.tokenHash !== this.payload.expectedTokenHash
    ) {
      return
    }

    if (invitation.expiresAt <= DateTime.now()) {
      await TeamInvitation.query()
        .where('id', invitation.id)
        .where('status', 'pending')
        .update({ status: 'expired' })
      return
    }

    const processing = await TeamInvitation.query()
      .where('id', invitation.id)
      .where('status', 'pending')
      .where('token_hash', this.payload.expectedTokenHash)
      .update({ deliveryStatus: 'processing', deliveryError: null })
    if (!processing) return

    let token: string | null = null
    try {
      token = decryptTeamInvitationToken(this.payload.encryptedToken)
      if (!token) throw new Error('Invalid encrypted team invitation token')
      if (hashTeamInvitationToken(token) !== invitation.tokenHash) {
        throw new Error('Invalid team invitation token')
      }

      const inviterName =
        `${invitation.inviter.firstName ?? ''} ${invitation.inviter.lastName ?? ''}`.trim() ||
        invitation.inviter.email
      await sendTeamInvitationEmail({
        to: invitation.email,
        inviterName,
        organizationName: invitation.organization.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        publicUrl: `${env.get('FRONTEND_URL').replace(/\/$/, '')}/team-invitations/${encodeURIComponent(token)}`,
        organizationId: invitation.organizationId,
      })
    } catch {
      await TeamInvitation.query()
        .where('id', invitation.id)
        .where('status', 'pending')
        .where('token_hash', this.payload.expectedTokenHash)
        .update({ deliveryStatus: 'retrying', deliveryError: 'Email delivery failed' })
      throw new Error('Team invitation email delivery failed')
    }

    await TeamInvitation.query()
      .where('id', invitation.id)
      .where('status', 'pending')
      .where('token_hash', this.payload.expectedTokenHash)
      .update({ deliveryStatus: 'sent', sentAt: DateTime.now(), deliveryError: null })
  }

  async failed(_error: Error) {
    await TeamInvitation.query()
      .where('id', this.payload.invitationId)
      .where('status', 'pending')
      .where('token_hash', this.payload.expectedTokenHash)
      .update({ deliveryStatus: 'failed', deliveryError: 'Email delivery failed' })
  }
}
