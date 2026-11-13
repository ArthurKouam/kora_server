import CandidateDocument from '#models/candidate_document'
import JobSeekerDocument from '#models/job_seeker_document'
import FileStorage, { UnsupportedFileTypeError } from '#services/file_storage'
import { streamCandidateDocument } from '#services/document_download'
import type { HttpContext } from '@adonisjs/core/http'

const GUARD = 'job_seeker_web' as const

const DOCUMENT_TYPES = ['cv', 'cover_letter', 'certificate', 'portfolio', 'other'] as const
type DocumentType = (typeof DOCUMENT_TYPES)[number]

function normalizeType(value: unknown): DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType) ? (value as DocumentType) : 'cv'
}

export default class JobSeekerDocumentsController {
  /** GET /job-seeker/documents */
  async index({ auth, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()
    const documents = await JobSeekerDocument.query()
      .where('job_seeker_id', jobSeeker.id)
      .orderBy('created_at', 'desc')

    return response.ok({ data: documents.map((document) => document.serialize()) })
  }

  /** POST /job-seeker/documents — upload multipart (champ `file`). */
  async store({ auth, request, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const file = request.file('file', {
      size: '10mb',
      extnames: ['pdf', 'doc', 'docx', 'odt', 'rtf'],
    })

    if (!file) {
      return response.unprocessableEntity({ errors: { file: 'Aucun fichier reçu.' } })
    }
    if (!file.isValid) {
      return response.unprocessableEntity({
        errors: { file: 'Fichier invalide ou trop volumineux (10 Mo maximum).' },
      })
    }

    let stored
    try {
      stored = await FileStorage.store(file, 'job-seeker-documents')
    } catch (error) {
      if (!(error instanceof UnsupportedFileTypeError)) throw error
      return response.unprocessableEntity({
        errors: { file: 'Le contenu du fichier ne correspond pas à un format autorisé.' },
      })
    }

    const existing = await JobSeekerDocument.query()
      .where('job_seeker_id', jobSeeker.id)
      .count('* as total')
    const isFirst = Number(existing[0]?.$extras?.total ?? 0) === 0

    const type = normalizeType(request.input('type'))
    const wantsDefault = request.input('isDefault') === true || request.input('isDefault') === 'true'
    const isDefault = type === 'cv' && (isFirst || wantsDefault)

    if (isDefault) {
      await JobSeekerDocument.query()
        .where('job_seeker_id', jobSeeker.id)
        .where('type', 'cv')
        .update({ is_default: false })
    }

    const document = await JobSeekerDocument.create({
      jobSeekerId: jobSeeker.id,
      type,
      name: stored.name,
      filePath: stored.key,
      mimeType: stored.mimeType,
      fileSize: stored.size,
      isDefault,
    })

    return response.created(document.serialize())
  }

  /** POST /job-seeker/documents/:id/default */
  async setDefault({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const document = await JobSeekerDocument.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!document) return response.notFound({ error: 'Document not found' })

    await JobSeekerDocument.query()
      .where('job_seeker_id', jobSeeker.id)
      .update({ is_default: false })

    document.isDefault = true
    await document.save()

    return response.ok(document.serialize())
  }

  /** DELETE /job-seeker/documents/:id */
  async destroy({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const document = await JobSeekerDocument.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!document) return response.notFound({ error: 'Document not found' })

    /**
     * Un document déjà envoyé à une organisation a été copié dans
     * `candidate_documents`. On ne supprime le fichier physique que s'il n'est
     * plus référencé par un dossier ATS.
     */
    const stillReferenced = await CandidateDocument.query()
      .where('file_path', document.filePath)
      .first()

    if (!stillReferenced) {
      await FileStorage.delete(document.filePath).catch(() => {})
    }
    await document.delete()

    return response.noContent()
  }

  /** GET /job-seeker/documents/:id/download */
  async download({ auth, params, response }: HttpContext) {
    const jobSeeker = auth.use(GUARD).getUserOrFail()

    const document = await JobSeekerDocument.query()
      .where('id', params.id)
      .where('job_seeker_id', jobSeeker.id)
      .first()
    if (!document) return response.notFound({ error: 'Document not found' })

    return streamCandidateDocument(response, document)
  }
}
