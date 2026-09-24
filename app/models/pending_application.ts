import { PendingApplicationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Job from '#models/job'
import Candidate from '#models/candidate'
import Form from '#models/form'

export default class PendingApplication extends PendingApplicationSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => Form)
  declare form: BelongsTo<typeof Form>
}
