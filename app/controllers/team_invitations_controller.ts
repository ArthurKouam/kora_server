import SendTeamInvitationEmail from '#jobs/send_team_invitation_email'
import Organization from '#models/organization'
import TeamInvitation from '#models/team_invitation'
import PlanService from '#services/plan_service'
import TeamInvitationService, { type TeamInvitationRole } from '#services/team_invitation'
import {
  acceptTeamInvitationValidator,
  createTeamInvitationValidator,
} from '#validators/team_invitation'
import {
  encryptTeamInvitationToken,
  maskTeamInvitationEmail,
} from '#services/team_invitation_tokens'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

function hasOnlyKeys(value: unknown, allowed: string[]): boolean {
  if (value === undefined || value === null) return true
  if (typeof value !== 'object' || Array.isArray(value)) return false
  return Object.keys(value).every((key) => allowed.includes(key))
}

function staffInvitationResponse(invitation: TeamInvitation) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    deliveryStatus: invitation.deliveryStatus,
    expiresAt: invitation.expiresAt,
    sentAt: invitation.sentAt,
    acceptedAt: invitation.acceptedAt,
    cancelledAt: invitation.cancelledAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  }
}

function publicInvitationResponse(invitation: TeamInvitation) {
  return {
    status: invitation.status,
    email: maskTeamInvitationEmail(invitation.email),
    role: invitation.role,
    organization: invitation.organization ? { name: invitation.organization.name } : undefined,
    expiresAt: invitation.expiresAt,
  }
}

export default class TeamInvitationsController {
  private async dispatchEmail(invitation: TeamInvitation, token: string) {
    try {
      await SendTeamInvitationEmail.dispatch({
        invitationId: invitation.id,
        encryptedToken: encryptTeamInvitationToken(token),
        expectedTokenHash: invitation.tokenHash,
      })
        .dedup({ id: `team-invitation:${invitation.id}:${invitation.tokenHash}` })
        .run()
    } catch {
      await TeamInvitation.query()
        .where('id', invitation.id)
        .where('token_hash', invitation.tokenHash)
        .update({ deliveryStatus: 'failed', deliveryError: 'Email could not be queued' })
      invitation.deliveryStatus = 'failed'
      invitation.deliveryError = 'Email could not be queued'
    }
  }

  async index({ auth, response, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const invitations = await TeamInvitationService.list(user.organizationId)
    return response.ok(await serialize(invitations.map(staffInvitationResponse)))
  }

  async show({ auth, params, response, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const invitation = await TeamInvitationService.findScoped(
      user.organizationId,
      String(params.id)
    )
    if (!invitation) return response.notFound({ error: 'Invitation not found' })
    return response.ok(await serialize(staffInvitationResponse(invitation)))
  }

  async members({ auth, response, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const members = await TeamInvitationService.members(user.organizationId)
    return response.ok(await serialize(UserTransformer.transform(members)))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    if (!hasOnlyKeys(request.body(), ['email', 'role'])) {
      return response.unprocessableEntity({ error: 'Unexpected invitation fields' })
    }

    // Quota de membres du plan courant vérifié AVANT toute écriture et tout
    // envoi d'email : inviter quelqu'un puis refuser l'invitation serait absurde
    // côté client, et l'email partirait pour une invitation que personne ne peut
    // accepter.
    const organization = await Organization.find(user.organizationId)
    if (!organization) {
      return response.forbidden({ error: 'Organization not found' })
    }

    const quotaError = await PlanService.checkMemberQuota(organization)
    if (quotaError) {
      return response.paymentRequired({ error: quotaError, code: 'member_quota_reached' })
    }

    const payload = await request.validateUsing(createTeamInvitationValidator)
    const result = await TeamInvitationService.create(
      user,
      payload.email,
      payload.role as TeamInvitationRole
    )

    if (!result.ok) {
      if (result.reason === 'already_member') {
        return response.conflict({ error: 'This user already belongs to the organization' })
      }
      if (result.reason === 'other_organization') {
        return response.conflict({ error: 'This user already belongs to another organization' })
      }
      return response.conflict({ error: 'A pending invitation already exists for this email' })
    }

    await this.dispatchEmail(result.invitation, result.token)
    return response.created(await serialize(staffInvitationResponse(result.invitation)))
  }

  async resend({ auth, params, request, response, serialize }: HttpContext) {
    if (!hasOnlyKeys(request.body(), [])) {
      return response.unprocessableEntity({ error: 'Unexpected invitation fields' })
    }

    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const result = await TeamInvitationService.resend(user.organizationId, String(params.id))
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return response.notFound({ error: 'Invitation not found' })
      }
      if (result.reason === 'expired') {
        return response.gone({ error: 'Invitation has expired' })
      }
      return response.conflict({ error: 'Only pending invitations can be resent' })
    }

    await this.dispatchEmail(result.invitation, result.token)
    return response.ok(await serialize(staffInvitationResponse(result.invitation)))
  }

  async cancel({ auth, params, request, response, serialize }: HttpContext) {
    if (!hasOnlyKeys(request.body(), [])) {
      return response.unprocessableEntity({ error: 'Unexpected invitation fields' })
    }

    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const result = await TeamInvitationService.cancel(user.organizationId, String(params.id))
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return response.notFound({ error: 'Invitation not found' })
      }
      if (result.reason === 'accepted') {
        return response.conflict({ error: 'Accepted invitations cannot be cancelled' })
      }
      return response.conflict({ error: 'Only pending invitations can be cancelled' })
    }

    return response.ok(await serialize(staffInvitationResponse(result.invitation)))
  }

  async publicShow({ params, response, serialize }: HttpContext) {
    response.header('Cache-Control', 'no-store')
    response.header('Referrer-Policy', 'no-referrer')
    const invitation = await TeamInvitationService.findPublic(String(params.token))
    if (!invitation) return response.notFound({ error: 'Invitation not found' })

    if (invitation.status === 'cancelled' || invitation.status === 'expired') {
      return response.gone({
        status: invitation.status,
        error: 'Invitation is no longer available',
      })
    }
    if (invitation.status === 'accepted') {
      return response.ok(await serialize({ status: 'accepted', acceptedAt: invitation.acceptedAt }))
    }

    return response.ok(await serialize(publicInvitationResponse(invitation)))
  }

  async publicAccept({ auth, params, request, response, serialize }: HttpContext) {
    response.header('Cache-Control', 'no-store')
    response.header('Referrer-Policy', 'no-referrer')
    if (
      !hasOnlyKeys(request.body(), ['firstName', 'lastName', 'password', 'passwordConfirmation'])
    ) {
      return response.unprocessableEntity({ error: 'Unexpected invitation fields' })
    }

    const payload = await request.validateUsing(acceptTeamInvitationValidator)
    const sessionGuard = auth.use('web')
    const sessionUser = (await auth.checkUsing(['web'])) ? sessionGuard.getUserOrFail() : null
    const result = await TeamInvitationService.accept(String(params.token), payload, sessionUser)

    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          return response.notFound({ error: 'Invitation not found' })
        case 'gone':
          return response.gone({ error: 'Invitation is no longer available' })
        case 'unauthorized':
          return response.unauthorized({
            error: 'Sign in with the invited email to accept this invitation',
          })
        case 'forbidden':
          return response.forbidden({
            error: 'The current session does not match the invited email',
          })
        case 'other_organization':
          return response.conflict({
            error: 'This account already belongs to another organization',
          })
        case 'invalid_state':
          return response.conflict({ error: 'This invitation can no longer be accepted' })
        case 'registration_required':
          return response.unprocessableEntity({
            errors: [
              { field: 'firstName', message: 'First name is required' },
              { field: 'lastName', message: 'Last name is required' },
              { field: 'password', message: 'Password is required' },
              { field: 'passwordConfirmation', message: 'Password confirmation is required' },
            ],
          })
      }
    }

    await auth.use('web').login(result.user, true)
    return response.ok(await serialize({ status: 'accepted', role: result.user.role }))
  }
}
