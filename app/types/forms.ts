export const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'multiselect',
  'radio',
  'date',
  'file',
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

/** Types dont la config requiert une liste d'options non vide */
export const FIELD_TYPES_WITH_OPTIONS: readonly FormFieldType[] = ['select', 'multiselect', 'radio']

export interface FieldOption {
  value: string
  label: string
}

export interface FieldConfig {
  maxLength?: number
  min?: number
  max?: number
  integer?: boolean
  options?: FieldOption[]
  minSelections?: number
  maxSelections?: number
  accept?: string[]
}

/**
 * Définition d'un champ de formulaire. La structure est volontairement plate :
 * `config` contient les contraintes spécifiques au type (voir registre ci-dessous).
 */
export interface FieldDefinition {
  /** Identifiant immuable, format `f_` + 12 caractères alphanumériques minuscules */
  id: string
  type: FormFieldType
  label: string
  placeholder?: string | null
  help?: string | null
  required?: boolean
  config?: FieldConfig
}

export interface FormDefinition {
  fields: FieldDefinition[]
}

/** Réponses d'une candidature, clé = field id immuable */
export type ApplicationAnswers = Record<string, unknown>

/** Limites globales — appliquées côté serveur, pas seulement dans l'UI */
export const FORM_LIMITS = {
  maxFields: 50,
  labelMaxLength: 200,
  placeholderMaxLength: 200,
  helpMaxLength: 500,
  maxOptions: 100,
  optionValueMaxLength: 100,
  optionLabelMaxLength: 100,
  textMaxLength: 500,
  textareaMaxLength: 5000,
} as const

export const FIELD_ID_REGEX = /^f_[a-z0-9]{12}$/
