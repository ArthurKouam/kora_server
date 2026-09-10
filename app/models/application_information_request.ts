import { ApplicationInformationRequestSchema } from '#database/schema'
import Application from '#models/application'
import Organization from '#models/organization'
import User from '#models/user'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ApplicationInformationRequest extends ApplicationInformationRequestSchema {
  static selfAssignPrimaryKey = false

  @column({ serializeAs: null })
  declare tokenHash: string

  @column({ serializeAs: null })
  declare deliveryError: string | null

  @column({ serializeAs: null })
  declare responseDeliveryError: string | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => User, { foreignKey: 'requestedBy' })
  declare requester: BelongsTo<typeof User>
}
