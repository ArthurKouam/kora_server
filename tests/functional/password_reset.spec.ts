import Email from '#models/email'
import Organization from '#models/organization'
import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { hashPasswordResetToken } from '#services/password_reset_service'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const BASE = '/api/v1/auth'

/**
 * Contrat public du flux « mot de passe oublié » et propriétés de sécurité :
 * pas d'énumération de comptes, usage unique du jeton, révocation des sessions.
 */
async function fixtures() {
  const suffix = randomUUID()
  const organization = await Organization.create({
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `staff-${suffix}@example.test`,
    password: 'motdepasse-initial',
    role: 'owner',
    firstName: 'Alice',
  })
  return { organization, user }
}

/** Extrait le token en clair du corps de l'email journalisé. */
function extractToken(body: string | null): string {
  const content = body ?? ''
  const match = content.match(/\/reset-password\/([A-Za-z0-9_-]+)/)
  if (!match) {
    throw new Error(`Aucun lien de réinitialisation dans l'email : ${content.slice(0, 200)}`)
  }
  return match[1]
}

function useFixtures() {
  const mailFake = () => mail.fake()
  const cleanup = async () => {
    mail.restore()
    await limiter.clear(['memory'])
  }
  return { mailFake, cleanup }
}

/** Déclenche une demande et renvoie le token en clair du dernier email. */
async function requestToken(email: string, client: any): Promise<string> {
  const response = await client.post(`${BASE}/forgot-password`).json({ email })
  response.assertStatus(202)
  const row = await Email.query()
    .where('recipient', email)
    .orderBy('created_at', 'desc')
    .firstOrFail()
  return extractToken(row.body)
}

test.group('Mot de passe oublié — demande', (group) => {
  const { mailFake, cleanup } = useFixtures()
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(cleanup)

  test('envoie un email contenant un lien de réinitialisation', async ({ client, assert }) => {
    const { user } = await fixtures()
    mailFake()

    const response = await client.post(`${BASE}/forgot-password`).json({ email: user.email })

    response.assertStatus(202)

    const row = await Email.query().where('recipient', user.email).firstOrFail()
    const token = extractToken(row.body)
    assert.isNotEmpty(token)
    assert.include(row.subject!, 'Réinitialisation')
    assert.equal(row.type, 'custom')

    // Le token n'est jamais stocké en clair : seule son empreinte l'est.
    const stored = await PasswordResetToken.query().where('user_id', user.id).firstOrFail()
    assert.equal(stored.tokenHash, hashPasswordResetToken(token))
    assert.notEqual(stored.tokenHash, token)
    assert.isNull(stored.usedAt)
  })

  test('répond 202 sans rien envoyer pour un email inconnu', async ({ client, assert }) => {
    mailFake()

    const email = `inconnu-${randomUUID()}@example.test`
    const response = await client.post(`${BASE}/forgot-password`).json({ email })

    // Message identique au cas nominal : pas d'énumération de comptes.
    response.assertStatus(202)
    assert.include(response.body().message, 'Si un compte existe')
    assert.lengthOf(await Email.query().where('recipient', email), 0)
  })

  test('valide le format de l\'email', async ({ client }) => {
    const response = await client.post(`${BASE}/forgot-password`).json({ email: 'pas-un-email' })

    response.assertStatus(422)
  })

  test('invalide la demande précédente du même utilisateur', async ({ client, assert }) => {
    const { user } = await fixtures()
    mailFake()

    const firstToken = await requestToken(user.email, client)
    const secondToken = await requestToken(user.email, client)
    assert.notEqual(firstToken, secondToken)

    // Seul le lien le plus récent est encore utilisable.
    const previous = await client.get(`${BASE}/reset-password/${firstToken}`)
    previous.assertStatus(410)
    const current = await client.get(`${BASE}/reset-password/${secondToken}`)
    current.assertStatus(200)
  })
})

test.group('Mot de passe oublié — application', (group) => {
  const { mailFake, cleanup } = useFixtures()
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(cleanup)

  test('le lien valide expose un email masqué et une expiration', async ({ client, assert }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    const response = await client.get(`${BASE}/reset-password/${token}`)

    response.assertStatus(200)
    // Le type est inferred comme une union 200|410 : on fixe le cas nominal.
    const body = response.body() as { status: string; email: string; expiresAt: string | null }
    assert.equal(body.status, 'valid')
    // L'adresse complète n'est jamais exposée sur un lien public.
    assert.notInclude(body.email, user.email)
    assert.include(body.email, '@example.test')
    assert.isTrue(DateTime.fromISO(body.expiresAt!) > DateTime.now())
  })

  test('applique le nouveau mot de passe et permet la connexion', async ({ client }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    const response = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'nouveau-motdepasse' })

    response.assertStatus(200)

    // 400 et non 401 : c'est le code renvoyé par `verifyCredentials`.
    const withOldPassword = await client
      .post(`${BASE}/login`)
      .json({ email: user.email, password: 'motdepasse-initial' })
    withOldPassword.assertStatus(400)

    const withNewPassword = await client
      .post(`${BASE}/login`)
      .json({ email: user.email, password: 'nouveau-motdepasse' })
    withNewPassword.assertStatus(200)
  })

  test('rejette un mot de passe trop court', async ({ client }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    const response = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'court', passwordConfirmation: 'court' })

    response.assertStatus(422)

    // Le token reste consommable après un échec de validation.
    const stillValid = await client.get(`${BASE}/reset-password/${token}`)
    stillValid.assertStatus(200)
  })

  test('rejette une confirmation qui ne correspond pas', async ({ client }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    const response = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'autre-motdepasse' })

    response.assertStatus(422)
  })

  test('refuse un token déjà utilisé', async ({ client, assert }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    const first = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'nouveau-motdepasse' })
    first.assertStatus(200)

    const replay = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'encore-un-autre', passwordConfirmation: 'encore-un-autre' })

    replay.assertStatus(410)
    assert.equal((replay.body() as { status: string }).status, 'used')

    // Le rejeu n'a rien changé : c'est le premier mot de passe qui reste valide.
    const login = await client
      .post(`${BASE}/login`)
      .json({ email: user.email, password: 'nouveau-motdepasse' })
    login.assertStatus(200)
  })

  test('refuse un token expiré', async ({ client }) => {
    const { user } = await fixtures()
    mailFake()
    const token = await requestToken(user.email, client)

    await PasswordResetToken.query()
      .where('user_id', user.id)
      .update({ expiresAt: DateTime.now().minus({ minutes: 1 }).toSQL()! })

    const show = await client.get(`${BASE}/reset-password/${token}`)
    show.assertStatus(410)

    const reset = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'nouveau-motdepasse' })
    reset.assertStatus(410)

    // Le mot de passe d'origine reste le seul valide.
    const login = await client
      .post(`${BASE}/login`)
      .json({ email: user.email, password: 'motdepasse-initial' })
    login.assertStatus(200)
  })

  test('révoque les sessions et jetons existants après réinitialisation', async ({ client, assert }) => {
    const { user } = await fixtures()
    mailFake()

    await db.table('remember_me_tokens').insert({
      tokenable_id: user.id,
      hash: 'hash-avant-reset',
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
      expires_at: DateTime.now().plus({ days: 30 }),
    })
    await db.table('auth_access_tokens').insert({
      tokenable_id: user.id,
      type: 'api',
      name: 'test',
      hash: 'hash-avant-reset',
      abilities: '*',
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
      expires_at: DateTime.now().plus({ days: 30 }),
    })

    const token = await requestToken(user.email, client)
    const response = await client
      .post(`${BASE}/reset-password/${token}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'nouveau-motdepasse' })
    response.assertStatus(200)

    const rememberMe = await db
      .query()
      .from('remember_me_tokens')
      .where('tokenable_id', user.id)
      .select('*')
    assert.lengthOf(rememberMe, 0)

    const accessTokens = await db
      .query()
      .from('auth_access_tokens')
      .where('tokenable_id', user.id)
      .select('*')
    assert.lengthOf(accessTokens, 0)
  })

  test('refuse un token forgé', async ({ client }) => {
    const forged = 'a'.repeat(43)

    const show = await client.get(`${BASE}/reset-password/${forged}`)
    show.assertStatus(410)

    const reset = await client
      .post(`${BASE}/reset-password/${forged}`)
      .json({ password: 'nouveau-motdepasse', passwordConfirmation: 'nouveau-motdepasse' })
    reset.assertStatus(410)
  })
})
