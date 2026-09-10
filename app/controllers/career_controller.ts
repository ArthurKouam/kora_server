import Application from '#models/application'
import Interview from '#models/interview'
import InterviewSlotRequest from '#models/interview_slot_request'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import Job from '#models/job'
import PendingApplication from '#models/pending_application'
import FileStorage from '#services/file_storage'
import OtpService from '#services/otp_service'
import Mailer from '#services/mailer'
import { validateAnswers } from '#services/form_answers_validator'
import { applyValidator, submitSlotsValidator, verifyOtpValidator } from '#validators/career'
import InterviewTokenService from '#services/interview_token_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { FieldDefinition } from '#types/forms'
import { DateTime } from 'luxon'

/**
 * Contrôleur public de la career page — aucune authentification.
 * N'expose que les offres publiées et la version PUBLIÉE du formulaire
 * (jamais un brouillon).
 */
export default class CareerController {
  async show({ params, response }: HttpContext) {
    const slug = String(params.slug)

    const job = await Job.query()
      .where('slug', slug)
      .andWhere('status', 'published')
      .preload('organization', (organizationsQuery) =>
        organizationsQuery.select('id', 'name', 'logo_url')
      )
      .first()

    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    let form: { id: string; definition: unknown } | null = null
    if (job.activeFormVersionId) {
      const version = await job.related('activeFormVersion').query().first()
      // Défense en profondeur : un pointeur vers un brouillon ne serait jamais exposé
      if (version && version.publishedAt !== null) {
        form = { id: version.id, definition: version.definition }
      }
    }

    return response.ok({
      job: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        employmentType: job.employmentType,
        workplaceType: job.workplaceType,
        experienceLevel: job.experienceLevel,
        location: job.location,
        city: job.city,
        country: job.country,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        closingDate: job.closingDate,
        publishedAt: job.publishedAt,
        organization: job.organization
          ? { name: job.organization.name, logoUrl: job.organization.logoUrl }
          : null,
      },
      form,
    })
  }

  /**
   * POST /career/jobs/:slug/apply
   * Soumission publique d'une candidature (JSON ou multipart avec fichiers).
   * Ne fait jamais confiance à la validation frontend : les réponses sont
   * re-validées serveur contre la définition de la version publiée.
   */
  async apply({ params, request, response }: HttpContext) {
    // Multipart : les champs structurés arrivent en strings JSON à parser
    const isMultipart = (request.header('content-type') ?? '').includes('multipart/form-data')
    let rawData: Record<string, unknown> = { ...request.body() }

    if (isMultipart) {
      try {
        if (typeof rawData.candidate === 'string') {
          rawData.candidate = JSON.parse(rawData.candidate)
        }
        if (typeof rawData.answers === 'string') {
          rawData.answers = rawData.answers ? JSON.parse(rawData.answers) : {}
        }
      } catch {
        return response.unprocessableEntity({ error: 'Invalid payload encoding' })
      }
    }

    const payload = await request.validateUsing(applyValidator, { data: rawData })

    const job = await Job.query()
      .where('slug', String(params.slug))
      .andWhere('status', 'published')
      .first()

    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    // Version publiée uniquement — jamais un draft
    let formVersion = null
    if (job.activeFormVersionId) {
      formVersion = await job.related('activeFormVersion').query().first()
      if (!formVersion || formVersion.publishedAt === null) {
        return response.unprocessableEntity({ error: 'Form is not available' })
      }
    }

    const definition = (formVersion?.definition ?? { fields: [] }) as {
      fields: FieldDefinition[]
    }
    const answers = (payload.answers ?? {}) as Record<string, unknown>

    // Candidat : création ou réutilisation par email (unique en base)
    let candidate = await Candidate.findBy('email', payload.candidate.email)
    if (!candidate) {
      candidate = await Candidate.create({
        email: payload.candidate.email,
        firstName: payload.candidate.firstName,
        lastName: payload.candidate.lastName,
        phone: payload.candidate.phone ?? null,
      })
    } else {
      // Complète les informations manquantes du profil existant
      candidate.firstName = candidate.firstName ?? payload.candidate.firstName
      candidate.lastName = candidate.lastName ?? payload.candidate.lastName
      candidate.phone = candidate.phone ?? payload.candidate.phone ?? null
      await candidate.save()
    }

    // Un seul dossier par offre et par candidat (contrainte unique en base aussi)
    const existing = await Application.query()
      .where('job_id', job.id)
      .where('candidate_id', candidate.id)
      .first()

    if (existing) {
      return response.conflict({
        error: 'Vous avez déjà postulé à cette offre.',
      })
    }

    // Upload des fichiers reçus en multipart → FileStorage → candidate_documents.
    // Les documents créés sont injectés dans `answers` avant validation.
    const uploadedDocumentIds: string[] = []
    let cvDocumentId: string | null = null

    if (isMultipart) {
      const cvFile = request.file('cv', {
        size: '10mb',
        extnames: ['pdf', 'doc', 'docx', 'odt', 'rtf'],
      })
      if (cvFile && !cvFile.isValid) {
        return response.unprocessableEntity({
          errors: { cv: 'Fichier CV invalide ou trop volumineux.' },
        })
      }
      if (cvFile?.isValid) {
        const stored = await FileStorage.store(cvFile, 'cvs')
        const document = await CandidateDocument.create({
          candidateId: candidate.id,
          type: 'cv',
          name: stored.name,
          filePath: stored.key,
          mimeType: stored.mimeType,
          fileSize: stored.size,
        })
        cvDocumentId = document.id
        uploadedDocumentIds.push(document.id)
      }

      for (const field of definition.fields) {
        if (field.type !== 'file') continue
        const file = request.file(`file_${field.id}`, {
          size: '10mb',
          extnames: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'jpg', 'jpeg', 'png', 'webp'],
        })
        if (!file) continue
        if (!file.isValid) {
          return response.unprocessableEntity({
            errors: { [field.id]: 'Fichier invalide ou trop volumineux.' },
          })
        }
        const stored = await FileStorage.store(file, 'application-documents')
        const document = await CandidateDocument.create({
          candidateId: candidate.id,
          type: 'other',
          name: stored.name,
          filePath: stored.key,
          mimeType: stored.mimeType,
          fileSize: stored.size,
        })
        answers[field.id] = { documentId: document.id }
        uploadedDocumentIds.push(document.id)
      }
    }

    // Validation des réponses contre la définition (allowlist stricte)
    const result = validateAnswers(definition, answers)
    if (!result.valid) {
      // Nettoie les fichiers déjà stockés si la validation échoue
      await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
      return response.unprocessableEntity({ errors: result.errors })
    }

    // Vérification des fichiers référencés : existence + appartenance + non-utilisés
    for (const field of definition.fields) {
      if (field.type !== 'file') continue
      const answer = answers[field.id] as { documentId?: string } | undefined
      if (!answer?.documentId) continue

      const document = await CandidateDocument.findBy('id', answer.documentId)
      if (!document || document.candidateId !== candidate.id || document.applicationId !== null) {
        await Promise.all(uploadedDocumentIds.map((id) => this.deleteDocument(id)))
        return response.unprocessableEntity({
          errors: { [field.id]: 'Fichier invalide.' },
        })
      }
    }

    // ─── Phase OTP : la candidature reste PENDING jusqu'à vérification email ───

    // Cas C : une tentative en attente existe pour ce couple email + job → on la réutilise
    let pending = await PendingApplication.query()
      .where('email', payload.candidate.email.toLowerCase())
      .where('job_id', job.id)
      .where('status', 'pending')
      .first()

    if (pending && pending.expiresAt <= DateTime.now()) {
      // Cas D : tentative expirée → recyclée
      pending.status = 'expired'
      await pending.save()
      pending = null
    }

    const pendingPayload = {
      answers,
      coverLetter: payload.coverLetter ?? null,
      cvDocumentId,
      documentIds: uploadedDocumentIds,
    }

    if (pending) {
      pending.candidateId = candidate.id
      pending.formVersionId = formVersion?.id ?? null
      pending.payload = pendingPayload
      pending.expiresAt = DateTime.now().plus({ minutes: 60 })
      await pending.save()
    } else {
      pending = await PendingApplication.create({
        email: payload.candidate.email.toLowerCase(),
        jobId: job.id,
        candidateId: candidate.id,
        formVersionId: formVersion?.id ?? null,
        payload: pendingPayload as never,
        status: 'pending',
        expiresAt: DateTime.now().plus({ minutes: 60 }),
      })
    }

    // Envoi du code OTP
    let code: string
    try {
      code = await OtpService.request(payload.candidate.email, 'application_otp')
    } catch (error) {
      if ((error as Error).message === 'OTP_RATE_LIMITED') {
        return response.tooManyRequests({
          error: 'Trop de demandes de vérification. Réessayez dans quelques minutes.',
        })
      }
      throw error
    }
    await Mailer.sendOtp(
      payload.candidate.email,
      code,
      job.title,
      job.organization?.name ?? 'Korahire',
      job.organizationId
    )

    return response.accepted({
      pendingApplicationId: pending.id,
      expiresAt: pending.expiresAt,
      message:
        'Un code de vérification a été envoyé par email. La candidature sera confirmée après saisie du code.',
    })
  }

  /**
   * POST /career/jobs/:slug/apply/:pendingId/verify
   * Vérifie l'OTP puis crée DÉFINITIVEMENT la candidature (idempotent).
   */
  async verify({ params, request, response }: HttpContext) {
    const { code } = await request.validateUsing(verifyOtpValidator)

    const job = await Job.query()
      .where('slug', String(params.slug))
      .andWhere('status', 'published')
      .first()

    if (!job) {
      return response.notFound({ error: 'Job not found' })
    }

    const pending = await PendingApplication.query()
      .where('id', String(params.pendingId))
      .where('job_id', job.id)
      .where('status', 'pending')
      .first()

    if (!pending) {
      return response.notFound({ error: 'Pending application not found' })
    }

    if (pending.expiresAt <= DateTime.now()) {
      pending.status = 'expired'
      await pending.save()
      return response.gone({ error: 'Verification expired. Please apply again.' })
    }

    // Vérification du code (tentatives limitées, usage unique)
    const otpResult = await OtpService.verify(pending.email, String(code), 'application_otp')
    if (!otpResult.ok) {
      if (otpResult.reason === 'too_many_attempts') {
        return response.tooManyRequests({
          error: 'Trop de tentatives. Demandez un nouveau code.',
        })
      }
      return response.unprocessableEntity({
        error:
          otpResult.reason === 'expired'
            ? 'Ce code a expiré. Demandez un nouveau code.'
            : 'Code incorrect.',
      })
    }

    const payload = pending.payload as {
      answers: Record<string, unknown>
      coverLetter: string | null
      cvDocumentId: string | null
      documentIds: string[]
    }

    const jobOrganization = await job.related('organization').query().first()
    const organizationName = jobOrganization?.name ?? 'Korahire'

    // Transaction : création finale idempotente
    // `created=false` signifie qu'une candidature valide existait déjà (Cas B)
    const outcome = await Application.transaction(async (trx) => {
      const candidate = await Candidate.findBy('email', pending!.email, { client: trx })

      if (!candidate) {
        return { error: 'candidate_missing' as const }
      }

      const existing = await Application.query({ client: trx })
        .where('job_id', job.id)
        .where('candidate_id', candidate.id)
        .first()

      if (existing) {
        // Cas B / idempotence : une seule candidature valide par couple job+candidat
        pending!.status = 'consumed'
        pending!.candidateId = candidate.id
        await pending!.save()
        return { created: false as const, application: existing }
      }

      const created = await Application.create(
        {
          jobId: job.id,
          candidateId: candidate.id,
          status: 'new',
          source: 'career_page',
          coverLetter: payload.coverLetter ?? null,
          cvDocumentId: payload.cvDocumentId ?? null,
          appliedAt: DateTime.now(),
          formVersionId: pending!.formVersionId,
          answers: payload.answers ?? {},
        },
        { client: trx }
      )

      const docIds = [
        ...(payload.documentIds ?? []),
        ...(payload.cvDocumentId ? [payload.cvDocumentId] : []),
      ]
      if (docIds.length > 0) {
        await CandidateDocument.query({ client: trx })
          .whereIn('id', docIds)
          .update({ applicationId: created.id })
      }

      pending!.status = 'consumed'
      pending!.candidateId = candidate.id
      await pending!.save()

      return { created: true as const, application: created }
    })

    if ('error' in outcome) {
      return response.unprocessableEntity({
        error: 'Candidate record not found. Please apply again.',
      })
    }

    if (!outcome.created) {
      return response.conflict({ error: 'Vous avez déjà postulé à cette offre.' })
    }

    const candidate = await Candidate.findBy('email', pending.email)

    await Mailer.sendApplicationConfirmation(
      pending.email,
      `${candidate?.firstName ?? ''} ${candidate?.lastName ?? ''}`.trim() || 'candidat',
      job.title,
      organizationName,
      job.organizationId,
      outcome.application.id
    )

    return response.created({
      id: outcome.application.id,
      status: outcome.application.status,
      appliedAt: outcome.application.appliedAt,
    })
  }

  private async deleteDocument(id: string): Promise<void> {
    const document = await CandidateDocument.find(id)
    if (!document) return
    await FileStorage.delete(document.filePath)
    await document.delete()
  }

  /**
   * ── CONFIRMATION D'ENTRETIEN PAR LE CANDIDAT (public, via lien email) ──
   */

  /**
   * GET /career/interview-slots/:token
   * Informations de la demande de créneaux pour la page publique.
   */
  async showSlotRequest({ params, response }: HttpContext) {
    const decoded = InterviewTokenService.decode(String(params.token))
    if (!decoded || decoded.kind !== 'slots') {
      return response.notFound({ error: 'Invalid link' })
    }

    const slotRequest = await InterviewSlotRequest.find(decoded.id)
    if (!slotRequest) return response.notFound({ error: 'Request not found' })

    const application = await slotRequest.related('application').query().preload('job').first()
    if (!application) return response.notFound({ error: 'Application not found' })
    const job = await application.related('job').query().first()
    const candidate = await application.related('candidate').query().first()
    const organization = job ? await job.related('organization').query().first() : null

    return response.ok({
      candidateName: candidate
        ? `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim()
        : '',
      jobTitle: job?.title ?? '',
      organizationName: organization?.name ?? '',
      requestedSlots: slotRequest.requestedSlots,
      periodStart: slotRequest.periodStart.toISODate(),
      periodEnd: slotRequest.periodEnd.toISODate(),
      answered: slotRequest.status !== 'pending',
      chosenSlots: slotRequest.chosenSlots ?? null,
    })
  }

  /**
   * POST /career/interview-slots/:token
   * Le candidat choisit N créneaux → création des entretiens confirmés.
   */
  async submitSlots({ params, request, response }: HttpContext) {
    const decoded = InterviewTokenService.decode(String(params.token))
    if (!decoded || decoded.kind !== 'slots') {
      return response.notFound({ error: 'Invalid link' })
    }

    const slotRequest = await InterviewSlotRequest.find(decoded.id)
    if (!slotRequest) return response.notFound({ error: 'Request not found' })
    if (slotRequest.status !== 'pending') {
      return response.conflict({ error: 'Créneaux déjà transmis.' })
    }

    const payload = await request.validateUsing(submitSlotsValidator)

    if (payload.slots.length !== slotRequest.requestedSlots) {
      return response.unprocessableEntity({
        error: `Veuillez choisir exactement ${slotRequest.requestedSlots} créneau(x).`,
      })
    }

    // Chaque créneau doit être unique et compris dans la période
    const start = DateTime.fromISO(`${slotRequest.periodStart.toISODate()}T00:00:00`)
    const end = DateTime.fromISO(`${slotRequest.periodEnd.toISODate()}T23:59:59`)
    const seen = new Set<string>()
    for (const slot of payload.slots) {
      const date = DateTime.fromISO(slot)
      if (!date.isValid || date < start || date > end) {
        return response.unprocessableEntity({
          error:
            'Chaque créneau doit être une date/heure valide comprise dans la période demandée.',
        })
      }
      const normalized = date.toISO()!
      if (seen.has(normalized)) {
        return response.unprocessableEntity({ error: 'Créneaux en double.' })
      }
      seen.add(normalized)
    }

    // Transaction atomique : création des entretiens + marquage de la demande.
    // Idempotent face aux soumissions concurrentes grâce au re-check en transaction.
    let chosenSlotsIso: string[] = []
    await Application.transaction(async (trx) => {
      const fresh = await InterviewSlotRequest.find(slotRequest.id, { client: trx })
      if (!fresh || fresh.status !== 'pending') {
        throw new Error('SLOTS_ALREADY_SUBMITTED')
      }

      const chosen: string[] = []
      for (const slot of seen) {
        await Interview.create(
          {
            applicationId: fresh.applicationId,
            scheduledAt: DateTime.fromISO(slot),
            status: 'scheduled',
            candidateConfirmation: 'confirmed',
            candidateConfirmedAt: DateTime.now(),
          },
          { client: trx }
        )
        chosen.push(slot)
        chosenSlotsIso.push(slot)
      }

      fresh.status = 'answered'
      // Les tableaux sont sérialisés en array-literals Postgres par le driver :
      // on passe une chaîne JSON explicite pour que jsonb la parse correctement.
      fresh.chosenSlots = JSON.stringify(chosen) as never
      await fresh.save()
    }).catch((error) => {
      if ((error as Error).message === 'SLOTS_ALREADY_SUBMITTED') {
        return response.conflict({ error: 'Créneaux déjà transmis.' })
      }
      throw error
    })

    // Récap par email au candidat
    const application = await slotRequest.related('application').query().first()
    const chosenSlots = chosenSlotsIso.map((slot) => DateTime.fromISO(slot).toISO()!)
    if (application) {
      const candidate = await application.related('candidate').query().first()
      const job = await application.related('job').query().first()
      if (candidate && job) {
        await Mailer.sendSlotsConfirmation({
          to: candidate.email,
          candidateName:
            `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || candidate.email,
          jobTitle: job.title,
          organizationId: job.organizationId,
          applicationId: application.id,
          chosenSlotsIso: chosenSlots,
        })
      }
    }

    return response.created({
      chosenSlots: chosenSlots.map((slot) => DateTime.fromISO(slot).toISO()),
    })
  }

  /**
   * POST /career/interview-confirmations/:token
   * Le candidat confirme ou décline un entretien planifié.
   */
  async respondToInvitation({ params, request, response }: HttpContext) {
    const decisionValidatorData = request.body()
    const decision = decisionValidatorData?.decision

    if (decision !== 'confirmed' && decision !== 'declined') {
      return response.unprocessableEntity({ error: 'Décision invalide.' })
    }

    const decoded = InterviewTokenService.decode(String(params.token))
    if (!decoded || decoded.kind !== 'invite') {
      return response.notFound({ error: 'Invalid link' })
    }

    const interview = await Interview.find(decoded.id)
    if (!interview) return response.notFound({ error: 'Interview not found' })

    interview.candidateConfirmation = decision
    interview.candidateConfirmedAt = DateTime.now()
    await interview.save()

    return response.ok({
      interviewId: interview.id,
      decision: interview.candidateConfirmation,
      confirmedAt: interview.candidateConfirmedAt,
    })
  }
}
