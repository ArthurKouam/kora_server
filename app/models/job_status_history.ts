import { JobStatusHistorySchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { belongsTo } from '@adonisjs/lucid/orm'
import User from '#models/user'
import Job from '#models/job'

export default class JobStatusHistory extends JobStatusHistorySchema {
  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => User, { foreignKey: 'changedByUserId' })
  declare changedByUser: BelongsTo<typeof User>
}
