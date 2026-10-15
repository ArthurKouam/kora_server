import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import { validateFormDefinition } from '#services/form_definition_validator'
import { duplicateJobFormValidator } from '#validators/job'
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
   * GET /jobs/form-sources
   * Postes de l'organisation disposant d'un formulaire publié, pour alimenter la
   * duplication d'un formulaire vers un autre poste.
   *
   * Route déclarée avant `/:id/form` : `/form-sources` est statique et doit
   * gagner avant que `:id` ne l'absorbe.
   */
  async sources({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const rows = await Job.query()
      .where('organization_id', organizationId)
      .whereNotNull('active_form_version_id')
      .where('status', 'published')
      .preload('activeFormVersion')
      .orderBy('title', 'asc')

    return response.ok(
      rows.map((job) => ({
        jobId: job.id,
        jobTitle: job.title,
        versionId: job.activeFormVersionId,
        version: job.activeFormVersion?.version ?? null,
        publishedAt: job.activeFormVersion?.publishedAt ?? null,
      }))
    )
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
   * POST /jobs/:id/form/draft/duplicate
   * Copie le formulaire d'un autre poste comme brouillon du poste cible.
   *
   * Sans `sourceVersionId`, on prend la version publiée du poste source et, à
   * défaut, sa version la plus récente.
   *
   * La copie remplace le brouillon éventuel du poste cible : il ne peut y en
   * avoir qu'un, garanti par un index unique partiel sur `(job_id) WHERE
   * published_at IS NULL`.
   */
  async duplicateDraft({ auth, params, request, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const payload = await request.validateUsing(duplicateJobFormValidator)

    // La source est scopingée par la même organisation : copier un formulaire
    // entre deux tenants n'a pas de sens et ne doit jamais être possible.
    const sourceJob = await Job.query()
      .where('id', payload.sourceJobId)
      .where('organization_id', job.organizationId)
      .first()

    if (!sourceJob) {
      return response.notFound({ error: 'Source job not found' })
    }

    if (sourceJob.id === job.id) {
      return response.unprocessableEntity({ error: 'A form cannot be duplicated onto itself.' })
    }

    const base = JobFormVersion.query().where('job_id', sourceJob.id)

    if (payload.sourceVersionId) {
      base.where('id', payload.sourceVersionId)
    } else if (sourceJob.activeFormVersionId) {
      base.where('id', sourceJob.activeFormVersionId)
    } else {
      base.whereNull('published_at')
    }

    const source = await base.orderBy('version', 'desc').first()

    if (!source) {
      return response.notFound({ error: 'Source job has no form to duplicate' })
    }

    // La définition vient d'une autre organisation : on la revalide plutôt que
    // de la recopier telle quelle.
    const result = validateFormDefinition(source.definition)
    if (!result.valid) {
      return response.unprocessableEntity({ errors: result.errors })
    }

    const user = auth.use('web').getUserOrFail()

    const draft = await JobFormVersion.query()
      .where('job_id', job.id)
      .whereNull('published_at')
      .first()

    if (draft) {
      draft.definition = source.definition
      await draft.save()
      return response.ok(draft)
    }

    const lastVersion = await JobFormVersion.query().where('job_id', job.id).max('version').first()
    const nextVersion = (lastVersion?.$extras.max_version ?? 0) + 1

    const created = await JobFormVersion.create({
      jobId: job.id,
      version: nextVersion,
      definition: source.definition,
      createdBy: user.id,
    })

    return response.created(created)
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
