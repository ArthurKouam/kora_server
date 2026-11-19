import ApiKey from '#models/api_key'
import Application from '#models/application'
import Candidate from '#models/candidate'
import Job from '#models/job'
import Organization from '#models/organization'
import Plan from '#models/plan'
import User from '#models/user'
import ApiKeyService from '#services/api_key_service'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const EXTERNAL = '/api/external/v1'
const MANAGEMENT = '/api/v1/settings/api-keys'

/**
 * Organisation dotée d'un forfait, d'une offre, d'un candidat et d'une
 * candidature — le jeu minimal pour éprouver l'API externe de bout en bout.
 */
async function orgFixture(slug = 'enterprise') {
  const suffix = randomUUID()
  const plan = await Plan.query().where('slug', slug).firstOrFail()

  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  organization.planId = plan.id
  // Jamais facturée = pas de blocage (cf. PlanService.isActive).
  organization.planExpiresAt = null
  await organization.save()

  const user = await User.create({
    organizationId: organization.id,
    email: `owner-${suffix}@example.test`,
    password: 'Motdepasse2026!',
    role: 'owner',
    firstName: 'Awa',
    lastName: 'Recruteur',
  })

  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: `Développeur ${suffix.slice(0, 8)}`,
    slug: `job-${suffix}`,
    status: 'published',
    headcount: 1,
    publishedAt: DateTime.now(),
  })

  const candidate = await Candidate.create({
    organizationId: organization.id,
    email: `candidate-${suffix}@example.test`,
    firstName: 'Marie',
    lastName: 'Dupont',
    city: 'Douala',
    country: 'Cameroun',
  })

  const application = await Application.create({
    jobId: job.id,
    candidateId: candidate.id,
    status: 'screening',
    source: 'career_page',
    appliedAt: DateTime.now(),
  })

  return { organization, plan, user, job, candidate, application }
}

test.group('Clés API — gestion', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test("crée une clé, n'affiche le token qu'une fois et le stocke haché", async ({
    client,
    assert,
  }) => {
    const { user, organization } = await orgFixture()

    const response = await client
      .post(MANAGEMENT)
      .loginAs(user)
      .json({ name: 'Reporting hebdomadaire' })

    response.assertStatus(201)

    const created = response.body() as unknown as {
      id: string
      name: string
      prefix: string
      token: string
    }
    assert.equal(created.name, 'Reporting hebdomadaire')
    assert.match(created.token, /^kh_live_/)
    assert.equal(created.prefix, created.token.slice(0, 16))

    const stored = await ApiKey.findOrFail(created.id)
    assert.equal(stored.organizationId, organization.id)
    assert.equal(stored.hash, ApiKeyService.hash(created.token))
    assert.notEqual(stored.hash, created.token)

    const list = await client.get(MANAGEMENT).loginAs(user)
    list.assertStatus(200)

    const keys = list.body() as unknown as Record<string, unknown>[]
    assert.lengthOf(keys, 1)
    assert.equal(keys[0].prefix, created.prefix)
    assert.notProperty(keys[0], 'token')
    assert.notProperty(keys[0], 'hash')
  })

  test('révoque une clé sans la supprimer', async ({ client, assert }) => {
    const { user, organization } = await orgFixture()
    const { key } = await ApiKeyService.create(organization.id, 'Ancienne clé', user.id)

    const response = await client.delete(`${MANAGEMENT}/${key.id}`).loginAs(user)
    response.assertStatus(200)

    const revoked = await ApiKey.findOrFail(key.id)
    assert.isNotNull(revoked.revokedAt)

    const list = await client.get(MANAGEMENT).loginAs(user)
    list.assertStatus(200)
    const keys = list.body() as unknown as { id: string; revokedAt: string | null }[]
    assert.isNotNull(keys.find((item) => item.id === key.id)?.revokedAt)
  })

  test('refuse la gestion des clés hors forfait Enterprise', async ({ client, assert }) => {
    const { user } = await orgFixture('plus')

    const response = await client.post(MANAGEMENT).loginAs(user).json({ name: 'Reporting' })

    response.assertStatus(402)
    const body = response.body() as unknown as { code: string; feature: string }
    assert.equal(body.code, 'plan_feature_required')
    assert.equal(body.feature, 'api')
  })

  test("ne laisse pas une organisation révoquer la clé d'une autre", async ({ client, assert }) => {
    const tenantA = await orgFixture()
    const tenantB = await orgFixture()
    const { key } = await ApiKeyService.create(tenantB.organization.id, 'Clé B', tenantB.user.id)

    const response = await client.delete(`${MANAGEMENT}/${key.id}`).loginAs(tenantA.user)

    response.assertStatus(404)
    const untouched = await ApiKey.findOrFail(key.id)
    assert.isNull(untouched.revokedAt)
  })

  test('réserve la gestion des clés aux rôles owner et admin', async ({ client }) => {
    const { organization } = await orgFixture()
    const recruiter = await User.create({
      organizationId: organization.id,
      email: `recruiter-${randomUUID()}@example.test`,
      password: 'Motdepasse2026!',
      role: 'recruiter',
    })

    const response = await client.get(MANAGEMENT).loginAs(recruiter)
    response.assertStatus(403)
  })
})

test.group('API externe — authentification et isolation', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('identifie le tenant à partir de la clé', async ({ client, assert }) => {
    const { organization, user } = await orgFixture()
    const { key, token } = await ApiKeyService.create(organization.id, 'Intégration', user.id)

    const response = await client.get(`${EXTERNAL}/me`).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const body = response.body() as unknown as {
      organization: { id: string; name: string }
      key: { name: string; prefix: string }
    }
    assert.equal(body.organization.id, organization.id)
    assert.equal(body.key.name, 'Intégration')
    assert.equal(body.key.prefix, key.prefix)

    const refreshed = await ApiKey.findOrFail(key.id)
    assert.isNotNull(refreshed.lastUsedAt)
  })

  test('refuse une requête sans clé ou avec une clé inconnue', async ({ client, assert }) => {
    const missing = await client.get(`${EXTERNAL}/jobs`)
    missing.assertStatus(401)
    assert.equal((missing.body() as unknown as { code: string }).code, 'missing_api_key')

    const invalid = await client
      .get(`${EXTERNAL}/jobs`)
      .header('Authorization', 'Bearer kh_live_inconnue')
    invalid.assertStatus(401)
    assert.equal((invalid.body() as unknown as { code: string }).code, 'invalid_api_key')
  })

  test('refuse une clé révoquée', async ({ client, assert }) => {
    const { organization, user } = await orgFixture()
    const { key, token } = await ApiKeyService.create(organization.id, 'Révoquée', user.id)

    const revoke = await client.delete(`${MANAGEMENT}/${key.id}`).loginAs(user)
    revoke.assertStatus(200)

    const response = await client.get(`${EXTERNAL}/me`).header('Authorization', `Bearer ${token}`)
    response.assertStatus(401)
    assert.equal((response.body() as unknown as { code: string }).code, 'invalid_api_key')
  })

  test("ne lit que les données de l'organisation propriétaire de la clé", async ({
    client,
    assert,
  }) => {
    const tenantA = await orgFixture()
    const tenantB = await orgFixture()
    const { token } = await ApiKeyService.create(
      tenantA.organization.id,
      'Intégration A',
      tenantA.user.id
    )

    const jobs = await client.get(`${EXTERNAL}/jobs`).header('Authorization', `Bearer ${token}`)
    jobs.assertStatus(200)
    const jobIds = (jobs.body() as unknown as { data: { id: string }[] }).data.map((job) => job.id)
    assert.deepEqual(jobIds, [tenantA.job.id])

    const otherJob = await client
      .get(`${EXTERNAL}/jobs/${tenantB.job.id}`)
      .header('Authorization', `Bearer ${token}`)
    otherJob.assertStatus(404)

    const otherCandidate = await client
      .get(`${EXTERNAL}/candidates/${tenantB.candidate.id}`)
      .header('Authorization', `Bearer ${token}`)
    otherCandidate.assertStatus(404)

    const otherApplication = await client
      .get(`${EXTERNAL}/applications/${tenantB.application.id}`)
      .header('Authorization', `Bearer ${token}`)
    otherApplication.assertStatus(404)
  })

  test("perd l'accès si l'organisation repasse sur un forfait inférieur", async ({
    client,
    assert,
  }) => {
    const { organization, user } = await orgFixture()
    const { token } = await ApiKeyService.create(organization.id, 'Intégration', user.id)

    const plus = await Plan.query().where('slug', 'plus').firstOrFail()
    organization.planId = plus.id
    await organization.save()

    const response = await client.get(`${EXTERNAL}/jobs`).header('Authorization', `Bearer ${token}`)
    response.assertStatus(402)
    assert.equal((response.body() as unknown as { code: string }).code, 'plan_feature_required')
  })
})

test.group('API externe — lecture des ressources', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('expose offres, candidats et candidatures avec filtres et pagination', async ({
    client,
    assert,
  }) => {
    const fixture = await orgFixture()
    const { token } = await ApiKeyService.create(
      fixture.organization.id,
      'Intégration',
      fixture.user.id
    )

    const jobs = await client
      .get(`${EXTERNAL}/jobs?status=published&search=Développeur`)
      .header('Authorization', `Bearer ${token}`)
    jobs.assertStatus(200)
    const jobsBody = jobs.body() as unknown as {
      data: { id: string; title: string; salaryMin: string | null }[]
      meta: { page: number; perPage: number; total: number; lastPage: number }
    }
    assert.lengthOf(jobsBody.data, 1)
    assert.equal(jobsBody.data[0].id, fixture.job.id)
    assert.equal(jobsBody.meta.total, 1)
    assert.equal(jobsBody.meta.page, 1)

    const candidates = await client
      .get(`${EXTERNAL}/candidates?search=Marie&jobId=${fixture.job.id}`)
      .header('Authorization', `Bearer ${token}`)
    candidates.assertStatus(200)
    const candidatesBody = candidates.body() as unknown as {
      data: { id: string; firstName: string; lastName: string; email: string }[]
    }
    assert.lengthOf(candidatesBody.data, 1)
    assert.equal(candidatesBody.data[0].id, fixture.candidate.id)
    assert.equal(candidatesBody.data[0].firstName, 'Marie')

    const candidateDetail = await client
      .get(`${EXTERNAL}/candidates/${fixture.candidate.id}`)
      .header('Authorization', `Bearer ${token}`)
    candidateDetail.assertStatus(200)
    const detail = candidateDetail.body() as unknown as {
      applications: { id: string; jobId: string; status: string }[]
      experiences: unknown[]
    }
    assert.lengthOf(detail.applications, 1)
    assert.equal(detail.applications[0].id, fixture.application.id)
    assert.deepEqual(detail.experiences, [])

    const applications = await client
      .get(`${EXTERNAL}/applications?status=screening&candidateId=${fixture.candidate.id}`)
      .header('Authorization', `Bearer ${token}`)
    applications.assertStatus(200)
    const applicationsBody = applications.body() as unknown as {
      data: {
        id: string
        status: string
        job: { id: string; title: string }
        candidate: { id: string; email: string }
      }[]
    }
    assert.lengthOf(applicationsBody.data, 1)
    assert.equal(applicationsBody.data[0].id, fixture.application.id)
    assert.equal(applicationsBody.data[0].job.id, fixture.job.id)
    assert.equal(applicationsBody.data[0].candidate.email, fixture.candidate.email)

    const applicationDetail = await client
      .get(`${EXTERNAL}/applications/${fixture.application.id}`)
      .header('Authorization', `Bearer ${token}`)
    applicationDetail.assertStatus(200)
    const applicationBody = applicationDetail.body() as unknown as {
      status: string
      statusHistory: unknown[]
      candidate: { id: string }
    }
    assert.equal(applicationBody.status, 'screening')
    assert.deepEqual(applicationBody.statusHistory, [])
    assert.equal(applicationBody.candidate.id, fixture.candidate.id)
  })

  test('refuse un identifiant de filtre invalide sans interroger PostgreSQL', async ({
    client,
    assert,
  }) => {
    const fixture = await orgFixture()
    const { token } = await ApiKeyService.create(
      fixture.organization.id,
      'Intégration',
      fixture.user.id
    )

    const response = await client
      .get(`${EXTERNAL}/applications?jobId=pas-un-uuid`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(422)
    assert.equal((response.body() as unknown as { code: string }).code, 'invalid_filter')

    const invalidStatus = await client
      .get(`${EXTERNAL}/applications?status=inconnu`)
      .header('Authorization', `Bearer ${token}`)

    invalidStatus.assertStatus(422)
    assert.equal((invalidStatus.body() as unknown as { code: string }).code, 'invalid_filter')
  })
})
