import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import Organization from '#models/organization'
import TeamInvitation from '#models/team_invitation'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => TeamInvitation, { foreignKey: 'invitedBy' })
  declare sentTeamInvitations: HasMany<typeof TeamInvitation>

  get initials() {
    const [first, last] =
      this.firstName && this.lastName ? [this.firstName, this.lastName] : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
