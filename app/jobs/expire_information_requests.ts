import ApplicationInformationRequest from '#models/application_information_request'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

export default class ExpireInformationRequests extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'maintenance', timeout: '30s' }

  async execute() {
    await ApplicationInformationRequest.query()
      .where('status', 'open')
      .where('expires_at', '<=', DateTime.now().toSQL()!)
      .update({ status: 'expired' })
  }
}
