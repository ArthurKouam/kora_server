import Email from '#models/email'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]!
  )
}

function escapeText(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    })
    .join('')
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

const roleLabels: Record<string, string> = {
  admin: 'administrateur',
  recruiter: 'recruteur',
  hiring_manager: 'responsable du recrutement',
  interviewer: 'intervieweur',
}

export async function sendTeamInvitationEmail(options: {
  to: string
  inviterName: string
  organizationName: string
  role: string
  expiresAt: DateTime
  publicUrl: string
  organizationId: string
}): Promise<void> {
  const roleLabel = roleLabels[options.role] ?? options.role
  const deadline = options.expiresAt.setLocale('fr-FR').toLocaleString(DateTime.DATETIME_FULL)
  const safeUrl = escapeHtml(options.publicUrl)
  const subject = safeHeader(`Invitation à rejoindre ${options.organizationName} · KoraHire`)
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<h2>Invitation à rejoindre ${escapeHtml(options.organizationName)}</h2>
<p>Bonjour ${escapeHtml(options.inviterName)},</p>
<p>${escapeHtml(options.organizationName)} vous invite à rejoindre son équipe en tant que ${escapeHtml(roleLabel)}.</p>
<p><a href="${safeUrl}">Accepter l'invitation</a></p>
<p>Cette invitation expire le ${escapeHtml(deadline)}.</p>
<p>Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.</p>
</div>`
  const text = [
    `Invitation à rejoindre ${escapeText(options.organizationName)}`,
    '',
    `Bonjour ${escapeText(options.inviterName)},`,
    `${escapeText(options.organizationName)} vous invite à rejoindre son équipe en tant que ${escapeText(roleLabel)}.`,
    '',
    `Accepter l'invitation : ${escapeText(options.publicUrl)}`,
    `Cette invitation expire le ${escapeText(deadline)}.`,
    "Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.",
  ].join('\n')

  const audit = await Email.create({
    organizationId: options.organizationId,
    applicationId: null,
    candidateId: null,
    templateId: null,
    recipient: options.to,
    subject,
    body: '[Lien d’invitation et token expurgés]',
    type: 'custom',
    status: 'pending',
  })

  try {
    await mail.send((message) => {
      message.to(options.to).subject(subject).html(html).text(text)
    })
    audit.status = 'sent'
    audit.sentAt = DateTime.now()
    await audit.save()
  } catch (error) {
    audit.status = 'failed'
    audit.failedAt = DateTime.now()
    audit.error = 'Team invitation email delivery failed'
    await audit.save()
    throw new Error('Team invitation email delivery failed')
  }
}
