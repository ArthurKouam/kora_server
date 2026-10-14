import TalentPoolService from '#services/talent_pool_service'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

/**
 * Purge des profils dont la durée de conservation est échue.
 *
 * Le retrait du vivier est un archivage volontaire ; l'oubli, lui, doit arriver
 * tout seul. Sans ce job, « on garde le profil 24 mois » ne serait qu'une
 * promesse que rien n'applique.
 */
export default class PurgeTalentPoolEntries extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'maintenance', timeout: '120s' }

  async execute() {
    await TalentPoolService.purgeExpired()
  }
}
