import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class SessionController {
  async login({ auth, request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    await auth.use('web').login(user, true)

    return serialize({
      user: UserTransformer.transform(user),
    })
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    return response.noContent()
  }
}
