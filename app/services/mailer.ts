import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Email from '#models/email'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  organizationId: string
  applicationId?: string | null
  candidateId?: string | null
  type?:
    | 'application_received'
    | 'application_rejected'
    | 'interview_invitation'
    | 'interview_reminder'
    | 'offer'
    | 'custom'
    | null
}

/**
 * Envoi d'emails avec journalisation en base (table `emails`).
 * En dev (driver json), aucun envoi réel : le contenu est journalisé.
 * Une erreur d'envoi ne fait jamais échouer la requête métier.
 */
export default class Mailer {
  static async send(options: SendEmailOptions): Promise<boolean> {
    const row = await Email.create({
      organizationId: options.organizationId,
      applicationId: options.applicationId ?? null,
      candidateId: options.candidateId ?? null,
      recipient: options.to,
      subject: options.subject,
      body: options.html,
      type: options.type ?? null,
      status: 'pending',
    })

    try {
      await mail.send((message) => {
        message.to(options.to).subject(options.subject).html(options.html)
      })
      row.status = 'sent'
      row.sentAt = DateTime.now()
      await row.save()
      return true
    } catch (error) {
      logger.error({ error }, `Échec d'envoi email à ${options.to}`)
      row.status = 'failed'
      row.error = String(error)
      await row.save()
      return false
    }
  }

  private static layout(content: string): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Korahire.</div>
  ${content}
  <p style="margin-top: 32px; font-size: 12px; color: #888;">Cet email a été envoyé par Korahire.</p>
</div>`
  }

  static async sendOtp(
    to: string,
    code: string,
    jobTitle: string,
    organizationName: string,
    organizationId: string
  ): Promise<boolean> {
    const html = this.layout(`
<h2>Vérifiez votre adresse email</h2>
<p>Voici votre code de vérification pour confirmer votre candidature au poste
<strong>${jobTitle}</strong> chez <strong>${organizationName}</strong> :</p>
<p style="font-size: 28px; letter-spacing: 8px; font-weight: 700;">${code}</p>
<p>Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
`)
    return this.send({
      to,
      subject: `Votre code de vérification — ${jobTitle}`,
      html,
      organizationId,
      type: null,
    })
  }

  static async sendApplicationConfirmation(
    to: string,
    candidateName: string,
    jobTitle: string,
    organizationName: string,
    organizationId: string,
    applicationId: string
  ): Promise<boolean> {
    const html = this.layout(`
<h2>Candidature confirmée</h2>
<p>Bonjour ${candidateName},</p>
<p>Votre candidature pour le poste <strong>${jobTitle}</strong> chez
<strong>${organizationName}</strong> a bien été enregistrée.</p>
<p>L'équipe recrutement reviendra vers vous dès qu'elle aura étudié votre dossier.</p>
`)
    return this.send({
      to,
      subject: `Candidature confirmée — ${jobTitle}`,
      html,
      organizationId,
      applicationId,
      type: 'application_received',
    })
  }

  private static formatDateFr(iso: string): string {
    // NB : "weekday" ne peut pas être combiné avec "dateStyle" (Intl lève une
    // TypeError) — les options individuelles donnent "lundi 14 septembre 2026 à 14:00".
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * ── TEXTES DES EMAILS ENTRETIENS ──────────────────────────────────────
   * Modifiez uniquement les chaînes ci-dessous pour ajuster le contenu.
   */
  static interviewTexts = {
    invitationSubject: (jobTitle: string) => `Invitation à un entretien — ${jobTitle}`,
    invitationBody: (
      candidateName: string,
      jobTitle: string,
      organizationName: string,
      whenLabel: string,
      confirmUrl: string,
      declineUrl: string
    ) => `
<h2>Invitation à un entretien</h2>
<p>Bonjour ${candidateName},</p>
<p>Nous sommes heureux de vous inviter à un entretien pour le poste
<strong>${jobTitle}</strong> chez <strong>${organizationName}</strong>.</p>
<p><strong>Date et heure :</strong> ${whenLabel}</p>
<p>Merci de nous confirmer votre présence en cliquant sur l'un des boutons ci-dessous :</p>
<p>
  <a href="${confirmUrl}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;margin-right:8px;">Confirmer ma présence</a>
  <a href="${declineUrl}" style="display:inline-block;padding:10px 20px;background:#e5e7eb;color:#374151;border-radius:6px;text-decoration:none;">Je ne peux pas venir</a>
</p>`,
    slotRequestSubject: (jobTitle: string) => `Choisissez vos créneaux d'entretien — ${jobTitle}`,
    slotRequestBody: (
      candidateName: string,
      jobTitle: string,
      organizationName: string,
      slotsCount: number,
      _periodLabel: string,
      pickUrl: string
    ) => `
<h2>Choisissez vos créneaux d'entretien</h2>
<p>Bonjour ${candidateName},</p>
<p>Dans le cadre de votre candidature pour le poste <strong>${jobTitle}</strong> chez
<strong>${organizationName}</strong>, nous vous invitons à choisir <strong>${slotsCount} créneau(x)</strong>
pour votre entretien.</p>
<p><a href="${pickUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Choisir mes créneaux</a></p>`,
    slotsChosenSubject: (jobTitle: string) => `Créneaux confirmés — ${jobTitle}`,
    slotsChosenBody: (candidateName: string, jobTitle: string, slotsHtml: string) => `
<h2>Vos créneaux sont confirmés</h2>
<p>Bonjour ${candidateName},</p>
<p>Votre entretien pour le poste <strong>${jobTitle}</strong> est planifié :</p>
${slotsHtml}`,
  }

  static async sendInterviewInvitation(options: {
    to: string
    candidateName: string
    jobTitle: string
    organizationName: string
    organizationId: string
    applicationId: string
    scheduledAtIso: string
    meetingOrLocation: string | null
    appBaseUrl: string
    confirmToken: string
  }): Promise<boolean> {
    const t = this.interviewTexts
    const when = this.formatDateFr(options.scheduledAtIso)
    const base = `${options.appBaseUrl}/entretien/${options.confirmToken}`
    return this.send({
      to: options.to,
      subject: t.invitationSubject(options.jobTitle),
      html: t.invitationBody(
        options.candidateName,
        options.jobTitle,
        options.organizationName,
        when + (options.meetingOrLocation ? ` — ${options.meetingOrLocation}` : ''),
        `${base}?decision=confirmed`,
        `${base}?decision=declined`
      ),
      organizationId: options.organizationId,
      applicationId: options.applicationId,
      type: 'interview_invitation',
    })
  }

  static async sendSlotRequest(options: {
    to: string
    candidateName: string
    jobTitle: string
    organizationName: string
    organizationId: string
    applicationId: string
    slotsCount: number
    periodStartIso: string
    periodEndIso: string
    appBaseUrl: string
    token: string
  }): Promise<boolean> {
    const t = this.interviewTexts
    const period = `le ${new Date(options.periodStartIso).toLocaleDateString('fr-FR', { dateStyle: 'long' })} et le ${new Date(options.periodEndIso).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`
    return this.send({
      to: options.to,
      subject: t.slotRequestSubject(options.jobTitle),
      html: t.slotRequestBody(
        options.candidateName,
        options.jobTitle,
        options.organizationName,
        options.slotsCount,
        period,
        `${options.appBaseUrl}/entretien/${options.token}`
      ),
      organizationId: options.organizationId,
      applicationId: options.applicationId,
      type: 'interview_invitation',
    })
  }

  static async sendSlotsConfirmation(options: {
    to: string
    candidateName: string
    jobTitle: string
    organizationId: string
    applicationId: string
    chosenSlotsIso: string[]
  }): Promise<boolean> {
    const t = this.interviewTexts
    const slotsHtml = `<ul>${options.chosenSlotsIso
      .map((slot) => `<li>${this.formatDateFr(slot)}</li>`)
      .join('')}</ul>`
    return this.send({
      to: options.to,
      subject: t.slotsChosenSubject(options.jobTitle),
      html: t.slotsChosenBody(options.candidateName, options.jobTitle, slotsHtml),
      organizationId: options.organizationId,
      applicationId: options.applicationId,
      type: 'interview_invitation',
    })
  }
}
