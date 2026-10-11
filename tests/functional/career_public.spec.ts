import Job from '#models/job'
import Organization from '#models/organization'
import User from '#models/user'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const BASE = '/api/v1/career'

/**
 * Deux organisations, chacune avec une offre sluguée `dev-frontend`.
 * La table `jobs` n'a qu'un unicité (organization_id, slug) : ces fixtures
 * vérifient que le scoping empêche une organisation d'exposer l'offre de l'autre.
 *
 * `alphaOnly` n'existe que chez Alpha : y accéder via Beta doit échouer.
 */
async function fixtures() {
  const suffix = randomUUID()
  const alpha = await Organization.create({ name: `Alpha ${suffix}`, slug: `alpha-${suffix}` })
  const beta = await Organization.create({ name: `Beta ${suffix}`, slug: `beta-${suffix}` })

  const alphaUser = await User.create({
    organizationId: alpha.id,
    email: `alpha-${suffix}@example.test`,
    password: 'not-used',
    role: 'recruiter',
  })
  const betaUser = await User.create({
    organizationId: beta.id,
    email: `beta-${suffix}@example.test`,
    password: 'not-used',
    role: 'recruiter',
  })

  const sharedSlug = 'dev-frontend'

  const alphaJob = await Job.create({
    organizationId: alpha.id,
    createdBy: alphaUser.id,
    title: 'Développeur Frontend Nuxt',
    slug: sharedSlug,
    description: 'Un poste chez Alpha qui parle de Docker et Kubernetes.',
    status: 'published',
    headcount: 1,
    employmentType: 'full_time',
    workplaceType: 'remote',
    city: 'Douala',
    country: 'Cameroun',
  })

  const betaJob = await Job.create({
    organizationId: beta.id,
    createdBy: betaUser.id,
    title: 'Développeur Frontend Vue',
    slug: sharedSlug,
    description: 'Un poste chez Beta qui parle de Laravel et Redis.',
    status: 'published',
    headcount: 1,
    employmentType: 'contract',
    workplaceType: 'onsite',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
  })

  const alphaDraft = await Job.create({
    organizationId: alpha.id,
    createdBy: alphaUser.id,
    title: 'Poste en brouillon',
    slug: 'brouillon',
    status: 'draft',
    headcount: 1,
  })

  const alphaInternship = await Job.create({
    organizationId: alpha.id,
    createdBy: alphaUser.id,
    title: 'Stage Qualité',
    slug: 'stage',
    status: 'published',
    headcount: 1,
    employmentType: 'internship',
    workplaceType: 'hybrid',
  })

  return { alpha, beta, alphaJob, betaJob, alphaDraft, alphaInternship }
}

test.group('Career public — liste des offres', () => {
  test('liste les offres publiées et exclut les brouillons', async ({ client, assert }) => {
    const { alpha, alphaDraft } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs`)

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.organization.name, alpha.name)
    assert.lengthOf(body.data, 2)
    assert.notInclude(
      body.data.map((job: { id: string }) => job.id),
      alphaDraft.id
    )
  })

  test('retourne 404 sur une organisation inconnue', async ({ client }) => {
    const response = await client.get(`${BASE}/orgs/${randomUUID()}/jobs`)

    response.assertStatus(404)
  })

  test('filtre par type de contrat', async ({ client, assert }) => {
    const { alpha, alphaInternship } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?employmentType=internship`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].id, alphaInternship.id)
  })

  test('filtre par type de lieu', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?workplaceType=remote`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
  })

  test('filtre par recherche sur le titre et la description', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const byTitle = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?search=Nuxt`)
    byTitle.assertStatus(200)
    assert.lengthOf(byTitle.body().data, 1)

    const byDescription = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?search=Kubernetes`)
    byDescription.assertStatus(200)
    assert.lengthOf(byDescription.body().data, 1)
  })

  test('filtre par ville', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?city=Douala`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
  })

  test('pagine les résultats', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs?page=1&limit=1`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().meta.total, 2)
    assert.equal(response.body().meta.lastPage, 2)
  })

  test('ne fuit pas les colonnes internes', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs`)

    response.assertStatus(200)
    assert.notProperty(response.body().data[0], 'createdBy')
    assert.notProperty(response.body().data[0], 'organizationId')
  })
})

test.group('Career public — isolation entre organisations', () => {
  test('la liste ne contient que les offres de son organisation', async ({ client, assert }) => {
    const { alpha, betaJob } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs`)

    response.assertStatus(200)
    assert.notInclude(
      response.body().data.map((job: { id: string }) => job.id),
      betaJob.id
    )
  })

  test('un slug partagé par deux organisations reste isolé sur show', async ({
    client,
    assert,
  }) => {
    const { alpha, beta } = await fixtures()

    const fromAlpha = await client.get(`${BASE}/orgs/${alpha.slug}/jobs/dev-frontend`)
    const fromBeta = await client.get(`${BASE}/orgs/${beta.slug}/jobs/dev-frontend`)

    fromAlpha.assertStatus(200)
    fromBeta.assertStatus(200)
    assert.equal(fromAlpha.body().job.title, 'Développeur Frontend Nuxt')
    assert.equal(fromBeta.body().job.title, 'Développeur Frontend Vue')
  })

  test("une offre d'une autre organisation renvoie 404", async ({ client }) => {
    const { beta, alphaDraft } = await fixtures()

    // alphaDraft appartient à Alpha : Beta ne doit pas le trouver.
    const response = await client.get(`${BASE}/orgs/${beta.slug}/jobs/${alphaDraft.slug}`)

    response.assertStatus(404)
  })

  test("une candidature vers l'offre d'une autre organisation renvoie 404", async ({ client }) => {
    const { beta, alphaInternship } = await fixtures()

    const response = await client
      .post(`${BASE}/orgs/${beta.slug}/jobs/${alphaInternship.slug}/apply`)
      .json({
        candidate: {
          firstName: 'Jean',
          lastName: 'Candidat',
          email: `jean-${randomUUID()}@example.test`,
        },
      })

    response.assertStatus(404)
  })

  test('un brouillon reste inaccessible en détail', async ({ client }) => {
    const { alpha, alphaDraft } = await fixtures()

    const response = await client.get(`${BASE}/orgs/${alpha.slug}/jobs/${alphaDraft.slug}`)

    response.assertStatus(404)
  })

  test('un filtre hors enum est ignoré plutôt que rejeté', async ({ client, assert }) => {
    const { alpha } = await fixtures()

    const response = await client.get(
      `${BASE}/orgs/${alpha.slug}/jobs?employmentType=full_time;DROP TABLE jobs`
    )

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
  })
})
