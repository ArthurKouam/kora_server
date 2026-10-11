import { PaymentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Plan from '#models/plan'

export default class Payment extends PaymentSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  isCompleted(): boolean {
    return this.status === 'complete'
  }
}
