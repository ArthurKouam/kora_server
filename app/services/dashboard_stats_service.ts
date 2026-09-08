import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Statuts de candidature considérés comme "actifs" dans le pipeline :
 * le candidat est en cours de traitement, pas encore à un statut terminal
 * (hired / rejected / withdrawn).
 */
const ACTIVE_APPLICATION_STATUSES = ['new', 'screening', 'shortlisted', 'interview', 'offer']

export interface DashboardStat {
  value: number
  previousValue: number
  /** null si aucune comparaison possible (0 avant et après) */
  changePercent: number | null
  trend: 'up' | 'down' | 'stable'
}

export interface UpcomingInterview {
  id: string
  candidateName: string
  jobTitle: string
  scheduledAt: string
  type: string | null
  interviewerName: string | null
  applicationId: string
}

export interface ApplicationStatusCount {
  status: string
  count: number
}

export interface JobStatusCount {
  status: string
  count: number
}

/**
 * Construit un objet stat homogène à partir de 2 compteurs (actuel / il y a 7 jours).
 * Gère le cas previous = 0 sans jamais renvoyer Infinity/NaN au front.
 */
function buildStat(current: number, previous: number): DashboardStat {
  if (previous === 0 && current === 0) {
    return { value: current, previousValue: previous, changePercent: null, trend: 'stable' }
  }

  if (previous === 0) {
    // Pas de base de comparaison exploitable -> convention +100%
    return { value: current, previousValue: previous, changePercent: 100, trend: 'up' }
  }

  const changePercent = ((current - previous) / previous) * 100
  const trend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'stable'

  return {
    value: current,
    previousValue: previous,
    changePercent: Math.round(changePercent * 10) / 10,
    trend,
  }
}

export default class DashboardStatsService {
  /**
   * Récupère les 4 KPI en parallèle (Promise.all).
   * Latence totale = celle de la requête la plus lente, pas la somme des 4.
   */
  static async getStats(organizationId: string) {
    const [openJobs, activeCandidates, interviewsThisWeek, avgTimeToHire] = await Promise.all([
      this.getOpenJobsStat(organizationId),
      this.getActiveCandidatesStat(organizationId),
      this.getInterviewsThisWeekStat(organizationId),
      this.getAverageTimeToHireStat(organizationId),
    ])

    return { openJobs, activeCandidates, interviewsThisWeek, avgTimeToHire }
  }

  /**
   * Récupère le nombre de candidatures par statut (New, Screening, Interview, Offer)
   * pour l'organisation donnée.
   */
  static async getApplicationStatusStats(
    organizationId: string
  ): Promise<ApplicationStatusCount[]> {
    const statuses = ['new', 'screening', 'interview', 'offer']

    const rows = await db
      .from('applications as a')
      .innerJoin('jobs as j', 'j.id', 'a.job_id')
      .where('j.organization_id', organizationId)
      .whereIn('a.status', statuses)
      .select('a.status', db.raw('COUNT(*) as count'))
      .groupBy('a.status')

    // S'assurer que tous les status sont présents, même avec count = 0
    const resultMap = new Map<string, number>()
    for (const status of statuses) {
      resultMap.set(status, 0)
    }

    for (const row of rows) {
      resultMap.set(row.status, Number(row.count))
    }

    return statuses.map((status) => ({
      status,
      count: resultMap.get(status) || 0,
    }))
  }

  /**
   * Récupère le nombre de postes par statut (Draft, Published, Paused, Closed)
   * pour l'organisation donnée.
   */
  static async getJobStatusStats(organizationId: string): Promise<JobStatusCount[]> {
    const statuses = ['draft', 'published', 'paused', 'closed']

    const rows = await db
      .from('jobs')
      .where('organization_id', organizationId)
      .whereIn('status', statuses)
      .select('status', db.raw('COUNT(*) as count'))
      .groupBy('status')

    // S'assurer que tous les status sont présents, même avec count = 0
    const resultMap = new Map<string, number>()
    for (const status of statuses) {
      resultMap.set(status, 0)
    }

    for (const row of rows) {
      resultMap.set(row.status, Number(row.count))
    }

    return statuses.map((status) => ({
      status,
      count: resultMap.get(status) || 0,
    }))
  }

  /**
   * Récupère la liste des prochains entretiens (7 prochains jours)
   * avec le nom du candidat, du poste, la date, le type et l'interviewer.
   */
  static async getUpcomingInterviews(organizationId: string): Promise<UpcomingInterview[]> {
    const now = DateTime.now().toSQL()
    const inOneWeek = DateTime.now().plus({ days: 7 }).toSQL()

    const rows = await db
      .from('interviews as i')
      .innerJoin('applications as a', 'a.id', 'i.application_id')
      .innerJoin('jobs as j', 'j.id', 'a.job_id')
      .innerJoin('candidates as c', 'c.id', 'a.candidate_id')
      .leftJoin('users as u', 'u.id', 'i.created_by')
      .where('j.organization_id', organizationId)
      .where('i.scheduled_at', '>=', now)
      .where('i.scheduled_at', '<=', inOneWeek)
      .whereNot('i.status', 'cancelled')
      .orderBy('i.scheduled_at', 'asc')
      .select(
        'i.id',
        'c.first_name as candidateFirstName',
        'c.last_name as candidateLastName',
        'j.title as jobTitle',
        'i.scheduled_at',
        'i.type',
        'a.id as applicationId'
      )

    return rows.map((row) => ({
      id: row.id,
      candidateName: `${row.candidateFirstName || ''} ${row.candidateLastName || ''}`.trim(),
      jobTitle: row.jobTitle,
      scheduledAt: row.scheduled_at,
      type: row.type,
      interviewerName: null,
      applicationId: row.applicationId,
    }))
  }

  /**
   * 1. Postes ouverts
   * Actuel  = jobs.status = 'published'
   * J-7     = jobs qui étaient 'published' il y a 7 jours, reconstruit via job_status_history
   *          (comme pour les applications avec application_status_history).
   * Index utilisés : jobs(organization_id, status) et job_status_history(job_id, created_at).
   */
  static async getOpenJobsStat(organizationId: string): Promise<DashboardStat> {
    const weekAgo = DateTime.now().minus({ days: 7 }).toSQL()

    const row = await db
      .from('jobs as j')
      .where('j.organization_id', organizationId)
      .select(
        db.raw(`SUM(CASE WHEN j.status = 'published' THEN 1 ELSE 0 END) as current_count`),
        db.raw(
          `SUM(CASE
            WHEN (
              SELECT COALESCE(
                (
                  SELECT jsh.to_status
                  FROM job_status_history jsh
                  WHERE jsh.job_id = j.id AND jsh.created_at <= ?
                  ORDER BY jsh.created_at DESC
                  LIMIT 1
                ),
                j.status
              )
            ) = 'published'
            AND (
              SELECT COUNT(*) > 0
              FROM job_status_history jsh
              WHERE jsh.job_id = j.id AND jsh.created_at <= ?
            )
            THEN 1
            WHEN (
              SELECT COUNT(*) = 0
              FROM job_status_history jsh
              WHERE jsh.job_id = j.id AND jsh.created_at <= ?
            )
            AND j.published_at <= ?
            AND j.status = 'published'
            THEN 1
            ELSE 0
          END) as previous_count`,
          [weekAgo, weekAgo, weekAgo, weekAgo]
        )
      )
      .first()

    return buildStat(Number(row?.current_count ?? 0), Number(row?.previous_count ?? 0))
  }

  /**
   * 2. Candidats actifs
   * Candidats distincts ayant au moins une candidature "active" sur une offre de l'org.
   * Actuel = applications.status courant.
   * J-7    = statut reconstruit via application_status_history (le dernier changement
   *          antérieur au cutoff, ou 'new' par défaut si aucun changement n'existait encore).
   *          C'est fiable car cette table trace bien tous les changements de statut.
   * Index utilisés : applications UNIQUE(job_id, candidate_id) pour le join,
   * application_status_history INDEX(application_id) pour la sous-requête corrélée.
   */
  static async getActiveCandidatesStat(organizationId: string): Promise<DashboardStat> {
    const weekAgo = DateTime.now().minus({ days: 7 }).toSQL()
    const statuses = ACTIVE_APPLICATION_STATUSES
    const inClause = statuses.map(() => '?').join(',')

    const row = await db
      .from('applications as a')
      .innerJoin('jobs as j', 'j.id', 'a.job_id')
      .where('j.organization_id', organizationId)
      .select(
        db.raw(
          `COUNT(DISTINCT CASE WHEN a.status IN (${inClause}) THEN a.candidate_id END) as current_count`,
          statuses
        ),
        db.raw(
          `COUNT(DISTINCT CASE
            WHEN a.applied_at <= ?
              AND COALESCE(
                (
                  SELECT ash.to_status
                  FROM application_status_history ash
                  WHERE ash.application_id = a.id AND ash.created_at <= ?
                  ORDER BY ash.created_at DESC
                  LIMIT 1
                ),
                'new'
              ) IN (${inClause})
            THEN a.candidate_id
          END) as previous_count`,
          [weekAgo, weekAgo, ...statuses]
        )
      )
      .first()

    return buildStat(Number(row?.current_count ?? 0), Number(row?.previous_count ?? 0))
  }

  /**
   * 3. Entretiens (semaine)
   * Semaine calendaire ISO (lundi 00:00 -> lundi suivant), pas un rolling 7 jours,
   * car "cette semaine" est une notion calendaire pour l'utilisateur.
   * On exclut les entretiens annulés (status != 'cancelled') : un entretien annulé
   * n'est pas un signal d'activité de recrutement.
   * Index utilisé : interviews(scheduled_at) — le whereBetween restreint le scan
   * aux 14 derniers jours avant même l'agrégation.
   */
  static async getInterviewsThisWeekStat(organizationId: string): Promise<DashboardStat> {
    const now = DateTime.now()
    const weekStart = now.startOf('week') // lundi 00:00
    const weekEnd = weekStart.plus({ weeks: 1 }) // lundi prochain (exclusif)
    const prevWeekStart = weekStart.minus({ weeks: 1 })

    const row = await db
      .from('interviews as i')
      .innerJoin('applications as a', 'a.id', 'i.application_id')
      .innerJoin('jobs as j', 'j.id', 'a.job_id')
      .where('j.organization_id', organizationId)
      .andWhereNot('i.status', 'cancelled')
      .whereBetween('i.scheduled_at', [prevWeekStart.toSQL()!, weekEnd.toSQL()!])
      .select(
        db.raw(
          `SUM(CASE WHEN i.scheduled_at >= ? AND i.scheduled_at < ? THEN 1 ELSE 0 END) as current_count`,
          [weekStart.toSQL(), weekEnd.toSQL()]
        ),
        db.raw(
          `SUM(CASE WHEN i.scheduled_at >= ? AND i.scheduled_at < ? THEN 1 ELSE 0 END) as previous_count`,
          [prevWeekStart.toSQL(), weekStart.toSQL()]
        )
      )
      .first()

    return buildStat(Number(row?.current_count ?? 0), Number(row?.previous_count ?? 0))
  }

  /**
   * 4. Temps moyen d'embauche (en jours)
   * current  = moyenne (hired_at - applied_at) pour les embauches des 7 derniers jours
   * previous = idem pour les 7 jours d'avant
   * On ne remonte que 2 colonnes de dates sur une fenêtre de 14 jours (volume faible
   * par construction : le nombre d'embauches/semaine est toujours petit), donc calculer
   * la moyenne côté JS est plus simple que jongler avec EXTRACT(EPOCH)/DATEDIFF qui ne
   * sont pas portables entre Postgres et MySQL.
   *
   * Attention pour l'UI : ici une baisse (trend: 'down') est une BONNE nouvelle,
   * contrairement aux 3 autres KPI. À gérer côté controller/front (voir positiveDirection).
   */
  static async getAverageTimeToHireStat(organizationId: string): Promise<DashboardStat> {
    const now = DateTime.now()
    const weekStart = now.minus({ days: 7 })
    const twoWeeksAgo = now.minus({ days: 14 })

    const rows = await db
      .from('applications as a')
      .innerJoin('jobs as j', 'j.id', 'a.job_id')
      .where('j.organization_id', organizationId)
      .where('a.status', 'hired')
      .whereNotNull('a.hired_at')
      .whereNotNull('a.applied_at')
      .where('a.hired_at', '>=', twoWeeksAgo.toSQL()!)
      .select('a.applied_at', 'a.hired_at')

    const currentDurations: number[] = []
    const previousDurations: number[] = []

    for (const row of rows) {
      const applied = DateTime.fromJSDate(new Date(row.applied_at))
      const hired = DateTime.fromJSDate(new Date(row.hired_at))
      const days = hired.diff(applied, 'days').days

      if (hired >= weekStart) {
        currentDurations.push(days)
      } else {
        previousDurations.push(days)
      }
    }

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0

    return buildStat(
      Math.round(avg(currentDurations) * 10) / 10,
      Math.round(avg(previousDurations) * 10) / 10
    )
  }
}
