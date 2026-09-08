import { PendingApplicationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Job from '#models/job'
import Candidate from '#models/candidate'
import JobFormVersion from '#models/job_form_version'

export default class PendingApplication extends PendingApplicationSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => JobFormVersion)
  declare formVersion: BelongsTo<typeof JobFormVersion>
}
