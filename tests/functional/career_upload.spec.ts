import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import Organization from '#models/organization'
import PendingApplication from '#models/pending_application'
import User from '#models/user'
import FileStorage from '#services/file_storage'
import ExpirePendingApplications from '#jobs/expire_pending_applications'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const applyUrl = (orgSlug: string, jobSlug: string) =>
  `/api/v1/career/orgs/${orgSlug}/jobs/${jobSlug}/apply`

async function fixtures(options: { accept?: string[] } = {}) {
  const suffix = randomUUID()
  const org = await Organization.create({ name: `Upload ${suffix}`, slug: `upload-${suffix}` })
  const user = await User.create({
    organizationId: org.id,
    email: `upload-${suffix}@example.test`,
    password: 'not-used',
    role: 'recruiter',
  })

  const job = await Job.create({
    organizationId: org.id,
    createdBy: user.id,
    title: 'Poste',
    slug: 'poste',
    status: 'published',
    headcount: 1,
  })

  const fileFieldId = `f_${suffix.slice(0, 12).replace(/-/g, '')}`
  const version = await JobFormVersion.create({
    jobId: job.id,
    version: 1,
    definition: {
      fields: [
        {
          id: fileFieldId,
          type: 'file',
          label: 'Pièce jointe',
          required: false,
          ...(options.accept ? { config: { accept: options.accept } } : {}),
        },
      ],
    },
    publishedAt: DateTime.now(),
  })

  await job.merge({ activeFormVersionId: version.id }).save()

  return { org, job, fileFieldId, version }
}

function candidate(email: string) {
  return {
    candidate: { firstName: 'Jean', lastName: 'Candidat', email },
  }
}

const pdf = {
  filename: 'cv.pdf',
  contentType: 'application/pdf',
}

test.group('Career upload — validation des fichiers', () => {
  test('accepte un CV et enregistre le document', async ({ client, assert }) => {
    const { org, job } = await fixtures()
    const email = `ok-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file('cv', Buffer.from('%PDF-1.4 test'), pdf)

    response.assertStatus(202)

    const pending = await PendingApplication.findBy('email', email)
    assert.isNotNull(pending)
    const payload = pending!.payload as unknown as { cvDocumentId: string; documentIds: string[] }
    assert.isNotNull(payload.cvDocumentId)

    const document = await CandidateDocument.findOrFail(payload.cvDocumentId)
    assert.equal(document.type, 'cv')
    assert.isNull(document.applicationId)

    await FileStorage.delete(document.filePath)
    await document.delete()
  })

  test('refuse une extension hors liste', async ({ client, assert }) => {
    const { org, job } = await fixtures()
    const email = `ext-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file('cv', Buffer.from('#!/bin/sh'), {
        filename: 'evil.sh',
        contentType: 'application/x-sh',
      })

    response.assertStatus(422)
    assert.property(response.body() as unknown as { errors: Record<string, string> }, 'errors')
  })

  test('refuse une double extension', async ({ client, assert }) => {
    const { org, job } = await fixtures()
    const email = `double-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file('cv', Buffer.from('#!/bin/sh'), {
        filename: 'evil.pdf.sh',
        contentType: 'application/pdf',
      })

    response.assertStatus(422)
    assert.property(response.body() as unknown as { errors: Record<string, string> }, 'errors')
  })

  test('neutralise la traversée de chemin dans le nom de fichier', async ({ client, assert }) => {
    const { org, job } = await fixtures()
    const email = `path-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file('cv', Buffer.from('%PDF-1.4 test'), {
        filename: '../../../../etc/evil.pdf',
        contentType: 'application/pdf',
      })

    response.assertStatus(202)

    const pending = await PendingApplication.findBy('email', email)
    const payload = pending!.payload as unknown as { cvDocumentId: string }
    const document = await CandidateDocument.findOrFail(payload.cvDocumentId)

    // Ni `/` ni `..` en position de segment : la clé reste confinée au dossier du disque.
    assert.notInclude(document.filePath.replace(/[a-f0-9-]+\.pdf$/, ''), '/../')
    assert.match(document.filePath, /^cvs\/[a-f0-9-]+-_+\.*_+$|cvs\/[a-f0-9-]+-/)

    const exists = await drive.use().exists(document.filePath)
    assert.isTrue(exists)

    await FileStorage.delete(document.filePath)
    await document.delete()
  })

  test('ne laisse pas de document orphelin quand une pièce jointe est rejetée', async ({
    client,
    assert,
  }) => {
    const { org, job, fileFieldId } = await fixtures()
    const email = `orphan-${randomUUID()}@example.test`

    // CV valide d'abord, puis une pièce jointe d'extension interdite.
    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file('cv', Buffer.from('%PDF-1.4 test'), pdf)
      .file(`file_${fileFieldId}`, Buffer.from('x'), {
        filename: 'bad.sh',
        contentType: 'application/x-sh',
      })

    response.assertStatus(422)

    // Le CV écrit avant le rejet ne doit pas rester en base ni sur le disque.
    const document = await CandidateDocument.query()
      .where('name', 'cv.pdf')
      .whereIn('candidate_id', db.from('candidates').select('id').where('email', email))
      .first()
    assert.isNull(document)
  })

  test('rejette un content-type absent des accept du champ', async ({ client, assert }) => {
    const { org, job, fileFieldId } = await fixtures({ accept: ['application/pdf'] })
    const email = `mime-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file(`file_${fileFieldId}`, Buffer.from('image bytes'), {
        filename: 'piece.png',
        contentType: 'image/png',
      })

    response.assertStatus(422)
    const body = response.body() as unknown as { errors: Record<string, string> }
    assert.deepEqual(Object.keys(body.errors), [fileFieldId])
  })

  test('accepte un content-type conforme aux accept du champ', async ({ client, assert }) => {
    const { org, job, fileFieldId } = await fixtures({ accept: ['application/pdf'] })
    const email = `mimeok-${randomUUID()}@example.test`

    const response = await client
      .post(applyUrl(org.slug, job.slug))
      .field('candidate', JSON.stringify(candidate(email).candidate))
      .file(`file_${fileFieldId}`, Buffer.from('%PDF-1.4 test'), pdf)

    response.assertStatus(202)

    const pending = await PendingApplication.findBy('email', email)
    const payload = pending!.payload as unknown as { documentIds: string[] }
    const document = await CandidateDocument.findOrFail(payload.documentIds[0])
    assert.equal(document.mimeType, 'application/pdf')

    await FileStorage.delete(document.filePath)
    await document.delete()
  })
})

test.group('Nettoyage des candidatures non vérifiées', () => {
  test('le job supprime les fichiers et documents des pending expirées', async ({ assert }) => {
    const { job } = await fixtures()
    const candidateRecord = await Candidate.create({
      email: `cand-${randomUUID()}@example.test`,
      firstName: 'Jean',
      lastName: 'Candidat',
    })

    await drive.use().put('cvs/orphan-test.pdf', 'contenu')
    const document = await CandidateDocument.create({
      candidateId: candidateRecord.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/orphan-test.pdf',
      mimeType: 'application/pdf',
      fileSize: 10,
    })

    const pending = await PendingApplication.create({
      email: `orphan-${randomUUID()}@example.test`,
      jobId: job.id,
      payload: { documentIds: [document.id], cvDocumentId: document.id },
      status: 'pending',
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    await new ExpirePendingApplications().execute()

    // Le job recharge sa propre instance : on relit la ligne plutôt que de
    // réutiliser l'objet du test.
    const updated = await PendingApplication.find(pending.id)
    assert.equal(updated?.status, 'expired')
    assert.isNull(await CandidateDocument.find(document.id))
    assert.isFalse(await drive.use().exists('cvs/orphan-test.pdf'))
  })

  test('le job ne touche pas un document déjà attaché à une candidature', async ({ assert }) => {
    const suffix = randomUUID()
    const org = await Organization.create({ name: `Keep ${suffix}`, slug: `keep-${suffix}` })
    const user = await User.create({
      organizationId: org.id,
      email: `keep-${suffix}@example.test`,
      password: 'not-used',
      role: 'recruiter',
    })
    const job = await Job.create({
      organizationId: org.id,
      createdBy: user.id,
      title: 'Poste',
      slug: 'poste',
      status: 'published',
      headcount: 1,
    })

    const candidateRecord = await Candidate.create({
      email: `cand-${suffix}@example.test`,
      firstName: 'Jean',
      lastName: 'Candidat',
    })
    const application = await Application.create({
      jobId: job.id,
      candidateId: candidateRecord.id,
      status: 'new',
      appliedAt: DateTime.now(),
      answers: {},
    })

    await drive.use().put('cvs/kept.pdf', 'contenu')
    const document = await CandidateDocument.create({
      candidateId: candidateRecord.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/kept.pdf',
      mimeType: 'application/pdf',
      fileSize: 8,
    })

    await PendingApplication.create({
      email: `kept-${suffix}@example.test`,
      jobId: job.id,
      payload: { documentIds: [document.id], cvDocumentId: document.id },
      status: 'pending',
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    await new ExpirePendingApplications().execute()

    assert.isNotNull(await CandidateDocument.find(document.id))
    assert.isTrue(await drive.use().exists('cvs/kept.pdf'))

    await drive.use().delete('cvs/kept.pdf')
  })

  test('le job ignore une pending encore valide', async ({ assert }) => {
    const { job } = await fixtures()

    const pending = await PendingApplication.create({
      email: `valid-${randomUUID()}@example.test`,
      jobId: job.id,
      payload: { documentIds: [], cvDocumentId: null },
      status: 'pending',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    await new ExpirePendingApplications().execute()

    const unchanged = await PendingApplication.find(pending.id)
    assert.equal(unchanged?.status, 'pending')
  })

  test('le balayage purge un document orphelin de plus de 24 h', async ({ assert }) => {
    const candidateRecord = await Candidate.create({
      email: `sweep-${randomUUID()}@example.test`,
      firstName: 'Jean',
      lastName: 'Candidat',
    })

    await drive.use().put('cvs/sweep-old.pdf', 'contenu')
    const old = await CandidateDocument.create({
      candidateId: candidateRecord.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/sweep-old.pdf',
      mimeType: 'application/pdf',
      fileSize: 8,
      createdAt: DateTime.now().minus({ hours: 30 }),
    })

    await new ExpirePendingApplications().execute()

    assert.isNull(await CandidateDocument.find(old.id))
    assert.isFalse(await drive.use().exists('cvs/sweep-old.pdf'))
  })

  test('le balayage laisse un document récent non rattaché', async ({ assert }) => {
    const candidateRecord = await Candidate.create({
      email: `fresh-${randomUUID()}@example.test`,
      firstName: 'Jean',
      lastName: 'Candidat',
    })

    await drive.use().put('cvs/sweep-fresh.pdf', 'contenu')
    const fresh = await CandidateDocument.create({
      candidateId: candidateRecord.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/sweep-fresh.pdf',
      mimeType: 'application/pdf',
      fileSize: 8,
      createdAt: DateTime.now().minus({ minutes: 5 }),
    })

    await new ExpirePendingApplications().execute()

    assert.isNotNull(await CandidateDocument.find(fresh.id))

    await drive.use().delete('cvs/sweep-fresh.pdf')
  })

  test('le balayage préserve un document référencé par une pending valide', async ({ assert }) => {
    const { job } = await fixtures()
    const candidateRecord = await Candidate.create({
      email: `kept-${randomUUID()}@example.test`,
      firstName: 'Jean',
      lastName: 'Candidat',
    })

    await drive.use().put('cvs/sweep-kept.pdf', 'contenu')
    const kept = await CandidateDocument.create({
      candidateId: candidateRecord.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/sweep-kept.pdf',
      mimeType: 'application/pdf',
      fileSize: 8,
      createdAt: DateTime.now().minus({ hours: 30 }),
    })

    await PendingApplication.create({
      email: `keeper-${randomUUID()}@example.test`,
      jobId: job.id,
      payload: { documentIds: [kept.id], cvDocumentId: kept.id },
      status: 'pending',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    await new ExpirePendingApplications().execute()

    assert.isNotNull(await CandidateDocument.find(kept.id))

    await drive.use().delete('cvs/sweep-kept.pdf')
  })
})
