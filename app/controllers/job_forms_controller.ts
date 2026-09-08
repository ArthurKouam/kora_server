import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import { validateFormDefinition } from '#services/form_definition_validator'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class JobFormsController {
  private async scopedJob(auth: HttpContext['auth'], jobId: string) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) return null

    return Job.query().where('id', jobId).andWhere('organization_id', organizationId).first()
  }

  /**
   * GET /jobs/:id/form
   * Retourne le brouillon courant, la version active et la liste des versions.
   */
  async show({ auth, params, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const versions = await JobFormVersion.query().where('job_id', job.id).orderBy('version', 'desc')

    const draft = versions.find((version) => !version.publishedAt) ?? null
    const active =
      versions.find(
        (version) => job.activeFormVersionId && version.id === job.activeFormVersionId
      ) ?? null

    return response.ok({
      active: active ?? null,
      draft,
      history: versions.map((version) => ({
        id: version.id,
        version: version.version,
        publishedAt: version.publishedAt,
      })),
    })
  }

  /**
   * PUT /jobs/:id/form/draft
   * Crée ou met à jour le brouillon du formulaire du poste.
   */
  async saveDraft({ auth, params, request, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const user = auth.use('web').getUserOrFail()

    const payload = request.body()
    const result = validateFormDefinition(payload?.fields !== undefined ? payload : { fields: [] })

    if (!result.valid) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    const definition = { fields: (payload as { fields: unknown }).fields }

    const draft = await JobFormVersion.query()
      .where('job_id', job.id)
      .whereNull('published_at')
      .first()

    if (draft) {
      draft.definition = definition
      await draft.save()
      return response.ok(draft)
    }

    const lastVersion = await JobFormVersion.query().where('job_id', job.id).max('version').first()

    const nextVersion = (lastVersion?.$extras.max_version ?? 0) + 1

    const created = await JobFormVersion.create({
      jobId: job.id,
      version: nextVersion,
      definition,
      createdBy: user.id,
    })

    return response.created(created)
  }

  /**
   * POST /jobs/:id/form/draft/publish
   * Publie le brouillon et en fait la version active du poste.
   */
  async publish({ auth, params, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const draft = await JobFormVersion.query()
      .where('job_id', job.id)
      .whereNull('published_at')
      .first()

    if (!draft) {
      return response.unprocessableEntity({ error: 'No draft to publish' })
    }

    draft.publishedAt = DateTime.now()
    await draft.save()

    job.activeFormVersionId = draft.id
    await job.save()

    return response.ok(draft)
  }

  /**
   * DELETE /jobs/:id/form/draft
   * Supprime le brouillon. Les versions publiées ne sont pas supprimables.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const draft = await JobFormVersion.query()
      .where('job_id', job.id)
      .whereNull('published_at')
      .first()

    if (!draft) {
      return response.notFound({ error: 'No draft found' })
    }

    await draft.delete()

    return response.noContent()
  }
}
