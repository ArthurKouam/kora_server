import UserTransformer from '#transformers/user_transformer'
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
}
