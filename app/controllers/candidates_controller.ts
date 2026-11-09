import type { HttpContext } from '@adonisjs/core/http'
import Candidate from '#models/candidate'
import Job from '#models/job'
import TalentPoolEntry from '#models/talent_pool_entry'
import { candidateIndexValidator } from '#validators/candidate'

export default class CandidatesController {
  /**
   * GET /candidates
   * Retourne les candidats ayant postulé à au moins une offre de l'organisation.
   *
   * La liste alimente l'annuaire global : recherche, filtre par poste, filtre
   * par localisation et tri par dernière activité. Les options de filtre sont
   * renvoyées avec la pagination pour éviter un second aller-retour côté UI.
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const payload = await request.validateUsing(candidateIndexValidator)
    const page = payload.page ?? 1
    const limit = payload.limit ?? 20
    const sort = payload.sort ?? 'last_activity_desc'
    const search = payload.search ?? null
    const jobId = payload.jobId ?? null

    const query = Candidate.query()
      .where('organization_id', organizationId)
      .preload('applications', (applicationsQuery) =>
        applicationsQuery
          .preload('job', (jobsQuery) => jobsQuery.select('id', 'title'))
          .orderBy('updated_at', 'desc')
      )

    if (search) {
      query.where((candidatesQuery) => {
        candidatesQuery
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    if (jobId) {
      query.whereHas('applications', (applicationsQuery) => {
        applicationsQuery.where('job_id', jobId)
      })
    }

    if (payload.city) {
      query.where('city', payload.city)
    }

    if (payload.country) {
      query.where('country', payload.country)
    }

    if (sort === 'name_asc') {
      query.orderBy('last_name', 'asc').orderBy('first_name', 'asc')
    } else {
      /**
       * La date affichée est celle de la dernière candidature, pas celle du
       * profil candidat : un candidat recontacté récemment doit remonter même
       * si sa fiche n'a pas été modifiée.
       */
      const direction = sort === 'last_activity_asc' ? 'asc' : 'desc'
      query.orderByRaw(
        `(
          SELECT MAX(COALESCE(applications.updated_at, applications.applied_at))
          FROM applications
          INNER JOIN jobs ON jobs.id = applications.job_id
          WHERE applications.candidate_id = candidates.id
            AND jobs.organization_id = ?
        ) ${direction}`,
        [organizationId]
      )
    }

    const [candidates, jobs, locations] = await Promise.all([
      query.paginate(page, limit),
      Job.query()
        .where('organization_id', organizationId)
        .select('id', 'title')
        .orderBy('title', 'asc'),
      Candidate.query()
        .where('organization_id', organizationId)
        .where((candidatesQuery) => {
          candidatesQuery.whereNotNull('city').orWhereNotNull('country')
        })
        .select('city', 'country')
        .groupBy('city', 'country')
        .orderBy('country', 'asc')
        .orderBy('city', 'asc'),
    ])

    return response.ok({
      data: candidates.all().map((candidate) => {
        const applications = candidate.applications.map((application) => ({
          id: application.id,
          jobId: application.jobId,
          jobTitle: application.job?.title ?? null,
          status: application.status,
          appliedAt: application.appliedAt,
          updatedAt: application.updatedAt,
        }))
        const latestApplication = candidate.applications[0]

        return {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          avatarUrl: candidate.avatarUrl,
          location: candidate.location,
          city: candidate.city,
          country: candidate.country,
          applicationsCount: applications.length,
          applications,
          lastActivity:
            latestApplication?.updatedAt ??
            latestApplication?.appliedAt ??
            candidate.updatedAt ??
            candidate.createdAt,
        }
      }),
      meta: {
        ...candidates.getMeta(),
        filters: {
          jobs: jobs.map((job) => ({ id: job.id, title: job.title })),
          locations: locations.map((location) => ({
            city: location.city,
            country: location.country,
            label: [location.city, location.country].filter(Boolean).join(', '),
          })),
        },
      },
    })
  }

  /**
   * GET /candidates/:id
   * Retourne les détails d'un candidat avec ses documents, expériences, formations, compétences et candidatures.
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const candidate = await Candidate.query()
      .where('id', params.id)
      .where('organization_id', organizationId)
      .preload('documents')
      .preload('experiences')
      .preload('educations')
      .preload('skills', (skillsQuery) => skillsQuery.preload('skill'))
      .preload('applications', (applicationsQuery) =>
        applicationsQuery.preload('job').preload('cvDocument').orderBy('applied_at', 'desc')
      )
      .firstOrFail()

    // Le bouton « Ajouter au vivier » de la fiche candidat est désactivé si le
    // candidat y figure déjà — même contrat que le détail d'une candidature.
    const poolEntry = await TalentPoolEntry.query()
      .where('organization_id', organizationId)
      .where('candidate_id', candidate.id)
      .select('id', 'status')
      .first()

    return response.ok({
      ...candidate.serialize(),
      talentPool: poolEntry ? { id: poolEntry.id, status: poolEntry.status } : null,
    })
  }
}
