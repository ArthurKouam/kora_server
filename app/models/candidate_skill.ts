import { CandidateSkillSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Candidate from '#models/candidate'
import Skill from '#models/skill'

export default class CandidateSkill extends CandidateSkillSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => Skill)
  declare skill: BelongsTo<typeof Skill>
}
