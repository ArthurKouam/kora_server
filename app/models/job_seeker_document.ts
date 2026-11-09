import { JobSeekerDocumentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import JobSeeker from '#models/job_seeker'

export default class JobSeekerDocument extends JobSeekerDocumentSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => JobSeeker)
  declare jobSeeker: BelongsTo<typeof JobSeeker>
}
