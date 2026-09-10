import Mailer from '#services/mailer'
import Application from '#models/application'
import Candidate from '#models/candidate'
import Email from '#models/email'
import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Mailer', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.teardown(() => {
    mail.restore()
  })

  test('formats interview dates in the organization time zone', async ({ assert }) => {
    const organization = await Organization.create({
      name: 'KoraHire Cameroun',
      slug: `korahire-${randomUUID()}`,
      timezone: 'Africa/Douala',
    })
    const user = await User.create({
      organizationId: organization.id,
      email: `staff-${randomUUID()}@example.test`,
      password: '[REDACTED:password]',
      role: 'recruiter',
    })
    const candidate = await Candidate.create({ email: `candidate-${randomUUID()}@example.test` })
    const job = await Job.create({
      organizationId: organization.id,
      createdBy: user.id,
      title: 'Développeur',
      slug: `job-${randomUUID()}`,
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
    mail.fake()

    await Mailer.sendInterviewInvitation({
      to: 'candidate@example.test',
      candidateName: 'Candidate Test',
      jobTitle: 'Développeur',
      organizationName: organization.name,
      organizationId: organization.id,
      applicationId: application.id,
      scheduledAtIso: '2026-09-14T13:00:00.000Z',
      timeZone: organization.timezone!,
      meetingOrLocation: null,
      appBaseUrl: 'https://app.example.test',
      confirmToken: 'token',
    })

    const audit = await Email.query().where('organization_id', organization.id).firstOrFail()
    assert.include(audit.body!, 'lundi 14 septembre 2026 à 14:00')
    assert.notInclude(audit.body!, 'lundi 14 septembre 2026 à 13:00')
  })

  test('does not fail the business operation when email auditing is unavailable', async ({
    assert,
  }) => {
    const sent = await Mailer.send({
      to: 'candidate@example.test',
      subject: 'Test',
      html: '<p>Test</p>',
      organizationId: randomUUID(),
    })

    assert.isFalse(sent)
  })
})
