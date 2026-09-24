import { test } from '@japa/runner'
import {
  decodeApplicationConfirmationToken,
  encodeApplicationConfirmationToken,
} from '#services/application_confirmation_tokens'

test.group('application confirmation tokens', () => {
  test('encode et décode un token valide', ({ assert }) => {
    const token = encodeApplicationConfirmationToken('pending-id', Date.now() + 60_000)

    assert.equal(decodeApplicationConfirmationToken(token), 'pending-id')
    assert.notInclude(token, 'pending-id')
  })

  test('refuse un token expiré', ({ assert }) => {
    const token = encodeApplicationConfirmationToken('pending-id', Date.now() - 1)

    assert.isNull(decodeApplicationConfirmationToken(token))
  })

  test('refuse un token modifié', ({ assert }) => {
    const token = encodeApplicationConfirmationToken('pending-id', Date.now() + 60_000)

    assert.isNull(decodeApplicationConfirmationToken(`${token}x`))
  })
})
