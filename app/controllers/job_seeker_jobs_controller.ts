import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import CandidateEducation from '#models/candidate_education'
import CandidateExperience from '#models/candidate_experience'
import CandidateSkill from '#models/candidate_skill'
import Job from '#models/job'
import JobSeekerDocument from '#models/job_seeker_document'
import FileStorage, { UnsupportedFileTypeError } from '#services/file_storage'
import { validateAnswers } from '#services/form_answers_validator'
import {
  jobSeekerApplyValidator,
  jobSeekerJobIndexValidator,
} from '#validators/job_seeker'
import type { HttpContext } from '@adonisjs/core/http'
import type { FieldDefinition } from '#types/forms'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const GUARD = 'job_seeker_web' as const

type CandidateWithProfile = Candidate & {
  organization?: unknown
}

function jobSummary(job: Job) {
  return {
    id: job.id,
    title: job.title,
    slug: job.slug,
    employmentType: job.employmentType,
    workplaceType: job.workplaceType,
    experienceLevel: job.experienceLevel,
    location: job.location,
    city: job.city,
    country: job.country,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    publishedAt: job.publishedAt,
    closingDate: job.closingDate,
    organization: job.organization
      ? {
          id: job.organization.id,
          name: job.organization.name,
          slug: job.organization.slug,
          logoUrl: job.organization.logoUrl,
        }
      : null,
  }
}

export default class JobSeekerJobsController {
  private isMultipart(request: HttpContext['request']): boolean {
    return (request.header('content-type') ?? '').includes('multipart/form-data')
  }

  /** GET /job-seeker/jobs — toutes les offres publiées, toutes organisations. */
  async index({ request, response }: HttpContext) {
    const {
      page = 1,
      limit = 20,
      search,
      employmentType,
      workplaceType,
      city,
      country,
    } = await request.validateUsing(jobSeekerJobIndexValidator)

    const query = Job.query()
      .where('status', 'published')
      .preload('organization', (organizationQuery) =>
        organizationQuery.select('id', 'name', 'slug', 'logo_url')
      )
      .orderBy('published_at', 'desc')

    if (search) {
      query.where((builder) => {
        builder.whereILike('title', `%${search}%`).orWhereILike('description', `%${search}%`)
      })
    }
    if (employmentType) {
      const types = (Array.isArray(employmentType) ? employmentType : [employmentType])
        .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
        .map((value) => value.trim())
        .filter(Boolean)
      if (types.length) query.whereIn('employment_type', types)
    }
    if (workplaceType) {
      const types = (Array.isArray(workplaceType) ? workplaceType : [workplaceType])
        .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
        .map((value) => value.trim())
        .filter(Boolean)
      if (types.length) query.whereIn('workplace_type', types)
    }
    if (city) query.whereILike('city', `%${city}%`)
    if (country) query.whereILike('country', `%${country}%`)

    const jobs = await query.paginate(page, limit)

    return response.ok({
      data: jobs.all().map((job) => jobSummary(job)),
      meta: jobs.getMeta(),
    })
  }

  /** GET /job-seeker/jobs/:jobId */
  async show({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const job = await Job.query()
      .where('id', params.jobId)
      .where('status', 'published')
      .preload('organization')
      .first()
    if (!job) return response.notFound({ error: 'Job not found' })

    let form: { id: string; definition: unknown } | null = null
    if (job.activeFormVersionId) {
      const version = await job.related('activeFormVersion').query().first()
      if (version && version.publishedAt !== null) {
        form = { id: version.id, definition: version.definition }
      }
    }

    const candidate = await Candidate.query()
      .where('organization_id', job.organizationId)
      .whereRaw('lower(email) = ?', [jobSeeker.email.toLowerCase()])
      .first()

    const alreadyApplied = candidate
      ? Boolean(
          await Application.query()
            .where('job_id', job.id)
            .where('candidate_id', candidate.id)
            .first()
        )
      : false

    return response.ok({
      job: {
        ...jobSummary(job),
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        organization: job.organization
          ? {
              ...jobSummary(job).organization,
              about: job.organization.about,
              website: job.organization.website,
            }
          : null,
      },
      form,
      alreadyApplied,
    })
  }

  /**
   * POST /job-seeker/jobs/:jobId/apply
   * Candidature authentifiée : l'email est déjà vérifié, pas d'OTP. Le dossier
   * `candidates` est créé/réutilisé dans l'organisation de l'offre, puis un
   * snapshot du profil et du CV est figé pour cette candidature.
   */
  async apply({ auth, params, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    if (jobSeeker.emailVerifiedAt === null) {
      return response.forbidden({
        error: 'Confirmez votre adresse email avant de postuler.',
        code: 'email_not_verified',
      })
    }

    const multipart = this.isMultipart(request)
    const rawData: Record<string, unknown> = { ...request.body() }
    if (multipart) {
      try {
        if (typeof rawData.answers === 'string') {
          rawData.answers = rawData.answers ? JSON.parse(rawData.answers) : {}
        }
      } catch {
        return response.unprocessableEntity({ error: 'Invalid payload encoding' })
      }
    }

    const payload = await request.validateUsing(jobSeekerApplyValidator, { data: rawData })

    const job = await Job.query()
      .where('id', params.jobId)
      .where('status', 'published')
      .first()
    if (!job) return response.notFound({ error: 'Job not found' })

    let formVersion = null
    if (job.activeFormVersionId) {
      formVersion = await job.related('activeFormVersion').query().first()
      if (!formVersion || formVersion.publishedAt === null) {
        return response.unprocessableEntity({ error: 'Form is not available' })
      }
    }

    const definition = (formVersion?.definition ?? { fields: [] }) as {
      fields: FieldDefinition[]
    }
    const answers = (payload.answers ?? {}) as Record<string, unknown>

    await jobSeeker.load('profile')
    const profile = jobSeeker.profile

    // ── Dossier candidat dans l'organisation de l'offre ──
    let candidate: CandidateWithProfile | null = await Candidate.query()
      .where('organization_id', job.organizationId)
      .whereRaw('lower(email) = ?', [jobSeeker.email.toLowerCase()])
      .first()

    if (!candidate) {
      candidate = await Candidate.create({
        organizationId: job.organizationId,
        jobSeekerId: jobSeeker.id,
        email: jobSeeker.email.toLowerCase(),
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        phone: profile?.phone ?? null,
        city: profile?.city ?? null,
        country: profile?.country ?? null,
        location: profile?.location ?? null,
        dateOfBirth: profile?.dateOfBirth ?? null,
        bio: profile?.bio ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        linkedinUrl: profile?.linkedinUrl ?? null,
        githubUrl: profile?.githubUrl ?? null,
        portfolioUrl: profile?.portfolioUrl ?? null,
        websiteUrl: profile?.websiteUrl ?? null,
        source: 'portal',
        profileSnapshot: profile ? (profile.serialize() as never) : null,
      })
    } else {
      // Le dossier préexiste (candidature carrière ou autre offre) : on le
      // rattache au compte et on rafraîchit les champs de contact.
      candidate.jobSeekerId = candidate.jobSeekerId ?? jobSeeker.id
      candidate.firstName = candidate.firstName ?? profile?.firstName ?? null
      candidate.lastName = candidate.lastName ?? profile?.lastName ?? null
      candidate.phone = profile?.phone ?? candidate.phone ?? null
      candidate.city = profile?.city ?? candidate.city ?? null
      candidate.country = profile?.country ?? candidate.country ?? null
      candidate.location = profile?.location ?? candidate.location ?? null
      candidate.dateOfBirth = profile?.dateOfBirth ?? candidate.dateOfBirth ?? null
      candidate.bio = profile?.bio ?? candidate.bio ?? null
      candidate.avatarUrl = profile?.avatarUrl ?? candidate.avatarUrl ?? null
      candidate.linkedinUrl = profile?.linkedinUrl ?? candidate.linkedinUrl ?? null
      candidate.githubUrl = profile?.githubUrl ?? candidate.githubUrl ?? null
      candidate.portfolioUrl = profile?.portfolioUrl ?? candidate.portfolioUrl ?? null
      candidate.websiteUrl = profile?.websiteUrl ?? candidate.websiteUrl ?? null
      candidate.profileSnapshot = profile ? (profile.serialize() as never) : null
      await candidate.save()
    }

    const existing = await Application.query()
      .where('job_id', job.id)
      .where('candidate_id', candidate.id)
      .first()
    if (existing) {
      return response.conflict({ error: 'Vous avez déjà postulé à cette offre.' })
    }

    // ── CV choisi parmi les documents du compte ──
    let chosenDocument: JobSeekerDocument | null = null
    if (payload.documentId) {
      chosenDocument = await JobSeekerDocument.query()
        .where('id', payload.documentId)
        .where('job_seeker_id', jobSeeker.id)
        .first()
      if (!chosenDocument) {
        return response.unprocessableEntity({ errors: { documentId: 'Document introuvable.' } })
      }
    } else {
      chosenDocument = await JobSeekerDocument.query()
        .where('job_seeker_id', jobSeeker.id)
        .where('type', 'cv')
        .where('is_default', true)
        .first()
    }

    // ── Fichiers dynamiques du formulaire ──
    const uploadedDocumentIds: string[] = []
    if (multipart) {
      for (const field of definition.fields) {
        if (field.type !== 'file') continue
        const file = request.file(`file_${field.id}`, {
          size: '10mb',
          extnames: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'jpg', 'jpeg', 'png', 'webp'],
        })
        if (!file) continue
        if (!file.isValid) {
          await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
          return response.unprocessableEntity({
            errors: { [field.id]: 'Fichier invalide ou trop volumineux.' },
          })
        }
        try {
          const stored = await FileStorage.store(file, 'application-documents', {
            allowedMimeTypes: field.config?.accept,
          })
          const document = await CandidateDocument.create({
            candidateId: candidate.id,
            type: 'other',
            name: stored.name,
            filePath: stored.key,
            mimeType: stored.mimeType,
            fileSize: stored.size,
          })
          answers[field.id] = { documentId: document.id }
          uploadedDocumentIds.push(document.id)
        } catch (error) {
          if (!(error instanceof UnsupportedFileTypeError)) throw error
          await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
          return response.unprocessableEntity({
            errors: {
              [field.id]: 'Le contenu du fichier ne correspond pas à un format autorisé.',
            },
          })
        }
      }
    }

    const result = validateAnswers(definition, answers)
    if (!result.valid) {
      await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
      return response.unprocessableEntity({ errors: result.errors })
    }

    // Vérification des fichiers référencés (appartenance + non-utilisés)
    for (const field of definition.fields) {
      if (field.type !== 'file') continue
      const answer = answers[field.id] as { documentId?: string } | undefined
      if (!answer?.documentId) continue
      const document = await CandidateDocument.find(answer.documentId)
      if (
        !document ||
        document.candidateId !== candidate.id ||
        document.applicationId !== null
      ) {
        await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
        return response.unprocessableEntity({ errors: { [field.id]: 'Fichier invalide.' } })
      }
    }

    // ── Snapshot + candidature (transaction) ──
    const candidateId = candidate.id
    let snapshotCvKey: string | null = null

    try {
      const application = await Application.transaction(async (trx) => {
        const created = await Application.create(
          {
            jobId: job.id,
            candidateId,
            status: 'new',
            source: 'portal',
            coverLetter: payload.coverLetter ?? null,
            appliedAt: DateTime.now(),
            formVersionId: formVersion?.id ?? null,
            answers: answers as never,
          },
          { client: trx }
        )

        // Snapshot du profil maître : le recruteur voit exactement ce qui a
        // été envoyé, même si le candidat modifie son profil ensuite.
        await CandidateExperience.query({ client: trx })
          .where('candidate_id', candidateId)
          .delete()
        await CandidateEducation.query({ client: trx })
          .where('candidate_id', candidateId)
          .delete()
        await CandidateSkill.query({ client: trx }).where('candidate_id', candidateId).delete()

        const experiences = await jobSeeker.related('experiences').query()
        for (const experience of experiences) {
          await CandidateExperience.create(
            {
              candidateId,
              applicationId: created.id,
              company: experience.company,
              position: experience.position,
              location: experience.location,
              description: experience.description,
              startDate: experience.startDate,
              endDate: experience.endDate,
              isCurrent: experience.isCurrent,
            },
            { client: trx }
          )
        }

        const educations = await jobSeeker.related('educations').query()
        for (const education of educations) {
          await CandidateEducation.create(
            {
              candidateId,
              applicationId: created.id,
              institution: education.institution,
              degree: education.degree,
              fieldOfStudy: education.fieldOfStudy,
              location: education.location,
              description: education.description,
              startDate: education.startDate,
              endDate: education.endDate,
            },
            { client: trx }
          )
        }

        const skills = await jobSeeker.related('skills').query()
        for (const skill of skills) {
          await CandidateSkill.create(
            {
              candidateId,
              skillId: skill.skillId,
              level: skill.level,
              yearsOfExperience: skill.yearsOfExperience,
            },
            { client: trx }
          )
        }

        // Le CV est physiquement copié : supprimer le document du compte ne
        // doit jamais faire disparaître la pièce reçue par l'entreprise.
        if (chosenDocument) {
          snapshotCvKey = `cvs/${randomUUID()}-${chosenDocument.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(-80)}`
          await drive.use().copy(chosenDocument.filePath, snapshotCvKey)
          const cvDocument = await CandidateDocument.create(
            {
              candidateId,
              applicationId: created.id,
              type: 'cv',
              name: chosenDocument.name,
              filePath: snapshotCvKey,
              mimeType: chosenDocument.mimeType,
              fileSize: chosenDocument.fileSize,
            },
            { client: trx }
          )
          created.cvDocumentId = cvDocument.id
          await created.save()
        }

        if (uploadedDocumentIds.length > 0) {
          await CandidateDocument.query({ client: trx })
            .whereIn('id', uploadedDocumentIds)
            .update({ application_id: created.id })
        }

        return created
      })

      return response.created({
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        cvDocumentId: application.cvDocumentId,
      })
    } catch (error) {
      // Nettoyage best-effort : la transaction a annulé les lignes, pas les
      // fichiers déjà écrits sur le disque.
      await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
      if (snapshotCvKey) await FileStorage.delete(snapshotCvKey).catch(() => {})
      throw error
    }
  }

  private async deleteDocument(id: string): Promise<void> {
    const document = await CandidateDocument.find(id)
    if (!document) return
    await FileStorage.delete(document.filePath).catch(() => {})
    await document.delete()
  }
}
