import vine from '@vinejs/vine'

/**
 * Validation de base du payload d'apply (career page).
 * Les `answers` sont validées séparément contre la définition publiée
 * (voir services/form_answers_validator).
 */
export const applyValidator = vine.create({
  candidate: vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255),
    phone: vine.string().trim().maxLength(50).nullable().optional(),
  }),
  coverLetter: vine.string().trim().maxLength(5000).nullable().optional(),
  // Validées contre la définition publiée par le service dédié — pas de shape statique
  answers: vine.any().optional(),
})

/**
 * Vérification du code OTP envoyé par email.
 */
export const verifyOtpValidator = vine.create({
  code: vine.string().trim().minLength(6).maxLength(6),
})

/**
 * Créneaux choisis par le candidat (dates/heures ISO).
 */
export const submitSlotsValidator = vine.create({
  slots: vine.array(vine.string().trim().minLength(10)).minLength(1).maxLength(5),
})
