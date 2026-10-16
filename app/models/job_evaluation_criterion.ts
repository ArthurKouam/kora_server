import { JobEvaluationCriterionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Job from '#models/job'

export default class JobEvaluationCriterion extends JobEvaluationCriterionSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>
}
