import type { HttpContext } from '@adonisjs/core/http'
import Job from '#models/job'
import { createJobValidator, updateJobValidator } from '#validators/job'
import { DateTime } from 'luxon'

export default class JobsController {
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

    const job = await Job.create({
      ...payload,
      organizationId: user.organizationId,
      createdBy: user.id,
      // Si status n'est pas fourni, on met 'draft' par défaut
      status: payload.status || 'draft',
      // Si published_at n'est pas fourni et status est 'published', on met la date actuelle
      publishedAt: payload.status === 'published' ? DateTime.now() : null,
    })

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
      applicationsQuery
        .preload('candidate')
        .orderBy('applied_at', 'desc')
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

    // Si on passe en status 'published', mettre published_at à maintenant
    if (payload.status === 'published' && !job.publishedAt) {
      payload.publishedAt = new Date()
    }

    job.merge(payload)
    await job.save()

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
