import { JobSeekerSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import JobSeekerProfile from '#models/job_seeker_profile'
import JobSeekerDocument from '#models/job_seeker_document'
import JobSeekerExperience from '#models/job_seeker_experience'
import JobSeekerEducation from '#models/job_seeker_education'
import JobSeekerSkill from '#models/job_seeker_skill'
import JobSeekerVerificationToken from '#models/job_seeker_verification_token'
import JobSeekerPasswordResetToken from '#models/job_seeker_password_reset_token'
import Candidate from '#models/candidate'

/**
 * Compte du candidat (Job Seeker). L'authentification vit ici, les données
 * personnelles dans `job_seeker_profiles`. Les dossiers ATS (`candidates`)
 * restent séparés : ils appartiennent aux organisations.
 */
export default class JobSeeker extends compose(JobSeekerSchema, withAuthFinder(hash)) {
  static selfAssignPrimaryKey = false

  @hasOne(() => JobSeekerProfile)
  declare profile: HasOne<typeof JobSeekerProfile>

  @hasMany(() => JobSeekerDocument)
  declare documents: HasMany<typeof JobSeekerDocument>

  @hasMany(() => JobSeekerExperience)
  declare experiences: HasMany<typeof JobSeekerExperience>

  @hasMany(() => JobSeekerEducation)
  declare educations: HasMany<typeof JobSeekerEducation>

  @hasMany(() => JobSeekerSkill)
  declare skills: HasMany<typeof JobSeekerSkill>

  @hasMany(() => Candidate)
  declare candidates: HasMany<typeof Candidate>

  @hasMany(() => JobSeekerVerificationToken)
  declare verificationTokens: HasMany<typeof JobSeekerVerificationToken>

  @hasMany(() => JobSeekerPasswordResetToken)
  declare passwordResetTokens: HasMany<typeof JobSeekerPasswordResetToken>

  get fullName(): string {
    const profile = this.profile
    if (!profile) return this.email
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || this.email
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }
}
