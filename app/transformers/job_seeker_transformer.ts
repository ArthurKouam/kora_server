import type JobSeeker from '#models/job_seeker'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Contrat public du compte candidat. Ne contient jamais le mot de passe.
 *
 * Les colonnes nullables sont normalisées en `null` : après un `create`, les
 * champs non renseignés valent `undefined` en mémoire, et `undefined` disparaît
 * de la réponse JSON. Le client reçoit donc toujours la même forme.
 */
export default class JobSeekerTransformer extends BaseTransformer<JobSeeker> {
  toObject() {
    const profile = this.resource.profile

    return {
      id: this.resource.id,
      email: this.resource.email,
      emailVerifiedAt: this.resource.emailVerifiedAt ?? null,
      status: this.resource.status,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt ?? null,
      profile: profile
        ? {
            id: profile.id,
            firstName: profile.firstName ?? null,
            lastName: profile.lastName ?? null,
            phone: profile.phone ?? null,
            headline: profile.headline ?? null,
            location: profile.location ?? null,
            city: profile.city ?? null,
            country: profile.country ?? null,
            dateOfBirth: profile.dateOfBirth ?? null,
            bio: profile.bio ?? null,
            avatarUrl: profile.avatarUrl ?? null,
            linkedinUrl: profile.linkedinUrl ?? null,
            githubUrl: profile.githubUrl ?? null,
            portfolioUrl: profile.portfolioUrl ?? null,
            websiteUrl: profile.websiteUrl ?? null,
          }
        : null,
    }
  }
}
