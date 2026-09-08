import {
  FIELD_ID_REGEX,
  FIELD_TYPES_WITH_OPTIONS,
  FORM_FIELD_TYPES,
  FORM_LIMITS,
  type FieldDefinition,
  type FormDefinition,
} from '#types/forms'

export interface DefinitionValidationResult {
  valid: boolean
  /** Erreurs indexées par chemin, ex: `fields.0.config.options` */
  errors: Record<string, string>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Valide une définition de formulaire soumise par le builder.
 * Vérifie la structure globale, chaque champ et sa config spécifique au type.
 */
export function validateFormDefinition(input: unknown): DefinitionValidationResult {
  const errors: Record<string, string> = {}

  if (!isPlainObject(input) || !Array.isArray((input as unknown as FormDefinition).fields)) {
    return { valid: false, errors: { fields: 'La liste des champs est requise' } }
  }

  const fields = (input as unknown as FormDefinition).fields

  if (fields.length > FORM_LIMITS.maxFields) {
    errors.fields = `Un formulaire ne peut pas contenir plus de ${FORM_LIMITS.maxFields} champs`
    return { valid: false, errors }
  }

  const seenIds = new Set<string>()

  fields.forEach((field: unknown, index) => {
    const path = `fields.${index}`
    if (!isPlainObject(field)) {
      errors[path] = 'Champ invalide'
      return
    }

    const { id, type, label, placeholder, help, required, config } =
      field as Partial<FieldDefinition>

    if (typeof id !== 'string' || !FIELD_ID_REGEX.test(id)) {
      errors[`${path}.id`] = 'Identifiant de champ invalide'
    } else if (seenIds.has(id)) {
      errors[`${path}.id`] = 'Identifiant de champ dupliqué'
    } else {
      seenIds.add(id)
    }

    if (typeof type !== 'string' || !FORM_FIELD_TYPES.includes(type as never)) {
      errors[`${path}.type`] = 'Type de champ inconnu'
    }

    if (
      typeof label !== 'string' ||
      label.trim().length === 0 ||
      label.length > FORM_LIMITS.labelMaxLength
    ) {
      errors[`${path}.label`] =
        `Le libellé est requis (${FORM_LIMITS.labelMaxLength} caractères max)`
    }

    if (placeholder !== undefined && placeholder !== null) {
      if (
        typeof placeholder !== 'string' ||
        placeholder.length > FORM_LIMITS.placeholderMaxLength
      ) {
        errors[`${path}.placeholder`] =
          `Placeholder invalide (${FORM_LIMITS.placeholderMaxLength} caractères max)`
      }
    }

    if (help !== undefined && help !== null) {
      if (typeof help !== 'string' || help.length > FORM_LIMITS.helpMaxLength) {
        errors[`${path}.help`] = `Aide invalide (${FORM_LIMITS.helpMaxLength} caractères max)`
      }
    }

    if (required !== undefined && typeof required !== 'boolean') {
      errors[`${path}.required`] = 'Doit être un booléen'
    }

    if (config !== undefined && config !== null && !isPlainObject(config)) {
      errors[`${path}.config`] = 'Config invalide'
      return
    }

    if (typeof type === 'string' && isPlainObject(config ?? {})) {
      validateFieldConfig(type as FieldDefinition['type'], config ?? {}, `${path}.config`, errors)
    }
  })

  return { valid: Object.keys(errors).length === 0, errors }
}

function validateFieldConfig(
  type: FieldDefinition['type'],
  config: Record<string, unknown>,
  path: string,
  errors: Record<string, string>
): void {
  const options = config.options

  // maxLength pour les champs texte
  if ((type === 'text' || type === 'textarea') && config.maxLength !== undefined) {
    const limit = type === 'text' ? FORM_LIMITS.textMaxLength : FORM_LIMITS.textareaMaxLength
    const maxLength = config.maxLength
    if (
      typeof maxLength !== 'number' ||
      !Number.isInteger(maxLength) ||
      maxLength < 1 ||
      maxLength > limit
    ) {
      errors[path] = `maxLength doit être un entier entre 1 et ${limit}`
    }
  }

  // Bornes numériques
  if (type === 'number' && (config.min !== undefined || config.max !== undefined)) {
    const min = config.min ?? null
    const max = config.max ?? null
    if (min !== null && (typeof min !== 'number' || Number.isNaN(min))) {
      errors[`${path}.min`] = 'min doit être un nombre'
    }
    if (max !== null && (typeof max !== 'number' || Number.isNaN(max))) {
      errors[`${path}.max`] = 'max doit être un nombre'
    }
    if (typeof min === 'number' && typeof max === 'number' && min >= max) {
      errors[`${path}.max`] = 'max doit être supérieur à min'
    }
    if (config.integer !== undefined && typeof config.integer !== 'boolean') {
      errors[`${path}.integer`] = 'integer doit être un booléen'
    }
  }

  // Options obligatoires pour select / multiselect / radio
  if (FIELD_TYPES_WITH_OPTIONS.includes(type)) {
    if (!Array.isArray(options) || options.length === 0) {
      errors[`${path}.options`] = 'Ce type de champ requiert au moins une option'
    } else {
      if (options.length > FORM_LIMITS.maxOptions) {
        errors[`${path}.options`] = `Maximum ${FORM_LIMITS.maxOptions} options`
      }
      const seenValues = new Set<string>()
      options.forEach((option, optionIndex) => {
        if (!isPlainObject(option)) {
          errors[`${path}.options.${optionIndex}`] = 'Option invalide'
          return
        }
        const { value, label: optionLabel } = option
        if (
          typeof value !== 'string' ||
          value.trim().length === 0 ||
          value.length > FORM_LIMITS.optionValueMaxLength
        ) {
          errors[`${path}.options.${optionIndex}.value`] =
            `Valeur requise (${FORM_LIMITS.optionValueMaxLength} caractères max)`
        } else if (seenValues.has(value)) {
          errors[`${path}.options.${optionIndex}.value`] = 'Valeur dupliquée'
        } else {
          seenValues.add(value)
        }
        if (
          typeof optionLabel !== 'string' ||
          optionLabel.trim().length === 0 ||
          optionLabel.length > FORM_LIMITS.optionLabelMaxLength
        ) {
          errors[`${path}.options.${optionIndex}.label`] =
            `Libellé requis (${FORM_LIMITS.optionLabelMaxLength} caractères max)`
        }
      })
    }
  }

  // Sélections min/max pour multiselect
  if (type === 'multiselect') {
    const minSelections = config.minSelections
    const maxSelections = config.maxSelections
    for (const [key, value] of Object.entries({ minSelections, maxSelections })) {
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
      ) {
        errors[`${path}.${key}`] = 'Doit être un entier positif'
      }
    }
    if (
      typeof minSelections === 'number' &&
      typeof maxSelections === 'number' &&
      minSelections > maxSelections
    ) {
      errors[`${path}.maxSelections`] = 'maxSelections doit être ≥ minSelections'
    }
  }

  // Types MIME acceptés pour file
  if (type === 'file' && config.accept !== undefined) {
    if (
      !Array.isArray(config.accept) ||
      config.accept.some((mime) => typeof mime !== 'string' || mime.trim().length === 0)
    ) {
      errors[`${path}.accept`] = 'accept doit être une liste de types MIME'
    }
  }

  // Date : bornes ISO
  if (type === 'date') {
    for (const key of ['min', 'max'] as const) {
      if (config[key] !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(config[key]))) {
        errors[`${path}.${key}`] = 'Doit être une date au format YYYY-MM-DD'
      }
    }
  }
}
