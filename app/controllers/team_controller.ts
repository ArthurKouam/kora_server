import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import encryption from '@adonisjs/core/services/encryption'
import Mailer from '#services/mailer'
import Organization from '#models/organization'
import PlanService from '#services/plan_service'
import { USER_ROLES, can } from '#services/authorization'
import { inviteMemberValidator } from '#validators/billing'

/**
 * Gestion d'équipe — invitation d'un membre.
 *
 * La permission `team.invite` existait dans le RBAC sans être câblée nulle
 * part : sans cet écran, le quota `max_members` des plans n'aurait aucun
 * effet. On ne couvre ici que l'invitation ; la modification de rôle et le
 * retrait d'un membre restent à faire.
 */
export default class TeamController {
  /**
   * GET /dashboard/team
   * Membres de l'organisation.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const members = await db
      .query()
      .from('users')
      .where('organization_id', user.organizationId)
      .select('id', 'first_name', 'last_name', 'email', 'role', 'is_active', 'created_at')
      .orderBy('created_at', 'asc')

    return response.ok(members)
  }

  /**
   * POST /dashboard/team/invitations
   *
   * Le quota de membres est vérifié **avant** tout envoi d'email : sinon on
   * invite quelqu'un puis on refuse l'invitation, ce qui est absurde côté
   * client.
   */
  async invite({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    if (!can(user.role, 'team.invite')) {
      return response.forbidden({ error: 'Insufficient permissions' })
    }

    const organization = await Organization.find(user.organizationId)

    if (!organization) {
      return response.forbidden({ error: 'Organization not found' })
    }

    const quotaError = await PlanService.checkMemberQuota(organization)

    if (quotaError) {
      return response.paymentRequired({ error: quotaError, code: 'member_quota_reached' })
    }

    const payload = await request.validateUsing(inviteMemberValidator)

    const existing = await db
      .query()
      .from('users')
      .where('email', payload.email)
      .where('organization_id', user.organizationId)
      .first()

    if (existing) {
      return response.conflict({ error: 'This person is already a member of the organization.' })
    }

    const role =
      payload.role && USER_ROLES.includes(payload.role as never) ? payload.role : 'recruiter'

    // Jeton à usage unique : le lien porte l'organisation et l'email, et il
    // est chiffré avec APP_KEY, donc non falsifiable.
    const token = encryption.encrypt(
      JSON.stringify({
        organizationId: user.organizationId,
        email: payload.email,
        role,
        invitedBy: user.id,
        expiresAt: DateTime.now().plus({ days: 7 }).toISO(),
      })
    )

    const inviteUrl = `${process.env.FRONTEND_URL ?? ''}/invitation?token=${encodeURIComponent(token)}`

    await Mailer.sendTeamInvitation({
      to: payload.email,
      inviterName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      organizationName: organization.name,
      invitationUrl: inviteUrl,
      expiresInDays: 7,
    })

    return response.created({
      email: payload.email,
      role,
      expiresInDays: 7,
      message: 'Invitation envoyée.',
    })
  }
}
