import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
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

function downloadUrl(applicationId: string, documentId: string) {
  return `/api/v1/dashboard/applications/${applicationId}/documents/${documentId}`
}

test.group('Téléchargement de documents — en-têtes sûrs', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('sert un document HTML hérité en pièce jointe octet-stream', async ({ client, assert }) => {
    const { user, candidate, application } = await fixtures()
    const key = `cvs/${randomUUID()}-legacy.html`
    const payload = '<!doctype html><html><script>alert(1)</script></html>'
    await drive.use().put(key, payload)

    // Simule une ligne créée avant la détection par magic bytes : le MIME
    // stocké en base est du HTML.
    const document = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.html',
      filePath: key,
      mimeType: 'text/html',
    })

    const response = await client.get(downloadUrl(application.id, document.id)).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/octet-stream')
    assert.match(response.header('content-disposition') ?? '', /^attachment;/)
    response.assertHeader('x-content-type-options', 'nosniff')

    await drive.use().delete(key)
  })

  test('sert un PDF avec son type réel, mais toujours en attachment', async ({
    client,
    assert,
  }) => {
    const { user, candidate, application } = await fixtures()
    const key = `cvs/${randomUUID()}-cv.pdf`
    await drive.use().put(key, '%PDF-1.4 test')

    const document = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: key,
      mimeType: 'application/pdf',
    })

    const response = await client.get(downloadUrl(application.id, document.id)).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.match(response.header('content-disposition') ?? '', /^attachment;/)
    assert.include(response.header('content-disposition') ?? '', 'filename="cv.pdf"')

    await drive.use().delete(key)
  })

  test('neutralise les retours à la ligne dans le nom du fichier', async ({ client, assert }) => {
    const { user, candidate, application } = await fixtures()
    const key = `cvs/${randomUUID()}-cv.pdf`
    await drive.use().put(key, '%PDF-1.4 test')

    const document = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv\r\nx-injected: 1.pdf',
      filePath: key,
      mimeType: 'application/pdf',
    })

    const response = await client.get(downloadUrl(application.id, document.id)).loginAs(user)

    response.assertStatus(200)
    assert.notInclude(response.header('content-disposition') ?? '', '\r')
    assert.notInclude(response.header('content-disposition') ?? '', '\n')
    assert.isUndefined(response.header('x-injected'))

    await drive.use().delete(key)
  })

  test('refuse le document d’une candidature d’une autre organisation', async ({ client }) => {
    const { candidate, application } = await fixtures()
    const rival = await fixtures()
    const key = `cvs/${randomUUID()}-cv.pdf`
    await drive.use().put(key, '%PDF-1.4 test')

    const document = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: key,
      mimeType: 'application/pdf',
    })

    const response = await client.get(downloadUrl(application.id, document.id)).loginAs(rival.user)

    response.assertStatus(404)

    await drive.use().delete(key)
  })
})
