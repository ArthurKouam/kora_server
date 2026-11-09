import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateExperience from '#models/candidate_experience'
import Job from '#models/job'
import JobSeeker from '#models/job_seeker'
import JobSeekerDocument from '#models/job_seeker_document'
import JobSeekerProfile from '#models/job_seeker_profile'
import Organization from '#models/organization'
import User from '#models/user'
import { issueVerificationToken } from '#services/job_seeker_tokens'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import mail from '@adonisjs/mail/services/main'
import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const BASE = '/api/v1/job-seeker'
const GUARD = 'job_seeker_web'

/** Organisation + offre publiée, avec le staff minimal requis par `Job`. */
async function organizationFixtures() {
  const suffix = randomUUID()
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role: 'owner',
  })
  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: `Développeur ${suffix.slice(0, 8)}`,
    slug: `job-${suffix}`,
    status: 'published',
    headcount: 1,
    publishedAt: DateTime.now(),
  })

  return { organization, user, job }
}

async function jobSeekerFixture(options: { verified?: boolean } = {}) {
  const suffix = randomUUID()
  const jobSeeker = await JobSeeker.create({
    email: `seeker-${suffix}@example.test`,
    password: 'motdepasse123',
    status: 'active',
    emailVerifiedAt: options.verified === false ? null : DateTime.now(),
  })
  await JobSeekerProfile.create({
    jobSeekerId: jobSeeker.id,
    firstName: 'Awa',
    lastName: 'Diop',
    city: 'Douala',
    country: 'Cameroun',
  })
  return jobSeeker
}

function auth(client: any, jobSeeker: JobSeeker) {
  return {
    get: (url: string) => client.get(url).withGuard(GUARD).loginAs(jobSeeker),
    post: (url: string) => client.post(url).withGuard(GUARD).loginAs(jobSeeker),
    put: (url: string) => client.put(url).withGuard(GUARD).loginAs(jobSeeker),
    delete: (url: string) => client.delete(url).withGuard(GUARD).loginAs(jobSeeker),
  }
}

test.group('Portail candidat — compte', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })
  group.each.teardown(() => {
    mail.restore()
  })

  test('signup crée le compte, connecte et exige la vérification email', async ({
    client,
    assert,
  }) => {
    const mailer = mail.fake()
    const email = `new-${randomUUID()}@example.test`
    const response = await client.post(`${BASE}/auth/signup`).json({
      firstName: 'Awa',
      lastName: 'Diop',
      email,
      password: 'motdepasse123',
      passwordConfirmation: 'motdepasse123',
    })

    response.assertStatus(201)
    assert.equal(response.body().data.user.email, email)
    assert.isNull(response.body().data.user.emailVerifiedAt)

    const jobSeeker = await JobSeeker.findByOrFail('email', email)
    assert.isNull(jobSeeker.emailVerifiedAt)
    const profile = await JobSeekerProfile.findByOrFail('jobSeekerId', jobSeeker.id)
    assert.equal(profile.firstName, 'Awa')

    // Le mail de vérification est parti sans être journalisé (pas d'organisation).
    mailer.messages.assertSentCount(1)
    const sent = mailer.messages.sent()[0]
    sent.assertSubject('Confirmez votre adresse email — KoraHire')
    assert.include(String(sent.toJSON().message.html), '/candidat/verifier-email?token=')
  })

  test('login refuse un mauvais mot de passe et accepte le bon', async ({ client, assert }) => {
    const jobSeeker = await jobSeekerFixture()

    const invalid = await client.post(`${BASE}/auth/login`).json({
      email: jobSeeker.email,
      password: 'mauvais-mot-de-passe',
    })
    invalid.assertStatus(401)

    const valid = await client.post(`${BASE}/auth/login`).json({
      email: jobSeeker.email,
      password: 'motdepasse123',
    })
    valid.assertStatus(200)
    assert.equal(valid.body().data.user.email, jobSeeker.email)
  })

  test('GET /me exige une session candidat', async ({ client }) => {
    const response = await client.get(`${BASE}/me`)
    response.assertStatus(401)
  })

  test('la vérification email consomme le jeton une seule fois', async ({ client, assert }) => {
    const jobSeeker = await jobSeekerFixture({ verified: false })
    const token = await issueVerificationToken(jobSeeker.id)

    const first = await client.post(`${BASE}/auth/verify-email`).json({ token })
    first.assertStatus(200)
    assert.isTrue(first.body().verified)

    const refreshed = await JobSeeker.findOrFail(jobSeeker.id)
    assert.isNotNull(refreshed.emailVerifiedAt)

    // Rejouer le même lien reste idempotent.
    const second = await client.post(`${BASE}/auth/verify-email`).json({ token })
    second.assertStatus(200)
    assert.isTrue(second.body().verified)
  })

  test('la mise à jour du profil est cloisonnée entre candidats', async ({ client, assert }) => {
    const owner = await jobSeekerFixture()
    const other = await jobSeekerFixture()

    const response = await auth(client, owner)
      .put(`${BASE}/profile`)
      .json({
        firstName: 'Awa',
        lastName: 'Ndiaye',
        headline: 'Développeuse backend',
      })
    response.assertStatus(200)

    const ownerProfile = await JobSeekerProfile.findByOrFail('jobSeekerId', owner.id)
    assert.equal(ownerProfile.lastName, 'Ndiaye')
    assert.equal(ownerProfile.headline, 'Développeuse backend')

    const otherProfile = await JobSeekerProfile.findByOrFail('jobSeekerId', other.id)
    assert.equal(otherProfile.lastName, 'Diop')
    assert.isNull(otherProfile.headline)
  })

  test('un candidat ne peut pas télécharger le document d’un autre', async ({ client }) => {
    const owner = await jobSeekerFixture()
    const other = await jobSeekerFixture()

    const document = await JobSeekerDocument.create({
      jobSeekerId: owner.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'job-seeker-documents/absent.pdf',
    })

    const response = await auth(client, other).get(
      `${BASE}/documents/${document.id}/download`
    )
    response.assertStatus(404)
  })

  test('l’inscription refuse un email déjà utilisé', async ({ client }) => {
    const existing = await jobSeekerFixture()

    const response = await client.post(`${BASE}/auth/signup`).json({
      firstName: 'Awa',
      lastName: 'Diop',
      email: existing.email,
      password: 'motdepasse123',
      passwordConfirmation: 'motdepasse123',
    })
    response.assertStatus(422)
  })
})

test.group('Portail candidat — candidatures', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  test('un email non vérifié ne peut pas postuler', async ({ client, assert }) => {
    const jobSeeker = await jobSeekerFixture({ verified: false })
    const { job } = await organizationFixtures()

    const response = await auth(client, jobSeeker).post(`${BASE}/jobs/${job.id}/apply`).json({})
    response.assertStatus(403)
    assert.equal(response.body().code, 'email_not_verified')
  })

  test('postuler crée un dossier propre à l’organisation et fige le profil', async ({
    client,
    assert,
  }) => {
    const jobSeeker = await jobSeekerFixture()
    const { organization, job } = await organizationFixtures()

    await jobSeeker.related('experiences').create({
      company: 'Acme',
      position: 'Développeuse',
      startDate: DateTime.fromISO('2020-01-01'),
      isCurrent: true,
    })

    const response = await auth(client, jobSeeker)
      .post(`${BASE}/jobs/${job.id}/apply`)
      .json({ coverLetter: 'Bonjour, je suis motivée.' })

    response.assertStatus(201)
    assert.equal(response.body().status, 'new')

    const candidate = await Candidate.query()
      .where('organization_id', organization.id)
      .where('job_seeker_id', jobSeeker.id)
      .firstOrFail()
    assert.equal(candidate.email, jobSeeker.email)
    assert.equal(candidate.source, 'portal')

    const application = await Application.findOrFail(response.body().id)
    assert.equal(application.candidateId, candidate.id)
    assert.equal(application.jobId, job.id)
    assert.equal(application.source, 'portal')
    assert.equal(application.coverLetter, 'Bonjour, je suis motivée.')

    const experiences = await CandidateExperience.query().where(
      'candidate_id',
      candidate.id
    )
    assert.lengthOf(experiences, 1)
    assert.equal(experiences[0].company, 'Acme')
  })

  test('le CV choisi est copié et téléchargeable depuis la candidature', async ({
    client,
    assert,
  }) => {
    const jobSeeker = await jobSeekerFixture()
    const other = await jobSeekerFixture()
    const { job } = await organizationFixtures()

    const key = `job-seeker-documents/${randomUUID()}.pdf`
    await drive.use().put(key, '%PDF-1.4 test')
    const document = await JobSeekerDocument.create({
      jobSeekerId: jobSeeker.id,
      type: 'cv',
      name: 'cv-awa.pdf',
      filePath: key,
      mimeType: 'application/pdf',
      fileSize: 13,
      isDefault: true,
    })

    const applied = await auth(client, jobSeeker)
      .post(`${BASE}/jobs/${job.id}/apply`)
      .json({ documentId: document.id })
    applied.assertStatus(201)

    const detail = await auth(client, jobSeeker).get(
      `${BASE}/applications/${applied.body().id}`
    )
    detail.assertStatus(200)
    assert.equal(detail.body().application.cvDocument.name, 'cv-awa.pdf')

    const download = await auth(client, jobSeeker).get(
      `${BASE}/applications/${applied.body().id}/cv`
    )
    download.assertStatus(200)
    assert.match(download.header('content-disposition') ?? '', /^attachment;/)

    const forbidden = await auth(client, other).get(
      `${BASE}/applications/${applied.body().id}/cv`
    )
    forbidden.assertStatus(404)

    await drive.use().delete(key)
  })

  test('une seconde candidature à la même offre est refusée', async ({ client }) => {
    const jobSeeker = await jobSeekerFixture()
    const { job } = await organizationFixtures()

    await auth(client, jobSeeker).post(`${BASE}/jobs/${job.id}/apply`).json({})

    const second = await auth(client, jobSeeker).post(`${BASE}/jobs/${job.id}/apply`).json({})
    second.assertStatus(409)
  })

  test('le même dossier sert pour plusieurs offres de la même organisation', async ({
    client,
    assert,
  }) => {
    const jobSeeker = await jobSeekerFixture()
    const { organization, user, job } = await organizationFixtures()
    const otherJob = await Job.create({
      organizationId: organization.id,
      createdBy: user.id,
      title: 'Product Manager',
      slug: `pm-${randomUUID()}`,
      status: 'published',
      headcount: 1,
      publishedAt: DateTime.now(),
    })

    const first = await auth(client, jobSeeker).post(`${BASE}/jobs/${job.id}/apply`).json({})
    first.assertStatus(201)
    const second = await auth(client, jobSeeker).post(`${BASE}/jobs/${otherJob.id}/apply`).json({})
    second.assertStatus(201)

    const candidates = await Candidate.query()
      .where('organization_id', organization.id)
      .where('job_seeker_id', jobSeeker.id)
    assert.lengthOf(candidates, 1)

    const applications = await Application.query().where(
      'candidate_id',
      candidates[0].id
    )
    assert.lengthOf(applications, 2)
  })

  test('postuler dans deux organisations crée deux dossiers distincts', async ({
    client,
    assert,
  }) => {
    const jobSeeker = await jobSeekerFixture()
    const first = await organizationFixtures()
    const second = await organizationFixtures()

    const firstResponse = await auth(client, jobSeeker)
      .post(`${BASE}/jobs/${first.job.id}/apply`)
      .json({})
    firstResponse.assertStatus(201)
    const secondResponse = await auth(client, jobSeeker)
      .post(`${BASE}/jobs/${second.job.id}/apply`)
      .json({})
    secondResponse.assertStatus(201)

    const candidates = await Candidate.query().where('job_seeker_id', jobSeeker.id)
    assert.lengthOf(candidates, 2)
    const organizationIds = candidates.map((candidate) => candidate.organizationId).sort()
    assert.deepEqual(
      organizationIds,
      [first.organization.id, second.organization.id].sort()
    )

    // Les deux candidatures remontent dans l'espace du candidat.
    const list = await auth(client, jobSeeker).get(`${BASE}/applications`)
    list.assertStatus(200)
    assert.lengthOf(list.body().data, 2)
  })

  test('la liste des candidatures ne montre que celles du candidat connecté', async ({
    client,
    assert,
  }) => {
    const owner = await jobSeekerFixture()
    const other = await jobSeekerFixture()
    const { job } = await organizationFixtures()

    await auth(client, owner).post(`${BASE}/jobs/${job.id}/apply`).json({})

    const response = await auth(client, other).get(`${BASE}/applications`)
    response.assertStatus(200)
    assert.lengthOf(response.body().data, 0)
  })

  test('le candidat peut retirer sa candidature', async ({ client, assert }) => {
    const jobSeeker = await jobSeekerFixture()
    const { job } = await organizationFixtures()

    const created = await auth(client, jobSeeker)
      .post(`${BASE}/jobs/${job.id}/apply`)
      .json({})
    created.assertStatus(201)

    const withdraw = await auth(client, jobSeeker).post(
      `${BASE}/applications/${created.body().id}/withdraw`
    )
    withdraw.assertStatus(200)
    assert.equal(withdraw.body().status, 'withdrawn')

    const application = await Application.findOrFail(created.body().id)
    assert.equal(application.status, 'withdrawn')
  })
})
