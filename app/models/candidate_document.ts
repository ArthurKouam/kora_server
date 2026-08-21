import { CandidateDocumentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Candidate from '#models/candidate'
import Application from '#models/application'

export default class CandidateDocument extends CandidateDocumentSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>
}
