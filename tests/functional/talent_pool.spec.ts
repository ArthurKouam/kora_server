import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import CandidateSkill from '#models/candidate_skill'
import Job from '#models/job'
import Organization from '#models/organization'
import Plan from '#models/plan'
import Skill from '#models/skill'
import TalentPoolEntry from '#models/talent_pool_entry'
import TalentPoolNote from '#models/talent_pool_note'
import TalentPoolTag from '#models/talent_pool_tag'
import Tag from '#models/tag'
import User from '#models/user'
import TalentPoolService, { RETENTION_MONTHS } from '#services/talent_pool_service'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const BASE = '/api/v1/dashboard/talent-pool'

/**
 * Le client de test type une URL par l'union des réponses de toutes les routes du
 * préfixe : sur `/talent-pool`, le corps peut être la liste paginée, le détail
 * d'un profil, ou une erreur de forfait. Chaque variante est donc lue via un
 * accessor explicite plutôt qu'à travers `response.body()`.
 */
function listBody(response: { body(): unknown }): { data: unknown[] } {
  return response.body() as { data: unknown[] }
}

function entryBody(response: { body(): unknown }): {
  candidate: { id: string; firstName: string | null }
  source: string
  status: string
  content?: string
} {
  return response.body() as {
    candidate: { id: string; firstName: string | null }
    source: string
    status: string
    content?: string
  }
}

function featureErrorBody(response: { body(): unknown }): {
  feature: string
  requiredPlan: { slug: string }
} {
  return response.body() as { feature: string; requiredPlan: { slug: string } }
}

/**
 * Corps d'erreur de l'API — `{ error, code }`.
 *
 * Le client de test type `body()` par l'union des réponses partageant la route
 * (succès | erreur) : on lit donc le corps par un paramètre élargi plutôt que
 * de caster directement l'union.
 */
function errorCode(response: { body(): unknown }): string | undefined {
  const body = response.body()
  if (body === null || typeof body !== 'object' || !('code' in body)) return undefined
  return (body as { code: string }).code
}

/**
 * Ce qui coûte cher si c'est faux : un profil d'une autre organisation dans la
 * liste, un retrait qui emporte les candidatures, une capacité payante offerte
 * par un forfait qui ne la contient pas.
 */
async function fixtures(planSlug = 'pro', role = 'recruiter') {
  const suffix = randomUUID()
  const plan = await Plan.query().where('slug', planSlug).firstOrFail()
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
    planId: plan.id,
    // Jamais facturé = pas de blocage (cf. PlanService.isActive).
    planExpiresAt: null,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role,
    firstName: 'Alice',
    lastName: 'Recruteur',
  })
  const candidate = await Candidate.create({
    email: `candidat-${suffix}@example.test`,
    firstName: 'Jean',
    lastName: 'Mbarga',
    city: 'Douala',
    country: 'Cameroun',
  })
  const job = await Job.create({
    organizationId: organization.id,
    createdBy: user.id,
    title: 'Développeur Go',
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

  return { organization, user, candidate, job, application, plan }
}

/** Une seconde organisation, pour vérifier l'isolation. */
async function otherOrganization(planSlug = 'pro') {
  const suffix = randomUUID()
  const plan = await Plan.query().where('slug', planSlug).firstOrFail()
  const organization = await Organization.create({
    name: `Autre ${suffix}`,
    slug: `autre-${suffix}`,
    planId: plan.id,
    planExpiresAt: null,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff2-${suffix}@example.test`,
    password: 'not-used-in-tests',
    role: 'recruiter',
  })
  return { organization, user }
}

async function cleanup(organization: Organization) {
  const jobIds = (
    (await db.query().from('jobs').where('organization_id', organization.id).select('id')) as {
      id: string
    }[]
  ).map((row) => row.id)

  const candidateIds = (
    (await db
      .query()
      .from('talent_pool_entries')
      .where('organization_id', organization.id)
      .select('candidate_id')) as { candidate_id: string }[]
  ).map((row) => row.candidate_id)

  if (jobIds.length) {
    await db.query().from('applications').whereIn('job_id', jobIds).delete()
    await db.query().from('job_form_versions').whereIn('job_id', jobIds).delete()
    await db.query().from('job_skills').whereIn('job_id', jobIds).delete()
    await db.query().from('jobs').whereIn('id', jobIds).delete()
  }

  await db.query().from('candidate_documents').whereIn('candidate_id', candidateIds).delete()
  await db.query().from('candidates').whereIn('id', candidateIds).delete()
  await db.query().from('users').where('organization_id', organization.id).delete()
  await db.query().from('organizations').where('id', organization.id).delete()
}

/** Faux serveur SMTP : les e-mails d'information ne doivent pas partir en vrai. */
function fakeMail() {
  mail.fake()
  return () => mail.restore()
}

function manualPayload(overrides: Record<string, unknown> = {}) {
  return {
    email: `externe-${randomUUID()}@example.test`,
    firstName: 'Awa',
    lastName: 'Nkem',
    phone: '+237 6 00 00 00 00',
    consentGiven: true,
    ...overrides,
  }
}

test.group('Vivier — accès par forfait', (group) => {
  group.each.setup(fakeMail)

  test('un forfait sans la capacité reçoit 402 et le forfait à prendre', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await fixtures('plus')

    const response = await client.get(BASE).loginAs(user)

    response.assertStatus(402)
    assert.equal(errorCode(response), 'plan_feature_required')
    assert.equal(featureErrorBody(response).feature, 'talentPool')
    // Le client peut afficher quoi acheter au lieu d'un refus nu.
    assert.equal(featureErrorBody(response).requiredPlan.slug, 'pro')

    await cleanup(organization)
  })

  test('Pro et Enterprise ont accès au vivier', async ({ client }) => {
    for (const slug of ['pro', 'enterprise']) {
      const { organization, user } = await fixtures(slug)

      const response = await client.get(BASE).loginAs(user)
      response.assertStatus(200)

      await cleanup(organization)
    }
  })

  test("un abonnement Pro expiré laisse lire mais refuse d'écrire", async ({ client, assert }) => {
    const { organization, user } = await fixtures('pro')
    organization.planExpiresAt = DateTime.now().minus({ days: 1 })
    await organization.save()

    const list = await client.get(BASE).loginAs(user)
    list.assertStatus(200)

    const write = await client.post(BASE).loginAs(user).json(manualPayload())
    write.assertStatus(402)
    assert.equal(errorCode(write), 'subscription_expired')

    await cleanup(organization)
  })
})

test.group('Vivier — ajout et doublons', (group) => {
  group.each.setup(fakeMail)

  test("ajoute le candidat d'une candidature", async ({ client, assert }) => {
    const { organization, user, candidate, application } = await fixtures()

    const response = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id, note: 'Profil solide sur Go' })

    response.assertStatus(201)
    assert.equal(entryBody(response).candidate.id, candidate.id)
    assert.equal(entryBody(response).source, 'application')
    assert.equal(entryBody(response).status, 'active')

    // Le candidat est informé de la conservation de son profil.
    const notification = await db
      .query()
      .from('emails')
      .where('candidate_id', candidate.id)
      .select('*')
    assert.lengthOf(notification, 1)

    await cleanup(organization)
  })

  test('ajoute un candidat externe et exige son accord', async ({ client, assert }) => {
    const { organization, user } = await fixtures()

    const refused = await client
      .post(BASE)
      .loginAs(user)
      .json(manualPayload({ consentGiven: false }))
    refused.assertStatus(422)
    assert.equal(errorCode(refused), 'consent_required')

    const response = await client.post(BASE).loginAs(user).json(manualPayload())
    response.assertStatus(201)
    assert.equal(entryBody(response).candidate.firstName, 'Awa')
    assert.equal(entryBody(response).source, 'manual')

    await cleanup(organization)
  })

  test('un second ajout ne crée pas de doublon', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()

    await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const second = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })

    second.assertStatus(201)
    assert.equal(second.body().id, (await firstEntryId(organization.id))!)

    const rows = await TalentPoolEntry.query().where('organization_id', organization.id)
    assert.lengthOf(rows, 1)

    await cleanup(organization)
  })

  test('un candidat déjà connu est complété, jamais réécrit', async ({ client, assert }) => {
    const { organization, user, candidate } = await fixtures()

    const response = await client
      .post(BASE)
      .loginAs(user)
      .json(manualPayload({ email: candidate.email, firstName: 'Autre' }))

    response.assertStatus(201)
    assert.equal(entryBody(response).candidate.id, candidate.id)

    await candidate.refresh()
    assert.equal(candidate.firstName, 'Jean')

    await cleanup(organization)
  })
})

test.group('Vivier — recherche et filtres', (group) => {
  group.each.setup(fakeMail)

  test('recherche par nom, compétence et tag', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()

    const skill = await Skill.create({
      name: 'Golang',
      slug: `golang-${randomUUID()}`,
      category: 'Backend',
    })
    await CandidateSkill.create({ candidateId: application.candidateId, skillId: skill.id })

    const tag = await Tag.create({ organizationId: organization.id, name: 'Backend' })

    await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id, tagIds: [tag.id] })

    const byName = await client.get(`${BASE}?search=Mbarga`).loginAs(user)
    byName.assertStatus(200)
    assert.lengthOf(byName.body().data, 1)

    const bySkill = await client.get(`${BASE}?search=Golang`).loginAs(user)
    bySkill.assertStatus(200)
    assert.lengthOf(bySkill.body().data, 1)

    const byTag = await client.get(`${BASE}?search=Backend`).loginAs(user)
    assert.lengthOf(byTag.body().data, 1)

    const byEmail = await client.get(`${BASE}?search=candidat-`).loginAs(user)
    assert.lengthOf(byEmail.body().data, 1)

    const nothing = await client.get(`${BASE}?search=Kubernetes`).loginAs(user)
    assert.lengthOf(nothing.body().data, 0)

    await cleanup(organization)
  })

  test('filtre par tag et par profil ayant un CV', async ({ client, assert }) => {
    const { organization, user, candidate, application } = await fixtures()

    const tag = await Tag.create({ organizationId: organization.id, name: 'Backend' })
    const other = await Tag.create({ organizationId: organization.id, name: 'Compta' })

    await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id, tagIds: [tag.id] })

    const matched = await client.get(`${BASE}?tagIds=${tag.id}`).loginAs(user)
    assert.lengthOf(matched.body().data, 1)

    const unmatched = await client.get(`${BASE}?tagIds=${other.id}`).loginAs(user)
    assert.lengthOf(unmatched.body().data, 0)

    const withCv = await client.get(`${BASE}?hasCv=true`).loginAs(user)
    assert.lengthOf(withCv.body().data, 0)

    await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/test.pdf',
      mimeType: 'application/pdf',
    })

    const nowWithCv = await client.get(`${BASE}?hasCv=true`).loginAs(user)
    assert.lengthOf(nowWithCv.body().data, 1)

    await cleanup(organization)
  })

  test('la pagination expose un meta cohérent', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()
    await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })

    const response = await client.get(`${BASE}?page=1&limit=10`).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().meta.total, 1)
    assert.equal(response.body().meta.perPage, 10)
    assert.equal(response.body().meta.lastPage, 1)

    await cleanup(organization)
  })
})

test.group('Vivier — retrait, restauration et purge', (group) => {
  group.each.setup(fakeMail)

  test("retirer du vivier ne supprime pas l'historique de candidature", async ({
    client,
    assert,
  }) => {
    const { organization, user, application, job } = await fixtures()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })

    const entryId = created.body().id as string

    const removed = await client
      .delete(`${BASE}/${entryId}`)
      .loginAs(user)
      .json({ reason: 'Profil trop senior pour le poste' })

    removed.assertStatus(200)
    assert.equal(entryBody(removed).status, 'archived')

    // L'historique de recrutement est intact.
    const stillThere = await Application.query().where('id', application.id).first()
    assert.exists(stillThere)
    assert.equal(stillThere!.jobId, job.id)

    // Le profil disparaît de la liste, mais reste consultable.
    const list = await client.get(BASE).loginAs(user)
    assert.lengthOf(listBody(list).data, 0)

    const archived = await client.get(`${BASE}?includeArchived=true`).loginAs(user)
    assert.lengthOf(archived.body().data, 1)

    const show = await client.get(`${BASE}/${entryId}`).loginAs(user)
    show.assertStatus(200)
    assert.equal(entryBody(show).status, 'archived')

    await cleanup(organization)
  })

  test('restaure un profil retiré sans dupliquer', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    await client.delete(`${BASE}/${entryId}`).loginAs(user)
    const restored = await client.post(`${BASE}/${entryId}/restore`).loginAs(user)

    restored.assertStatus(200)
    assert.equal(restored.body().status, 'active')

    assert.lengthOf(await TalentPoolEntry.query().where('organization_id', organization.id), 1)

    await cleanup(organization)
  })

  test('la purge efface le profil et sa durée de conservation est bornée', async ({
    client,
    assert,
  }) => {
    const { organization, user, application } = await fixtures()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    // Une durée de conservation est toujours posée, jamais infinie.
    const entry = await TalentPoolEntry.findOrFail(entryId)
    assert.isTrue(entry.retentionExpiresAt > DateTime.now())
    assert.equal(
      Math.round(entry.retentionExpiresAt.diff(DateTime.now(), 'months').months),
      RETENTION_MONTHS
    )

    const purged = await client
      .delete(`${BASE}/${entryId}/purge`)
      .loginAs(user)
      .json({ reason: 'candidate_request' })

    purged.assertStatus(200)
    assert.isTrue(purged.body().purged)
    assert.lengthOf(await TalentPoolEntry.query().where('id', entryId), 0)
    // La candidature, elle, survit : c'est le vivier qui était purgé.
    assert.exists(await Application.query().where('id', application.id).first())

    await cleanup(organization)
  })

  test('le job de purge retire les profils échus', async ({ assert }) => {
    const { organization, candidate } = await fixtures()

    await TalentPoolEntry.create({
      organizationId: organization.id,
      candidateId: candidate.id,
      source: 'manual',
      status: 'active',
      legalBasis: 'consent',
      retentionExpiresAt: DateTime.now().minus({ days: 1 }),
    })

    const purged = await TalentPoolService.purgeExpired()

    assert.isAbove(purged, 0)
    assert.lengthOf(await TalentPoolEntry.query().where('organization_id', organization.id), 0)

    await cleanup(organization)
  })
})

test.group('Vivier — notes et tags', (group) => {
  group.each.setup(fakeMail)

  test('ajoute, modifie et supprime une note interne', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    const note = await client
      .post(`${BASE}/${entryId}/notes`)
      .loginAs(user)
      .json({ content: 'Disponible dans trois mois' })
    note.assertStatus(201)
    const noteId = note.body().id as string

    const updated = await client
      .put(`${BASE}/${entryId}/notes/${noteId}`)
      .loginAs(user)
      .json({ content: 'Revenu sur le marché au T3' })
    updated.assertStatus(200)
    assert.equal(entryBody(updated).content, 'Revenu sur le marché au T3')

    const show = await client.get(`${BASE}/${entryId}`).loginAs(user)
    assert.lengthOf((show.body() as { notes: unknown[] }).notes, 1)

    const removed = await client.delete(`${BASE}/${entryId}/notes/${noteId}`).loginAs(user)
    removed.assertStatus(204)
    assert.lengthOf(await TalentPoolNote.query().where('talent_pool_entry_id', entryId), 0)

    await cleanup(organization)
  })

  test("remplace les tags et ignore ceux d'une autre organisation", async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()
    const rival = await otherOrganization()

    const owned = await Tag.create({ organizationId: organization.id, name: 'Backend' })
    const foreign = await Tag.create({ organizationId: rival.organization.id, name: 'Secret' })

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    const response = await client
      .put(`${BASE}/${entryId}/tags`)
      .loginAs(user)
      .json({ tagIds: [owned.id, foreign.id] })

    response.assertStatus(200)
    assert.lengthOf(response.body().tags, 1)
    assert.equal(response.body().tags[0].id, owned.id)

    const links = await TalentPoolTag.query().where('talent_pool_entry_id', entryId)
    assert.lengthOf(links, 1)

    await cleanup(organization)
    await cleanup(rival.organization)
  })

  test('les notes internes ne sortent pas du vivier', async ({ client, assert }) => {
    const { organization, user, candidate, application } = await fixtures()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    await client
      .post(`${BASE}/${entryId}/notes`)
      .loginAs(user)
      .json({ content: 'Salaire attendu : 400 000 XAF' })

    // Le détail candidat, qui est la seule autre vue sur un profil, n'en parle pas.
    const candidateDetail = await client
      .get(`/api/v1/dashboard/candidates/${candidate.id}`)
      .loginAs(user)
    candidateDetail.assertStatus(200)
    assert.notInclude(JSON.stringify(candidateDetail.body()), 'Salaire attendu')
    assert.notProperty(candidateDetail.body(), 'notes')
    assert.lengthOf(await TalentPoolNote.query().where('talent_pool_entry_id', entryId), 1)

    await cleanup(organization)
  })
})

test.group('Vivier — association à une offre', (group) => {
  group.each.setup(fakeMail)

  test('crée la candidature et réutilise le CV connu', async ({ client, assert }) => {
    const { organization, user, candidate, application } = await fixtures()

    const cv = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/test.pdf',
      mimeType: 'application/pdf',
    })

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    const otherJob = await Job.create({
      organizationId: organization.id,
      createdBy: user.id,
      title: 'Lead Backend',
      slug: `lead-${randomUUID()}`,
      status: 'published',
      headcount: 1,
    })

    const response = await client
      .post(`${BASE}/${entryId}/attach`)
      .loginAs(user)
      .json({ jobId: otherJob.id, coverLetter: 'Profil correspondant au poste' })

    response.assertStatus(201)
    assert.equal(response.body().jobId, otherJob.id)
    assert.equal(response.body().candidateId, candidate.id)
    assert.equal(response.body().cvDocumentId, cv.id)

    // Rejouer la même association ne crée pas de seconde candidature.
    const again = await client
      .post(`${BASE}/${entryId}/attach`)
      .loginAs(user)
      .json({ jobId: otherJob.id })
    again.assertStatus(200)

    assert.lengthOf(
      await Application.query().where('job_id', otherJob.id).where('candidate_id', candidate.id),
      1
    )

    await cleanup(organization)
  })

  test("refuse une offre d'une autre organisation", async ({ client }) => {
    const { organization, user, application } = await fixtures()
    const rival = await otherOrganization()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })

    const rivalJob = await Job.create({
      organizationId: rival.organization.id,
      createdBy: rival.user.id,
      title: 'Poste concurrent',
      slug: `concurrent-${randomUUID()}`,
      status: 'published',
      headcount: 1,
    })

    const response = await client
      .post(`${BASE}/${created.body().id}/attach`)
      .loginAs(user)
      .json({ jobId: rivalJob.id })

    response.assertStatus(404)

    await cleanup(organization)
    await cleanup(rival.organization)
  })
})

test.group('Vivier — isolation entre organisations', (group) => {
  group.each.setup(fakeMail)

  test('un vivier ne renvoie que ses propres profils', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()
    const rival = await otherOrganization()

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    const list = await client.get(BASE).loginAs(rival.user)
    list.assertStatus(200)
    assert.lengthOf(listBody(list).data, 0)

    const show = await client.get(`${BASE}/${entryId}`).loginAs(rival.user)
    show.assertStatus(404)

    const notes = await client.post(`${BASE}/${entryId}/notes`).loginAs(rival.user).json({
      content: 'Note qui ne doit pas exister',
    })
    notes.assertStatus(404)
    assert.lengthOf(await TalentPoolNote.query().where('talent_pool_entry_id', entryId), 0)

    const removed = await client.delete(`${BASE}/${entryId}`).loginAs(rival.user)
    removed.assertStatus(404)

    await cleanup(organization)
    await cleanup(rival.organization)
  })

  test("le CV d'un profil n'est pas téléchargeable par une autre organisation", async ({
    client,
  }) => {
    const { organization, user, candidate, application } = await fixtures()
    const rival = await otherOrganization()

    const document = await CandidateDocument.create({
      candidateId: candidate.id,
      applicationId: application.id,
      type: 'cv',
      name: 'cv.pdf',
      filePath: 'cvs/confidentiel.pdf',
      mimeType: 'application/pdf',
    })

    const created = await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })
    const entryId = created.body().id as string

    const forbidden = await client
      .get(`${BASE}/${entryId}/documents/${document.id}`)
      .loginAs(rival.user)
    forbidden.assertStatus(404)

    await cleanup(organization)
    await cleanup(rival.organization)
  })
})

test.group('Vivier — RBAC', (group) => {
  group.each.setup(fakeMail)

  test('un interviewer lit le vivier mais ne le modifie pas', async ({ client, assert }) => {
    const { organization, user, application } = await fixtures()
    const interviewer = await User.create({
      organizationId: organization.id,
      email: `interviewer-${randomUUID()}@example.test`,
      password: 'not-used-in-tests',
      role: 'interviewer',
    })

    await client
      .post(`${BASE}/from-application`)
      .loginAs(user)
      .json({ applicationId: application.id })

    const list = await client.get(BASE).loginAs(interviewer)
    list.assertStatus(200)
    assert.lengthOf(listBody(list).data, 1)

    const write = await client
      .post(`${BASE}/from-application`)
      .loginAs(interviewer)
      .json({ applicationId: application.id })
    write.assertStatus(403)

    await cleanup(organization)
  })
})

async function firstEntryId(organizationId: string): Promise<string | undefined> {
  const entry = await TalentPoolEntry.query()
    .where('organization_id', organizationId)
    .orderBy('created_at', 'asc')
    .first()
  return entry?.id
}
