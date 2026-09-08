import Application from '#models/application'
import Job from '#models/job'
import type { HttpContext } from '@adonisjs/core/http'

export default class ReportsController {
  /**
   * GET /dashboard/reports
   * Agrégations réelles pour la page Rapports :
   * - volume quotidien des candidatures (30 derniers jours)
   * - répartition par source
   * - entonnoir par statut
   * - totaux et taux de conversion
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const organizationId = user.organizationId

    if (!organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)

    const applications = await Application.query()
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.organization_id', organizationId)
      .select(
        'applications.status',
        'applications.source',
        'applications.applied_at',
        'applications.hired_at'
      )

    // Volume quotidien (30 derniers jours)
    const perDayMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const day = new Date(since)
      day.setDate(day.getDate() + i)
      perDayMap.set(day.toISOString().slice(0, 10), 0)
    }
    for (const application of applications) {
      const key = application.appliedAt.toISODate() ?? ''
      if (perDayMap.has(key)) {
        perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1)
      }
    }

    // Par source
    const sourceMap = new Map<string, number>()
    for (const application of applications) {
      const source = application.source ?? 'other'
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1)
    }

    // Entonnoir par statut
    const statusMap = new Map<string, number>()
    for (const application of applications) {
      statusMap.set(application.status, (statusMap.get(application.status) ?? 0) + 1)
    }

    const totalApplications = applications.length
    const hiredCount = statusMap.get('hired') ?? 0

    const activeJobs = await Job.query()
      .where('organization_id', organizationId)
      .whereIn('status', ['published', 'paused'])
      .select('id')

    return response.ok({
      perDay: Array.from(perDayMap.entries()).map(([date, count]) => ({ date, count })),
      perSource: Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      statusCounts: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      totals: {
        totalApplications,
        activeJobs: activeJobs.length,
        hiredCount,
        conversionRate:
          totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 1000) / 10 : 0,
      },
    })
  }
}
