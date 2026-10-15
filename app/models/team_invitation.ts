import { TeamInvitationSchema } from '#database/schema'
import Organization from '#models/organization'
import User from '#models/user'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class TeamInvitation extends TeamInvitationSchema {
  static selfAssignPrimaryKey = false

  @column({ serializeAs: null })
  declare tokenHash: string

  @column({ serializeAs: null })
  declare deliveryError: string | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'invitedBy' })
  declare inviter: BelongsTo<typeof User>
}
