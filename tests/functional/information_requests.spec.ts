import SendInformationRequestEmail from '#jobs/send_information_request_email'
import SendInformationResponseNotification from '#jobs/send_information_response_notification'
import Application from '#models/application'
import ApplicationInformationRequest from '#models/application_information_request'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import Email from '#models/email'
import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import FileStorage from '#services/file_storage'
import {
  encryptInformationRequestToken,
  generateInformationRequestToken,
  hashInformationRequestToken,
} from '#services/information_request_tokens'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import mail from '@adonisjs/mail/services/main'
import { QueueManager } from '@adonisjs/queue'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const textField = {
  id: 'f_aaaaaaaaaaaa',
  type: 'text' as const,
  label: 'Précisions',
  required: true,
}

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
    source: 'career_page',
    appliedAt: DateTime.now(),
  })
  return { organization, user, candidate, job, application }
}

async function createRequest(options: {
  organizationId: string
  applicationId: string
  requestedBy: string
  token?: string
  status?: string
  expiresAt?: DateTime
  fields?: unknown[]
}) {
  const token = options.token ?? generateInformationRequestToken()
  const row = await ApplicationInformationRequest.create({
    organizationId: options.organizationId,
    applicationId: options.applicationId,
    requestedBy: options.requestedBy,
    definition: { fields: options.fields ?? [textField] },
    answers: null,
    message: 'Merci de préciser.',
    status: options.status ?? 'open',
    deliveryStatus: 'pending',
    responseDeliveryStatus: null,
    tokenHash: hashInformationRequestToken(token),
    deliveryError: null,
    responseDeliveryError: null,
    expiresAt: options.expiresAt ?? DateTime.now().plus({ days: 7 }),
    sentAt: null,
    submittedAt: options.status === 'submitted' ? DateTime.now() : null,
    cancelledAt: options.status === 'cancelled' ? DateTime.now() : null,
  })
  return { row, token }
}

test.group('Application information requests', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })
  group.each.teardown(() => {
    QueueManager.restore()
    mail.restore()
  })

  test('migration installs the partial unique open-request index', async ({ assert }) => {
    const result = await db.rawQuery<{ rows: { indexdef: string }[] }>(
      `select indexdef from pg_indexes where indexname =
       'application_information_requests_one_open_per_application'`
    )
    assert.lengthOf(result.rows, 1)
    assert.include(result.rows[0].indexdef, "WHERE (status = 'open'::text)")
  })

  test('creates a request, hides its hash, and queues email asynchronously', async ({ client }) => {
    const { user, application } = await fixtures()
    const queue = QueueManager.fake()

    const response = await client
      .post(`/api/v1/dashboard/applications/${application.id}/information-requests`)
      .loginAs(user)
      .json({ fields: [textField], message: 'Complétez votre dossier.' })

    response.assertStatus(201)
    response.assertBodyNotContains(['tokenHash', 'deliveryError'])
    const responseBody = response.body() as { id: string }
    queue.assertPushed(SendInformationRequestEmail, {
      queue: 'emails',
      payload: (value) => {
        const payload = value as {
          requestId: string
          expectedTokenHash: string
          encryptedToken: string
        }
        return (
          payload.requestId === responseBody.id &&
          payload.expectedTokenHash.length === 64 &&
          !payload.encryptedToken.includes(payload.expectedTokenHash)
        )
      },
    })
  })

  test('returns 409 for a second open request and allows historical requests', async ({
    client,
  }) => {
    const { user, application, organization } = await fixtures()
    QueueManager.fake()
    await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      status: 'submitted',
    })

    const responses = await Promise.all([
      client
        .post(`/api/v1/dashboard/applications/${application.id}/information-requests`)
        .loginAs(user)
        .json({ fields: [textField] }),
      client
        .post(`/api/v1/dashboard/applications/${application.id}/information-requests`)
        .loginAs(user)
        .json({ fields: [textField] }),
    ])
    responses.sort((left, right) => left.status() - right.status())
    responses[0].assertStatus(201)
    responses[1].assertStatus(409)
  })

  test('defaults expiration to seven days, enforces 1-30 days, and sweeps expired open rows', async ({
    client,
    assert,
  }) => {
    const { user, application, organization } = await fixtures()
    QueueManager.fake()

    for (const expiresAt of [
      DateTime.now().plus({ hours: 23 }).toISO(),
      DateTime.now().plus({ days: 31 }).toISO(),
    ]) {
      const invalid = await client
        .post(`/api/v1/dashboard/applications/${application.id}/information-requests`)
        .loginAs(user)
        .json({ fields: [textField], expiresAt })
      invalid.assertStatus(422)
    }

    const expired = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      expiresAt: DateTime.now().minus({ minutes: 1 }),
    })
    const created = await client
      .post(`/api/v1/dashboard/applications/${application.id}/information-requests`)
      .loginAs(user)
      .json({ fields: [textField] })
    created.assertStatus(201)
    await expired.row.refresh()
    assert.equal(expired.row.status, 'expired')
    const createdBody = created.body() as unknown as { expiresAt: string }
    const lifetime = DateTime.fromISO(createdBody.expiresAt).diffNow('days').days
    assert.approximately(lifetime, 7, 0.01)
  })

  test('scopes requests by organization and denies roles without the dedicated permission', async ({
    client,
  }) => {
    const tenantA = await fixtures('recruiter')
    const tenantB = await fixtures('recruiter')
    const admin = await User.create({
      organizationId: tenantA.organization.id,
      email: `admin-${randomUUID()}@example.test`,
      password: 'not-used-in-tests',
      role: 'admin',
    })
    QueueManager.fake()

    const crossTenant = await client
      .post(`/api/v1/dashboard/applications/${tenantB.application.id}/information-requests`)
      .loginAs(tenantA.user)
      .json({ fields: [textField] })
    crossTenant.assertStatus(404)

    const forbidden = await client
      .post(`/api/v1/dashboard/applications/${tenantA.application.id}/information-requests`)
      .loginAs(admin)
      .json({ fields: [textField] })
    forbidden.assertStatus(403)
  })

  test('returns the contracted public states and context without exposing submitted answers', async ({
    client,
  }) => {
    const { organization, application, job, user } = await fixtures()
    const invalid = await client.get('/api/v1/career/information-requests/not-a-token')
    invalid.assertStatus(404)

    const open = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
    })
    const openResult = await client.get(`/api/v1/career/information-requests/${open.token}`)
    openResult.assertStatus(200)
    openResult.assertBodyContains({
      status: 'open',
      organization: { name: organization.name },
      job: { title: job.title },
    })
    open.row.status = 'submitted'
    await open.row.save()

    for (const status of ['expired', 'cancelled'] as const) {
      const item = await createRequest({
        organizationId: organization.id,
        applicationId: application.id,
        requestedBy: user.id,
        status,
      })
      const result = await client.get(`/api/v1/career/information-requests/${item.token}`)
      result.assertStatus(410)
      result.assertBodyContains({ status })
    }

    const submitted = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      status: 'submitted',
    })
    submitted.row.answers = { [textField.id]: 'sensible' }
    await submitted.row.save()
    const result = await client.get(`/api/v1/career/information-requests/${submitted.token}`)
    result.assertStatus(200)
    result.assertBodyContains({ status: 'submitted' })
    result.assertBodyNotContains(['answers', 'sensible'])
  })

  test('validates JSON answers, rejects unknown keys, and makes submission immutable', async ({
    client,
    assert,
  }) => {
    const { organization, application, user } = await fixtures()
    const queue = QueueManager.fake()
    const item = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
    })

    const unknown = await client
      .post(`/api/v1/career/information-requests/${item.token}`)
      .json({ answers: { unknown: 'x', [textField.id]: 'valide' } })
    unknown.assertStatus(422)

    const submitted = await client
      .post(`/api/v1/career/information-requests/${item.token}`)
      .json({ answers: { [textField.id]: 'première réponse' } })
    submitted.assertStatus(200)
    queue.assertPushed(SendInformationResponseNotification, {
      payload: { requestId: item.row.id },
    })

    const duplicate = await client
      .post(`/api/v1/career/information-requests/${item.token}`)
      .json({ answers: { [textField.id]: 'écrasement' } })
    duplicate.assertStatus(200)
    await item.row.refresh()
    assert.equal(item.row.answers[textField.id], 'première réponse')
  })

  test('rate limits public submissions by token hash at five per ten minutes', async ({
    client,
  }) => {
    const { organization, application, user } = await fixtures()
    QueueManager.fake()
    const item = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      status: 'submitted',
    })

    for (let attempt = 0; attempt < 5; attempt++) {
      const allowed = await client
        .post(`/api/v1/career/information-requests/${item.token}`)
        .json({ answers: {} })
      allowed.assertStatus(200)
    }
    const limited = await client
      .post(`/api/v1/career/information-requests/${item.token}`)
      .json({ answers: {} })
    limited.assertStatus(429)
  })

  test('accepts multipart files, links documents, and rejects unknown file keys', async ({
    client,
    assert,
  }) => {
    const { organization, application, user } = await fixtures()
    QueueManager.fake()
    const fileField = {
      id: 'f_bbbbbbbbbbbb',
      type: 'file',
      label: 'Attestation',
      required: true,
      config: { accept: ['application/pdf'] },
    }
    const unknownItem = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      fields: [fileField],
    })
    const unknown = await client
      .post(`/api/v1/career/information-requests/${unknownItem.token}`)
      .field('answers', '{}')
      .file('file_unknown', Buffer.from('%PDF test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
    unknown.assertStatus(422)
    unknownItem.row.status = 'cancelled'
    await unknownItem.row.save()

    const item = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
      fields: [fileField],
    })
    const result = await client
      .post(`/api/v1/career/information-requests/${item.token}`)
      .field('answers', '{}')
      .file(`file_${fileField.id}`, Buffer.from('%PDF test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
    result.assertStatus(200)

    await item.row.refresh()
    const documentId = item.row.answers[fileField.id].documentId as string
    const document = await CandidateDocument.findOrFail(documentId)
    assert.equal(document.applicationId, application.id)
    assert.equal(document.candidateId, application.candidateId)
    await FileStorage.delete(document.filePath)
  })

  test('rotates the public token on resend', async ({ client }) => {
    const { organization, application, user } = await fixtures()
    QueueManager.fake()
    const item = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
    })
    const oldHash = item.row.tokenHash
    const result = await client
      .post(
        `/api/v1/dashboard/applications/${application.id}/information-requests/${item.row.id}/resend`
      )
      .loginAs(user)
    result.assertStatus(200)
    await item.row.refresh()
    result.assertBodyNotContains(['tokenHash'])
    if (item.row.tokenHash === oldHash) throw new Error('Token hash was not rotated')
    const oldToken = await client.get(`/api/v1/career/information-requests/${item.token}`)
    oldToken.assertStatus(404)
  })

  test('blocks document download through another application even for the same candidate', async ({
    client,
  }) => {
    const tenantA = await fixtures()
    const otherJob = await Job.create({
      organizationId: tenantA.organization.id,
      createdBy: tenantA.user.id,
      title: 'Autre poste',
      slug: `other-${randomUUID()}`,
      status: 'published',
      headcount: 1,
    })
    const otherApplication = await Application.create({
      jobId: otherJob.id,
      candidateId: tenantA.candidate.id,
      status: 'new',
      appliedAt: DateTime.now(),
    })
    const document = await CandidateDocument.create({
      candidateId: tenantA.candidate.id,
      applicationId: otherApplication.id,
      type: 'other',
      name: 'secret.pdf',
      filePath: 'missing/secret.pdf',
    })

    const result = await client
      .get(`/api/v1/dashboard/applications/${tenantA.application.id}/documents/${document.id}`)
      .loginAs(tenantA.user)
    result.assertStatus(404)
  })

  test('jobs send redacted audits, notify the requester, and persist terminal failures', async ({
    assert,
  }) => {
    const { organization, application, user } = await fixtures()
    const mailer = mail.fake()
    const requestItem = await createRequest({
      organizationId: organization.id,
      applicationId: application.id,
      requestedBy: user.id,
    })
    const requestJob = new SendInformationRequestEmail()
    requestJob.$hydrate(
      {
        requestId: requestItem.row.id,
        encryptedToken: encryptInformationRequestToken(requestItem.token),
        expectedTokenHash: requestItem.row.tokenHash,
      },
      {
        jobId: randomUUID(),
        name: 'SendInformationRequestEmail',
        attempt: 1,
        queue: 'emails',
        priority: 5,
        acquiredAt: new Date(),
        stalledCount: 0,
      }
    )
    await requestJob.execute()
    mailer.messages.assertSentCount(1)
    await requestItem.row.refresh()
    assert.equal(requestItem.row.deliveryStatus, 'sent')
    const requestAudit = await Email.query().orderBy('created_at', 'desc').firstOrFail()
    assert.notInclude(requestAudit.body ?? '', requestItem.token)

    requestItem.row.status = 'submitted'
    requestItem.row.answers = { [textField.id]: 'réponse extrêmement sensible' }
    await requestItem.row.save()
    const responseJob = new SendInformationResponseNotification()
    responseJob.$hydrate(
      { requestId: requestItem.row.id },
      {
        jobId: randomUUID(),
        name: 'SendInformationResponseNotification',
        attempt: 1,
        queue: 'emails',
        priority: 5,
        acquiredAt: new Date(),
        stalledCount: 0,
      }
    )
    await responseJob.execute()
    mailer.messages.assertSentCount(2)
    const responseAudit = await Email.query().orderBy('created_at', 'desc').firstOrFail()
    assert.equal(responseAudit.recipient, user.email)
    assert.notInclude(responseAudit.body ?? '', 'réponse extrêmement sensible')

    await responseJob.failed(new Error('SMTP unavailable'))
    await requestItem.row.refresh()
    assert.equal(requestItem.row.responseDeliveryStatus, 'failed')
    assert.equal(SendInformationResponseNotification.options.maxRetries, 5)
    assert.equal(SendInformationRequestEmail.options.maxRetries, 5)
  })
})
