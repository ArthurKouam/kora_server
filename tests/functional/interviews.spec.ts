import Application from '#models/application'
import Candidate from '#models/candidate'
import Interview from '#models/interview'
import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

/**
 * `PUT /interviews/:id` sert deux publics : les rôles pipeline qui pilotent
 * l'entretien, et l'interviewer assigné qui n'y dépose que ses notes.
 */
async function fixtures(role = 'recruiter') {
  const suffix = randomUUID().replace(/-/g, '')
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role,
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
    status: 'interview',
    appliedAt: DateTime.now(),
  })
  const interview = await Interview.create({
    applicationId: application.id,
    createdBy: user.id,
    assignedTo: user.id,
    scheduledAt: DateTime.now().plus({ days: 1 }),
    status: 'scheduled',
  })

  return { organization, user, candidate, job, application, interview }
}

test.group('Interviews — RBAC', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('l’interviewer assigné peut déposer ses notes', async ({ client, assert }) => {
    const { user, interview } = await fixtures('interviewer')

    const response = await client
      .put(`/api/v1/dashboard/interviews/${interview.id}`)
      .loginAs(user)
      .json({ notes: 'Très bon échange technique.' })

    response.assertStatus(200)
    assert.equal((response.body() as { notes: string }).notes, 'Très bon échange technique.')
  })

  test('l’interviewer ne peut pas noter un entretien qui ne lui est pas assigné', async ({
    client,
  }) => {
    const { organization, interview } = await fixtures('interviewer')
    const other = await User.create({
      organizationId: organization.id,
      email: `other-${randomUUID()}@example.test`,
      password: 'not-used-in-tests',
      role: 'interviewer',
    })

    const response = await client
      .put(`/api/v1/dashboard/interviews/${interview.id}`)
      .loginAs(other)
      .json({ notes: 'Tentative.' })

    response.assertStatus(403)
  })

  test('l’interviewer ne peut pas changer le statut, même sur son entretien', async ({
    client,
    assert,
  }) => {
    const { user, interview } = await fixtures('interviewer')

    const response = await client
      .put(`/api/v1/dashboard/interviews/${interview.id}`)
      .loginAs(user)
      .json({ status: 'completed' })

    response.assertStatus(403)
    await interview.refresh()
    assert.equal(interview.status, 'scheduled')
  })

  test('un recruteur peut changer le statut', async ({ client, assert }) => {
    const { user, interview } = await fixtures('recruiter')

    const response = await client
      .put(`/api/v1/dashboard/interviews/${interview.id}`)
      .loginAs(user)
      .json({ status: 'completed' })

    response.assertStatus(200)
    assert.equal((response.body() as { status: string }).status, 'completed')
  })

  test('un membre d’une autre organisation obtient 404', async ({ client }) => {
    const tenantA = await fixtures('recruiter')
    const tenantB = await fixtures('recruiter')

    const response = await client
      .put(`/api/v1/dashboard/interviews/${tenantB.interview.id}`)
      .loginAs(tenantA.user)
      .json({ notes: 'Tentative.' })

    response.assertStatus(404)
  })
})
