import { EvaluationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Application from '#models/application'
import Interview from '#models/interview'
import User from '#models/user'

export default class Evaluation extends EvaluationSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => Interview)
  declare interview: BelongsTo<typeof Interview>

  @belongsTo(() => User, { foreignKey: 'evaluatorId' })
  declare evaluator: BelongsTo<typeof User>
}
