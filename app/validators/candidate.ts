import vine from '@vinejs/vine'

/**
 * Filtres de l'annuaire des candidats.
 *
 * `city` et `country` viennent d'une seule sélection côté UI (« Douala,
 * Cameroun ») mais restent deux colonnes distinctes en base : le client les
 * envoie séparément pour éviter de filtrer sur une concaténation SQL fragile.
 */
export const candidateIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(120).nullable().optional(),
  jobId: vine.string().uuid().nullable().optional(),
  city: vine.string().trim().maxLength(120).nullable().optional(),
  country: vine.string().trim().maxLength(120).nullable().optional(),
  sort: vine.enum(['last_activity_desc', 'last_activity_asc', 'name_asc']).optional(),
})
