import { InterviewSchema } from '#database/schema'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Application from '#models/application'
import User from '#models/user'
import Evaluation from '#models/evaluation'

export default class Interview extends InterviewSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => Evaluation)
  declare evaluations: HasMany<typeof Evaluation>

  @hasOne(() => Evaluation)
  declare evaluation: HasOne<typeof Evaluation>
}
