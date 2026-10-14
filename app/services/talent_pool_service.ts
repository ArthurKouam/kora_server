import Application from '#models/application'
import db from '@adonisjs/lucid/services/db'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import FileStorage from '#services/file_storage'
import Mailer from '#services/mailer'
import TalentPoolEntry, { type TalentPoolSource } from '#models/talent_pool_entry'
import TalentPoolNote from '#models/talent_pool_note'
import TalentPoolTag from '#models/talent_pool_tag'
import Tag from '#models/tag'
import type Job from '#models/job'
import type Organization from '#models/organization'
import type User from '#models/user'
import { DateTime } from 'luxon'

/** Clef de la capacité dans `plans.features`. */
export const TALENT_POOL_FEATURE = 'talentPool'

/**
 * Durée de conservation hors recrutement en cours. Au-delà, ce n'est plus un
 * vivier mais une archive de personnes qui n'ont pas candidaté : le job
 * `purge_talent_pool_entries` supprime la fiche et ses fichiers.
 */
export const RETENTION_MONTHS = 24

export interface TalentPoolFilters {
  search?: string
  tagIds?: string[]
  sources?: string[]
  city?: string
  country?: string
  hasCv?: boolean
  includeArchived?: boolean
}

export interface TalentPoolListFilters extends TalentPoolFilters {
  page: number
  limit: number
}

type SqlError = Error & { code?: string; constraint?: string }

async function countRows(
  table: string,
  scope: (query: ReturnType<typeof db.query>) => void
): Promise<number> {
  const query = db.query().from(table)
  scope(query as never)
  const row = await query.count('* as total').first()
  return Number(row?.total ?? 0)
}

export default class TalentPoolService {
  static retentionExpiry(from = DateTime.now()): DateTime {
    return from.plus({ months: RETENTION_MONTHS })
  }

  /** Point d'entrée unique du scoping : l'org vient du user, jamais du payload. */
  static scopedEntries(organizationId: string) {
    return TalentPoolEntry.query().where('organization_id', organizationId)
  }

  static findScoped(organizationId: string, entryId: string) {
    return this.scopedEntries(organizationId).where('id', entryId).first()
  }

  static findByCandidate(organizationId: string, candidateId: string) {
    return this.scopedEntries(organizationId).where('candidate_id', candidateId).first()
  }

  /**
   * Ajout ou réactivation. L'unicité (organization_id, candidate_id) est en
   * base : deux recruteurs qui cliquent en même temps obtiennent un conflit SQL
   * résolu en réactivation, pas deux lignes.
   */
  static async add(params: {
    organization: Organization
    user: User
    candidate: Candidate
    source: TalentPoolSource
    sourceApplicationId?: string | null
    note?: string | null
    tagIds?: string[]
    legalBasis?: 'consent' | 'legitimate_interest'
  }): Promise<TalentPoolEntry> {
    const { organization, user, candidate } = params

    try {
      const entry = await TalentPoolEntry.create({
        organizationId: organization.id,
        candidateId: candidate.id,
        addedBy: user.id,
        source: params.source,
        sourceApplicationId: params.sourceApplicationId ?? null,
        status: 'active',
        legalBasis: params.legalBasis ?? 'consent',
        consentAt: DateTime.now(),
        retentionExpiresAt: this.retentionExpiry(),
      })

      if (params.note) {
        await TalentPoolNote.create({
          talentPoolEntryId: entry.id,
          authorId: user.id,
          content: params.note,
        })
      }

      if (params.tagIds?.length) {
        await this.replaceTags(organization.id, entry.id, params.tagIds)
      }

      await this.notifyCandidate(organization, candidate, 'added')

      return entry
    } catch (error) {
      const sql = error as SqlError
      if (sql.code !== '23505') throw error

      const existing = await this.findByCandidate(organization.id, candidate.id)
      if (!existing) throw error

      return this.reactivate(existing, params.source, user.id, params.sourceApplicationId ?? null)
    }
  }

  /** Réactivation d'un profil retiré, en repoussant la durée de conservation. */
  private static async reactivate(
    entry: TalentPoolEntry,
    source: TalentPoolSource,
    userId: string,
    sourceApplicationId: string | null
  ): Promise<TalentPoolEntry> {
    entry.status = 'active'
    entry.addedBy = userId
    entry.source = source
    entry.sourceApplicationId = sourceApplicationId
    entry.consentAt = DateTime.now()
    entry.retentionExpiresAt = this.retentionExpiry()
    entry.archivedAt = null
    entry.removalReason = null
    await entry.save()
    return entry
  }

  /**
   * Retrait du vivier. C'est un archivage : les candidatures, notes et tags
   * restent intacts — « retirer du vivier » n'est pas « supprimer la fiche ».
   */
  static async remove(entry: TalentPoolEntry, reason?: string | null): Promise<TalentPoolEntry> {
    entry.status = 'archived'
    entry.archivedAt = DateTime.now()
    entry.removalReason = reason ?? null
    await entry.save()
    return entry
  }

  /**
   * Information du candidat, qui accompagne la conservation de ses données.
   * Un échec d'envoi ne doit pas annuler l'action métier du recruteur.
   */
  static async notifyCandidate(
    organization: Organization,
    candidate: Candidate,
    event: 'added' | 'removed'
  ): Promise<void> {
    const hello = candidate.firstName ? ` ${candidate.firstName}` : ''

    const [subject, body] =
      event === 'added'
        ? [
            `Votre profil a été ajouté à notre vivier de talents — ${organization.name}`,
            `<p>Bonjour${hello},</p><p>Nous avons ajouté votre profil à notre vivier de talents afin de vous proposer opportunément des postes correspondant à votre profil.</p><p>Nous conservons ces informations pendant ${RETENTION_MONTHS} mois. Vous pouvez à tout moment en demander la suppression en répondant à cet e-mail.</p>`,
          ]
        : [
            `Votre profil a été retiré de notre vivier de talents — ${organization.name}`,
            `<p>Bonjour${hello},</p><p>Votre profil a été retiré de notre vivier de talents : il ne sera plus utilisé pour vous contacter à l'avenir.</p>`,
          ]

    await Mailer.send({
      to: candidate.email,
      subject,
      html: body,
      organizationId: organization.id,
      candidateId: candidate.id,
      type: 'custom',
    })
  }

  /** Liste paginée. `search` porte sur nom, e-mail, compétences et tags. */
  static async index(organizationId: string, filters: TalentPoolListFilters) {
    const query = TalentPoolEntry.query()
      .where('organization_id', organizationId)
      .preload('candidate', (candidateQuery) => {
        candidateQuery.preload('skills', (skillsQuery) => skillsQuery.preload('skill'))
      })
      .preload('tags')
      .preload('addedByUser', (userQuery) =>
        userQuery.select('id', 'first_name', 'last_name', 'email')
      )
      .orderBy('created_at', 'desc')

    if (!filters.includeArchived) query.where('status', 'active')
    if (filters.sources?.length) query.whereIn('source', filters.sources)

    if (filters.city) {
      query.whereHas('candidate', (q) => q.whereILike('city', `%${filters.city}%`))
    }
    if (filters.country) {
      query.whereHas('candidate', (q) => q.whereILike('country', `%${filters.country}%`))
    }

    if (filters.hasCv !== undefined) {
      const withCv = CandidateDocument.query().select('candidate_id').where('type', 'cv')
      if (filters.hasCv) query.whereIn('candidate_id', withCv)
      else query.whereNotIn('candidate_id', withCv)
    }

    // AND entre tags : on filtre « Backend ET Go », pas « l'un des deux ».
    for (const tagId of filters.tagIds ?? []) {
      query.whereHas('tagLinks', (linksQuery) => linksQuery.where('tag_id', tagId))
    }

    if (filters.search) {
      const term = `%${filters.search}%`
      query.where((builder) => {
        builder
          .whereHas('candidate', (candidateQuery) => {
            candidateQuery
              .whereILike('first_name', term)
              .orWhereILike('last_name', term)
              .orWhereILike('email', term)
              .orWhereHas('skills', (skillsQuery) =>
                skillsQuery.whereHas('skill', (skillQuery) =>
                  skillQuery.whereILike('name', term).orWhereILike('category', term)
                )
              )
          })
          .orWhereHas('tags', (tagsQuery) => tagsQuery.whereILike('name', term))
      })
    }

    return query.paginate(filters.page, filters.limit)
  }

  /** Tags de l'org, avec le nombre de profils actifs qui les portent. */
  static async tags(organizationId: string) {
    const links = await TalentPoolTag.query()
      .join('talent_pool_entries', 'talent_pool_entries.id', 'talent_pool_entry_id')
      .where('talent_pool_entries.organization_id', organizationId)
      .where('talent_pool_entries.status', 'active')
      .select('talent_pool_tags.tag_id')

    const counts = new Map<string, number>()
    for (const link of links) {
      counts.set(link.tagId, (counts.get(link.tagId) ?? 0) + 1)
    }

    const tags = await Tag.query().where('organization_id', organizationId).orderBy('name', 'asc')

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      poolCount: counts.get(tag.id) ?? 0,
    }))
  }

  /** Remplace le jeu de tags : un tag d'une autre organisation est ignoré. */
  static async replaceTags(organizationId: string, entryId: string, tagIds: string[]) {
    const unique = Array.from(new Set(tagIds))

    const owned = unique.length
      ? await Tag.query().where('organization_id', organizationId).whereIn('id', unique)
      : []

    await TalentPoolTag.query().where('talent_pool_entry_id', entryId).delete()

    if (owned.length) {
      await TalentPoolTag.createMany(
        owned.map((tag) => ({ talentPoolEntryId: entryId, tagId: tag.id }))
      )
    }
  }

  /**
   * Associe un profil du vivier à une offre : on crée une candidature
   * normale, pour que la nouvelle offre se comporte comme les autres.
   */
  static async attachToJob(params: {
    entry: TalentPoolEntry
    job: Job
    coverLetter?: string | null
  }): Promise<{ application: Application; created: boolean }> {
    const { entry, job } = params

    const existing = await Application.query()
      .where('job_id', job.id)
      .where('candidate_id', entry.candidateId)
      .first()

    if (existing) return { application: existing, created: false }

    const cv = await CandidateDocument.query()
      .where('candidate_id', entry.candidateId)
      .where('type', 'cv')
      .orderBy('created_at', 'desc')
      .first()

    const application = await Application.create({
      jobId: job.id,
      candidateId: entry.candidateId,
      status: 'new',
      source: 'direct',
      coverLetter: params.coverLetter ?? null,
      cvDocumentId: cv?.id ?? null,
      appliedAt: DateTime.now(),
    })

    return { application, created: true }
  }

  /**
   * Suppression définitive. Les candidatures ne sont jamais touchées : les
   * documents qu'elles référencent survivent via `ON DELETE SET NULL`. Seuls
   * les fichiers non rattachés à une candidature partent avec la fiche.
   */
  static async purge(entry: TalentPoolEntry): Promise<{ documents: number }> {
    const candidateId = entry.candidateId
    let documents = 0

    for (const document of await CandidateDocument.query().where('candidate_id', candidateId)) {
      if (document.applicationId) continue
      await FileStorage.delete(document.filePath).catch(() => {})
      await document.delete()
      documents++
    }

    // La fiche candidat ne part que si plus rien ne la référence : la laisser
    // créerait des candidatures orphelines, la supprimer brutalement laisserait
    // un profil fantôme dans une autre organisation.
    const [applications, otherPools] = await Promise.all([
      countRows('applications', (q) => q.where('candidate_id', candidateId)),
      countRows('talent_pool_entries', (q) =>
        q.where('candidate_id', candidateId).whereNot('organization_id', entry.organizationId)
      ),
    ])

    if (applications === 0 && otherPools === 0) {
      const candidate = await Candidate.find(candidateId)
      await candidate?.delete()
    }

    await entry.delete()

    return { documents }
  }

  /** Purge des entrées dont la durée de conservation est échue. */
  static async purgeExpired(): Promise<number> {
    const expired = await TalentPoolEntry.query().where(
      'retention_expires_at',
      '<=',
      DateTime.now().toSQL()!
    )

    for (const entry of expired) {
      await this.purge(entry).catch(() => {})
    }

    return expired.length
  }
}
