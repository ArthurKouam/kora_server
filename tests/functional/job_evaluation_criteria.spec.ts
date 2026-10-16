import Job from '#models/job'
import JobEvaluationCriterion from '#models/job_evaluation_criterion'
import Organization from '#models/organization'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

async function fixtures(status = 'draft') {
  const suffix = randomUUID()
  const organization = await Organization.create({ name: `Org ${suffix}`, slug: `org-${suffix}` })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role: 'recruiter',
  })
  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: 'Développeur',
    slug: `job-${suffix}`,
    status,
    headcount: 1,
  })
  return { organization, user, job }
}

test.group('Job evaluation criteria', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('saves the ordered grid of a draft offer', async ({ client, assert }) => {
    const { user, job } = await fixtures('draft')

    const response = await client
      .put(`/api/v1/dashboard/jobs/${job.id}/evaluation-criteria`)
      .loginAs(user)
      .json({ criteria: [{ label: 'Technique' }, { label: 'Communication' }] })

    response.assertStatus(200)
    const body = response.body() as { criteria: { label: string; position: number }[]; locked: boolean }
    assert.lengthOf(body.criteria, 2)
    assert.equal(body.criteria[0].label, 'Technique')
    assert.equal(body.criteria[1].position, 1)
    assert.isFalse(body.locked)
  })

  test('allows the initial grid of a published offer but freezes it afterwards', async ({
    client,
  }) => {
    const { user, job } = await fixtures('published')
    const url = `/api/v1/dashboard/jobs/${job.id}/evaluation-criteria`

    // Première saisie autorisée même publiée…
    const initial = await client.put(url).loginAs(user).json({ criteria: [{ label: 'Technique' }] })
    initial.assertStatus(200)
    // …toute modification ultérieure est refusée.
    const frozen = await client.put(url).loginAs(user).json({ criteria: [{ label: 'Autre' }] })
    frozen.assertStatus(422)
  })

  test('duplicates the grid of another offer of the same organization', async ({
    client,
    assert,
  }) => {
    const { organization, user, job } = await fixtures('draft')
    const source = await Job.create({
      organizationId: organization.id,
      createdBy: user.id,
      title: 'Source',
      slug: `source-${randomUUID()}`,
      status: 'published',
      headcount: 1,
    })
    await JobEvaluationCriterion.createMany([
      { jobId: source.id, label: 'Technique', position: 0 },
      { jobId: source.id, label: 'Culture', position: 1 },
    ])

    const response = await client
      .post(`/api/v1/dashboard/jobs/${job.id}/evaluation-criteria/duplicate`)
      .loginAs(user)
      .json({ sourceJobId: source.id })

    response.assertStatus(200)
    const body = response.body() as { criteria: { label: string }[] }
    assert.deepEqual(
      body.criteria.map((criterion) => criterion.label),
      ['Technique', 'Culture']
    )
  })

  test('cannot duplicate from another organization', async ({ client }) => {
    const tenantA = await fixtures('draft')
    const tenantB = await fixtures('draft')

    const response = await client
      .post(`/api/v1/dashboard/jobs/${tenantA.job.id}/evaluation-criteria/duplicate`)
      .loginAs(tenantA.user)
      .json({ sourceJobId: tenantB.job.id })

    response.assertStatus(404)
  })
})
