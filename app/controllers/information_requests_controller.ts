import SendInformationRequestEmail from '#jobs/send_information_request_email'
import SendInformationResponseNotification from '#jobs/send_information_response_notification'
import Application from '#models/application'
import ApplicationInformationRequest from '#models/application_information_request'
import CandidateDocument from '#models/candidate_document'
import FileStorage from '#services/file_storage'
import { validateAnswers } from '#services/form_answers_validator'
import { validateFormDefinition } from '#services/form_definition_validator'
import {
  encryptInformationRequestToken,
  generateInformationRequestToken,
  hashInformationRequestToken,
} from '#services/information_request_tokens'
import type { FieldDefinition, FormDefinition } from '#types/forms'
import {
  createInformationRequestValidator,
  submitInformationRequestValidator,
} from '#validators/information_request'
import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'

type SqlError = Error & { code?: string; constraint?: string }

export default class InformationRequestsController {
  private async findScopedApplication(organizationId: string, applicationId: string) {
    return Application.query()
      .where('id', applicationId)
      .andWhereHas('job', (query) => query.where('organization_id', organizationId))
      .first()
  }

  private scopedRequest(organizationId: string, applicationId: string, requestId: string) {
    return ApplicationInformationRequest.query()
      .where('id', requestId)
      .where('organization_id', organizationId)
      .where('application_id', applicationId)
  }

  private async expireOpenRequests(applicationId?: string) {
    const query = ApplicationInformationRequest.query()
      .where('status', 'open')
      .where('expires_at', '<=', DateTime.now().toSQL()!)
    if (applicationId) query.where('application_id', applicationId)
    await query.update({ status: 'expired' })
  }

  private async dispatchCandidateEmail(request: ApplicationInformationRequest, token: string) {
    try {
      await SendInformationRequestEmail.dispatch({
        requestId: request.id,
        encryptedToken: encryptInformationRequestToken(token),
        expectedTokenHash: request.tokenHash,
      })
        .dedup({ id: `information-request:${request.id}:${request.tokenHash}` })
        .run()
    } catch (error) {
      request.deliveryStatus = 'failed'
      request.deliveryError = error instanceof Error ? error.message : String(error)
      await request.save()
    }
  }

  async create({ auth, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const applicationId = String(params.id)
    if (!(await this.findScopedApplication(user.organizationId, applicationId))) {
      return response.notFound({ error: 'Application not found' })
    }

    const payload = await request.validateUsing(createInformationRequestValidator)
    const definition: FormDefinition = { fields: payload.fields as FieldDefinition[] }
    const definitionResult = validateFormDefinition(definition)
    if (!definitionResult.valid) {
      return response.unprocessableEntity({ errors: definitionResult.errors })
    }

    const now = DateTime.now()
    const expiresAt = payload.expiresAt
      ? DateTime.fromISO(payload.expiresAt, { setZone: true }).toUTC()
      : now.plus({ days: 7 })
    const lifetimeDays = expiresAt.diff(now, 'days').days
    if (!expiresAt.isValid || lifetimeDays < 1 || lifetimeDays > 30) {
      return response.unprocessableEntity({
        errors: { expiresAt: 'Expiration must be between 1 and 30 days from now' },
      })
    }

    const token = generateInformationRequestToken()
    let informationRequest: ApplicationInformationRequest
    try {
      informationRequest = await ApplicationInformationRequest.transaction(async (trx) => {
        await ApplicationInformationRequest.query({ client: trx })
          .where('application_id', applicationId)
          .where('status', 'open')
          .where('expires_at', '<=', now.toSQL()!)
          .update({ status: 'expired' })

        return ApplicationInformationRequest.create(
          {
            organizationId: user.organizationId!,
            applicationId,
            requestedBy: user.id,
            definition,
            answers: null,
            message: payload.message ?? null,
            status: 'open',
            deliveryStatus: 'pending',
            responseDeliveryStatus: null,
            tokenHash: hashInformationRequestToken(token),
            deliveryError: null,
            responseDeliveryError: null,
            expiresAt,
            sentAt: null,
            submittedAt: null,
            cancelledAt: null,
          },
          { client: trx }
        )
      })
    } catch (error) {
      if ((error as SqlError).code === '23505') {
        return response.conflict({ error: 'An open information request already exists' })
      }
      throw error
    }

    await this.dispatchCandidateEmail(informationRequest, token)
    return response.created(informationRequest)
  }

  async list({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    const applicationId = String(params.id)
    if (!(await this.findScopedApplication(user.organizationId, applicationId))) {
      return response.notFound({ error: 'Application not found' })
    }

    await this.expireOpenRequests(applicationId)
    const requests = await ApplicationInformationRequest.query()
      .where('organization_id', user.organizationId)
      .where('application_id', applicationId)
      .orderBy('created_at', 'desc')
    return response.ok({ data: requests })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    await this.expireOpenRequests(String(params.id))
    const informationRequest = await this.scopedRequest(
      user.organizationId,
      String(params.id),
      String(params.requestId)
    ).first()
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })
    return response.ok(informationRequest)
  }

  async resend({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    await this.expireOpenRequests(String(params.id))
    const informationRequest = await this.scopedRequest(
      user.organizationId,
      String(params.id),
      String(params.requestId)
    ).first()
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })
    if (informationRequest.status !== 'open') {
      return response.conflict({ error: 'Only an open information request can be resent' })
    }

    const token = generateInformationRequestToken()
    informationRequest.tokenHash = hashInformationRequestToken(token)
    informationRequest.deliveryStatus = 'pending'
    informationRequest.deliveryError = null
    informationRequest.sentAt = null
    await informationRequest.save()
    await this.dispatchCandidateEmail(informationRequest, token)
    return response.ok(informationRequest)
  }

  async cancel({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    await this.expireOpenRequests(String(params.id))
    const informationRequest = await this.scopedRequest(
      user.organizationId,
      String(params.id),
      String(params.requestId)
    ).first()
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })
    if (informationRequest.status === 'cancelled') return response.ok(informationRequest)
    if (informationRequest.status !== 'open') {
      return response.conflict({ error: 'Only an open information request can be cancelled' })
    }
    informationRequest.status = 'cancelled'
    informationRequest.cancelledAt = DateTime.now()
    await informationRequest.save()
    return response.ok(informationRequest)
  }

  private async findPublic(token: string) {
    const tokenHash = hashInformationRequestToken(token)
    const informationRequest = await ApplicationInformationRequest.query()
      .where('token_hash', tokenHash)
      .preload('application', (query) =>
        query.preload('job', (jobQuery) => jobQuery.preload('organization'))
      )
      .first()
    if (informationRequest?.status === 'open' && informationRequest.expiresAt <= DateTime.now()) {
      informationRequest.status = 'expired'
      await informationRequest.save()
    }
    return informationRequest
  }

  async publicShow({ params, response }: HttpContext) {
    const informationRequest = await this.findPublic(String(params.token))
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })
    if (informationRequest.status === 'expired' || informationRequest.status === 'cancelled') {
      return response.gone({
        status: informationRequest.status,
        error: 'Information request is no longer available',
      })
    }
    if (informationRequest.status === 'submitted') {
      return response.ok({ status: 'submitted', submittedAt: informationRequest.submittedAt })
    }
    return response.ok({
      status: informationRequest.status,
      fields: informationRequest.definition.fields,
      message: informationRequest.message,
      expiresAt: informationRequest.expiresAt,
      organization: { name: informationRequest.application.job.organization.name },
      job: { title: informationRequest.application.job.title },
    })
  }

  async publicSubmit({ params, request, response }: HttpContext) {
    const token = String(params.token)
    let informationRequest = await this.findPublic(token)
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })
    if (informationRequest.status === 'expired' || informationRequest.status === 'cancelled') {
      return response.gone({ error: 'Information request is no longer available' })
    }
    if (informationRequest.status === 'submitted') {
      return response.ok({ status: 'submitted', submittedAt: informationRequest.submittedAt })
    }

    const isMultipart = (request.header('content-type') ?? '').includes('multipart/form-data')
    const rawData: Record<string, unknown> = { ...request.body() }
    if (isMultipart && typeof rawData.answers === 'string') {
      try {
        rawData.answers = JSON.parse(rawData.answers)
      } catch {
        return response.unprocessableEntity({ error: 'Invalid answers JSON' })
      }
    }
    const payload = await request.validateUsing(submitInformationRequestValidator, {
      data: rawData,
    })
    const answers = { ...(payload.answers as Record<string, unknown>) }
    const definition = informationRequest.definition as FormDefinition
    const allowedFileKeys = new Set(
      definition.fields.filter((field) => field.type === 'file').map((field) => `file_${field.id}`)
    )
    for (const key of Object.keys(request.allFiles())) {
      if (!allowedFileKeys.has(key)) {
        return response.unprocessableEntity({ errors: { [key]: 'Unknown file field' } })
      }
      if (Array.isArray(request.allFiles()[key])) {
        return response.unprocessableEntity({ errors: { [key]: 'Only one file is allowed' } })
      }
    }

    const storedFiles: {
      fieldId: string
      key: string
      name: string
      mimeType: string | null
      size: number | null
    }[] = []
    try {
      for (const field of definition.fields) {
        if (field.type !== 'file') continue
        const file = request.file(`file_${field.id}`, {
          size: '10mb',
          extnames: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'jpg', 'jpeg', 'png', 'webp'],
        })
        if (!file) {
          if (answers[field.id] !== undefined) {
            await this.deleteStoredFiles(storedFiles)
            return response.unprocessableEntity({ errors: { [field.id]: 'File must be uploaded' } })
          }
          continue
        }
        if (!file.isValid) {
          await this.deleteStoredFiles(storedFiles)
          return response.unprocessableEntity({ errors: { [field.id]: 'Invalid file' } })
        }
        const mimeType = file.headers?.['content-type'] ?? null
        if (
          field.config?.accept?.length &&
          (!mimeType || !field.config.accept.includes(mimeType))
        ) {
          await this.deleteStoredFiles(storedFiles)
          return response.unprocessableEntity({
            errors: { [field.id]: 'File type is not allowed' },
          })
        }
        const stored = await FileStorage.store(file, 'application-documents')
        storedFiles.push({ fieldId: field.id, ...stored })
        answers[field.id] = { documentId: '__pending__' }
      }

      const validation = validateAnswers(definition, answers)
      if (!validation.valid) {
        await this.deleteStoredFiles(storedFiles)
        return response.unprocessableEntity({ errors: validation.errors })
      }

      const result = await ApplicationInformationRequest.transaction(async (trx) => {
        const locked = await ApplicationInformationRequest.query({ client: trx })
          .where('id', informationRequest!.id)
          .where('token_hash', hashInformationRequestToken(token))
          .forUpdate()
          .first()
        if (!locked) return { outcome: 'not_found' as const }
        if (locked.status === 'submitted') return { outcome: 'submitted' as const, row: locked }
        if (locked.status !== 'open' || locked.expiresAt <= DateTime.now()) {
          if (locked.status === 'open') {
            locked.status = 'expired'
            await locked.save()
          }
          return { outcome: 'gone' as const }
        }

        const application = await Application.findOrFail(locked.applicationId, { client: trx })
        for (const stored of storedFiles) {
          const document = await CandidateDocument.create(
            {
              candidateId: application.candidateId,
              applicationId: locked.applicationId,
              type: 'other',
              name: stored.name,
              filePath: stored.key,
              mimeType: stored.mimeType,
              fileSize: stored.size,
            },
            { client: trx }
          )
          answers[stored.fieldId] = { documentId: document.id, name: document.name }
        }

        locked.answers = answers
        locked.status = 'submitted'
        locked.submittedAt = DateTime.now()
        locked.responseDeliveryStatus = 'pending'
        await locked.save()
        return { outcome: 'created' as const, row: locked }
      })

      if (result.outcome !== 'created') await this.deleteStoredFiles(storedFiles)
      if (result.outcome === 'not_found') {
        return response.notFound({ error: 'Information request not found' })
      }
      if (result.outcome === 'gone') {
        return response.gone({ error: 'Information request is no longer available' })
      }
      if (result.outcome === 'submitted') {
        return response.ok({ status: 'submitted', submittedAt: result.row.submittedAt })
      }

      informationRequest = result.row
      try {
        await SendInformationResponseNotification.dispatch({ requestId: informationRequest.id })
          .dedup({ id: `information-response:${informationRequest.id}` })
          .run()
      } catch (error) {
        informationRequest.responseDeliveryStatus = 'failed'
        informationRequest.responseDeliveryError =
          error instanceof Error ? error.message : String(error)
        await informationRequest.save()
      }
      return response.ok({ status: 'submitted', submittedAt: informationRequest.submittedAt })
    } catch (error) {
      await this.deleteStoredFiles(storedFiles)
      throw error
    }
  }

  private async deleteStoredFiles(files: { key: string }[]) {
    await Promise.allSettled(files.map((file) => FileStorage.delete(file.key)))
  }

  async downloadDocument({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }
    const informationRequest = await this.scopedRequest(
      user.organizationId,
      String(params.id),
      String(params.requestId)
    ).first()
    if (!informationRequest) return response.notFound({ error: 'Information request not found' })

    const referenced = Object.values(informationRequest.answers ?? {}).some(
      (answer) =>
        typeof answer === 'object' &&
        answer !== null &&
        'documentId' in answer &&
        (answer as { documentId?: unknown }).documentId === String(params.documentId)
    )
    if (!referenced) return response.notFound({ error: 'Document not found' })

    const document = await CandidateDocument.query()
      .where('id', String(params.documentId))
      .where('application_id', String(params.id))
      .first()
    if (!document) return response.notFound({ error: 'Document not found' })

    try {
      const stream = await drive.use().getStream(document.filePath)
      response.header('content-type', document.mimeType ?? 'application/octet-stream')
      return response.stream(stream)
    } catch {
      return response.notFound({ error: 'File missing from storage' })
    }
  }
}
