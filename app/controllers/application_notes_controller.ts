import Application from '#models/application'
import ApplicationNote from '#models/application_note'
import {
  createApplicationNoteValidator,
  updateApplicationNoteValidator,
} from '#validators/application_note'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Notes internes d'équipe sur une candidature. Visibles uniquement du staff
 * de l'organisation.
 */
export default class ApplicationNotesController {
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
   * GET /applications/:id/notes
   */
  async index({ auth, params, response }: HttpContext) {
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const notes = await ApplicationNote.query()
      .where('application_id', application.id)
      .preload('author')
      .orderBy('created_at', 'desc')

    return response.ok(notes)
  }

  /**
   * POST /applications/:id/notes
   */
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const payload = await request.validateUsing(createApplicationNoteValidator)

    const note = await ApplicationNote.create({
      applicationId: application.id,
      authorId: user.id,
      content: payload.content,
    })
    await note.load('author')

    return response.created(note)
  }

  /**
   * PUT /applications/:id/notes/:noteId
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const note = await ApplicationNote.query()
      .where('id', String(params.noteId))
      .where('application_id', application.id)
      .first()
    if (!note) return response.notFound({ error: 'Note not found' })
    if (note.authorId !== user.id) {
      return response.forbidden({ error: 'Only the author can edit this note' })
    }

    const payload = await request.validateUsing(updateApplicationNoteValidator)
    note.content = payload.content
    await note.save()
    await note.load('author')

    return response.ok(note)
  }

  /**
   * DELETE /applications/:id/notes/:noteId
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const note = await ApplicationNote.query()
      .where('id', String(params.noteId))
      .where('application_id', application.id)
      .first()
    if (!note) return response.notFound({ error: 'Note not found' })
    if (note.authorId !== user.id) {
      return response.forbidden({ error: 'Only the author can delete this note' })
    }

    await note.delete()
    return response.ok({ deleted: true })
  }
}
