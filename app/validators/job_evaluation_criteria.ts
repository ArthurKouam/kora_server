import vine from '@vinejs/vine'

/**
 * Remplacement atomique de la grille d'évaluation d'une offre.
 * La position est déduite de l'ordre du tableau.
 */
export const saveJobEvaluationCriteriaValidator = vine.create({
  criteria: vine
    .array(
      vine.object({
        label: vine.string().trim().minLength(1).maxLength(120),
      })
    )
    .maxLength(20),
})

/** Copie de la grille d'une autre offre de la même organisation. */
export const duplicateJobEvaluationCriteriaValidator = vine.create({
  sourceJobId: vine.string().uuid(),
})
