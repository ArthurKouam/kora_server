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
  token: vine.string().trim().minLength(1).maxLength(2048),
  code: vine
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export const resendOtpValidator = vine.create({
  token: vine.string().trim().minLength(1).maxLength(2048),
})

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
  'temporary',
] as const

export const WORKPLACE_TYPES = ['onsite', 'remote', 'hybrid'] as const

/** Filtres de GET /career/orgs/:orgSlug/jobs. Les enums sont des CSV parsés côté contrôleur. */
export const careerIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(50).optional(),
  search: vine.string().trim().minLength(1).maxLength(100).optional(),
  // Le parseur de query string renvoie un tableau pour `a,b` comme pour `a[]=x` :
  // le typage et le whitelist passent par parseCsvFilter.
  employmentType: vine.any().optional(),
  workplaceType: vine.any().optional(),
  city: vine.string().trim().minLength(1).maxLength(100).optional(),
  country: vine.string().trim().minLength(1).maxLength(100).optional(),
})

/**
 * Normalise un filtre d'enums en tableau.
 * Le parseur de query string fournit un tableau pour `a,b` comme pour `a[]=x`.
 */
export function parseCsvFilter(raw: unknown, allowed: readonly string[]): string[] | undefined {
  if (raw === null || raw === undefined) return undefined

  const items = (Array.isArray(raw) ? raw : [raw]).flatMap((item) =>
    typeof item === 'string' ? item.split(',') : []
  )

  const values = items.map((item) => item.trim()).filter((item) => allowed.includes(item))

  return values.length > 0 ? Array.from(new Set(values)) : undefined
}

/**
 * Créneaux choisis par le candidat (dates/heures ISO).
 */
export const submitSlotsValidator = vine.create({
  slots: vine.array(vine.string().trim().minLength(10)).minLength(1).maxLength(5),
})
