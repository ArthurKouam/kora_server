import Application from '#models/application'
import Interview from '#models/interview'
import InterviewSlotRequest from '#models/interview_slot_request'
import Mailer from '#services/mailer'
import InterviewTokenService from '#services/interview_token_service'
import {
  createInterviewValidator,
  createSlotRequestValidator,
  updateInterviewValidator,
} from '#validators/interview'
import type { HttpContext } from '@adonisjs/core/http'
import InterviewPolicy from '#policies/interview_policy'
import { can } from '#services/authorization'
import { DateTime } from 'luxon'

export default class InterviewsController {
  /**
   * GET /interviews
   * Liste consolidée des entretiens de l'organisation.
   */
  async indexAll({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const interviews = await Interview.query()
      .join('applications', 'applications.id', 'interviews.application_id')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.organization_id', organizationId)
      .preload('application', (applicationsQuery) =>
        applicationsQuery.preload('candidate').preload('job')
      )
      .select('interviews.*')
      .orderBy('interviews.scheduled_at', 'desc')
      .limit(100)

    return response.ok(interviews)
  }

  private async scopedApplication(auth: HttpContext['auth'], applicationId: string) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) return null

    return Application.query()
      .where('id', applicationId)
      .andWhereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
      .first()
  }

  /**
   * GET /applications/:id/interviews
   */
  async indexForApplication({ auth, params, response }: HttpContext) {
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const interviews = await Interview.query()
      .where('application_id', application.id)
      .orderBy('scheduled_at', 'desc')

    return response.ok(interviews)
  }

  /**
   * POST /applications/:id/interviews — planifie un entretien.
   */
  async store({ auth, params, request, response }: HttpContext) {
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const user = auth.use('web').getUserOrFail()
    const payload = await request.validateUsing(createInterviewValidator)

    const interview = await Interview.create({
      applicationId: application.id,
      createdBy: user.id,
      assignedTo: payload.assignedTo ?? null,
      scheduledAt: DateTime.fromISO(payload.scheduledAt),
      duration: payload.duration ?? null,
      type: payload.type ?? null,
      location: payload.location ?? null,
      meetingUrl: payload.meetingUrl ?? null,
      notes: payload.notes ?? null,
      status: 'scheduled',
    })

    // Invitation avec confirmation du candidat (défaut : envoyée)
    let confirmToken: string | null = null
    if (payload.sendInvite !== false) {
      const candidate = await application.related('candidate').query().first()
      const job = await application.related('job').query().first()
      if (candidate && job) {
        confirmToken = InterviewTokenService.encode('invite', interview.id)
        const organization = await job.related('organization').query().first()
        const appBaseUrl = process.env.APP_URL?.replace(/\/$/, '') ?? ''
        await Mailer.sendInterviewInvitation({
          to: candidate.email,
          candidateName:
            `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || candidate.email,
          jobTitle: job.title,
          organizationName: organization?.name ?? 'Korahire',
          organizationId: organization!.id,
          applicationId: application.id,
          scheduledAtIso: interview.scheduledAt!.toISO()!,
          timeZone: organization?.timezone ?? 'Africa/Douala',
          meetingOrLocation: interview.meetingUrl ?? interview.location ?? null,
          appBaseUrl,
          confirmToken,
        })
      }
    }

    return response.created({ ...interview.serialize(), confirmToken })
  }

  /**
   * POST /applications/:id/slot-requests
   * Demande au candidat de choisir N créneaux dans une période donnée.
   */
  async requestSlots({ auth, params, request, response }: HttpContext) {
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const payload = await request.validateUsing(createSlotRequestValidator)

    if (payload.periodStart > payload.periodEnd) {
      return response.unprocessableEntity({
        errors: [{ field: 'periodEnd', message: 'La fin de période doit être après le début.' }],
      })
    }

    const candidate = await application.related('candidate').query().first()
    const job = await application.related('job').query().first()
    if (!candidate || !job) {
      return response.notFound({ error: 'Candidate or job not found' })
    }

    const slotRequest = await InterviewSlotRequest.create({
      applicationId: application.id,
      requestedSlots: payload.requestedSlots,
      periodStart: DateTime.fromISO(`${payload.periodStart}T00:00:00`),
      periodEnd: DateTime.fromISO(`${payload.periodEnd}T23:59:59`),
      status: 'pending',
    })

    const token = InterviewTokenService.encode('slots', slotRequest.id)
    const organization = await job.related('organization').query().first()
    const appBaseUrl = process.env.APP_URL?.replace(/\/$/, '') ?? ''

    await Mailer.sendSlotRequest({
      to: candidate.email,
      candidateName:
        `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || candidate.email,
      jobTitle: job.title,
      organizationName: organization?.name ?? 'Korahire',
      organizationId: organization!.id,
      applicationId: application.id,
      slotsCount: payload.requestedSlots,
      periodStartIso: `${payload.periodStart}T00:00:00`,
      periodEndIso: `${payload.periodEnd}T23:59:59`,
      appBaseUrl,
      token,
    })

    return response.created(slotRequest)
  }

  /**
   * PUT /interviews/:id — statut et notes.
   */
  async update({ auth, bouncer, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) return response.forbidden({ error: 'No organization' })

    const interview = await Interview.query()
      .where('id', String(params.id))
      .andWhereHas('application', (applicationsQuery) =>
        applicationsQuery.whereHas('job', (jobsQuery) =>
          jobsQuery.where('organization_id', organizationId)
        )
      )
      .first()

    if (!interview) return response.notFound({ error: 'Interview not found' })

    const payload = await request.validateUsing(updateInterviewValidator)

    // RBAC global via la matrice, règle ressource via le Bouncer :
    // un interviewer ne peut intervenir que sur ses entretiens assignés,
    // et uniquement pour y déposer son feedback (notes).
    let notesOnly = false
    if (can(user.role, 'interviews.update')) {
      await bouncer.with(InterviewPolicy).authorize('update', interview)
    } else {
      await bouncer.with(InterviewPolicy).authorize('updateFeedback', interview)
      notesOnly = true
    }

    if (payload.notes !== undefined) interview.notes = payload.notes
    if (!notesOnly) interview.status = payload.status
    await interview.save()

    return response.ok(interview)
  }
}
