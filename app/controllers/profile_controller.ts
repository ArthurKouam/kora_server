import Organization from '#models/organization'
import UserTransformer from '#transformers/user_transformer'
import {
  updateOrganizationValidator,
  updatePasswordValidator,
  updateProfileValidator,
} from '#validators/settings'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    return serialize({
      user: UserTransformer.transform(user),
      organization: user.organization,
    })
  }

  /**
   * PUT /account/profile — met à jour le profil de l'utilisateur connecté.
   */
  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator)

    user.firstName = payload.firstName
    user.lastName = payload.lastName
    await user.save()

    return serialize({ user: UserTransformer.transform(user) })
  }

  /**
   * PUT /account/password — changement de mot de passe.
   */
  async updatePassword({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const payload = await request.validateUsing(updatePasswordValidator)

    const valid = await user.verifyPassword(payload.currentPassword)
    if (!valid) {
      return response.unprocessableEntity({
        errors: [{ field: 'currentPassword', message: 'Mot de passe actuel incorrect.' }],
      })
    }

    user.password = payload.password
    await user.save()

    return response.ok({ message: 'Mot de passe mis à jour.' })
  }

  /**
   * PUT /account/organization — met à jour l'organisation de l'utilisateur.
   */
  async updateOrganization({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const payload = await request.validateUsing(updateOrganizationValidator)
    const organization = await Organization.findOrFail(organizationId)

    organization.merge(payload as never)
    await organization.save()

    return response.ok(organization)
  }
}
