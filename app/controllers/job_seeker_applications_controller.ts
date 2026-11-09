import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import { streamCandidateDocument } from '#services/document_download'
import type { HttpContext } from '@adonisjs/core/http'

const GUARD = 'job_seeker_web' as const

export default class JobSeekerApplicationsController {
  private scopedApplications(jobSeekerId: string, email: string) {
    return Application.query().whereHas('candidate', (candidateQuery) => {
      candidateQuery.where((subQuery) => {
        subQuery
          .where('job_seeker_id', jobSeekerId)
          .orWhereRaw('lower(email) = ?', [email.toLowerCase()])
      })
    })
  }

  private serializeApplication(application: Application) {
    const job = application.job
    const organization = job?.organization

    return {
      id: application.id,
      status: application.status,
      source: application.source,
      coverLetter: application.coverLetter,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      rejectedAt: application.rejectedAt,
      hiredAt: application.hiredAt,
      job: job
        ? {
            id: job.id,
            title: job.title,
            slug: job.slug,
            employmentType: job.employmentType,
            workplaceType: job.workplaceType,
            location: job.location,
            city: job.city,
            country: job.country,
          }
        : null,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logoUrl: organization.logoUrl,
          }
        : null,
    }
  }

  /** GET /job-seeker/applications */
  async index({ auth, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const applications = await this.scopedApplications(jobSeeker.id, jobSeeker.email)
      .preload('job', (jobQuery) => jobQuery.preload('organization'))
      .orderBy('applied_at', 'desc')

    return response.ok({ data: applications.map((application) => this.serializeApplication(application)) })
  }

  /** GET /job-seeker/applications/:id */
  async show({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const application = await this.scopedApplications(jobSeeker.id, jobSeeker.email)
      .where('id', params.id)
      .preload('job', (jobQuery) => jobQuery.preload('organization'))
      .preload('cvDocument')
      .first()

    if (!application) return response.notFound({ error: 'Application not found' })

    return response.ok({
      application: {
        ...this.serializeApplication(application),
        answers: application.answers,
        cvDocument: application.cvDocument
          ? {
              id: application.cvDocument.id,
              name: application.cvDocument.name,
              mimeType: application.cvDocument.mimeType,
              fileSize: application.cvDocument.fileSize,
            }
          : null,
      },
    })
  }

  /**
   * GET /job-seeker/applications/:id/cv
   * Le CV envoyé est un snapshot `candidate_documents` : il reste consultable
   * même si le candidat a supprimé le document de son propre espace.
   */
  async downloadCv({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const application = await this.scopedApplications(jobSeeker.id, jobSeeker.email)
      .where('id', params.id)
      .preload('cvDocument')
      .first()

    if (!application || !application.cvDocument) {
      return response.notFound({ error: 'CV not found' })
    }

    return streamCandidateDocument(response, application.cvDocument)
  }

  /** POST /job-seeker/applications/:id/withdraw */
  async withdraw({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const application = await this.scopedApplications(jobSeeker.id, jobSeeker.email)
      .where('id', params.id)
      .first()

    if (!application) return response.notFound({ error: 'Application not found' })

    if (['hired', 'withdrawn', 'rejected'].includes(application.status)) {
      return response.unprocessableEntity({
        error: 'Cette candidature ne peut plus être retirée.',
      })
    }

    const candidate = await application.related('candidate').query().first()
    const previousStatus = application.status

    application.status = 'withdrawn'
    await application.save()

    await ApplicationStatusHistory.create({
      applicationId: application.id,
      fromStatus: previousStatus,
      toStatus: 'withdrawn',
      changedByType: 'candidate',
      changedByCandidateId: candidate?.id ?? null,
      reason: 'Retrait par le candidat depuis son espace.',
    })

    return response.ok({ id: application.id, status: application.status })
  }
}
