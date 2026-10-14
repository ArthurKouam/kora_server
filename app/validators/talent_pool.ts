import vine from '@vinejs/vine'

/** Ajout manuel d'un candidat externe : la fiche est créée si elle est inconnue. */
export const createManualEntryValidator = vine.create({
  email: vine.string().trim().email().maxLength(255),
  firstName: vine.string().trim().maxLength(120).nullable().optional(),
  lastName: vine.string().trim().maxLength(120).nullable().optional(),
  phone: vine.string().trim().maxLength(40).nullable().optional(),
  location: vine.string().trim().maxLength(255).nullable().optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  country: vine.string().trim().maxLength(120).nullable().optional(),
  linkedinUrl: vine.string().trim().url().maxLength(255).nullable().optional(),
  note: vine.string().trim().maxLength(5000).nullable().optional(),
  tagIds: vine.array(vine.string()).maxLength(20).optional(),
  // Un candidat externe n'a jamais consenti en postulant : sans confirmation
  // explicite du recruteur, l'entrée est refusée.
  consentGiven: vine.boolean(),
})

/** Ajout depuis une candidature de l'organisation. */
export const createEntryFromApplicationValidator = vine.create({
  applicationId: vine.string().uuid(),
  note: vine.string().trim().maxLength(5000).nullable().optional(),
  tagIds: vine.array(vine.string()).maxLength(20).optional(),
})

export const removeEntryValidator = vine.create({
  reason: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const noteValidator = vine.create({
  content: vine.string().trim().minLength(1).maxLength(5000),
})

export const setTagsValidator = vine.create({
  tagIds: vine.array(vine.string()).maxLength(20),
})

export const createTagValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  color: vine.string().trim().maxLength(32).nullable().optional(),
})

export const attachToJobValidator = vine.create({
  jobId: vine.string().uuid(),
  coverLetter: vine.string().trim().maxLength(5000).nullable().optional(),
})

export const PURGE_REASONS = ['retention', 'candidate_request', 'organization_request'] as const

export const purgeEntryValidator = vine.create({
  reason: vine.enum(PURGE_REASONS),
})

/**
 * Filtres de la liste du vivier. `tagIds` et `sources` arrivent en CSV depuis
 * l'URL : le parseur de query string produit un tableau pour `a,b` comme pour
 * `a[]=x`, le typage se fait donc via parseCsvFilter.
 */
export const talentPoolIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(120).nullable().optional(),
  tagIds: vine.any().optional(),
  sources: vine.any().optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  country: vine.string().trim().maxLength(120).nullable().optional(),
  hasCv: vine.boolean().optional(),
  includeArchived: vine.boolean().optional(),
})

/** Normalise un filtre en tableau de valeurs autorisées (cf. parseCsvFilter). */
export function parseCsvFilter(raw: unknown, allowed?: readonly string[]): string[] | undefined {
  if (raw === null || raw === undefined) return undefined

  const items = (Array.isArray(raw) ? raw : [raw]).flatMap((item) =>
    typeof item === 'string' ? item.split(',') : []
  )

  const values = items.map((item) => item.trim()).filter(Boolean)
  if (!allowed) return values.length > 0 ? Array.from(new Set(values)) : undefined

  const filtered = values.filter((item) => allowed.includes(item))
  return filtered.length > 0 ? Array.from(new Set(filtered)) : undefined
}
