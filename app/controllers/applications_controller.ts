import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import CandidateDocument from '#models/candidate_document'
import drive from '@adonisjs/drive/services/main'
import Mailer from '#services/mailer'
import { updateApplicationStatusValidator } from '#validators/application'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class ApplicationsController {
  /**
   * GET /applications/:id
   * Détail d'une candidature avec le candidat, le poste et les documents.
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const application = await Application.query()
      .where('id', String(params.id))
      .andWhereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
      .preload('candidate')
      .preload('job', (jobsQuery) =>
        jobsQuery.select('id', 'title', 'slug', 'location', 'city', 'country')
      )
      .preload('cvDocument')
      .preload('statusHistory', (historyQuery) =>
        historyQuery.orderBy('created_at', 'asc').limit(50)
      )
      .firstOrFail()

    // Définition exacte de la version à laquelle le candidat a répondu
    let formDefinition = null
    if (application.formVersionId) {
      const formVersion = await application.related('formVersion').query().first()
      formDefinition = formVersion?.definition ?? null
    }

    return response.ok({
      ...application.serialize(),
      formVersion: application.formVersionId
        ? { id: application.formVersionId, definition: formDefinition }
        : null,
    })
  }

  /**
   * PUT /applications/:id/status
   * Change le statut d'une candidature et enregistre l'historique.
   */
  async updateStatus({ auth, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const application = await Application.query()
      .where('id', String(params.id))
      .andWhereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
      .firstOrFail()

    const payload = await request.validateUsing(updateApplicationStatusValidator)

    if (payload.status === application.status) {
      return response.unprocessableEntity({ error: 'Application is already in this status' })
    }

    const previousStatus = application.status

    application.status = payload.status
    if (payload.status === 'rejected') {
      application.rejectedAt = DateTime.now()
    }
    if (payload.status === 'hired') {
      application.hiredAt = DateTime.now()
    }
    await application.save()

    await ApplicationStatusHistory.create({
      applicationId: application.id,
      fromStatus: previousStatus,
      toStatus: payload.status,
      changedByType: 'user',
      changedByUserId: user.id,
      reason: payload.reason ?? null,
    })

    // Email au candidat pour les décisions importantes
    const candidate = await application.related('candidate').query().first()
    const job = await application.related('job').query().first()

    if (candidate && job) {
      if (payload.status === 'hired') {
        await Mailer.send({
          to: candidate.email,
          subject: `Bonne nouvelle concernant votre candidature — ${job.title}`,
          html: `<p>Bonjour,</p><p>Nous avons le plaisir de vous informer que votre candidature pour <strong>${job.title}</strong> a été retenue. Nous vous contacterons très rapidement pour la suite.</p>`,
          organizationId,
          applicationId: application.id,
          candidateId: candidate.id,
          type: 'offer',
        }).catch(() => false)
      } else if (payload.status === 'rejected') {
        await Mailer.send({
          to: candidate.email,
          subject: `Mise à jour de votre candidature — ${job.title}`,
          html: `<p>Bonjour,</p><p>Après examen de votre dossier, nous sommes au regret de ne pas pouvoir donner une suite favorable à votre candidature pour <strong>${job.title}</strong>. Nous vous remercions de votre intérêt et vous souhaitons pleine réussite dans vos recherches.</p>`,
          organizationId,
          applicationId: application.id,
          candidateId: candidate.id,
          type: 'application_rejected',
        }).catch(() => false)
      }
    }

    return response.ok(application)
  }

  /**
   * GET /applications/:id/documents/:documentId
   * Téléchargement sécurisé d'un document lié à une candidature de l'organisation.
   */
  async downloadDocument({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    // Le document doit appartenir à une candidature d'un job de l'org
    const application = await Application.query()
      .where('id', String(params.id))
      .andWhereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
      .first()

    if (!application) {
      return response.notFound({ error: 'Application not found' })
    }

    const document = await CandidateDocument.query()
      .where('id', String(params.documentId))
      .where((query) =>
        query
          .where('application_id', application.id)
          .orWhere('candidate_id', application.candidateId)
      )
      .first()

    if (!document) {
      return response.notFound({ error: 'Document not found' })
    }

    try {
      const stream = await drive.use().getStream(document.filePath)
      response.header('content-type', document.mimeType ?? 'application/octet-stream')
      return response.stream(stream)
    } catch {
      return response.notFound({ error: 'File missing from storage' })
    }
  }
}
