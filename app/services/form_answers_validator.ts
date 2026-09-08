import { FORM_LIMITS, type FieldDefinition, type FormDefinition } from '#types/forms'

export interface AnswersValidationResult {
  valid: boolean
  /** Erreurs indexées par id de champ */
  errors: Record<string, string>
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim().length === 0) return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Valide les réponses d'une candidature contre la définition du formulaire.
 * Allowlist stricte : seuls les ids présents dans la définition sont acceptés,
 * et chaque valeur doit correspondre au type déclaré.
 *
 * Note : pour les champs `file`, la validité du document (existence + appartenance
 * au candidat) est vérifiée par le contrôleur d'apply, pas ici.
 */
export function validateAnswers(
  definition: FormDefinition,
  input: unknown
): AnswersValidationResult {
  const errors: Record<string, string> = {}

  if (!isPlainObject(input)) {
    return { valid: false, errors: { _form: 'Les réponses doivent être un objet' } }
  }

  const fieldsById = new Map<string, FieldDefinition>(
    definition.fields.map((field) => [field.id, field])
  )

  // Rejet des ids inconnus
  for (const key of Object.keys(input)) {
    if (!fieldsById.has(key)) {
      errors[key] = 'Champ inconnu'
    }
  }

  for (const field of definition.fields) {
    const value = input[field.id]

    if (isEmpty(value)) {
      if (field.required) {
        errors[field.id] = 'Ce champ est requis'
      }
      continue
    }

    const error = validateFieldValue(field, value)
    if (error) errors[field.id] = error
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

function validateFieldValue(field: FieldDefinition, value: unknown): string | null {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email': {
      if (typeof value !== 'string') return 'Doit être une chaîne de caractères'
      const maxLength =
        field.config?.maxLength ??
        (field.type === 'textarea' ? FORM_LIMITS.textareaMaxLength : FORM_LIMITS.textMaxLength)
      if (value.length > maxLength) return `Maximum ${maxLength} caractères`
      if (field.type === 'email' && !EMAIL_REGEX.test(value)) return 'Adresse email invalide'
      return null
    }

    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) return 'Doit être un nombre'
      if (field.config?.integer && !Number.isInteger(value)) return 'Doit être un entier'
      const { min, max } = field.config ?? {}
      if (typeof min === 'number' && value < min) return `Minimum : ${min}`
      if (typeof max === 'number' && value > max) return `Maximum : ${max}`
      return null
    }

    case 'select':
    case 'radio': {
      if (typeof value !== 'string') return 'Doit être une chaîne de caractères'
      if (!isAllowedOption(field, value)) return 'Valeur non autorisée'
      return null
    }

    case 'multiselect': {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        return 'Doit être une liste de valeurs'
      }
      const unique = new Set(value)
      if (unique.size !== value.length) return 'Valeurs dupliquées'
      for (const item of unique) {
        if (!isAllowedOption(field, item as string)) return `Valeur non autorisée : ${item}`
      }
      const { minSelections, maxSelections } = field.config ?? {}
      if (typeof minSelections === 'number' && value.length < minSelections) {
        return `Sélectionnez au moins ${minSelections} option(s)`
      }
      if (typeof maxSelections === 'number' && value.length > maxSelections) {
        return `Maximum ${maxSelections} option(s)`
      }
      return null
    }

    case 'date': {
      if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
        return 'Date invalide (format attendu : YYYY-MM-DD)'
      }
      const date = new Date(`${value}T00:00:00Z`)
      if (Number.isNaN(date.getTime())) return 'Date invalide'
      const { min, max } = (field.config ?? {}) as { min?: string; max?: string }
      if (typeof min === 'string' && DATE_REGEX.test(min) && value < min) {
        return `La date doit être après le ${min}`
      }
      if (typeof max === 'string' && DATE_REGEX.test(max) && value > max) {
        return `La date doit être avant le ${max}`
      }
      return null
    }

    case 'file': {
      if (
        !isPlainObject(value) ||
        typeof value.documentId !== 'string' ||
        value.documentId.length === 0
      ) {
        return 'Fichier manquant'
      }
      return null
    }
  }
}

function isAllowedOption(field: FieldDefinition, candidate: string): boolean {
  const options = field.config?.options ?? []
  return options.some((option) => option.value === candidate)
}
