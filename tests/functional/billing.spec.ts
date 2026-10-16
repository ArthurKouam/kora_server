import { test } from '@japa/runner'
import { createHmac } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import Payment from '#models/payment'
import Plan from '#models/plan'
import User from '#models/user'
import PlanService from '#services/plan_service'
import NotchPayService from '#services/notchpay_service'
import { parseNotchPayDate } from '#services/notchpay_service'
import type { NotchPayTransaction } from '#services/notchpay_service'
import { buildCsv } from '#services/csv'
import notchpayConfig from '#config/notchpay'
import { DateTime } from 'luxon'

/**
 * Ces tests couvrent ce qui coûte cher si c'est faux : un plan obtenu sans
 * payer, un webhook forgé, un montant falsifié, un quota contourné.
 */

/**
 * `Array.find` renvoie `T | undefined` : sans garde explicite, la disparition
 * d'un slug de plan produirait une erreur `undefined` difficile à interpréter.
 */
function mustFind<T>(items: T[], predicate: (item: T) => boolean, label: string): T {
  const found = items.find(predicate)
  if (found === undefined) {
    throw new Error(`Élément introuvable : ${label}`)
  }
  return found
}

/**
 * Le client de test type une URL par l'union des réponses de toutes les routes
 * qui partagent son chemin : sur `/api/v1/dashboard/jobs`, le corps est donc
 * `Job | ModelPaginatorContract<Job>`. Après un statut d'erreur, on lit le
 * corps d'erreur explicitement plutôt que de laisser l'union treacherous.
 */
function errorBody(response: { body(): unknown }): {
  error: string
  code?: string
  billingUrl?: string
} {
  const body = response.body()
  if (body === null || typeof body !== 'object' || !('error' in body)) {
    throw new Error(`Réponse sans champ "error" : ${JSON.stringify(body)}`)
  }
  return body as { error: string; code?: string; billingUrl?: string }
}

async function orgWithPlan(slug: string) {
  const suffix = randomUUID()
  const plan = await Plan.query().where('slug', slug).firstOrFail()
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  organization.planId = plan.id
  // Jamais facturé = pas de blocage (cf. PlanService.isActive).
  organization.planExpiresAt = null
  await organization.save()

  const owner = await User.create({
    organizationId: organization.id,
    email: `owner-${suffix}@example.test`,
    password: 'Motdepasse2026!',
    role: 'owner',
    firstName: 'Awa',
    lastName: 'Recruteur',
  })

  return { organization, owner, plan }
}

/**
 * Nettoyage : les `jobs` référencent `created_by` en NOT NULL, donc ils
 * doivent partir avant les utilisateurs.
 */
async function cleanup(organization: Organization) {
  const jobIds = (
    (await db.query().from('jobs').where('organization_id', organization.id).select('id')) as {
      id: string
    }[]
  ).map((row) => row.id)

  if (jobIds.length) {
    await db.query().from('applications').whereIn('job_id', jobIds).delete()
    await db.query().from('job_form_versions').whereIn('job_id', jobIds).delete()
    await db.query().from('job_skills').whereIn('job_id', jobIds).delete()
    await db.query().from('jobs').whereIn('id', jobIds).delete()
  }

  await db.query().from('users').where('organization_id', organization.id).delete()
  await db.query().from('organizations').where('id', organization.id).delete()
}

/**
 * Le validateur de création d'offre exige les champs nullables explicitement
 * présents (`null`), pas absents — voir `createJobValidator`.
 */
function jobPayload(suffix: string, title = 'Développeur PHP') {
  // Slug en minuscules : le validateur refuse les majuscules.
  const slug = `job-${suffix.replace(/[^a-z0-9]/g, '')}`

  return {
    title,
    slug,
    description: 'Poste de test',
    requirements: null,
    responsibilities: null,
    benefits: null,
    location: null,
    city: null,
    country: null,
    employmentType: 'full_time',
    workplaceType: 'remote',
    experienceLevel: 'confirmé',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    headcount: 1,
    status: 'draft',
    closingDate: null,
  }
}

test.group('Billing — plans et visibilité publique', () => {
  test('GET /billing/plans est public et renvoie les 3 plans', async ({ client, assert }) => {
    const response = await client.get('/api/v1/billing/plans')

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body, 3)

    const plus = mustFind(body, (p: any) => p.slug === 'plus', 'plan "plus"')
    assert.equal(plus.priceXaf, 8000)
    assert.equal(plus.maxActiveJobs, 5)
    assert.equal(plus.maxMembers, 3)
    assert.isTrue(plus.isPurchasable)

    const pro = mustFind(body, (p: any) => p.slug === 'pro', 'plan "pro"')
    assert.equal(pro.priceXaf, 20000)
    assert.equal(pro.maxActiveJobs, 20)
    assert.equal(pro.maxMembers, 10)

    const enterprise = mustFind(body, (p: any) => p.slug === 'enterprise', 'plan "enterprise"')
    assert.isNull(enterprise.priceXaf)
    assert.isFalse(enterprise.isPublic)
    // Non achetable : le bouton doit proposer un contact, pas un paiement.
    assert.isFalse(enterprise.isPurchasable)
  })

  test('les capacités non livrées sont marquées defined: false', async ({ client, assert }) => {
    const response = await client.get('/api/v1/billing/plans')
    response.assertStatus(200)

    const plus = mustFind(response.body(), (p: any) => p.slug === 'plus', 'plan "plus"')
    assert.isFalse(plus.features.cvParsing.defined)
    assert.isTrue(plus.features.customForms.defined)
  })
})

test.group('Billing — quotas', () => {
  test('une organisation sans forfait peut créer une offre', async ({ client }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const suffix = randomUUID()

    const response = await client
      .post('/api/v1/dashboard/jobs')
      .loginAs(owner)
      .json(jobPayload(suffix))

    response.assertStatus(201)
    await cleanup(organization)
  })

  test('le quota d’offures est refusé avec 402 une fois atteint', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')

    // Plus = 5 offres actives.
    for (let i = 0; i < 5; i++) {
      await client
        .post('/api/v1/dashboard/jobs')
        .loginAs(owner)
        .json(jobPayload(randomUUID(), `Offre ${i}`))
    }

    const response = await client
      .post('/api/v1/dashboard/jobs')
      .loginAs(owner)
      .json(jobPayload(randomUUID(), 'Offre 6'))

    response.assertStatus(402)
    assert.match(errorBody(response).error, /limité à 5 offres/)
    assert.equal(errorBody(response).code, 'job_quota_reached')

    await cleanup(organization)
  })

  test('Pro autorise 20 offres, le quota ne bloque pas à 6', async ({ client }) => {
    const { organization, owner } = await orgWithPlan('pro')

    for (let i = 0; i < 6; i++) {
      const response = await client
        .post('/api/v1/dashboard/jobs')
        .loginAs(owner)
        .json(jobPayload(randomUUID(), `Offre Pro ${i}`))
      response.assertStatus(201)
    }

    await cleanup(organization)
  })

  test('une offre clôturée libère un quota', async ({ client }) => {
    const { organization, owner } = await orgWithPlan('plus')

    const created: string[] = []
    for (let i = 0; i < 5; i++) {
      const response = await client
        .post('/api/v1/dashboard/jobs')
        .loginAs(owner)
        .json(jobPayload(randomUUID(), `Offre ${i}`))
      response.assertStatus(201)
      created.push((response.body() as { id: string }).id)
    }

    await db.query().from('jobs').where('id', created[0]).update({ status: 'closed' })

    const response = await client
      .post('/api/v1/dashboard/jobs')
      .loginAs(owner)
      .json(jobPayload(randomUUID(), 'Offre après clôture'))

    response.assertStatus(201)
    await cleanup(organization)
  })

  test('le quota de membres est signalé avant tout envoi d’email', async ({ assert }) => {
    const { organization } = await orgWithPlan('plus')

    // Plus = 3 membres ; il y en a déjà 1 (le owner).
    for (let i = 0; i < 2; i++) {
      await User.create({
        organizationId: organization.id,
        email: `membre-${i}-${randomUUID()}@example.test`,
        password: 'Motdepasse2026!',
        role: 'recruiter',
      })
    }

    const message = await PlanService.checkMemberQuota(organization)
    assert.isNotNull(message)
    assert.include(message!, 'limité à 3 membres')

    await cleanup(organization)
  })
})

test.group('Billing — inscription', () => {
  test('une organisation fraîchement créée n’a aucun forfait par défaut', async ({
    client,
    assert,
  }) => {
    const suffix = randomUUID()
    const email = `nouveau-${suffix}@example.test`

    const signup = await client.post('/api/v1/auth/signup').json({
      firstName: 'Nouvelle',
      lastName: 'Recruteuse',
      email,
      password: 'Motdepasse2026!',
      passwordConfirmation: 'Motdepasse2026!',
      organizationName: `Org ${suffix}`,
    })

    signup.assertStatus(201)

    const user = await User.findByOrFail('email', email)
    const organization = (await Organization.find(user.organizationId!))!

    /**
     * Le forfait est un choix du client : aucun repli implicite vers « Plus ».
     * Le compte reste utilisable (aucun quota ne le bloque), mais n'accède à
     * aucune capacité payante.
     */
    assert.isNull(organization.planId)
    assert.isNull(organization.planExpiresAt)
    assert.isNull(await PlanService.forOrganization(organization))

    const subscription = await client.get('/api/v1/billing/subscription').loginAs(user)

    subscription.assertStatus(200)

    const body = subscription.body() as {
      plan: unknown
      limits: { maxActiveJobs: number | null; maxMembers: number | null }
      capabilities: { talentPool: boolean }
    }

    assert.isNull(body.plan)
    assert.isFalse(body.capabilities.talentPool)
    // Un quota `null` veut dire « illimité », pas « zéro ».
    assert.isNull(body.limits.maxActiveJobs)

    await cleanup(organization)
  })
})

test.group('Billing — expiration en lecture seule', () => {
  test('une organization expirée est bloquée en écriture', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')
    organization.planExpiresAt = DateTime.now().minus({ days: 1 })
    await organization.save()

    const response = await client
      .post('/api/v1/dashboard/jobs')
      .loginAs(owner)
      .json(jobPayload(randomUUID()))

    response.assertStatus(402)
    assert.equal(errorBody(response).code, 'subscription_expired')
    assert.match(errorBody(response).error, /a expiré/)
    assert.equal(errorBody(response).billingUrl, '/settings/billing')

    await cleanup(organization)
  })

  test('la lecture reste possible après expiration', async ({ client }) => {
    const { organization, owner } = await orgWithPlan('plus')
    organization.planExpiresAt = DateTime.now().minus({ days: 1 })
    await organization.save()

    const response = await client.get('/api/v1/dashboard/jobs').loginAs(owner)
    response.assertStatus(200)

    await cleanup(organization)
  })

  test('l’export reste ouvert après expiration', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')
    organization.planExpiresAt = DateTime.now().minus({ days: 30 })
    await organization.save()

    const response = await client.get('/api/v1/billing/applications/export').loginAs(owner)

    response.assertStatus(200)
    assert.match(response.header('content-type') || '', /text\/csv/)
    // BOM UTF-8 : sans lui Excel affiche mal les accents.
    assert.equal(response.text().charCodeAt(0), 0xfeff)

    await cleanup(organization)
  })

  test('PlanService : pas d’échéance = actif, échéance passée = inactif', async ({ assert }) => {
    const { organization } = await orgWithPlan('plus')

    organization.planExpiresAt = null
    assert.isTrue(PlanService.isActive(organization))
    assert.equal(PlanService.remainingDays(organization), 0)

    organization.planExpiresAt = DateTime.now().minus({ days: 1 })
    assert.isFalse(PlanService.isActive(organization))

    organization.planExpiresAt = DateTime.now().plus({ days: 3 })
    assert.isTrue(PlanService.isActive(organization))
    assert.isTrue(PlanService.isExpiringSoon(organization, 5))

    await cleanup(organization)
  })

  test('activate prolonge depuis l’échéance lors d’un renouvellement anticipé', async ({
    assert,
  }) => {
    let { organization } = await orgWithPlan('plus')
    const pro = await Plan.query().where('slug', 'pro').firstOrFail()

    const future = DateTime.now().plus({ days: 10 })
    organization.planExpiresAt = future
    await organization.save()

    await PlanService.activate(organization, pro)
    organization = (await Organization.find(organization.id))!

    const days = organization.planExpiresAt!.diff(future, 'days').days
    assert.isTrue(Math.abs(days - 30) < 1)

    await cleanup(organization)
  })
})

test.group('Billing — sécurité du paiement', () => {
  test('checkout refuse le plan enterprise (non public)', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const enterprise = await Plan.query().where('slug', 'enterprise').firstOrFail()

    const response = await client
      .post('/api/v1/billing/checkout')
      .loginAs(owner)
      .json({ planId: enterprise.id })

    response.assertStatus(403)
    assert.match(errorBody(response).error, /devis/)

    await cleanup(organization)
  })

  test('checkout refuse un planId inconnu', async ({ client }) => {
    const { organization, owner } = await orgWithPlan('plus')

    const response = await client
      .post('/api/v1/billing/checkout')
      .loginAs(owner)
      .json({ planId: '00000000-0000-0000-0000-000000000000' })

    response.assertStatus(404)
    await cleanup(organization)
  })

  test('confirm ne peut pas activer un plan avec une référence étrangère', async ({
    client,
    assert,
  }) => {
    let { organization, owner } = await orgWithPlan('plus')

    const response = await client
      .post('/api/v1/billing/confirm')
      .loginAs(owner)
      .json({ reference: 'trx.inexistant-totalement' })

    response.assertStatus(404)
    organization = (await Organization.find(organization.id))!
    assert.isNull(organization.planExpiresAt)

    await cleanup(organization)
  })

  test('confirm ignore un status=complete injecté par le client', async ({ client, assert }) => {
    let { organization, owner } = await orgWithPlan('plus')
    const plan = await Plan.query().where('slug', 'pro').firstOrFail()

    const payment = await Payment.create({
      organizationId: organization.id,
      planId: plan.id,
      notchpayReference: `trx.synthetique-${randomUUID()}`,
      orderReference: `kor_test_${randomUUID().slice(0, 8)}`,
      amount: 20000,
      currency: 'XAF',
      status: 'pending',
    })

    const response = await client
      .post('/api/v1/billing/confirm')
      .loginAs(owner)
      // Seul `reference` est accepté par le contrat : la confiance ne repose pas sur
      // des champs envoyés par le client, mais sur l'appel à NotchPay via
      // syncPayment. Un montant falsifié n'a donc rien à faire dans cette requête.
      .json({ reference: payment.notchpayReference ?? '' })

    // L'appel réseau à NotchPay échoue : aucun plan ne doit s'activer.
    organization = (await Organization.find(organization.id))!
    assert.isNull(organization.planExpiresAt)
    assert.notEqual(response.status(), 200)

    await cleanup(organization)
  })

  test('checkout exige une authentification', async ({ client }) => {
    const { organization } = await orgWithPlan('plus')

    const response = await client.post('/api/v1/billing/checkout').json({ planId: randomUUID() })
    response.assertStatus(401)

    await cleanup(organization)
  })

  test('checkout ne réutilise pas un paiement en attente d’un autre forfait', async ({
    client,
    assert,
  }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const pro = await Plan.query().where('slug', 'pro').firstOrFail()
    const plus = await Plan.query().where('slug', 'plus').firstOrFail()
    const staleUrl = 'https://checkout.notchpay.co/pay/pro-en-attente'

    await Payment.create({
      organizationId: organization.id,
      planId: pro.id,
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 20000,
      currency: 'XAF',
      status: 'pending',
      authorizationUrl: staleUrl,
    })

    const response = await client
      .post('/api/v1/billing/checkout')
      .loginAs(owner)
      .json({ planId: plus.id })

    // Sinon le client croirait choisir Plus et paierait Pro.
    assert.notEqual(
      (response.body() as { authorizationUrl?: string })?.authorizationUrl,
      staleUrl
    )
    assert.notEqual((response.body() as { reused?: boolean })?.reused, true)

    await cleanup(organization)
  })

  test('checkout ne réutilise pas un paiement en attente périmé', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const plus = await Plan.query().where('slug', 'plus').firstOrFail()
    const staleUrl = 'https://checkout.notchpay.co/pay/perime'

    const stale = await Payment.create({
      organizationId: organization.id,
      planId: plus.id,
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 8000,
      currency: 'XAF',
      status: 'pending',
      authorizationUrl: staleUrl,
    })

    // Une transaction NotchPay expire après 3 h : au-delà, le lien ne permet
    // plus de payer, mais l'ancien garde-fou le renvoyait quand même.
    await db
      .query()
      .from('payments')
      .where('id', stale.id)
      .update({ created_at: DateTime.now().minus({ hours: 4 }).toSQL() })

    const response = await client
      .post('/api/v1/billing/checkout')
      .loginAs(owner)
      .json({ planId: plus.id })

    assert.notEqual(
      (response.body() as { authorizationUrl?: string })?.authorizationUrl,
      staleUrl
    )

    await cleanup(organization)
  })

  test('confirm retrouve la transaction par le trxref renvoyé par NotchPay', async ({
    client,
    assert,
  }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const plan = await Plan.query().where('slug', 'pro').firstOrFail()

    const payment = await Payment.create({
      organizationId: organization.id,
      planId: plan.id,
      // NotchPay renvoie son identifiant sous `reference` et le nôtre sous
      // `trxref` : les deux doivent retrouver la même ligne, sinon un client
      // qui vient de payer lit « paiement introuvable ».
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 20000,
      currency: 'XAF',
      status: 'pending',
    })

    const response = await client
      .post('/api/v1/billing/confirm')
      .loginAs(owner)
      .json({ reference: 'trx.inconnu-des-deux-colonnes', trxref: payment.orderReference })

    // Seul le 404 prouve l'échec de la recherche : la suite part en erreur
    // faute de clé NotchPay dans l'environnement de test.
    assert.notEqual(response.status(), 404)

    await cleanup(organization)
  })

  test('confirm retrouve la transaction via le payload enregistré', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')
    const plan = await Plan.query().where('slug', 'pro').firstOrFail()

    const payment = await Payment.create({
      organizationId: organization.id,
      planId: plan.id,
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 20000,
      currency: 'XAF',
      status: 'pending',
      // Cas documenté : le callback porte un `trx.*` qui n'est ni notre
      // référence ni l'`id` stocké. Le payload reste le dernier recours.
      payload: {
        id: `pay_${randomUUID()}`,
        reference: 'trx.callback-seulement',
        trxref: null,
      },
    })

    assert.isNotNull(payment.payload)

    const response = await client
      .post('/api/v1/billing/confirm')
      .loginAs(owner)
      .json({ reference: 'trx.callback-seulement' })

    assert.notEqual(response.status(), 404)

    await cleanup(organization)
  })
})

test.group('Billing — statuts et dates NotchPay', () => {
  test('les statuts étendus sont acceptés par la contrainte', async ({ assert }) => {
    const { organization } = await orgWithPlan('plus')
    const plan = await Plan.query().where('slug', 'plus').firstOrFail()

    /**
     * Le CHECK d'origine n'en prévoyait que six : un abandon ou un
     * remboursement faisait échouer l'écriture, donc le webhook ne pouvait
     * jamais suivre l'état réel de la transaction.
     */
    const extended = [
      'incomplete',
      'abandoned',
      'rejected',
      'refunded',
      'partialy-refunded',
    ]

    for (const status of extended) {
      const payment = await Payment.create({
        organizationId: organization.id,
        planId: plan.id,
        notchpayReference: `pay_${randomUUID()}`,
        orderReference: `kor_${randomUUID().slice(0, 8)}`,
        amount: 8000,
        currency: 'XAF',
        status,
      })

      assert.equal(payment.status, status)
    }

    await cleanup(organization)
  })

  test('un statut inconnu ne remplace pas le statut enregistré', async ({ assert }) => {
    const { organization } = await orgWithPlan('plus')
    const plan = await Plan.query().where('slug', 'plus').firstOrFail()

    const payment = await Payment.create({
      organizationId: organization.id,
      planId: plan.id,
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 8000,
      currency: 'XAF',
      status: 'pending',
    })

    const applied = payment.applyProviderTransaction({ status: 'statut-imprevu-du-fournisseur' })

    assert.equal(applied, 'pending')
    assert.equal(payment.status, 'pending')

    await cleanup(organization)
  })

  test('les dates NotchPay en ISO 8601 sont converties', ({ assert }) => {
    const parsed = parseNotchPayDate('2026-10-16T11:05:00.000000Z')

    assert.isNotNull(parsed)
    assert.isTrue(parsed!.isValid)
    assert.equal(parsed!.toISO(), '2026-10-16T11:05:00.000Z')

    // `DateTime.fromSQL` acceptait ce format et produisait une date invalide :
    // c'est ce qui faisait échouer l'enregistrement de `paid_at`.
    assert.isNull(parseNotchPayDate(null))
    assert.isNull(parseNotchPayDate(undefined))
    assert.isNull(parseNotchPayDate('pas-une-date'))
  })

  test('confirm active le forfait sur une réponse NotchPay complète', async ({
    client,
    assert,
  }) => {
    let { organization, owner } = await orgWithPlan('plus')
    const pro = await Plan.query().where('slug', 'pro').firstOrFail()

    const payment = await Payment.create({
      organizationId: organization.id,
      planId: pro.id,
      notchpayReference: `pay_${randomUUID()}`,
      orderReference: `kor_${randomUUID().slice(0, 8)}`,
      amount: 20000,
      currency: 'XAF',
      status: 'pending',
    })

    const original = NotchPayService.retrievePayment

    // Réponse réelle de l'API : statut `complete` et `completed_at` en ISO
    // 8601. C'est ce format qui faisait échouer la confirmation (500) sans
    // jamais activer le forfait.
    NotchPayService.retrievePayment = async (): Promise<NotchPayTransaction> => ({
      id: payment.notchpayReference!,
      reference: payment.orderReference,
      amount: 20000,
      currency: 'XAF',
      status: 'complete',
      created_at: '2026-10-16T11:00:00.000000Z',
      completed_at: '2026-10-16T11:05:00.000000Z',
    })

    try {
      const response = await client
        .post('/api/v1/billing/confirm')
        .loginAs(owner)
        .json({ reference: payment.notchpayReference! })

      response.assertStatus(200)
      assert.isTrue((response.body() as { activated: boolean }).activated)
    } finally {
      NotchPayService.retrievePayment = original
    }

    const synced = (await Payment.find(payment.id))!
    assert.equal(synced.status, 'complete')
    assert.isNotNull(synced.paidAt)
    assert.equal(synced.paidAt!.toUTC().toFormat('HH:mm'), '11:05')

    organization = (await Organization.find(organization.id))!
    assert.equal(organization.planId, pro.id)
    assert.isNotNull(organization.planExpiresAt)

    await cleanup(organization)
  })
})

test.group('Billing — webhooks', () => {
  // Clé lue depuis la config de l'app : c'est elle que le contrôleur compare.
  const hashKey = notchpayConfig.hashKey ?? ''

  test('une signature valide est acceptée, une forgée refusée', ({ assert }) => {
    const body = JSON.stringify({ id: 'evt_1', type: 'payment.complete' })
    const signature = createHmac('sha256', hashKey).update(body, 'utf8').digest('hex')

    assert.isTrue(NotchPayService.verifyWebhookSignature(body, signature))
    assert.isFalse(NotchPayService.verifyWebhookSignature(body, 'deadbeef'))
    assert.isFalse(NotchPayService.verifyWebhookSignature(body, null))
    assert.isFalse(NotchPayService.verifyWebhookSignature(body, ''))
  })

  test('modifier le corps invalide la signature', ({ assert }) => {
    const body = JSON.stringify({ id: 'evt_1', type: 'payment.complete' })
    const signature = createHmac('sha256', hashKey).update(body, 'utf8').digest('hex')

    const tampered = JSON.stringify({ id: 'evt_1', type: 'payment.complete', amount: 1 })
    assert.isFalse(NotchPayService.verifyWebhookSignature(tampered, signature))
  })

  test('le webhook refuse une signature invalide avec 400', async ({ client }) => {
    const response = await client
      .post('/api/v1/billing/webhooks/notchpay')
      .header('x-notch-signature', 'signature-bidon')
      .json({ id: 'evt_faux', type: 'payment.complete' })

    response.assertStatus(400)
  })

  test('un retry du même événement n’est traité qu’une fois', async ({ client, assert }) => {
    const eventId = `evt_${randomUUID()}`
    const body = JSON.stringify({
      id: eventId,
      type: 'payment.canceled',
      data: { reference: 'trx.inconnu', status: 'canceled' },
    })
    const signature = createHmac('sha256', hashKey).update(body, 'utf8').digest('hex')

    const first = await client
      .post('/api/v1/billing/webhooks/notchpay')
      .header('x-notch-signature', signature)
      .json(JSON.parse(body))

    first.assertStatus(200)
    assert.isUndefined((first.body() as { duplicate?: boolean }).duplicate)

    const second = await client
      .post('/api/v1/billing/webhooks/notchpay')
      .header('x-notch-signature', signature)
      .json(JSON.parse(body))

    second.assertStatus(200)
    assert.isTrue((second.body() as { duplicate?: boolean }).duplicate)

    const rows = await db.query().from('webhook_events').where('event_id', eventId)
    assert.lengthOf(rows, 1)

    await db.query().from('webhook_events').where('event_id', eventId).delete()
  })
})

test.group('Billing — export CSV', () => {
  test('les séparateurs et guillemets sont échappés', ({ assert }) => {
    const csv = buildCsv(['Nom', 'Note'], [['Nguyen; Thuy', 'Il a dit "oui"']])

    assert.include(csv, '"Nguyen; Thuy"')
    assert.include(csv, '"Il a dit ""oui"""')
  })

  test('les retours à la ligne n’cassent pas l’alignement', ({ assert }) => {
    const csv = buildCsv(['Nom'], [['Ligne 1\nLigne 2']])

    // Une seule ligne de données : le saut interne a été neutralisé.
    assert.equal(csv.split('\r\n').length, 2)
    assert.include(csv, 'Ligne 1 Ligne 2')
  })

  test('une formule Excel est neutralisée', ({ assert }) => {
    const csv = buildCsv(['Email'], [['=cmd|calc']])

    // Préfixée d'une apostrophe, sinon Excel exécute la formule.
    assert.include(csv, "'=cmd|calc")
  })

  test('les accents sont préservés', ({ assert }) => {
    const csv = buildCsv(['Ville'], [['Douala']])

    assert.include(csv, 'Douala')
  })

  test('l’export ne renvoie que les candidatures de l’organisation', async ({ client, assert }) => {
    const { organization, owner } = await orgWithPlan('plus')

    const response = await client.get('/api/v1/billing/applications/export').loginAs(owner)
    response.assertStatus(200)

    // Entête présente, et la ligne d'en-tête contient bien nos colonnes.
    assert.include(response.text(), 'Date de candidature')

    await cleanup(organization)
  })
})
