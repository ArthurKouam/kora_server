import { test } from '@japa/runner'
import { validateFormDefinition } from '#services/form_definition_validator'
import { validateAnswers } from '#services/form_answers_validator'

const selectField = {
  id: 'f_a1b2c3d4e5f6',
  type: 'select' as const,
  label: 'Niveau',
  required: true,
  config: {
    options: [
      { value: 'jr', label: 'Junior' },
      { value: 'sr', label: 'Senior' },
    ],
  },
}

test.group('validateFormDefinition', () => {
  test('accepte une définition valide', ({ assert }) => {
    const result = validateFormDefinition({ fields: [selectField] })
    assert.isTrue(result.valid)
  })

  test('rejette un identifiant de champ invalide', ({ assert }) => {
    const result = validateFormDefinition({ fields: [{ ...selectField, id: 'champ1' }] })
    assert.isFalse(result.valid)
    assert.include(Object.keys(result.errors), 'fields.0.id')
  })

  test('rejette des ids dupliqués', ({ assert }) => {
    const result = validateFormDefinition({ fields: [selectField, { ...selectField }] })
    assert.isFalse(result.valid)
  })

  test('rejette un type inconnu', ({ assert }) => {
    const result = validateFormDefinition({
      fields: [{ ...selectField, type: 'telepathie' as never }],
    })
    assert.isFalse(result.valid)
  })

  test('exige des options pour select/radio/multiselect', ({ assert }) => {
    const result = validateFormDefinition({
      fields: [{ ...selectField, config: {} }],
    })
    assert.isFalse(result.valid)
  })

  test('plafonne à 50 champs', ({ assert }) => {
    const fields = Array.from({ length: 51 }, (_, i) => ({
      id: `f_test000000${String(i).padStart(2, '0')}`,
      type: 'text' as const,
      label: `Champ ${i}`,
    }))
    const result = validateFormDefinition({ fields })
    assert.isFalse(result.valid)
  })
})

test.group('validateAnswers', () => {
  const definition = {
    fields: [
      selectField,
      {
        id: 'f_b2c3d4e5f6a1',
        type: 'number' as const,
        label: 'Expérience',
        required: false,
        config: { min: 0, max: 50, integer: true },
      },
      {
        id: 'f_c3d4e5f6a1b2',
        type: 'multiselect' as const,
        label: 'Langues',
        required: false,
        config: { options: [{ value: 'fr', label: 'Français' }] },
      },
      {
        id: 'f_d4e5f6a1b2c3',
        type: 'file' as const,
        label: 'Portfolio',
        required: true,
      },
    ],
  }

  test('accepte des réponses valides', ({ assert }) => {
    const result = validateAnswers(definition, {
      f_a1b2c3d4e5f6: 'jr',
      f_b2c3d4e5f6a1: 5,
      f_c3d4e5f6a1b2: ['fr'],
      f_d4e5f6a1b2c3: { documentId: 'abc' },
    })
    assert.isTrue(result.valid)
  })

  test('rejette un champ requis manquant', ({ assert }) => {
    const result = validateAnswers(definition, {})
    assert.isFalse(result.valid)
    assert.isDefined(result.errors['f_a1b2c3d4e5f6'])
    assert.isDefined(result.errors['f_d4e5f6a1b2c3'])
  })

  test('rejette les champs inconnus (allowlist stricte)', ({ assert }) => {
    const result = validateAnswers(definition, {
      f_zzzz99999999: 'hack',
      f_a1b2c3d4e5f6: 'sr',
      f_d4e5f6a1b2c3: { documentId: 'x' },
    })
    assert.isFalse(result.valid)
    assert.equal(result.errors['f_zzzz99999999'], 'Champ inconnu')
  })

  test('rejette une valeur hors options', ({ assert }) => {
    const result = validateAnswers(definition, {
      f_a1b2c3d4e5f6: 'intermédiaire',
      f_d4e5f6a1b2c3: { documentId: 'x' },
    })
    assert.isFalse(result.valid)
    assert.match(result.errors['f_a1b2c3d4e5f6'], /non autorisée/)
  })

  test('rejette un nombre hors bornes / non entier', ({ assert }) => {
    const base = { f_a1b2c3d4e5f6: 'jr', f_d4e5f6a1b2c3: { documentId: 'x' } }
    assert.isFalse(validateAnswers(definition, { ...base, f_b2c3d4e5f6a1: 51 }).valid)
    assert.isFalse(validateAnswers(definition, { ...base, f_b2c3d4e5f6a1: 3.5 }).valid)
  })

  test('rejette un multiselect hors options', ({ assert }) => {
    const result = validateAnswers(definition, {
      f_a1b2c3d4e5f6: 'jr',
      f_c3d4e5f6a1b2: ['de'],
      f_d4e5f6a1b2c3: { documentId: 'x' },
    })
    assert.isFalse(result.valid)
  })
})
