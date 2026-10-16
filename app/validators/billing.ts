import vine from '@vinejs/vine'

/**
 * Paiement : le client ne choisit que le plan. Ni le montant ni la durée ne
 * viennent du client — ils sont lus sur la ligne `plans`, sinon on pourrait
 * acheter Pro pour 100 FCFA.
 */
export const checkoutValidator = vine.create({
  planId: vine.string().uuid(),
  phone: vine
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,20}$/)
    .optional(),
})

/**
 * Confirmation après retour du client.
 *
 * Le statut est vérifié côté serveur, jamais fourni ici. NotchPay peut
 * renvoyer notre référence sous `trxref` en plus de `reference` : on accepte
 * les deux, le serveur cherche la transaction sur les deux.
 */
export const confirmValidator = vine.create({
  reference: vine.string().trim().minLength(4).maxLength(120),
  trxref: vine.string().trim().minLength(4).maxLength(120).optional(),
})

/** Export CSV des candidatures. */
export const exportApplicationsValidator = vine.create({
  jobId: vine.string().uuid().optional(),
  status: vine.string().trim().maxLength(30).optional(),
  from: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

/** Invitation d'un membre — nécessaire pour que le quota de membres serve. */
export const inviteMemberValidator = vine.create({
  email: vine.string().trim().email().maxLength(255),
  role: vine.string().trim().maxLength(30).optional(),
})
