import { ApplicationTagSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Application from '#models/application'
import Tag from '#models/tag'

export default class ApplicationTag extends ApplicationTagSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => Tag)
  declare tag: BelongsTo<typeof Tag>
}
