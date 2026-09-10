import ApplicationInformationRequest from '#models/application_information_request'
import { sendInformationResponseNotification } from '#services/information_request_email'
import env from '#start/env'
import { exponentialBackoff, Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface Payload {
  requestId: string
}

export default class SendInformationResponseNotification extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 5,
    retry: { backoff: exponentialBackoff({ baseDelay: '2s', maxDelay: '10m', jitter: true }) },
    timeout: '30s',
    failOnTimeout: false,
  }

  async execute() {
    const request = await ApplicationInformationRequest.query()
      .where('id', this.payload.requestId)
      .where('status', 'submitted')
      .preload('requester')
      .preload('application', (query) => query.preload('candidate').preload('job'))
      .first()
    if (!request) return

    request.responseDeliveryStatus = 'processing'
    request.responseDeliveryError = null
    await request.save()

    try {
      const { candidate, job } = request.application
      await sendInformationResponseNotification({
        to: request.requester.email,
        recruiterName:
          `${request.requester.firstName ?? ''} ${request.requester.lastName ?? ''}`.trim() ||
          'recruteur',
        candidateName:
          `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || 'Le candidat',
        jobTitle: job.title,
        applicationUrl: `${env.get('FRONTEND_URL').replace(/\/$/, '')}/applications/${request.applicationId}`,
        organizationId: request.organizationId,
        applicationId: request.applicationId,
        candidateId: candidate.id,
      })
      request.responseDeliveryStatus = 'sent'
      await request.save()
    } catch (error) {
      request.responseDeliveryStatus = 'retrying'
      request.responseDeliveryError = error instanceof Error ? error.message : String(error)
      await request.save()
      throw error
    }
  }

  async failed(error: Error) {
    await ApplicationInformationRequest.query()
      .where('id', this.payload.requestId)
      .update({ responseDeliveryStatus: 'failed', responseDeliveryError: error.message })
  }
}
