import { JobSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'
import JobSkill from '#models/job_skill'
import Application from '#models/application'
import Skill from '#models/skill'

export default class Job extends JobSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => JobSkill)
  declare skills: HasMany<typeof JobSkill>

  @hasMany(() => Application)
  declare applications: HasMany<typeof Application>

  @manyToMany(() => Skill, {
    pivotModel: () => JobSkill,
    pivotForeignKey: 'job_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'skill_id',
  })
  declare requiredSkills: ManyToMany<typeof Skill>
}
