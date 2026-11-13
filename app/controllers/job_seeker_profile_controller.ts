import JobSeeker from '#models/job_seeker'
import JobSeekerExperience from '#models/job_seeker_experience'
import JobSeekerEducation from '#models/job_seeker_education'
import JobSeekerSkill from '#models/job_seeker_skill'
import JobSeekerDocument from '#models/job_seeker_document'
import Skill from '#models/skill'
import FileStorage from '#services/file_storage'
import JobSeekerTransformer from '#transformers/job_seeker_transformer'
import {
  jobSeekerEducationValidator,
  jobSeekerExperienceValidator,
  jobSeekerSkillsValidator,
  jobSeekerUpdatePasswordValidator,
  jobSeekerUpdateProfileValidator,
} from '#validators/job_seeker'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const GUARD = 'job_seeker_web' as const

function toDate(value: string | null | undefined): DateTime | null {
  if (!value) return null
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : null
}

export default class JobSeekerProfileController {
  private async loadFullProfile(jobSeeker: JobSeeker) {
    await jobSeeker.load('profile')
    await jobSeeker.load('experiences', (query) => query.orderBy('start_date', 'desc'))
    await jobSeeker.load('educations', (query) => query.orderBy('start_date', 'desc'))
    await jobSeeker.load('skills', (query) => query.preload('skill'))
    return jobSeeker
  }

  /** GET /job-seeker/profile — profil maître complet. */
  async show({ auth, serialize }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    await this.loadFullProfile(jobSeeker)

    return serialize({
      user: JobSeekerTransformer.transform(jobSeeker),
      experiences: jobSeeker.experiences.map((experience) => experience.serialize()),
      educations: jobSeeker.educations.map((education) => education.serialize()),
      skills: jobSeeker.skills.map((skill) => ({
        id: skill.id,
        skillId: skill.skillId,
        name: skill.skill?.name ?? null,
        category: skill.skill?.category ?? null,
        level: skill.level,
        yearsOfExperience: skill.yearsOfExperience,
      })),
    })
  }

  /** PUT /job-seeker/profile */
  async update({ auth, request, serialize }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerUpdateProfileValidator)

    const profile = await jobSeeker.related('profile').query().firstOrFail()
    profile.merge({
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone ?? null,
      headline: payload.headline ?? null,
      location: payload.location ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      dateOfBirth: toDate(payload.dateOfBirth),
      bio: payload.bio ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      linkedinUrl: payload.linkedinUrl ?? null,
      githubUrl: payload.githubUrl ?? null,
      portfolioUrl: payload.portfolioUrl ?? null,
      websiteUrl: payload.websiteUrl ?? null,
    })
    await profile.save()

    await jobSeeker.load('profile')
    return serialize({ user: JobSeekerTransformer.transform(jobSeeker) })
  }

  /** PUT /job-seeker/password */
  async updatePassword({ auth, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(
      jobSeekerUpdatePasswordValidator
    )

    const valid = await jobSeeker.verifyPassword(currentPassword)
    if (!valid) {
      return response.unprocessableEntity({
        errors: { currentPassword: 'Mot de passe actuel incorrect.' },
      })
    }

    jobSeeker.password = password
    await jobSeeker.save()

    return response.ok({ message: 'Mot de passe mis à jour.' })
  }

  /**
   * DELETE /job-seeker/account
   * Supprime le compte et ses données personnelles. Les dossiers ATS déjà
   * transmis aux organisations restent leur propriété (snapshot figé) ; le lien
   * vers le compte est simplement mis à NULL.
   */
  async destroy({ auth, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const documents = await JobSeekerDocument.query().where('job_seeker_id', jobSeeker.id)

    for (const document of documents) {
      await FileStorage.delete(document.filePath).catch(() => {})
    }

    await auth.use(GUARD).logout()
    await jobSeeker.delete()

    return response.noContent()
  }

  // ── Expériences ──────────────────────────────────────────────────────

  /** POST /job-seeker/experiences */
  async storeExperience({ auth, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerExperienceValidator)

    const experience = await JobSeekerExperience.create({
      jobSeekerId: jobSeeker.id,
      company: payload.company,
      position: payload.position,
      location: payload.location ?? null,
      description: payload.description ?? null,
      startDate: toDate(payload.startDate),
      endDate: toDate(payload.endDate),
      isCurrent: payload.isCurrent ?? false,
    })

    return response.created(experience.serialize())
  }

  /** PUT /job-seeker/experiences/:id */
  async updateExperience({ auth, params, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerExperienceValidator)

    const experience = await JobSeekerExperience.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!experience) return response.notFound({ error: 'Experience not found' })

    experience.merge({
      company: payload.company,
      position: payload.position,
      location: payload.location ?? null,
      description: payload.description ?? null,
      startDate: toDate(payload.startDate),
      endDate: toDate(payload.endDate),
      isCurrent: payload.isCurrent ?? false,
    })
    await experience.save()

    return response.ok(experience.serialize())
  }

  /** DELETE /job-seeker/experiences/:id */
  async destroyExperience({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const experience = await JobSeekerExperience.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!experience) return response.notFound({ error: 'Experience not found' })

    await experience.delete()
    return response.noContent()
  }

  // ── Formations ───────────────────────────────────────────────────────

  /** POST /job-seeker/educations */
  async storeEducation({ auth, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerEducationValidator)

    const education = await JobSeekerEducation.create({
      jobSeekerId: jobSeeker.id,
      institution: payload.institution,
      degree: payload.degree,
      fieldOfStudy: payload.fieldOfStudy ?? null,
      location: payload.location ?? null,
      description: payload.description ?? null,
      startDate: toDate(payload.startDate),
      endDate: toDate(payload.endDate),
    })

    return response.created(education.serialize())
  }

  /** PUT /job-seeker/educations/:id */
  async updateEducation({ auth, params, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerEducationValidator)

    const education = await JobSeekerEducation.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!education) return response.notFound({ error: 'Education not found' })

    education.merge({
      institution: payload.institution,
      degree: payload.degree,
      fieldOfStudy: payload.fieldOfStudy ?? null,
      location: payload.location ?? null,
      description: payload.description ?? null,
      startDate: toDate(payload.startDate),
      endDate: toDate(payload.endDate),
    })
    await education.save()

    return response.ok(education.serialize())
  }

  /** DELETE /job-seeker/educations/:id */
  async destroyEducation({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const education = await JobSeekerEducation.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!education) return response.notFound({ error: 'Education not found' })

    await education.delete()
    return response.noContent()
  }

  // ── Compétences ──────────────────────────────────────────────────────

  /** GET /job-seeker/skills/catalog — référentiel global. */
  async skillsCatalog({ response }: HttpContext) {
    const skills = await Skill.query().orderBy('name', 'asc')
    return response.ok({ data: skills.map((skill) => skill.serialize()) })
  }

  /** PUT /job-seeker/skills — remplace la liste complète. */
  async setSkills({ auth, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const payload = await request.validateUsing(jobSeekerSkillsValidator)

    const ids = [...new Set(payload.skills.map((skill) => skill.skillId))]
    const found = ids.length
      ? await Skill.query().whereIn('id', ids).select('id')
      : []
    const known = new Set(found.map((skill) => skill.id))
    const unknown = ids.filter((id) => !known.has(id))
    if (unknown.length > 0) {
      return response.unprocessableEntity({
        errors: { skills: 'Une ou plusieurs compétences sont inconnues.' },
      })
    }

    await JobSeekerSkill.query().where('job_seeker_id', jobSeeker.id).delete()

    if (payload.skills.length > 0) {
      await JobSeekerSkill.createMany(
        payload.skills.map((skill) => ({
          jobSeekerId: jobSeeker.id,
          skillId: skill.skillId,
          level: skill.level ?? null,
          yearsOfExperience: skill.yearsOfExperience ?? null,
        }))
      )
    }

    const skills = await JobSeekerSkill.query()
      .where('job_seeker_id', jobSeeker.id)
      .preload('skill')

    return response.ok({
      data: skills.map((skill) => ({
        id: skill.id,
        skillId: skill.skillId,
        name: skill.skill?.name ?? null,
        category: skill.skill?.category ?? null,
        level: skill.level,
        yearsOfExperience: skill.yearsOfExperience,
      })),
    })
  }
}
