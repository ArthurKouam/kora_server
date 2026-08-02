import { AuthAccessTokenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class AuthAccessToken extends AuthAccessTokenSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => User, { foreignKey: 'tokenableId' })
  declare tokenable: BelongsTo<typeof User>
}
