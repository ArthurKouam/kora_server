import vine from '@vinejs/vine'

/**
 * Fiche d'évaluation d'un dossier de candidature (`interviewId` absent) ou
 * d'un entretien (`interviewId` renseigné). La note de chaque critère est
 * sur 5 ; la note globale est calculée côté serveur.
 */
export const upsertEvaluationValidator = vine.create({
  interviewId: vine.string().uuid().nullable().optional(),
  criteria: vine
    .array(
      vine.object({
        criterionId: vine.string().uuid(),
        score: vine.number().min(1).max(5),
      })
    )
    .minLength(1),
  recommendation: vine
    .enum(['strong_yes', 'yes', 'neutral', 'no', 'strong_no'])
    .nullable()
    .optional(),
  strengths: vine.string().trim().maxLength(5000).nullable().optional(),
  weaknesses: vine.string().trim().maxLength(5000).nullable().optional(),
  comments: vine.string().trim().maxLength(5000).nullable().optional(),
})
