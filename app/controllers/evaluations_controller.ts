import Application from '#models/application'
import Evaluation from '#models/evaluation'
import Interview from '#models/interview'
import JobEvaluationCriterion from '#models/job_evaluation_criterion'
import InterviewPolicy from '#policies/interview_policy'
import { can } from '#services/authorization'
import { upsertEvaluationValidator } from '#validators/evaluation'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Évaluations d'une candidature.
 *
 * Deux contextes partagent la même table :
 *   - `interviewId = null` → évaluation du dossier soumis à la postulation ;
 *   - `interviewId` renseigné → évaluation d'un entretien.
 *
 * Une seule fiche par (contexte, évaluateur) : un nouvel envoi met à jour la
 * fiche existante plutôt que d'en créer une seconde.
 */
export default class EvaluationsController {
  private async scopedApplication(auth: HttpContext['auth'], applicationId: string) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId
    if (!organizationId) return null

    return Application.query()
      .where('id', applicationId)
      .andWhereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
      .first()
  }

  /**
   * GET /applications/:id/evaluations
   */
  async index({ auth, params, response }: HttpContext) {
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const evaluations = await Evaluation.query()
      .where('application_id', application.id)
      .preload('evaluator')
      .orderBy('created_at', 'asc')

    return response.ok(evaluations)
  }

  /**
   * PUT /applications/:id/evaluations
   * Crée ou remplace la fiche de l'utilisateur courant pour le contexte donné.
   */
  async upsert({ auth, bouncer, params, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const payload = await request.validateUsing(upsertEvaluationValidator)
    const interviewId = payload.interviewId ?? null

    if (interviewId) {
      const interview = await Interview.query()
        .where('id', interviewId)
        .where('application_id', application.id)
        .first()
      if (!interview) return response.notFound({ error: 'Interview not found' })

      // Un interviewer ne note que l'entretien qui lui est assigné.
      if (can(user.role, 'interviews.update')) {
        await bouncer.with(InterviewPolicy).authorize('update', interview)
      } else {
        await bouncer.with(InterviewPolicy).authorize('updateFeedback', interview)
      }
    } else if (!can(user.role, 'applications.evaluate')) {
      return response.forbidden({ error: 'Insufficient permissions' })
    }

    // Les critères doivent appartenir à l'offre de la candidature.
    const jobCriteria = await JobEvaluationCriterion.query().where('job_id', application.jobId)
    const criteriaById = new Map(jobCriteria.map((criterion) => [criterion.id, criterion]))

    const criteria: { criterionId: string; label: string; score: number }[] = []
    for (const item of payload.criteria) {
      const criterion = criteriaById.get(item.criterionId)
      if (!criterion) {
        return response.unprocessableEntity({
          errors: [{ field: 'criteria', message: "Critère inconnu pour cette offre." }],
        })
      }
      criteria.push({ criterionId: criterion.id, label: criterion.label, score: item.score })
    }

    const average = criteria.reduce((sum, item) => sum + item.score, 0) / criteria.length
    const score = Math.round(average)

    const query = Evaluation.query()
      .where('application_id', application.id)
      .where('evaluator_id', user.id)
    if (interviewId) query.where('interview_id', interviewId)
    else query.whereNull('interview_id')

    let evaluation = await query.first()

    const attributes = {
      // `pg` sérialise un tableau JS en littéral de tableau Postgres, pas en
      // JSON : on stringify explicitement pour la colonne `jsonb`.
      criteria: JSON.stringify(criteria),
      score,
      recommendation: payload.recommendation ?? null,
      strengths: payload.strengths ?? null,
      weaknesses: payload.weaknesses ?? null,
      comments: payload.comments ?? null,
    }

    if (evaluation) {
      evaluation.merge(attributes)
      await evaluation.save()
    } else {
      evaluation = await Evaluation.create({
        applicationId: application.id,
        interviewId,
        evaluatorId: user.id,
        ...attributes,
      })
    }

    await evaluation.load('evaluator')
    // La colonne jsonb est écrite sous forme de chaîne : on restitue le
    // tableau pour une réponse cohérente avec l'API de lecture.
    evaluation.criteria = criteria
    return response.ok(evaluation)
  }

  /**
   * DELETE /applications/:id/evaluations/:evaluationId
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const application = await this.scopedApplication(auth, String(params.id))
    if (!application) return response.notFound({ error: 'Application not found' })

    const evaluation = await Evaluation.query()
      .where('id', String(params.evaluationId))
      .where('application_id', application.id)
      .first()
    if (!evaluation) return response.notFound({ error: 'Evaluation not found' })

    const isAuthor = evaluation.evaluatorId === user.id
    if (!isAuthor && !can(user.role, 'applications.evaluate')) {
      return response.forbidden({ error: 'Insufficient permissions' })
    }

    await evaluation.delete()
    return response.ok({ deleted: true })
  }
}
