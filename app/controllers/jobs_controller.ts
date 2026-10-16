import type { HttpContext } from '@adonisjs/core/http'
import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import JobStatusHistory from '#models/job_status_history'
import Organization from '#models/organization'
import PlanService from '#services/plan_service'
import { createJobValidator, updateJobValidator } from '#validators/job'
import { DateTime } from 'luxon'

/** Les colonnes `decimal` sont typées string par le générateur Lucid */
function normalizeJobPayload<
  T extends { salaryMin?: number | string | null; salaryMax?: number | string | null },
>(
  payload: T
): Omit<T, 'salaryMin' | 'salaryMax'> & { salaryMin: string | null; salaryMax: string | null } {
  return {
    ...payload,
    salaryMin:
      payload.salaryMin !== null && payload.salaryMin !== undefined
        ? String(payload.salaryMin)
        : null,
    salaryMax:
      payload.salaryMax !== null && payload.salaryMax !== undefined
        ? String(payload.salaryMax)
        : null,
  }
}

export default class JobsController {
  /**
   * Publie le brouillon de formulaire d'un poste qui vient d'être publié.
   *
   * La page carrière n'expose que `activeFormVersion`, renseigné uniquement par
   * la publication explicite d'une version. Un formulaire laissé en brouillon
   * resterait donc invisible des candidats, y compris lorsque le poste est
   * publié dans la foulée de sa création.
   *
   * On ne touche pas à un poste qui a déjà une version active : publier le
   * poste ne doit pas remplacer une version déjà en ligne.
   */
  private async publishDraftFormIfNeeded(job: Job): Promise<void> {
    if (job.status !== 'published') return
    if (job.activeFormVersionId) return

    const draft = await JobFormVersion.query()
      .where('job_id', job.id)
      .whereNull('published_at')
      .first()

    if (!draft) return

    draft.publishedAt = DateTime.now()
    await draft.save()

    job.activeFormVersionId = draft.id
    await job.save()
  }

  /**
   * GET /jobs
   * Retourne la liste des jobs de l'organisation de l'utilisateur
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const { page = 1, limit = 20, status, search } = request.qs()

    const query = Job.query()
      .where('organization_id', user.organizationId)
      .orderBy('created_at', 'desc')

    if (status) {
      await query.where('status', status)
    }

    if (search) {
      await query.whereILike('title', `%${search}%`)
    }

    const jobs = await query.paginate(page, limit)

    return response.ok(jobs)
  }

  /**
   * POST /jobs
   * Crée un nouveau job
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const payload = await request.validateUsing(createJobValidator)

    // Quota d'offres actives du plan courant, avant toute écriture.
    const organization = await Organization.find(user.organizationId)
    if (!organization) {
      return response.forbidden({ error: 'Organization not found' })
    }

    const quotaError = await PlanService.checkJobQuota(organization)
    if (quotaError) {
      return response.paymentRequired({ error: quotaError, code: 'job_quota_reached' })
    }

    const job = await Job.create({
      ...normalizeJobPayload(payload),
      organizationId: user.organizationId,
      createdBy: user.id,
      // Si status n'est pas fourni, on met 'draft' par défaut
      status: payload.status || 'draft',
      // Si published_at n'est pas fourni et status est 'published', on met la date actuelle
      publishedAt: payload.status === 'published' ? DateTime.now() : null,
    })

    await this.publishDraftFormIfNeeded(job)

    await job.load('organization')
    await job.load('user')

    return response.created(job)
  }

  /**
   * GET /jobs/:id
   * Retourne un job spécifique
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const job = await Job.query()
      .where('id', params.id)
      .andWhere('organization_id', user.organizationId)
      .firstOrFail()

    await job.load('organization')
    await job.load('user')
    await job.load('skills')
    await job.load('applications', (applicationsQuery) =>
      applicationsQuery.preload('candidate').orderBy('applied_at', 'desc')
    )

    return response.ok(job)
  }

  /**
   * PUT /jobs/:id
   * Met à jour un job
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const job = await Job.query()
      .where('id', params.id)
      .andWhere('organization_id', user.organizationId)
      .firstOrFail()

    const payload = await request.validateUsing(updateJobValidator)

    const previousStatus = job.status
    const willPublish = payload.status === 'published' && !job.publishedAt

    // `status` ne peut jamais être null en base : on ignore une valeur nulle
    const { status, ...rest } = normalizeJobPayload(payload)
    job.merge(rest)
    if (status !== null && status !== undefined) {
      job.status = status as typeof job.status
    }

    // Si on passe en status 'published', mettre published_at à maintenant
    if (willPublish) {
      job.publishedAt = DateTime.now()
    }

    await job.save()

    await this.publishDraftFormIfNeeded(job)

    // Historique de changement de statut (utilisé par le dashboard)
    if (payload.status && payload.status !== previousStatus) {
      await JobStatusHistory.create({
        jobId: job.id,
        fromStatus: previousStatus,
        toStatus: payload.status,
        changedByType: 'user',
        changedByUserId: user.id,
      })
    }

    await job.load('organization')
    await job.load('user')

    return response.ok(job)
  }

  /**
   * DELETE /jobs/:id
   * Supprime un job
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const job = await Job.query()
      .where('id', params.id)
      .andWhere('organization_id', user.organizationId)
      .firstOrFail()

    await job.delete()

    return response.noContent()
  }
}
