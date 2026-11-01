import Application from '#models/application'
import Candidate from '#models/candidate'
import Job from '#models/job'
import Organization from '#models/organization'
import TalentPoolEntry from '#models/talent_pool_entry'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

async function fixtures() {
  const suffix = randomUUID()
  const organization = await Organization.create({ name: `Org ${suffix}`, slug: `org-${suffix}` })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role: 'recruiter',
  })
  const candidate = await Candidate.create({
    email: `candidate-${suffix}@example.test`,
    firstName: 'Marie',
    lastName: 'Dupont',
    city: 'Douala',
    country: 'Cameroun',
  })
  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: 'Développeuse',
    slug: `job-${suffix}`,
    status: 'published',
    headcount: 1,
  })
  const application = await Application.create({
    jobId: job.id,
    candidateId: candidate.id,
    status: 'screening',
    appliedAt: DateTime.now(),
  })
  return { organization, user, candidate, job, application }
}

test.group('Candidate detail', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  /**
   * La fiche candidat alimente le bouton « Ajouter au vivier » : elle doit
   * exposer le même contrat `talentPool` que le détail d'une candidature.
   */
  test('exposes a null talent pool when the candidate is not in it', async ({ client, assert }) => {
    const { user, candidate } = await fixtures()

    const response = await client
      .get(`/api/v1/dashboard/candidates/${candidate.id}`)
      .loginAs(user)

    response.assertStatus(200)
    assert.propertyVal(response.body(), 'talentPool', null)
  })

  test('exposes the talent pool entry once the candidate has been added', async ({
    client,
    assert,
  }) => {
    const { organization, user, candidate } = await fixtures()

    const entry = await TalentPoolEntry.create({
      organizationId: organization.id,
      candidateId: candidate.id,
      addedBy: user.id,
      source: 'manual',
      status: 'active',
      legalBasis: 'consent',
      consentAt: DateTime.now(),
      retentionExpiresAt: DateTime.now().plus({ months: 24 }),
    })

    const response = await client
      .get(`/api/v1/dashboard/candidates/${candidate.id}`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as { talentPool: { id: string; status: string } | null }
    assert.equal(body.talentPool?.id, entry.id)
    assert.equal(body.talentPool?.status, 'active')
  })
})

test.group('Candidate index', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('exposes application titles and filter options', async ({ client, assert }) => {
    const { user, job } = await fixtures()

    const response = await client.get('/api/v1/dashboard/candidates').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        applicationsCount: number
        applications: Array<{ jobId: string; jobTitle: string | null }>
      }>
      meta: {
        filters: {
          jobs: Array<{ id: string; title: string }>
          locations: Array<{ city: string | null; country: string | null; label: string }>
        }
      }
    }

    assert.lengthOf(body.data, 1)
    assert.equal(body.data[0].applicationsCount, 1)
    assert.equal(body.data[0].applications[0].jobId, job.id)
    assert.equal(body.data[0].applications[0].jobTitle, job.title)
    assert.lengthOf(body.meta.filters.jobs, 1)
    assert.equal(body.meta.filters.jobs[0].id, job.id)
    assert.deepEqual(body.meta.filters.locations[0], {
      city: 'Douala',
      country: 'Cameroun',
      label: 'Douala, Cameroun',
    })
  })

  test('filters by job, location and search', async ({ client, assert }) => {
    const { organization, user, candidate, job } = await fixtures()
    const suffix = randomUUID()

    const otherJob = await Job.create({
      organizationId: organization.id,
      createdBy: user.id,
      title: 'Designer',
      slug: `designer-${suffix}`,
      status: 'published',
      headcount: 1,
    })
    const otherCandidate = await Candidate.create({
      email: `other-${suffix}@example.test`,
      firstName: 'Jean',
      lastName: 'Martin',
      city: 'Yaoundé',
      country: 'Cameroun',
    })
    await Application.create({
      jobId: otherJob.id,
      candidateId: otherCandidate.id,
      status: 'new',
      appliedAt: DateTime.now(),
    })

    const byJob = await client
      .get(`/api/v1/dashboard/candidates?jobId=${job.id}`)
      .loginAs(user)
    byJob.assertStatus(200)
    const byJobBody = byJob.body() as { data: Array<{ id: string }> }
    assert.lengthOf(byJobBody.data, 1)
    assert.equal(byJobBody.data[0].id, candidate.id)

    const byLocation = await client
      .get(`/api/v1/dashboard/candidates?city=${encodeURIComponent('Yaoundé')}`)
      .loginAs(user)
    byLocation.assertStatus(200)
    const byLocationBody = byLocation.body() as { data: Array<{ id: string }> }
    assert.lengthOf(byLocationBody.data, 1)
    assert.equal(byLocationBody.data[0].id, otherCandidate.id)

    const bySearch = await client
      .get('/api/v1/dashboard/candidates?search=Jean')
      .loginAs(user)
    bySearch.assertStatus(200)
    const bySearchBody = bySearch.body() as { data: Array<{ id: string }> }
    assert.lengthOf(bySearchBody.data, 1)
    assert.equal(bySearchBody.data[0].id, otherCandidate.id)
  })
})
