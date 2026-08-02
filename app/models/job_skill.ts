import { JobSkillSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Job from '#models/job'
import Skill from '#models/skill'

export default class JobSkill extends JobSkillSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => Skill)
  declare skill: BelongsTo<typeof Skill>
}
