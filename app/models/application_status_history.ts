import { ApplicationStatusHistorySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Application from '#models/application'
import User from '#models/user'
import Candidate from '#models/candidate'

export default class ApplicationStatusHistory extends ApplicationStatusHistorySchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => User, { foreignKey: 'changedByUserId' })
  declare changedByUser: BelongsTo<typeof User>

  @belongsTo(() => Candidate, { foreignKey: 'changedByCandidateId' })
  declare changedByCandidate: BelongsTo<typeof Candidate>
}
