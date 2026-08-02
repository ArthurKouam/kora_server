import { CandidateSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import CandidateDocument from '#models/candidate_document'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateSkill from '#models/candidate_skill'
import Application from '#models/application'
import CandidateSession from '#models/candidate_session'
import CandidateVerificationToken from '#models/candidate_verification_token'

export default class Candidate extends CandidateSchema {
  static selfAssignPrimaryKey = false

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
  declare sessions: HasMany<typeof CandidateSession>

  @hasMany(() => CandidateVerificationToken)
  declare verificationTokens: HasMany<typeof CandidateVerificationToken>
}
