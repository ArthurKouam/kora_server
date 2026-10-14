import { TalentPoolEntrySchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Candidate from '#models/candidate'
import Organization from '#models/organization'
import Tag from '#models/tag'
import TalentPoolNote from '#models/talent_pool_note'
import TalentPoolTag from '#models/talent_pool_tag'
import User from '#models/user'

export type TalentPoolStatus = 'active' | 'archived'
export type TalentPoolSource = 'application' | 'manual'

/** Adhésion d'un candidat au vivier d'une organisation. */
export default class TalentPoolEntry extends TalentPoolEntrySchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => User, { foreignKey: 'addedBy' })
  declare addedByUser: BelongsTo<typeof User>

  @hasMany(() => TalentPoolNote)
  declare notes: HasMany<typeof TalentPoolNote>

  @hasMany(() => TalentPoolTag)
  declare tagLinks: HasMany<typeof TalentPoolTag>

  @manyToMany(() => Tag, {
    pivotTable: 'talent_pool_tags',
    pivotForeignKey: 'talent_pool_entry_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'tag_id',
  })
  declare tags: ManyToMany<typeof Tag>

  isArchived(): boolean {
    return this.status === 'archived'
  }
}
