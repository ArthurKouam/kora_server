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

interface AuditedEmail {
  to: string
  subject: string
  html: string
  auditBody: string
  organizationId: string
  applicationId: string
  candidateId: string
}

async function sendAudited(options: AuditedEmail): Promise<void> {
  const row = await Email.create({
    organizationId: options.organizationId,
    applicationId: options.applicationId,
    candidateId: options.candidateId,
    recipient: options.to,
    subject: options.subject,
    body: options.auditBody,
    type: 'custom',
    status: 'pending',
  })

  try {
    await mail.send((message) => {
      message.to(options.to).subject(options.subject).html(options.html)
    })
    row.status = 'sent'
    row.sentAt = DateTime.now()
    await row.save()
  } catch (error) {
    row.status = 'failed'
    row.failedAt = DateTime.now()
    row.error = error instanceof Error ? error.message : String(error)
    await row.save()
    throw error
  }
}

export async function sendInformationRequestEmail(options: {
  to: string
  candidateName: string
  jobTitle: string
  organizationName: string
  message: string | null
  expiresAt: DateTime
  publicUrl: string
  organizationId: string
  applicationId: string
  candidateId: string
}): Promise<void> {
  const customMessage = options.message
    ? `<p>${escapeHtml(options.message).replace(/\n/g, '<br>')}</p>`
    : ''
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<h2>Informations complémentaires demandées</h2>
<p>Bonjour ${escapeHtml(options.candidateName)},</p>
<p>${escapeHtml(options.organizationName)} souhaite obtenir des informations complémentaires concernant votre candidature au poste <strong>${escapeHtml(options.jobTitle)}</strong>.</p>
${customMessage}
<p><a href="${escapeHtml(options.publicUrl)}">Répondre à la demande</a></p>
<p>Cette demande expire le ${escapeHtml(options.expiresAt.setLocale('fr-FR').toLocaleString(DateTime.DATETIME_FULL))}.</p>
</div>`

  await sendAudited({
    ...options,
    subject: `Informations complémentaires — ${options.jobTitle}`,
    html,
    auditBody: '[Lien public et contenu de la demande expurgés]',
  })
}

export async function sendInformationResponseNotification(options: {
  to: string
  recruiterName: string
  candidateName: string
  jobTitle: string
  applicationUrl: string
  organizationId: string
  applicationId: string
  candidateId: string
}): Promise<void> {
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
<h2>Réponse reçue</h2>
<p>Bonjour ${escapeHtml(options.recruiterName)},</p>
<p>${escapeHtml(options.candidateName)} a répondu à votre demande d’informations complémentaires pour le poste <strong>${escapeHtml(options.jobTitle)}</strong>.</p>
<p><a href="${escapeHtml(options.applicationUrl)}">Consulter la réponse dans KoraHire</a></p>
</div>`

  await sendAudited({
    ...options,
    subject: `Réponse reçue — ${options.candidateName}`,
    html,
    auditBody: '[Notification de réponse sans réponses candidat]',
  })
}
