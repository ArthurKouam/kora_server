import { CandidateEducationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Candidate from '#models/candidate'

export default class CandidateEducation extends CandidateEducationSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>
}
