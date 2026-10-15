import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import Organization from '#models/organization'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

/**
 * Ce qui coûte cher si c'est faux : copier un formulaire depuis une autre
 * organisation, écraser une version publiée, ou laisser deux brouillons sur un
 * même poste (ce que le serveur interdit par un index unique partiel).
 */

const FIELDS = {
  fields: [{ id: 'f_demo00001', type: 'text', label: 'Pourquoi ce poste ?', required: true }],
}

async function orgWithUser(role = 'owner') {
  const suffix = randomUUID()
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `owner-${suffix}@example.test`,
    password: 'Motdepasse2026!',
    role,
    firstName: 'Awa',
    lastName: 'Recruteur',
  })
  return { organization, user }
}

async function jobWithForm(
  organizationId: string,
  createdBy: string,
  options: { published?: boolean } = {}
) {
  const suffix = randomUUID()
  const job = await Job.create({
    organizationId,
    title: `Poste ${suffix}`,
    slug: `job-${suffix}`,
    status: 'published',
    createdBy,
  })

  const version = await JobFormVersion.create({
    jobId: job.id,
    version: 1,
    definition: FIELDS,
    createdBy,
    publishedAt: options.published === false ? null : DateTime.now(),
  })

  if (options.published !== false) {
    job.activeFormVersionId = version.id
    await job.save()
  }

  return { job, version }
}

test.group('Job forms — duplication', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('copie le formulaire publié d’un autre poste comme brouillon', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await orgWithUser()
    const { job: source } = await jobWithForm(organization.id, user.id)
    const { job: target } = await jobWithForm(organization.id, user.id, { published: false })

    // Le poste cible n'a qu'un brouillon : il doit être remplacé, pas dupliqué.
    const response = await client
      .post(`/api/v1/dashboard/jobs/${target.id}/form/draft/duplicate`)
      .loginAs(user)
      .json({ sourceJobId: source.id })

    response.assertStatus(200)
    assert.deepEqual(response.body().definition, FIELDS)

    const drafts = await JobFormVersion.query().where('job_id', target.id).whereNull('published_at')
    assert.lengthOf(drafts, 1)
  })

  test('ne copie jamais un formulaire depuis une autre organisation', async ({ client }) => {
    const { organization, user } = await orgWithUser()
    const { job: target } = await jobWithForm(organization.id, user.id, { published: false })

    const rival = await orgWithUser()
    const { job: foreignJob } = await jobWithForm(rival.organization.id, rival.user.id)

    const response = await client
      .post(`/api/v1/dashboard/jobs/${target.id}/form/draft/duplicate`)
      .loginAs(user)
      .json({ sourceJobId: foreignJob.id })

    response.assertStatus(404)
  })

  test('refuse de dupliquer un formulaire sur lui-même', async ({ client }) => {
    const { organization, user } = await orgWithUser()
    const { job } = await jobWithForm(organization.id, user.id)

    const response = await client
      .post(`/api/v1/dashboard/jobs/${job.id}/form/draft/duplicate`)
      .loginAs(user)
      .json({ sourceJobId: job.id })

    response.assertStatus(422)
  })

  test('un poste sans formulaire publié n’apparaît pas comme source', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await orgWithUser()
    await jobWithForm(organization.id, user.id, { published: false })

    const response = await client.get('/api/v1/dashboard/jobs/form-sources').loginAs(user)

    response.assertStatus(200)
    assert.lengthOf(response.body(), 0)
  })
})
