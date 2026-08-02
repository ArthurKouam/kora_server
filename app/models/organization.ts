import { OrganizationSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Job from '#models/job'
import Tag from '#models/tag'
import EmailTemplate from '#models/email_template'

export default class Organization extends OrganizationSchema {
  static selfAssignPrimaryKey = false

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Job)
  declare jobs: HasMany<typeof Job>

  @hasMany(() => Tag)
  declare tags: HasMany<typeof Tag>

  @hasMany(() => EmailTemplate)
  declare emailTemplates: HasMany<typeof EmailTemplate>
}
