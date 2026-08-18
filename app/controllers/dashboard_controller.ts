import type { HttpContext } from '@adonisjs/core/http'
import DashboardStatsService from '#services/dashboard_stats_service'

export default class DashboardController {
  /**
   * GET /dashboard/stats
   * Retourne les 4 KPI du dashboard, scopés sur l'organisation de l'utilisateur connecté.
   * organizationId vient TOUJOURS du user authentifié (guard 'web' ou 'api'),
   * jamais d'un param client (sinon un recruteur pourrait lire les stats d'une autre entreprise).
   */
  async stats({ auth, response }: HttpContext) {
    // Utilise le guard 'web' ou 'api' pour s'assurer que c'est un User (avec organizationId)
    // et non un Candidate
    const user = auth.use('web').getUserOrFail()

    await user.load('organization')

    // Vérifie que l'utilisateur a bien une organisation
    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const stats = await DashboardStatsService.getStats(user.organizationId)

    return response.ok({
      openJobs: stats.openJobs,
      activeCandidates: stats.activeCandidates,
      interviewsThisWeek: stats.interviewsThisWeek,
      avgTimeToHire: {
        ...stats.avgTimeToHire,
        unit: 'jours',
        // Seul KPI où une baisse est positive : le front doit inverser la couleur
        // de la flèche (vert si trend = 'down', rouge si trend = 'up').
        positiveDirection: 'down',
      },
    })
  }

  /**
   * GET /dashboard/upcoming-interviews
   * Retourne la liste des prochains entretiens (7 jours) pour l'organisation de l'utilisateur.
   */
  async upcomingInterviews({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()

    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const interviews = await DashboardStatsService.getUpcomingInterviews(user.organizationId)

    return response.ok(interviews)
  }

  /**
   * GET /dashboard/application-status-stats
   * Retourne le nombre de candidatures par statut (New, Screening, Interview, Offer)
   * pour l'organisation de l'utilisateur.
   */
  async applicationStatusStats({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()

    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const stats = await DashboardStatsService.getApplicationStatusStats(user.organizationId)

    return response.ok(stats)
  }

  /**
   * GET /dashboard/job-status-stats
   * Retourne le nombre de postes par statut (Draft, Published, Paused, Closed)
   * pour l'organisation de l'utilisateur.
   */
  async jobStatusStats({ auth, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()

    await user.load('organization')

    if (!user.organizationId) {
      return response.forbidden({ error: 'User does not belong to any organization' })
    }

    const stats = await DashboardStatsService.getJobStatusStats(user.organizationId)

    return response.ok(stats)
  }
}
