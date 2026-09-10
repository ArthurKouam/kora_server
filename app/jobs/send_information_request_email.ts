import ApplicationInformationRequest from '#models/application_information_request'
import { sendInformationRequestEmail } from '#services/information_request_email'
import {
  decryptInformationRequestToken,
  hashInformationRequestToken,
} from '#services/information_request_tokens'
import env from '#start/env'
import { exponentialBackoff, Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

interface Payload {
  requestId: string
  encryptedToken: string
  expectedTokenHash: string
}

export default class SendInformationRequestEmail extends Job<Payload> {
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
      .preload('application', (query) =>
        query.preload('candidate').preload('job', (jobQuery) => jobQuery.preload('organization'))
      )
      .first()

    if (
      !request ||
      request.status !== 'open' ||
      request.tokenHash !== this.payload.expectedTokenHash
    ) {
      return
    }
    if (request.expiresAt <= DateTime.now()) {
      request.status = 'expired'
      await request.save()
      return
    }

    const token = decryptInformationRequestToken(this.payload.encryptedToken)
    if (!token || hashInformationRequestToken(token) !== request.tokenHash) {
      throw new Error('Invalid encrypted information request token')
    }

    request.deliveryStatus = 'processing'
    request.deliveryError = null
    await request.save()

    try {
      const { candidate, job } = request.application
      await sendInformationRequestEmail({
        to: candidate.email,
        candidateName:
          `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || 'candidat',
        jobTitle: job.title,
        organizationName: job.organization.name,
        message: request.message,
        expiresAt: request.expiresAt,
        publicUrl: `${env.get('FRONTEND_URL').replace(/\/$/, '')}/informations/${token}`,
        organizationId: request.organizationId,
        applicationId: request.applicationId,
        candidateId: candidate.id,
      })
      request.deliveryStatus = 'sent'
      request.sentAt = DateTime.now()
      await request.save()
    } catch (error) {
      request.deliveryStatus = 'retrying'
      request.deliveryError = error instanceof Error ? error.message : String(error)
      await request.save()
      throw error
    }
  }

  async failed(error: Error) {
    await ApplicationInformationRequest.query()
      .where('id', this.payload.requestId)
      .where('token_hash', this.payload.expectedTokenHash)
      .update({ deliveryStatus: 'failed', deliveryError: error.message })
  }
}
