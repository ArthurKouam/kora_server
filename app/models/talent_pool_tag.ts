import { TalentPoolTagSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tag from '#models/tag'
import TalentPoolEntry from '#models/talent_pool_entry'

export default class TalentPoolTag extends TalentPoolTagSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => TalentPoolEntry, { foreignKey: 'talentPoolEntryId' })
  declare entry: BelongsTo<typeof TalentPoolEntry>

  @belongsTo(() => Tag)
  declare tag: BelongsTo<typeof Tag>
}
