import Application from '#models/application'
import Candidate from '#models/candidate'
import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

async function fixtures(role = 'recruiter') {
  const suffix = randomUUID()
  const organization = await Organization.create({ name: `Org ${suffix}`, slug: `org-${suffix}` })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role,
    firstName: 'Alice',
    lastName: 'Recruiter',
  })
  const candidate = await Candidate.create({
    email: `candidate-${suffix}@example.test`,
    firstName: 'Jean',
    lastName: 'Candidat',
  })
  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: 'Développeur',
    slug: `job-${suffix}`,
    status: 'published',
    headcount: 1,
  })
  const application = await Application.create({
    jobId: job.id,
    candidateId: candidate.id,
    status: 'new',
    appliedAt: DateTime.now(),
  })
  return { organization, user, candidate, job, application }
}

test.group('Application notes', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('creates and lists a note with its author', async ({ client, assert }) => {
    const { user, application } = await fixtures('recruiter')
    const url = `/api/v1/dashboard/applications/${application.id}/notes`

    const response = await client.post(url).loginAs(user).json({ content: 'À recontacter lundi.' })
    response.assertStatus(201)

    const list = await client.get(url).loginAs(user)
    list.assertStatus(200)
    const body = list.body() as { content: string; author: { id: string } }[]
    assert.lengthOf(body, 1)
    assert.equal(body[0].content, 'À recontacter lundi.')
    assert.equal(body[0].author.id, user.id)
  })

  test('rejects an interviewer without the note permission', async ({ client }) => {
    const { user, application } = await fixtures('interviewer')

    const response = await client
      .post(`/api/v1/dashboard/applications/${application.id}/notes`)
      .loginAs(user)
      .json({ content: 'Tentative.' })

    response.assertStatus(403)
  })

  test('lets only the author edit or delete a note', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures('recruiter')
    const other = await User.create({
      organizationId: organization.id,
      email: `other-${randomUUID()}@example.test`,
      password: 'not-used-in-tests',
      role: 'recruiter',
    })
    const base = `/api/v1/dashboard/applications/${application.id}/notes`

    const created = await client.post(base).loginAs(user).json({ content: 'Note initiale.' })
    const noteId = (created.body() as { id: string }).id

    const forbiddenUpdate = await client
      .put(`${base}/${noteId}`)
      .loginAs(other)
      .json({ content: 'Piratage' })
    forbiddenUpdate.assertStatus(403)
    const forbiddenDelete = await client.delete(`${base}/${noteId}`).loginAs(other)
    forbiddenDelete.assertStatus(403)

    const updated = await client.put(`${base}/${noteId}`).loginAs(user).json({ content: 'Note modifiée.' })
    updated.assertStatus(200)
    assert.equal((updated.body() as { content: string }).content, 'Note modifiée.')

    const deleted = await client.delete(`${base}/${noteId}`).loginAs(user)
    deleted.assertStatus(200)
  })

  test('scopes notes by organization', async ({ client }) => {
    const tenantA = await fixtures('recruiter')
    const tenantB = await fixtures('recruiter')

    const response = await client
      .get(`/api/v1/dashboard/applications/${tenantB.application.id}/notes`)
      .loginAs(tenantA.user)

    response.assertStatus(404)
  })
})
