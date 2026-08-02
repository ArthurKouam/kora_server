import { TagSchema } from '#database/schema'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Application from '#models/application'
import ApplicationTag from '#models/application_tag'

export default class Tag extends TagSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @manyToMany(() => Application, {
    pivotModel: () => ApplicationTag,
    pivotForeignKey: 'tag_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'application_id',
  })
  declare applications: ManyToMany<typeof Application>
}
