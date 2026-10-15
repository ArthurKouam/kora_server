import encryption from '@adonisjs/core/services/encryption'

const PURPOSE = 'application-confirmation'

export function encodeApplicationConfirmationToken(pendingId: string, expiresAtMs: number): string {
  return encryption.encrypt(
    JSON.stringify({
      kind: 'application_confirmation',
      pendingId,
      expiresAt: expiresAtMs,
    }),
    { purpose: PURPOSE }
  )
}

export function decodeApplicationConfirmationToken(token: string): string | null {
  try {
    const decrypted = encryption.decrypt<string>(token, PURPOSE)
    if (!decrypted) return null

    const payload = JSON.parse(decrypted) as {
      kind?: unknown
      pendingId?: unknown
      expiresAt?: unknown
    }

    if (
      payload.kind !== 'application_confirmation' ||
      typeof payload.pendingId !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    return payload.pendingId
  } catch {
    return null
  }
}
