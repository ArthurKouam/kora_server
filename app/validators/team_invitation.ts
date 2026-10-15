import vine from '@vinejs/vine'
import { TEAM_INVITATION_ROLES } from '#services/team_invitation'

export const createTeamInvitationValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
  role: vine.enum(TEAM_INVITATION_ROLES),
})

export const acceptTeamInvitationValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100).optional(),
  lastName: vine.string().trim().minLength(1).maxLength(100).optional(),
  password: vine.string().minLength(8).maxLength(32).optional(),
  passwordConfirmation: vine.string().sameAs('password').optional(),
})
