import { ApplicationSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Job from '#models/job'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import ApplicationStatusHistory from '#models/application_status_history'
import ApplicationNote from '#models/application_note'
import ApplicationTag from '#models/application_tag'
import Interview from '#models/interview'
import Evaluation from '#models/evaluation'
import Email from '#models/email'
import JobFormVersion from '#models/job_form_version'

export default class Application extends ApplicationSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => CandidateDocument, { foreignKey: 'cvDocumentId' })
  declare cvDocument: BelongsTo<typeof CandidateDocument>

  @belongsTo(() => JobFormVersion, { foreignKey: 'formVersionId' })
  declare formVersion: BelongsTo<typeof JobFormVersion>

  @hasMany(() => ApplicationStatusHistory)
  declare statusHistory: HasMany<typeof ApplicationStatusHistory>

  @hasMany(() => ApplicationNote)
  declare notes: HasMany<typeof ApplicationNote>

  @hasMany(() => ApplicationTag)
  declare tags: HasMany<typeof ApplicationTag>

  @hasMany(() => Interview)
  declare interviews: HasMany<typeof Interview>

  @hasMany(() => Evaluation)
  declare evaluations: HasMany<typeof Evaluation>

  @hasMany(() => Email)
  declare emails: HasMany<typeof Email>
}
