import { CandidateSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import JobSeeker from '#models/job_seeker'
import CandidateDocument from '#models/candidate_document'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateSkill from '#models/candidate_skill'
import Application from '#models/application'
import CandidateSession from '#models/candidate_session'
import CandidateVerificationToken from '#models/candidate_verification_token'
import TalentPoolEntry from '#models/talent_pool_entry'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

export default class Candidate extends CandidateSchema {
  static selfAssignPrimaryKey = false

  static candidateSessions = DbAccessTokensProvider.forModel(Candidate, {
    table: 'candidate_access_tokens',
  })

  /**
   * Dossier ATS : il appartient toujours à une organisation. Le même candidat
   * peut avoir un dossier distinct dans chaque entreprise.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * Compte Job Seeker à l'origine du dossier, s'il existe. NULL pour une
   * candidature déposée sans compte depuis une page carrière.
   */
  @belongsTo(() => JobSeeker)
  declare jobSeeker: BelongsTo<typeof JobSeeker>

  @hasMany(() => CandidateDocument)
  declare documents: HasMany<typeof CandidateDocument>

  @hasMany(() => CandidateExperience)
  declare experiences: HasMany<typeof CandidateExperience>

  @hasMany(() => CandidateEducation)
  declare educations: HasMany<typeof CandidateEducation>

  @hasMany(() => CandidateSkill)
  declare skills: HasMany<typeof CandidateSkill>

  @hasMany(() => Application)
  declare applications: HasMany<typeof Application>

  @hasMany(() => CandidateSession)
  declare candidateSessions: HasMany<typeof CandidateSession>

  @hasMany(() => CandidateVerificationToken)
  declare candidateVerificationTokens: HasMany<typeof CandidateVerificationToken>

  @hasMany(() => TalentPoolEntry)
  declare talentPoolEntries: HasMany<typeof TalentPoolEntry>
}
