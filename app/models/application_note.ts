import { ApplicationNoteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Application from '#models/application'
import User from '#models/user'

export default class ApplicationNote extends ApplicationNoteSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
