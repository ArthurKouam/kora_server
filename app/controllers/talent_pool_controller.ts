import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import Job from '#models/job'
import Tag from '#models/tag'
import TalentPoolEntry from '#models/talent_pool_entry'
import TalentPoolNote from '#models/talent_pool_note'
import TalentPoolTag from '#models/talent_pool_tag'
import TalentPoolService from '#services/talent_pool_service'
import { can } from '#services/authorization'
import {
  attachToJobValidator,
  createEntryFromApplicationValidator,
  createManualEntryValidator,
  createTagValidator,
  noteValidator,
  parseCsvFilter,
  purgeEntryValidator,
  removeEntryValidator,
  setTagsValidator,
  talentPoolIndexValidator,
} from '#validators/talent_pool'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'

type SqlError = Error & { code?: string; constraint?: string }

/**
 * `middleware.requireOrganization()` dérive le tenant de l'utilisateur
 * authentifié et le pose sur le contexte : aucune requête ci-dessous ne lit un
 * `organizationId` venu du client.
 */
function tenant(ctx: HttpContext): Organization {
  if (!ctx.organization) throw new Error('Organization middleware is missing')
  return ctx.organization
}

export default class TalentPoolController {
  /** GET /talent-pool — liste paginée du vivier. */
  async index(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { request, response } = ctx

    const payload = await request.validateUsing(talentPoolIndexValidator)

    const entries = await TalentPoolService.index(organization.id, {
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
      search: payload.search ?? undefined,
      tagIds: parseCsvFilter(payload.tagIds),
      sources: parseCsvFilter(payload.sources, ['application', 'manual']),
      city: payload.city ?? undefined,
      country: payload.country ?? undefined,
      hasCv: payload.hasCv,
      includeArchived: payload.includeArchived,
    })

    return response.ok({
      data: entries.all().map((entry) => this.summary(entry)),
      meta: entries.getMeta(),
    })
  }

  /** GET /talent-pool/:id — profil complet. */
  async show(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, response } = ctx

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const [candidate, applications, documents, notes, tagIds] = await Promise.all([
      Candidate.query()
        .where('id', entry.candidateId)
        .preload('skills', (q) => q.preload('skill'))
        .preload('experiences')
        .preload('educations')
        .firstOrFail(),
      Application.query()
        .where('candidate_id', entry.candidateId)
        .whereHas('job', (q) => q.where('organization_id', organization.id))
        .preload('job', (q) => q.select('id', 'title', 'slug', 'status'))
        .orderBy('applied_at', 'desc'),
      // Même garde que `CandidatesController.show` : un document rattaché à la
      // candidature d'une autre organisation ne doit pas fuiter ici.
      CandidateDocument.query()
        .where('candidate_id', entry.candidateId)
        .where((q) =>
          q
            .whereNull('application_id')
            .orWhereHas('application', (applicationQuery) =>
              applicationQuery.whereHas('job', (jobQuery) =>
                jobQuery.where('organization_id', organization.id)
              )
            )
        )
        .orderBy('created_at', 'desc'),
      TalentPoolNote.query()
        .where('talent_pool_entry_id', entry.id)
        .preload('author', (q) => q.select('id', 'first_name', 'last_name'))
        .orderBy('created_at', 'desc'),
      TalentPoolTag.query()
        .where('talent_pool_entry_id', entry.id)
        .select('tag_id')
        .then((rows) => new Set(rows.map((row) => row.tagId))),
    ])

    const tags = (await TalentPoolService.tags(organization.id)).filter((tag) =>
      tagIds.has(tag.id)
    )

    return response.ok({
      ...this.entryAttributes(entry),
      candidate: {
        ...candidate.serialize(),
        skills: candidate.skills.map((skill) => ({
          id: skill.id,
          level: skill.level,
          yearsOfExperience: skill.yearsOfExperience,
          name: skill.skill.name,
          category: skill.skill.category,
        })),
      },
      documents: documents.map((document) => document.serialize()),
      applications: applications.map((application) => ({
        id: application.id,
        status: application.status,
        source: application.source,
        appliedAt: application.appliedAt,
        job: application.job.serialize(),
      })),
      notes: notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author ? this.authorName(note.author) : null,
      })),
      tags,
    })
  }

  /** POST /talent-pool — ajout manuel d'un candidat externe. */
  async store(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, request, response } = ctx

    const user = auth.use('web').getUserOrFail()
    const payload = await request.validateUsing(createManualEntryValidator)

    // Sans accord, on n'entre pas le profil : conserver sans base légale n'est
    // pas un détail d'interface.
    if (!payload.consentGiven) {
      return response.unprocessableEntity({
        error:
          "Le candidat doit être informé de la conservation de son profil et avoir donné son accord. Confirmez-le avant de l'ajouter au vivier.",
        code: 'consent_required',
      })
    }

    const email = payload.email.toLowerCase()
    let candidate = await Candidate.query().whereRaw('lower(email) = ?', [email]).first()

    if (candidate) {
      // On ne remplit que les champs vides : un profil connu n'est pas réécrit.
      candidate.firstName = candidate.firstName ?? payload.firstName ?? null
      candidate.lastName = candidate.lastName ?? payload.lastName ?? null
      candidate.phone = candidate.phone ?? payload.phone ?? null
      candidate.location = candidate.location ?? payload.location ?? null
      candidate.city = candidate.city ?? payload.city ?? null
      candidate.country = candidate.country ?? payload.country ?? null
      candidate.linkedinUrl = candidate.linkedinUrl ?? payload.linkedinUrl ?? null
      await candidate.save()
    } else {
      candidate = await Candidate.create({
        email,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        phone: payload.phone ?? null,
        location: payload.location ?? null,
        city: payload.city ?? null,
        country: payload.country ?? null,
        linkedinUrl: payload.linkedinUrl ?? null,
      })
    }

    const entry = await TalentPoolService.add({
      organization,
      user,
      candidate,
      source: 'manual',
      note: payload.note ?? null,
      tagIds: payload.tagIds ?? [],
    })

    return response.created(await this.reload(organization.id, entry.id))
  }

  /** POST /talent-pool/from-application — ajout depuis une candidature existante. */
  async storeFromApplication(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, request, response } = ctx

    const user = auth.use('web').getUserOrFail()
    const payload = await request.validateUsing(createEntryFromApplicationValidator)

    const application = await Application.query()
      .where('id', payload.applicationId)
      .andWhereHas('job', (q) => q.where('organization_id', organization.id))
      .first()

    if (!application) return response.notFound({ error: 'Application not found' })

    const entry = await TalentPoolService.add({
      organization,
      user,
      candidate: await Candidate.findOrFail(application.candidateId),
      source: 'application',
      sourceApplicationId: application.id,
      note: payload.note ?? null,
      tagIds: payload.tagIds ?? [],
    })

    return response.created(await this.reload(organization.id, entry.id))
  }

  /** DELETE /talent-pool/:id — retrait, sans toucher à l'historique. */
  async destroy(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, request, response } = ctx

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const payload = await request.validateUsing(removeEntryValidator)
    await TalentPoolService.remove(entry, payload.reason ?? null)

    const candidate = await Candidate.find(entry.candidateId)
    if (candidate) await TalentPoolService.notifyCandidate(organization, candidate, 'removed')

    return response.ok({ id: entry.id, status: entry.status, archivedAt: entry.archivedAt })
  }

  /** POST /talent-pool/:id/restore — remet un profil retiré dans le vivier. */
  async restore(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, params, response } = ctx

    const user = auth.use('web').getUserOrFail()

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    if (entry.isArchived()) {
      entry.status = 'active'
      entry.addedBy = user.id
      entry.consentAt = DateTime.now()
      entry.retentionExpiresAt = TalentPoolService.retentionExpiry()
      entry.archivedAt = null
      entry.removalReason = null
      await entry.save()

      const candidate = await Candidate.find(entry.candidateId)
      if (candidate) await TalentPoolService.notifyCandidate(organization, candidate, 'added')
    }

    return response.ok(await this.reload(organization.id, entry.id))
  }

  /**
   * DELETE /talent-pool/:id/purge — effacement définitif. Distinct du retrait,
   * réversible : c'est le droit à l'effacement.
   */
  async purge(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, request, response } = ctx

    const payload = await request.validateUsing(purgeEntryValidator)

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const result = await TalentPoolService.purge(entry)

    return response.ok({ purged: true, reason: payload.reason, documents: result.documents })
  }

  /** POST /talent-pool/:id/notes */
  async addNote(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, params, request, response } = ctx

    const user = auth.use('web').getUserOrFail()

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const payload = await request.validateUsing(noteValidator)
    const note = await TalentPoolNote.create({
      talentPoolEntryId: entry.id,
      authorId: user.id,
      content: payload.content,
    })

    return response.created({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: this.authorName(user),
    })
  }

  /** PUT /talent-pool/:id/notes/:noteId */
  async updateNote(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, params, request, response } = ctx

    const user = auth.use('web').getUserOrFail()

    const note = await this.scopedNote(organization.id, String(params.id), String(params.noteId))
    if (!note) return response.notFound({ error: 'Note not found' })

    if (note.authorId !== user.id && !can(user.role, 'talent_pool.manage')) {
      return response.forbidden({ error: 'Only the author can edit this note' })
    }

    const payload = await request.validateUsing(noteValidator)
    note.content = payload.content
    await note.save()

    return response.ok({ id: note.id, content: note.content, updatedAt: note.updatedAt })
  }

  /** DELETE /talent-pool/:id/notes/:noteId */
  async destroyNote(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { auth, params, response } = ctx

    const user = auth.use('web').getUserOrFail()

    const note = await this.scopedNote(organization.id, String(params.id), String(params.noteId))
    if (!note) return response.notFound({ error: 'Note not found' })

    if (note.authorId !== user.id && !can(user.role, 'talent_pool.manage')) {
      return response.forbidden({ error: 'Only the author can delete this note' })
    }

    await note.delete()

    return response.noContent()
  }

  /** PUT /talent-pool/:id/tags */
  async setTags(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, request, response } = ctx

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const payload = await request.validateUsing(setTagsValidator)
    await TalentPoolService.replaceTags(organization.id, entry.id, payload.tagIds)

    return response.ok(await this.reload(organization.id, entry.id))
  }

  /** GET /talent-pool/tags */
  async tags(ctx: HttpContext) {
    return ctx.response.ok(await TalentPoolService.tags(tenant(ctx).id))
  }

  /** POST /talent-pool/tags */
  async createTag(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { request, response } = ctx

    const payload = await request.validateUsing(createTagValidator)

    try {
      const tag = await Tag.create({
        organizationId: organization.id,
        name: payload.name,
        color: payload.color ?? null,
      })
      return response.created(tag)
    } catch (error) {
      // (organization_id, name) est unique : créer un tag déjà connu n'est pas une erreur.
      if ((error as SqlError).code !== '23505') throw error

      return response.ok(
        await Tag.query()
          .where('organization_id', organization.id)
          .where('name', payload.name)
          .firstOrFail()
      )
    }
  }

  /** POST /talent-pool/:id/attach — associe le profil à une offre. */
  async attachToJob(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, request, response } = ctx

    const payload = await request.validateUsing(attachToJobValidator)

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const job = await Job.query()
      .where('id', payload.jobId)
      .andWhere('organization_id', organization.id)
      .first()

    if (!job) return response.notFound({ error: 'Job not found' })

    const { application, created } = await TalentPoolService.attachToJob({
      entry,
      job,
      coverLetter: payload.coverLetter ?? null,
    })

    return created ? response.created(application) : response.ok(application)
  }

  /**
   * GET /talent-pool/:id/documents/:documentId
   * CV du profil. Autorisé par l'appartenance au vivier ET le rattachement du
   * document à une candidature de l'organisation.
   */
  async downloadDocument(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, response } = ctx

    const entry = await TalentPoolService.findScoped(organization.id, String(params.id))
    if (!entry) return response.notFound({ error: 'Talent pool entry not found' })

    const document = await CandidateDocument.query()
      .where('id', String(params.documentId))
      .where('candidate_id', entry.candidateId)
      .where((q) =>
        q
          .whereNull('application_id')
          .orWhereHas('application', (applicationQuery) =>
            applicationQuery.whereHas('job', (jobQuery) =>
              jobQuery.where('organization_id', organization.id)
            )
          )
      )
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

  // ── helpers ────────────────────────────────────────────────────────────

  private entryAttributes(entry: TalentPoolEntry) {
    return {
      id: entry.id,
      status: entry.status,
      source: entry.source,
      legalBasis: entry.legalBasis,
      consentAt: entry.consentAt,
      retentionExpiresAt: entry.retentionExpiresAt,
      archivedAt: entry.archivedAt,
      removalReason: entry.removalReason,
      createdAt: entry.createdAt,
    }
  }

  /** Ligne de liste : assez pour le tableau, pas assez pour fuiter. */
  private summary(entry: TalentPoolEntry) {
    const candidate = entry.candidate

    return {
      ...this.entryAttributes(entry),
      candidate: candidate
        ? {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            avatarUrl: candidate.avatarUrl,
            location: candidate.location,
            city: candidate.city,
            country: candidate.country,
            skills: (candidate.skills ?? [])
              .map((skill) => skill.skill?.name)
              .filter((name): name is string => Boolean(name)),
          }
        : null,
      tags: entry.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
      addedBy: entry.addedByUser ? this.authorName(entry.addedByUser) : null,
    }
  }

  private authorName(user: { id: string; firstName?: string | null; lastName?: string | null }) {
    return {
      id: user.id,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.id,
    }
  }

  /** Recharge l'entrée avec ses relations, pour les réponses après écriture. */
  private async reload(organizationId: string, entryId: string) {
    const entry = await TalentPoolService.scopedEntries(organizationId)
      .where('id', entryId)
      .preload('candidate', (q) => {
        q.preload('skills', (skillsQuery) => skillsQuery.preload('skill'))
      })
      .preload('tags')
      .preload('addedByUser')
      .firstOrFail()

    return this.summary(entry)
  }

  private async scopedNote(organizationId: string, entryId: string, noteId: string) {
    const entry = await TalentPoolService.findScoped(organizationId, entryId)
    if (!entry) return null

    return TalentPoolNote.query()
      .where('id', noteId)
      .where('talent_pool_entry_id', entry.id)
      .first()
  }
}
