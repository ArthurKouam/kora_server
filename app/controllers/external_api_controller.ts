import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import Application from '#models/application'
import Candidate from '#models/candidate'
import Job from '#models/job'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/** Un identifiant non-UUID ferait échouer la requête en 500 côté PostgreSQL. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Les statuts sont des colonnes `enum` PostgreSQL : une valeur inconnue ferait
 * échouer la requête en 500. On valide donc le filtre avant de l'appliquer.
 */
const JOB_STATUSES: readonly string[] = ['draft', 'published', 'paused', 'closed', 'archived']

const APPLICATION_STATUSES: readonly string[] = [
  'new',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
]

type Request = HttpContext['request']

type Paginator = {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
}

function tenant(ctx: HttpContext): Organization {
  if (!ctx.organization) throw new Error('Organization middleware is missing')
  return ctx.organization
}

function pagination(request: Request): { page: number; limit: number } {
  const page = Number.parseInt(String(request.input('page', 1)), 10)
  const limit = Number.parseInt(String(request.input('limit', DEFAULT_LIMIT)), 10)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT,
  }
}

function paginationMeta(paginator: Paginator) {
  return {
    page: paginator.currentPage,
    perPage: paginator.perPage,
    total: paginator.total,
    lastPage: paginator.lastPage,
  }
}

/** Filtre texte : une chaîne vide vaut absence de filtre. */
function textFilter(request: Request, name: string): string | null {
  const value = request.input(name)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function jobPayload(job: Job) {
  return {
    id: job.id,
    title: job.title,
    slug: job.slug,
    status: job.status,
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    benefits: job.benefits,
    employmentType: job.employmentType,
    workplaceType: job.workplaceType,
    experienceLevel: job.experienceLevel,
    location: job.location,
    city: job.city,
    country: job.country,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    headcount: job.headcount,
    publishedAt: job.publishedAt,
    closingDate: job.closingDate,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

function candidatePayload(candidate: Candidate) {
  return {
    id: candidate.id,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    city: candidate.city,
    country: candidate.country,
    bio: candidate.bio,
    avatarUrl: candidate.avatarUrl,
    linkedinUrl: candidate.linkedinUrl,
    websiteUrl: candidate.websiteUrl,
    portfolioUrl: candidate.portfolioUrl,
    githubUrl: candidate.githubUrl,
    source: candidate.source,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

function applicationPayload(application: Application) {
  return {
    id: application.id,
    status: application.status,
    source: application.source,
    coverLetter: application.coverLetter,
    appliedAt: application.appliedAt,
    updatedAt: application.updatedAt,
    hiredAt: application.hiredAt,
    rejectedAt: application.rejectedAt,
    candidate: application.candidate
      ? {
          id: application.candidate.id,
          firstName: application.candidate.firstName,
          lastName: application.candidate.lastName,
          email: application.candidate.email,
        }
      : null,
    job: application.job
      ? {
          id: application.job.id,
          title: application.job.title,
          slug: application.job.slug,
        }
      : null,
  }
}

/**
 * API externe en lecture seule, authentifiée par clé d'organisation.
 *
 * Les réponses sont volontairement explicites et stables : elles ne réutilisent
 * pas la sérialisation Lucid de l'API interne, qui suit les besoins de l'UI et
 * exposerait des relations internes (notes, évaluations, auteurs des
 * changements de statut).
 */
export default class ExternalApiController {
  /** GET /api/external/v1/me — vérifie une clé et identifie l'organisation. */
  async me(ctx: HttpContext) {
    const organization = tenant(ctx)
    const key = ctx.apiKey

    return ctx.response.ok({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      key: key
        ? {
            name: key.name,
            prefix: key.prefix,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
          }
        : null,
    })
  }

  /** GET /api/external/v1/jobs */
  async jobs(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { request, response } = ctx
    const { page, limit } = pagination(request)

    const query = Job.query()
      .where('organization_id', organization.id)
      .orderBy('created_at', 'desc')

    const status = textFilter(request, 'status')
    if (status) {
      if (!JOB_STATUSES.includes(status)) {
        return response.unprocessableEntity({
          error: 'status must be one of: ' + JOB_STATUSES.join(', ') + '.',
          code: 'invalid_filter',
        })
      }
      query.where('status', status)
    }

    const search = textFilter(request, 'search')
    if (search) query.whereILike('title', `%${search}%`)

    const paginator = await query.paginate(page, limit)

    return response.ok({
      data: paginator.all().map(jobPayload),
      meta: paginationMeta(paginator),
    })
  }

  /** GET /api/external/v1/jobs/:id */
  async job(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, response } = ctx

    if (!UUID.test(String(params.id))) {
      return response.notFound({ error: 'Job not found' })
    }

    const job = await Job.query()
      .where('id', String(params.id))
      .where('organization_id', organization.id)
      .first()

    if (!job) return response.notFound({ error: 'Job not found' })

    return response.ok(jobPayload(job))
  }

  /** GET /api/external/v1/candidates */
  async candidates(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { request, response } = ctx
    const { page, limit } = pagination(request)

    const query = Candidate.query()
      .where('organization_id', organization.id)
      .orderBy('updated_at', 'desc')

    const search = textFilter(request, 'search')
    if (search) {
      query.where((candidatesQuery) => {
        candidatesQuery
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    const jobId = textFilter(request, 'jobId')
    if (jobId !== null) {
      if (!UUID.test(jobId)) {
        return response.unprocessableEntity({
          error: 'jobId must be a valid UUID.',
          code: 'invalid_filter',
        })
      }
      query.whereHas('applications', (applicationsQuery) => {
        applicationsQuery.where('job_id', jobId)
      })
    }

    const city = textFilter(request, 'city')
    if (city) query.where('city', city)

    const country = textFilter(request, 'country')
    if (country) query.where('country', country)

    const paginator = await query.paginate(page, limit)

    return response.ok({
      data: paginator.all().map(candidatePayload),
      meta: paginationMeta(paginator),
    })
  }

  /** GET /api/external/v1/candidates/:id */
  async candidate(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, response } = ctx

    if (!UUID.test(String(params.id))) {
      return response.notFound({ error: 'Candidate not found' })
    }

    const candidate = await Candidate.query()
      .where('id', String(params.id))
      .where('organization_id', organization.id)
      .preload('experiences', (query) => query.orderBy('start_date', 'desc'))
      .preload('educations', (query) => query.orderBy('start_date', 'desc'))
      .preload('skills', (query) => query.preload('skill'))
      .preload('applications', (query) =>
        query
          .preload('job', (jobsQuery) => jobsQuery.select('id', 'title', 'slug'))
          .orderBy('applied_at', 'desc')
      )
      .first()

    if (!candidate) return response.notFound({ error: 'Candidate not found' })

    return response.ok({
      ...candidatePayload(candidate),
      experiences: candidate.experiences.map((experience) => ({
        id: experience.id,
        position: experience.position,
        company: experience.company,
        location: experience.location,
        description: experience.description,
        startDate: experience.startDate,
        endDate: experience.endDate,
        isCurrent: experience.isCurrent,
      })),
      educations: candidate.educations.map((education) => ({
        id: education.id,
        institution: education.institution,
        degree: education.degree,
        fieldOfStudy: education.fieldOfStudy,
        location: education.location,
        description: education.description,
        startDate: education.startDate,
        endDate: education.endDate,
      })),
      skills: candidate.skills.map((candidateSkill) => ({
        id: candidateSkill.skill?.id ?? candidateSkill.skillId,
        name: candidateSkill.skill?.name ?? null,
        slug: candidateSkill.skill?.slug ?? null,
        category: candidateSkill.skill?.category ?? null,
        level: candidateSkill.level,
        yearsOfExperience: candidateSkill.yearsOfExperience,
      })),
      applications: candidate.applications.map((application) => ({
        id: application.id,
        jobId: application.jobId,
        jobTitle: application.job?.title ?? null,
        jobSlug: application.job?.slug ?? null,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.updatedAt,
        hiredAt: application.hiredAt,
        rejectedAt: application.rejectedAt,
      })),
    })
  }

  /** GET /api/external/v1/applications */
  async applications(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { request, response } = ctx
    const { page, limit } = pagination(request)

    const query = Application.query()
      .whereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organization.id))
      .preload('candidate', (candidatesQuery) =>
        candidatesQuery.select('id', 'first_name', 'last_name', 'email')
      )
      .preload('job', (jobsQuery) => jobsQuery.select('id', 'title', 'slug'))
      .orderBy('applied_at', 'desc')

    const status = textFilter(request, 'status')
    if (status) {
      if (!APPLICATION_STATUSES.includes(status)) {
        return response.unprocessableEntity({
          error: 'status must be one of: ' + APPLICATION_STATUSES.join(', ') + '.',
          code: 'invalid_filter',
        })
      }
      query.where('status', status)
    }

    for (const [param, column] of [
      ['jobId', 'job_id'],
      ['candidateId', 'candidate_id'],
    ] as const) {
      const value = textFilter(request, param)
      if (value === null) continue

      if (!UUID.test(value)) {
        return response.unprocessableEntity({
          error: `${param} must be a valid UUID.`,
          code: 'invalid_filter',
        })
      }
      query.where(column, value)
    }

    const paginator = await query.paginate(page, limit)

    return response.ok({
      data: paginator.all().map(applicationPayload),
      meta: paginationMeta(paginator),
    })
  }

  /** GET /api/external/v1/applications/:id */
  async application(ctx: HttpContext) {
    const organization = tenant(ctx)
    const { params, response } = ctx

    if (!UUID.test(String(params.id))) {
      return response.notFound({ error: 'Application not found' })
    }

    const application = await Application.query()
      .where('id', String(params.id))
      .whereHas('job', (jobsQuery) => jobsQuery.where('organization_id', organization.id))
      .preload('candidate', (candidatesQuery) =>
        candidatesQuery.select('id', 'first_name', 'last_name', 'email')
      )
      .preload('job', (jobsQuery) => jobsQuery.select('id', 'title', 'slug'))
      .preload('statusHistory', (historyQuery) =>
        historyQuery.orderBy('created_at', 'asc').limit(50)
      )
      .first()

    if (!application) return response.notFound({ error: 'Application not found' })

    return response.ok({
      ...applicationPayload(application),
      answers: application.answers,
      statusHistory: application.statusHistory.map((entry) => ({
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        changedByType: entry.changedByType,
        reason: entry.reason,
        createdAt: entry.createdAt,
      })),
    })
  }
}
