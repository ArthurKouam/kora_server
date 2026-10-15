import SendTeamInvitationEmail from '#jobs/send_team_invitation_email'
import Organization from '#models/organization'
import Email from '#models/email'
import TeamInvitation from '#models/team_invitation'
import User from '#models/user'
import {
  decryptTeamInvitationToken,
  encryptTeamInvitationToken,
  generateTeamInvitationToken,
  hashTeamInvitationToken,
} from '#services/team_invitation_tokens'
import testUtils from '@adonisjs/core/services/test_utils'
import limiter from '@adonisjs/limiter/services/main'
import mail from '@adonisjs/mail/services/main'
import { QueueManager } from '@adonisjs/queue'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

async function fixtures(role = 'owner') {
  const suffix = randomUUID()
  const organization = await Organization.create({
    name: `Organisation ${suffix}`,
    slug: `org-${suffix}`,
  })
  const user = await User.create({
    organizationId: organization.id,
    email: `owner-${suffix}@example.test`,
    password: 'old-password',
    role,
    firstName: 'Owner',
    lastName: 'Test',
  })
  return { organization, user }
}

async function createInvitation(options: {
  organizationId: string
  invitedBy: string
  email: string
  role?: string
  status?: string
  expiresAt?: DateTime
}) {
  const token = generateTeamInvitationToken()
  const row = await TeamInvitation.create({
    organizationId: options.organizationId,
    invitedBy: options.invitedBy,
    email: options.email.toLowerCase(),
    role: options.role ?? 'recruiter',
    status: options.status ?? 'pending',
    deliveryStatus: 'pending',
    tokenHash: hashTeamInvitationToken(token),
    deliveryError: null,
    expiresAt: options.expiresAt ?? DateTime.now().plus({ days: 7 }),
    sentAt: null,
    acceptedAt: options.status === 'accepted' ? DateTime.now() : null,
    cancelledAt: options.status === 'cancelled' ? DateTime.now() : null,
  })
  return { row, token }
}

test.group('Team invitations', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().withGlobalTransaction()
    await limiter.clear(['memory'])
    return rollback
  })

  group.each.teardown(() => {
    QueueManager.restore()
    mail.restore()
  })

  test('creates a normalized invitation for an owner and queues a hashed-token email', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await fixtures()
    const queue = QueueManager.fake()
    const response = await client
      .post('/api/v1/dashboard/team/invitations')
      .loginAs(user)
      .json({ email: '  Invitee@Example.Test ', role: 'recruiter' })

    response.assertStatus(201)
    response.assertBodyNotContains(['token', 'tokenHash', 'organizationId', 'invitedBy'])
    const body = response.body() as { data: { id: string; email: string } }
    assert.equal(body.data.email, 'invitee@example.test')
    const row = await TeamInvitation.findOrFail(body.data.id)
    assert.lengthOf(row.tokenHash, 64)
    assert.notEqual(row.tokenHash, body.data.id)
    assert.equal(row.organizationId, organization.id)
    assert.equal(row.invitedBy, user.id)
    queue.assertPushed(SendTeamInvitationEmail, {
      queue: 'emails',
      payload: (value) => {
        const payload = value as { expectedTokenHash: string; encryptedToken: string }
        return (
          payload.expectedTokenHash === row.tokenHash &&
          !payload.encryptedToken.includes(row.tokenHash)
        )
      },
    })
  })

  test('enforces owner-only RBAC and rejects owner role or client-controlled fields', async ({
    client,
  }) => {
    const { organization, user: owner } = await fixtures()
    const admin = await User.create({
      organizationId: organization.id,
      email: `admin-${randomUUID()}@example.test`,
      password: 'old-password',
      role: 'admin',
    })

    const forbidden = await client
      .post('/api/v1/dashboard/team/invitations')
      .loginAs(admin)
      .json({ email: 'member@example.test', role: 'recruiter' })
    forbidden.assertStatus(403)

    const managedInvitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      email: 'managed@example.test',
    })
    const forbiddenResend = await client
      .post(`/api/v1/dashboard/team/invitations/${managedInvitation.row.id}/resend`)
      .loginAs(admin)
    forbiddenResend.assertStatus(403)
    const forbiddenCancel = await client
      .post(`/api/v1/dashboard/team/invitations/${managedInvitation.row.id}/cancel`)
      .loginAs(admin)
    forbiddenCancel.assertStatus(403)

    const ownerRole = await client
      .post('/api/v1/dashboard/team/invitations')
      .loginAs(owner)
      .json({ email: 'owner-invite@example.test', role: 'owner' })
    ownerRole.assertStatus(422)

    const organizationId = await client
      .post('/api/v1/dashboard/team/invitations')
      .loginAs(owner)
      .json({
        email: 'controlled@example.test',
        role: 'recruiter',
        organizationId: randomUUID(),
        status: 'accepted',
        token: 'client-token',
      })
    organizationId.assertStatus(422)
  })

  test('prevents duplicate pending invitations under concurrency', async ({ client }) => {
    const { user } = await fixtures()
    QueueManager.fake()
    const responses = await Promise.all([
      client
        .post('/api/v1/dashboard/team/invitations')
        .loginAs(user)
        .json({ email: 'same@example.test', role: 'recruiter' }),
      client
        .post('/api/v1/dashboard/team/invitations')
        .loginAs(user)
        .json({ email: 'SAME@example.test', role: 'admin' }),
    ])
    responses.sort((left, right) => left.status() - right.status())
    responses[0].assertStatus(201)
    responses[1].assertStatus(409)
  })

  test('scopes members, invitations, resend, and cancel to the current organization', async ({
    client,
    assert,
  }) => {
    const tenantA = await fixtures()
    const tenantB = await fixtures()
    const invitation = await createInvitation({
      organizationId: tenantB.organization.id,
      invitedBy: tenantB.user.id,
      email: 'private@example.test',
    })
    const memberB = await User.create({
      organizationId: tenantB.organization.id,
      email: `member-b-${randomUUID()}@example.test`,
      password: 'old-password',
      role: 'recruiter',
    })

    const list = await client.get('/api/v1/dashboard/team/invitations').loginAs(tenantA.user)
    list.assertStatus(200)
    assert.notInclude(JSON.stringify(list.body()), invitation.row.id)

    const members = await client.get('/api/v1/dashboard/team/members').loginAs(tenantA.user)
    members.assertStatus(200)
    assert.notInclude(JSON.stringify(members.body()), memberB.id)

    // The members payload must expose the transformer output, not raw
    // serializer metadata (`$type`/`transformerData`).
    const membersPayload = members.body() as { data?: Record<string, unknown>[] }
    assert.isArray(membersPayload.data)
    assert.isNotEmpty(membersPayload.data!)
    const currentMember = membersPayload.data!.find(
      (member) => member.id === tenantA.user.id
    )
    assert.exists(currentMember, 'expected the current user in the members payload')
    assert.equal(currentMember!.email, tenantA.user.email)
    assert.equal(currentMember!.role, 'owner')
    assert.equal(currentMember!.initials, 'OT')
    assert.isFalse('transformerData' in currentMember!)

    const detail = await client
      .get(`/api/v1/dashboard/team/invitations/${invitation.row.id}`)
      .loginAs(tenantA.user)
    detail.assertStatus(404)

    const resend = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/resend`)
      .loginAs(tenantA.user)
    resend.assertStatus(404)

    const cancel = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/cancel`)
      .loginAs(tenantA.user)
    cancel.assertStatus(404)
    await invitation.row.refresh()
    assert.equal(invitation.row.status, 'pending')
  })

  test('previews and accepts a new account atomically without returning the token', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await fixtures()
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'new-member@example.test',
    })

    const preview = await client.get(`/api/v1/career/team-invitations/${invitation.token}`)
    preview.assertStatus(200)
    assert.equal(preview.headers()['cache-control'], 'no-store')
    assert.equal(preview.headers()['referrer-policy'], 'no-referrer')
    preview.assertBodyNotContains(['token', 'tokenHash', 'organizationId', 'invitedBy'])
    const previewBody = preview.body() as {
      data: { email: string; organization: { name: string } }
    }
    assert.notEqual(previewBody.data.email, 'new-member@example.test')
    assert.equal(previewBody.data.organization.name, organization.name)

    const accepted = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .json({
        firstName: 'Nouvel',
        lastName: 'Membre',
        password: 'new-password',
        passwordConfirmation: 'new-password',
        role: 'owner',
      } as never)
    accepted.assertStatus(422)

    const result = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .json({
        firstName: 'Nouvel',
        lastName: 'Membre',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      })
    result.assertStatus(200)
    assert.include(String(result.headers()['set-cookie']), 'adonis-session')
    result.assertBodyNotContains(['token', 'tokenHash'])
    await invitation.row.refresh()
    assert.equal(invitation.row.status, 'accepted')
    const created = await User.query()
      .whereRaw('LOWER(email) = ?', ['new-member@example.test'])
      .firstOrFail()
    assert.equal(created.organizationId, organization.id)
    assert.equal(created.role, 'recruiter')
    assert.isTrue(await created.verifyPassword('new-password'))
  })

  test('creates a new invited account even when another session is open', async ({ client, assert }) => {
    const { organization, user: currentlySignedInUser } = await fixtures()
    const invitedEmail = `new-professional-${randomUUID()}@example.test`
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: currentlySignedInUser.id,
      email: invitedEmail,
    })

    const accepted = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .loginAs(currentlySignedInUser)
      .json({
        firstName: 'Nouvelle',
        lastName: 'Personne',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      })

    accepted.assertStatus(200)
    const created = await User.query().where('email', invitedEmail).firstOrFail()
    assert.equal(created.organizationId, organization.id)
    assert.equal(created.role, 'recruiter')
  })

  test('requires a matching session for existing accounts and preserves their role', async ({
    client,
    assert,
  }) => {
    const { organization, user: inviter } = await fixtures()
    const existing = await User.create({
      email: `Existing-${randomUUID()}@Example.Test`,
      password: 'existing-password',
      role: 'admin',
      firstName: 'Existing',
      lastName: 'Member',
    })
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: inviter.id,
      email: existing.email,
      role: 'interviewer',
    })

    const anonymous = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .json({})
    anonymous.assertStatus(401)
    await invitation.row.refresh()
    assert.equal(invitation.row.status, 'pending')

    const wrongSession = await User.create({
      organizationId: organization.id,
      email: `wrong-${randomUUID()}@example.test`,
      password: 'old-password',
      role: 'recruiter',
    })
    const forbidden = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .loginAs(wrongSession)
      .json({})
    forbidden.assertStatus(403)

    const accepted = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .loginAs(existing)
      .json({ password: 'must-not-reset' })
    accepted.assertStatus(200)
    await existing.refresh()
    await invitation.row.refresh()
    assert.equal(existing.organizationId, organization.id)
    assert.equal(existing.role, 'interviewer')
    assert.isTrue(await existing.verifyPassword('existing-password'))
    assert.equal(invitation.row.status, 'accepted')
  })

  test('attaches an existing account without an organization and refuses cross-organization moves', async ({
    client,
    assert,
  }) => {
    const organizationA = await fixtures()
    const organizationB = await fixtures()
    const unattached = await User.create({
      email: `unattached-${randomUUID()}@example.test`,
      password: 'existing-password',
      role: 'recruiter',
    })
    const attachInvitation = await createInvitation({
      organizationId: organizationA.organization.id,
      invitedBy: organizationA.user.id,
      email: unattached.email,
      role: 'hiring_manager',
    })
    const attached = await client
      .post(`/api/v1/career/team-invitations/${attachInvitation.token}/accept`)
      .loginAs(unattached)
      .json({})
    attached.assertStatus(200)
    await unattached.refresh()
    assert.equal(unattached.organizationId, organizationA.organization.id)
    assert.equal(unattached.role, 'hiring_manager')

    const sameOrgInvitation = await createInvitation({
      organizationId: organizationA.organization.id,
      invitedBy: organizationA.user.id,
      email: unattached.email,
      role: 'admin',
    })
    const sameOrgAccepted = await client
      .post(`/api/v1/career/team-invitations/${sameOrgInvitation.token}/accept`)
      .loginAs(unattached)
      .json({})
    sameOrgAccepted.assertStatus(200)
    const replay = await client
      .post(`/api/v1/career/team-invitations/${sameOrgInvitation.token}/accept`)
      .loginAs(unattached)
      .json({})
    replay.assertStatus(200)
    await unattached.refresh()
    assert.equal(unattached.role, 'hiring_manager')

    const otherUser = await User.create({
      organizationId: organizationB.organization.id,
      email: `other-org-${randomUUID()}@example.test`,
      password: 'existing-password',
      role: 'recruiter',
    })
    const blockedCreate = await client
      .post('/api/v1/dashboard/team/invitations')
      .loginAs(organizationA.user)
      .json({ email: otherUser.email, role: 'admin' })
    blockedCreate.assertStatus(409)

    const blockedInvitation = await createInvitation({
      organizationId: organizationA.organization.id,
      invitedBy: organizationA.user.id,
      email: otherUser.email,
      role: 'admin',
    })
    const blocked = await client
      .post(`/api/v1/career/team-invitations/${blockedInvitation.token}/accept`)
      .loginAs(otherUser)
      .json({})
    blocked.assertStatus(409)
    await otherUser.refresh()
    await blockedInvitation.row.refresh()
    assert.equal(otherUser.organizationId, organizationB.organization.id)
    assert.equal(otherUser.role, 'recruiter')
    assert.equal(blockedInvitation.row.status, 'pending')
  })

  test('expires invitations and makes resend or acceptance unavailable', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await fixtures()
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'expired@example.test',
      expiresAt: DateTime.now().minus({ minutes: 1 }),
    })

    const preview = await client.get(`/api/v1/career/team-invitations/${invitation.token}`)
    preview.assertStatus(410)
    const accepted = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .json({})
    accepted.assertStatus(410)
    const resend = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/resend`)
      .loginAs(user)
    resend.assertStatus(409)
    await invitation.row.refresh()
    assert.equal(invitation.row.status, 'expired')
  })

  test('rotates tokens on resend and keeps cancel idempotent without cancelling accepted rows', async ({
    client,
    assert,
  }) => {
    const { organization, user } = await fixtures()
    const queue = QueueManager.fake()
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'rotate@example.test',
    })
    const oldToken = invitation.token
    let queuedPayload: { encryptedToken: string; expectedTokenHash: string } | null = null
    const resent = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/resend`)
      .loginAs(user)
    resent.assertStatus(200)
    queue.assertPushed(SendTeamInvitationEmail, {
      payload: (value) => {
        queuedPayload = value as typeof queuedPayload
        return true
      },
    })
    assert.isNotNull(queuedPayload)
    await invitation.row.refresh()
    assert.notEqual(invitation.row.tokenHash, hashTeamInvitationToken(oldToken))
    const oldPreview = await client.get(`/api/v1/career/team-invitations/${oldToken}`)
    oldPreview.assertStatus(404)
    const newToken = decryptTeamInvitationToken(queuedPayload!.encryptedToken)
    assert.isNotNull(newToken)

    const cancelled = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/cancel`)
      .loginAs(user)
    cancelled.assertStatus(200)
    const cancelledAgain = await client
      .post(`/api/v1/dashboard/team/invitations/${invitation.row.id}/cancel`)
      .loginAs(user)
    cancelledAgain.assertStatus(200)
    const unavailable = await client.get(`/api/v1/career/team-invitations/${newToken}`)
    unavailable.assertStatus(410)

    const acceptedInvitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'accepted-cancel@example.test',
    })
    const accepted = await client
      .post(`/api/v1/career/team-invitations/${acceptedInvitation.token}/accept`)
      .json({
        firstName: 'Accepted',
        lastName: 'Member',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      })
    accepted.assertStatus(200)
    const cancelAccepted = await client
      .post(`/api/v1/dashboard/team/invitations/${acceptedInvitation.row.id}/cancel`)
      .loginAs(user)
    cancelAccepted.assertStatus(409)
  })

  test('sends escaped HTML and text while keeping the raw token out of the audit', async ({
    assert,
  }) => {
    const { organization, user } = await fixtures()
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'email@example.test',
    })
    const mailer = mail.fake()
    const job = new SendTeamInvitationEmail()
    job.$hydrate(
      {
        invitationId: invitation.row.id,
        encryptedToken: encryptTeamInvitationToken(invitation.token),
        expectedTokenHash: invitation.row.tokenHash,
      },
      {
        jobId: randomUUID(),
        name: 'SendTeamInvitationEmail',
        attempt: 1,
        queue: 'emails',
        priority: 5,
        acquiredAt: new Date(),
        stalledCount: 0,
      }
    )
    await job.execute()
    mailer.messages.assertSentCount(1)
    await invitation.row.refresh()
    assert.equal(invitation.row.deliveryStatus, 'sent')
    const message = mailer.messages.sent()[0]
    message.assertHtmlIncludes(invitation.token)
    message.assertTextIncludes(invitation.token)
    const audit = await Email.query().orderBy('created_at', 'desc').firstOrFail()
    assert.notInclude(audit.body ?? '', invitation.token)
  })

  test('rate limits public acceptance by token', async ({ client, assert }) => {
    const { organization, user } = await fixtures()
    const invitation = await createInvitation({
      organizationId: organization.id,
      invitedBy: user.id,
      email: 'rate-limit@example.test',
      status: 'accepted',
    })
    const member = await User.create({
      organizationId: organization.id,
      email: 'rate-limit@example.test',
      password: 'old-password',
      role: 'recruiter',
    })

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await client
        .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
        .loginAs(member)
        .json({})
      response.assertStatus(200)
    }
    const limited = await client
      .post(`/api/v1/career/team-invitations/${invitation.token}/accept`)
      .loginAs(member)
      .json({})
    limited.assertStatus(429)
    assert.equal(limited.headers()['cache-control'], 'no-store')
    assert.equal(limited.headers()['referrer-policy'], 'no-referrer')
  })
})
