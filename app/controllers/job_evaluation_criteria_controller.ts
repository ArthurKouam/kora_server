import Job from '#models/job'
import JobEvaluationCriterion from '#models/job_evaluation_criterion'
import {
  duplicateJobEvaluationCriteriaValidator,
  saveJobEvaluationCriteriaValidator,
} from '#validators/job_evaluation_criteria'
import type { HttpContext } from '@adonisjs/core/http'

export default class JobEvaluationCriteriaController {
  /**
   * Offre de l'organisation courante, ou `null` si hors tenant.
   */
  private async scopedJob(auth: HttpContext['auth'], jobId: string) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) return null

    return Job.query().where('id', jobId).where('organization_id', organizationId).first()
  }

  /**
   * Les critères sont figés dès que l'offre a été publiée (statut ≠ draft) et
   * qu'elle possède déjà une grille. La toute première saisie reste possible,
   * y compris pour une offre créée directement en « publiée ».
   */
  private isLocked(status: string, criteriaCount: number) {
    return status !== 'draft' && criteriaCount > 0
  }

  /**
   * GET /jobs/:id/evaluation-criteria
   */
  async index({ auth, params, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) return response.notFound({ error: 'Job not found' })

    const criteria = await JobEvaluationCriterion.query()
      .where('job_id', job.id)
      .orderBy('position', 'asc')

    return response.ok({
      criteria,
      locked: this.isLocked(job.status, criteria.length),
    })
  }

  /**
   * PUT /jobs/:id/evaluation-criteria
   * Remplace l'intégralité de la grille (position = ordre du tableau).
   */
  async save({ auth, params, request, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) return response.notFound({ error: 'Job not found' })

    const existing = await JobEvaluationCriterion.query().where('job_id', job.id)
    if (this.isLocked(job.status, existing.length)) {
      return response.unprocessableEntity({
        error: "Les critères d'évaluation ne sont plus modifiables après la publication de l'offre.",
      })
    }

    const payload = await request.validateUsing(saveJobEvaluationCriteriaValidator)

    await JobEvaluationCriterion.query().where('job_id', job.id).delete()
    const criteria = await Promise.all(
      payload.criteria.map((criterion, index) =>
        JobEvaluationCriterion.create({
          jobId: job.id,
          label: criterion.label,
          position: index,
        })
      )
    )

    return response.ok({ criteria, locked: this.isLocked(job.status, criteria.length) })
  }

  /**
   * POST /jobs/:id/evaluation-criteria/duplicate
   * Copie la grille d'une autre offre de la même organisation.
   */
  async duplicate({ auth, params, request, response }: HttpContext) {
    const job = await this.scopedJob(auth, String(params.id))
    if (!job) return response.notFound({ error: 'Job not found' })

    const existing = await JobEvaluationCriterion.query().where('job_id', job.id)
    if (this.isLocked(job.status, existing.length)) {
      return response.unprocessableEntity({
        error: "Les critères d'évaluation ne sont plus modifiables après la publication de l'offre.",
      })
    }

    const payload = await request.validateUsing(duplicateJobEvaluationCriteriaValidator)

    const source = await Job.query()
      .where('id', payload.sourceJobId)
      .where('organization_id', job.organizationId)
      .first()
    if (!source) return response.notFound({ error: 'Source job not found' })

    const sourceCriteria = await JobEvaluationCriterion.query()
      .where('job_id', source.id)
      .orderBy('position', 'asc')

    if (sourceCriteria.length === 0) {
      return response.unprocessableEntity({ error: "L'offre source n'a aucun critère." })
    }

    await JobEvaluationCriterion.query().where('job_id', job.id).delete()
    const criteria = await Promise.all(
      sourceCriteria.map((criterion, index) =>
        JobEvaluationCriterion.create({
          jobId: job.id,
          label: criterion.label,
          position: index,
        })
      )
    )

    return response.ok({ criteria, locked: this.isLocked(job.status, criteria.length) })
  }

  /**
   * GET /jobs/evaluation-criteria-sources
   * Offres de l'organisation disposant déjà d'une grille (pour la duplication).
   */
  async sources({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const jobs = await Job.query()
      .where('organization_id', organizationId)
      .preload('evaluationCriteria')
      .orderBy('title', 'asc')

    return response.ok(
      jobs
        .filter((job) => job.evaluationCriteria.length > 0)
        .map((job) => ({
          jobId: job.id,
          jobTitle: job.title,
          criteriaCount: job.evaluationCriteria.length,
        }))
    )
  }
}
