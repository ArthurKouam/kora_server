import { TalentPoolNoteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import TalentPoolEntry from '#models/talent_pool_entry'
import User from '#models/user'

/** Note interne : lue uniquement par les routes `/talent-pool/*`. */
export default class TalentPoolNote extends TalentPoolNoteSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => TalentPoolEntry, { foreignKey: 'talentPoolEntryId' })
  declare entry: BelongsTo<typeof TalentPoolEntry>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
