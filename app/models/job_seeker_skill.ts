import { JobSeekerSkillSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import JobSeeker from '#models/job_seeker'
import Skill from '#models/skill'

export default class JobSeekerSkill extends JobSeekerSkillSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => JobSeeker)
  declare jobSeeker: BelongsTo<typeof JobSeeker>

  @belongsTo(() => Skill)
  declare skill: BelongsTo<typeof Skill>
}
