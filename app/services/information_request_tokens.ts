import encryption from '@adonisjs/core/services/encryption'
import { createHash, randomBytes } from 'node:crypto'

const PURPOSE = 'application-information-request'

export function generateInformationRequestToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashInformationRequestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function encryptInformationRequestToken(token: string): string {
  return encryption.encrypt(token, { purpose: PURPOSE })
}

export function decryptInformationRequestToken(payload: string): string | null {
  return encryption.decrypt<string>(payload, PURPOSE)
}
