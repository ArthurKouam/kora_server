import type { HttpContext } from '@adonisjs/core/http'
import Candidate from '#models/candidate'

export default class CandidatesController {
  /**
   * GET /candidates
   * Retourne les candidats ayant postulé à au moins une offre de l'organisation.
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    await user.load('organization')

    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const query = Candidate.query()
      .whereHas('applications', (applicationsQuery) =>
        applicationsQuery.whereHas('job', (jobsQuery) =>
          jobsQuery.where('organization_id', organizationId)
        )
      )
      .preload('applications', (applicationsQuery) =>
        applicationsQuery
          .whereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organizationId))
          .orderBy('updated_at', 'desc')
      )
      .orderBy('updated_at', 'desc')

    const { page = 1, limit = 20, search } = request.qs()

    if (search) {
      query.where((candidatesQuery) => {
        candidatesQuery
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    const candidates = await query.paginate(page, limit)

    return response.ok({
      data: candidates.all().map((candidate) => {
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
          applicationsCount: candidate.applications.length,
          lastActivity:
            latestApplication?.updatedAt ??
            latestApplication?.appliedAt ??
            candidate.updatedAt ??
            candidate.createdAt,
        }
      }),
      meta: candidates.getMeta(),
    })
  }
}
