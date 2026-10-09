import CandidateDocument from '#models/candidate_document'
import PendingApplication from '#models/pending_application'
import FileStorage from '#services/file_storage'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { DateTime } from 'luxon'

type PendingPayload = {
  documentIds?: string[]
  cvDocumentId?: string | null
}

/** Délai de grâce avant de considérer un document non rattaché comme abandonnable. */
const ORPHAN_GRACE_HOURS = 24

/**
 * Purge les fichiers des candidatures dont le code OTP n'a jamais été vérifié.
 *
 * Le CV et les pièces jointes sont écrits sur disque avant la vérification email
 * (le fichier doit survivre entre POST /apply et POST /verify). Sans ce job, une
 * candidature abandonnée laisse un fichier et une ligne candidate_documents
 * orphelins, attachés à un candidat déjà créé en base.
 *
 * Un document n'est supprimé que s'il n'est rattaché à aucune candidature
 * (`application_id IS NULL`) : dès que verify() l'a attaché, il n'est plus orphelin.
 */
export default class ExpirePendingApplications extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'maintenance', timeout: '60s' }

  async execute() {
    const expired = await PendingApplication.query()
      .where('status', 'pending')
      .where('expires_at', '<=', DateTime.now().toSQL()!)

    for (const pending of expired) {
      const payload = (pending.payload ?? {}) as PendingPayload
      const ids = new Set([
        ...(payload.documentIds ?? []),
        ...(payload.cvDocumentId ? [payload.cvDocumentId] : []),
      ])

      for (const id of ids) {
        const document = await CandidateDocument.findBy('id', id)

        // Déjà attaché à une candidature : plus orphelin, on ne touche à rien.
        if (!document || document.applicationId !== null) continue

        // Le fichier peut déjà avoir disparu du disque : on ne bloque pas pour ça.
        await FileStorage.delete(document.filePath).catch(() => {})
        await document.delete()
      }

      pending.status = 'expired'
      await pending.save()
    }

    await this.sweepUnreferencedDocuments()
  }

  /**
   * Filet de sécurité : supprime les documents jamais rattachés à une candidature
   * et qui ne sont référencés par aucune pending en cours.
   *
   * Le passage ci-dessus ne voit que les documents listés dans un payload. Un
   * document devenu orphelin après l'écrasement de ce payload (resoumission avec
   * une version antérieure du code) n'y figure plus et ne serait jamais purgé.
   *
   * Le délai de grâce couvre la fenêtre d'attente d'une candidature légitime :
   * un document attend au plus OTP_TTL_MINUTES avant d'être attaché, puis le
   * temps d'un éventuel arbitrage côté recrutement.
   */
  private async sweepUnreferencedDocuments() {
    const gracePeriod = DateTime.now().minus({ hours: ORPHAN_GRACE_HOURS })

    const referenced = await PendingApplication.query()
      .where('status', 'pending')
      .where('expires_at', '>', DateTime.now().toSQL()!)

    const keep = new Set<string>()
    for (const pending of referenced) {
      const payload = (pending.payload ?? {}) as PendingPayload
      for (const id of [
        ...(payload.documentIds ?? []),
        ...(payload.cvDocumentId ? [payload.cvDocumentId] : []),
      ]) {
        keep.add(id)
      }
    }

    const orphans = await CandidateDocument.query()
      .whereNull('application_id')
      .where('created_at', '<=', gracePeriod.toSQL()!)

    for (const document of orphans) {
      if (keep.has(document.id)) continue
      await FileStorage.delete(document.filePath).catch(() => {})
      await document.delete()
    }
  }
}
