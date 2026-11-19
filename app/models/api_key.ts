import { ApiKeySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'

/**
 * Clé d'accès à l'API externe, rattachée à une organisation.
 *
 * Le token en clair n'existe qu'au moment de la création : cette table ne
 * conserve que son empreinte SHA-256 et un préfixe lisible pour l'interface.
 * Une clé révoquée reste en base pour garder la trace de qui l'a créée.
 */
export default class ApiKey extends ApiKeySchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>
}
