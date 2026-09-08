import vine from '@vinejs/vine'

export const createInterviewValidator = vine.create({
  scheduledAt: vine.string().trim().minLength(10),
  duration: vine.number().min(5).max(480).nullable().optional(),
  type: vine.enum(['phone', 'video', 'onsite']).nullable().optional(),
  location: vine.string().trim().maxLength(255).nullable().optional(),
  meetingUrl: vine.string().trim().maxLength(500).nullable().optional(),
  notes: vine.string().trim().maxLength(5000).nullable().optional(),
  sendInvite: vine.boolean().optional(),
  /** Interviewer assigné à l'entretien (peut modifier son feedback) */
  assignedTo: vine.string().uuid().nullable().optional(),
})

/**
 * Si true (défaut), un email d'invitation avec lien de confirmation
 * est envoyé au candidat après la création.
 */
export const sendInviteSchema = { sendInvite: vine.boolean().optional() }

/**
 * Demande de créneaux : le candidat choisit lui-même N dates dans une période.
 */
export const createSlotRequestValidator = vine.create({
  requestedSlots: vine.number().min(1).max(5),
  periodStart: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const updateInterviewValidator = vine.create({
  status: vine.enum(['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show']),
  notes: vine.string().trim().maxLength(5000).nullable().optional(),
})
