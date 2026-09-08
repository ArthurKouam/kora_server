import { JobSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'
import JobSkill from '#models/job_skill'
import Application from '#models/application'
import Skill from '#models/skill'
import JobFormVersion from '#models/job_form_version'

export default class Job extends JobSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => JobSkill)
  declare skills: HasMany<typeof JobSkill>

  @hasMany(() => Application)
  declare applications: HasMany<typeof Application>

  @hasMany(() => JobFormVersion)
  declare formVersions: HasMany<typeof JobFormVersion>

  @belongsTo(() => JobFormVersion, { foreignKey: 'activeFormVersionId' })
  declare activeFormVersion: BelongsTo<typeof JobFormVersion>

  @manyToMany(() => Skill, {
    pivotTable: 'job_skills',
    pivotForeignKey: 'job_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'skill_id',
  })
  declare requiredSkills: ManyToMany<typeof Skill>
}
