import Organization from '#models/organization'
import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { DateTime } from 'luxon'

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default class NewAccountController {
  /**
   * Crée le compte recruteur ET son organisation (rôle owner forcé).
   * `role` et `organizationId` ne sont jamais acceptés du client.
   */
  async store({ request, response, serialize }: HttpContext) {
    const { firstName, lastName, email, password, organizationName } =
      await request.validateUsing(signupValidator)

    // Slug d'organisation unique
    let slug = slugify(organizationName)
    const existingOrg = await Organization.query().where('slug', slug).first()
    if (existingOrg) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const result = await Organization.transaction(async (trx) => {
      const organization = await Organization.create(
        {
          name: organizationName,
          slug,
          email,
        },
        { client: trx }
      )

      const user = await User.create(
        {
          firstName,
          lastName,
          email,
          password,
          role: 'owner',
          organizationId: organization.id,
          emailVerifiedAt: DateTime.now(),
        },
        { client: trx }
      )

      return { organization, user }
    })

    const token = await User.accessTokens.create(result.user)

    return response.created(
      serialize({
        user: UserTransformer.transform(result.user),
        token: token.value!.release(),
      })
    )
  }
}
