import Application from '#models/application'
import Candidate from '#models/candidate'
import Interview from '#models/interview'
import Job from '#models/job'
import JobEvaluationCriterion from '#models/job_evaluation_criterion'
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
  const criteria = await JobEvaluationCriterion.createMany([
    { jobId: job.id, label: 'Technique', position: 0 },
    { jobId: job.id, label: 'Communication', position: 1 },
  ])
  const application = await Application.create({
    jobId: job.id,
    candidateId: candidate.id,
    status: 'interview',
    appliedAt: DateTime.now(),
  })
  return { organization, user, candidate, job, criteria, application }
}

function criterionScores(criteria: JobEvaluationCriterion[], score: number) {
  return criteria.map((criterion) => ({ criterionId: criterion.id, score }))
}

test.group('Application evaluations', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('records a dossier evaluation and returns the stored criteria', async ({
    client,
    assert,
  }) => {
    const { user, application, criteria } = await fixtures('recruiter')

    const response = await client
      .put(`/api/v1/dashboard/applications/${application.id}/evaluations`)
      .loginAs(user)
      .json({
        criteria: [
          { criterionId: criteria[0].id, score: 4 },
          { criterionId: criteria[1].id, score: 4 },
        ],
        recommendation: 'yes',
        comments: 'Bon profil.',
      })

    response.assertStatus(200)
    const body = response.body() as {
      score: number
      criteria: { label: string; score: number }[]
      evaluatorId: string
    }
    assert.equal(body.score, 4)
    assert.lengthOf(body.criteria, 2)
    assert.equal(body.criteria[0].label, 'Technique')
    assert.equal(body.evaluatorId, user.id)
  })

  test('upserts the same evaluator instead of stacking fiches', async ({ client, assert }) => {
    const { user, application, criteria } = await fixtures('recruiter')
    const url = `/api/v1/dashboard/applications/${application.id}/evaluations`

    const first = await client.put(url).loginAs(user).json({ criteria: criterionScores(criteria, 3) })
    first.assertStatus(200)
    const second = await client.put(url).loginAs(user).json({ criteria: criterionScores(criteria, 5) })
    second.assertStatus(200)

    const list = await client.get(url).loginAs(user)
    list.assertStatus(200)
    const body = list.body() as { score: number }[]
    assert.lengthOf(body, 1)
    assert.equal(body[0].score, 5)
  })

  test('rejects a criterion that does not belong to the offer', async ({ client }) => {
    const { user, application } = await fixtures('recruiter')

    const response = await client
      .put(`/api/v1/dashboard/applications/${application.id}/evaluations`)
      .loginAs(user)
      .json({ criteria: [{ criterionId: randomUUID(), score: 4 }] })

    response.assertStatus(422)
  })

  test('lets the assigned interviewer note the interview but not the dossier', async ({
    client,
  }) => {
    const { user: interviewer, application, criteria } = await fixtures('interviewer')
    const interview = await Interview.create({
      applicationId: application.id,
      createdBy: interviewer.id,
      assignedTo: interviewer.id,
      scheduledAt: DateTime.now().plus({ days: 1 }),
      status: 'scheduled',
    })
    const url = `/api/v1/dashboard/applications/${application.id}/evaluations`

    const dossier = await client
      .put(url)
      .loginAs(interviewer)
      .json({ criteria: criterionScores(criteria, 4) })
    dossier.assertStatus(403)

    const interviewEvaluation = await client
      .put(url)
      .loginAs(interviewer)
      .json({ interviewId: interview.id, criteria: criterionScores(criteria, 4) })
    interviewEvaluation.assertStatus(200)
  })

  test('denies an interviewer who is not assigned to the interview', async ({ client }) => {
    const { organization, user: interviewer, application, criteria } = await fixtures('interviewer')
    const interview = await Interview.create({
      applicationId: application.id,
      createdBy: interviewer.id,
      assignedTo: interviewer.id,
      scheduledAt: DateTime.now().plus({ days: 1 }),
      status: 'scheduled',
    })
    const other = await User.create({
      organizationId: organization.id,
      email: `other-${randomUUID()}@example.test`,
      password: 'not-used-in-tests',
      role: 'interviewer',
    })

    const response = await client
      .put(`/api/v1/dashboard/applications/${application.id}/evaluations`)
      .loginAs(other)
      .json({ interviewId: interview.id, criteria: criterionScores(criteria, 4) })

    response.assertStatus(403)
  })

  test('scopes evaluations by organization', async ({ client }) => {
    const tenantA = await fixtures('recruiter')
    const tenantB = await fixtures('recruiter')

    const response = await client
      .get(`/api/v1/dashboard/applications/${tenantB.application.id}/evaluations`)
      .loginAs(tenantA.user)

    response.assertStatus(404)
  })
})
