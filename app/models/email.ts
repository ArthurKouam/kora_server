import { EmailSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import Application from '#models/application'
import Candidate from '#models/candidate'
import EmailTemplate from '#models/email_template'

export default class Email extends EmailSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Application)
  declare application: BelongsTo<typeof Application>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>

  @belongsTo(() => EmailTemplate)
  declare template: BelongsTo<typeof EmailTemplate>
}
