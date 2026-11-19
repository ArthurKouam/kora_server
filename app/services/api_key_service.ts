import ApiKey from '#models/api_key'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'

/**
 * Préfixe public du token : identifie une clé KoraHire et permet de la
 * reconnaître dans les journaux ou une recherche de secrets fuités.
 */
const TOKEN_PREFIX = 'kh_live_'

/**
 * Longueur du préfixe affiché dans l'interface : `kh_live_` + 8 caractères.
 * Suffisant pour distinguer deux clés sans révéler le secret.
 */
const DISPLAY_PREFIX_LENGTH = 16

export default class ApiKeyService {
  /** Empreinte SHA-256 du token. Le token lui-même n'est jamais stocké. */
  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * Crée une clé pour une organisation et renvoie le token en clair.
   *
   * L'appelant est seul responsable de la transmission du token : il ne sera
   * plus jamais lisible ensuite, seule l'empreinte reste en base.
   */
  static async create(
    organizationId: string,
    name: string,
    createdByUserId: string | null
  ): Promise<{ key: ApiKey; token: string }> {
    const token = this.generateToken()

    const key = await ApiKey.create({
      organizationId,
      createdByUserId,
      name,
      prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      hash: this.hash(token),
    })

    return { key, token }
  }

  /** Résout un token présenté en `Authorization: Bearer` vers sa clé active. */
  static async findActive(token: string): Promise<ApiKey | null> {
    if (!token.startsWith(TOKEN_PREFIX) || token.length <= DISPLAY_PREFIX_LENGTH) {
      return null
    }

    return ApiKey.query().where('hash', this.hash(token)).whereNull('revoked_at').first()
  }

  /**
   * Met à jour `last_used_at` au plus une fois par minute.
   *
   * Une écriture par requête coûterait cher pour une information indicative :
   * l'interface affiche « dernière utilisation », pas un journal d'accès.
   */
  static async touch(key: ApiKey): Promise<void> {
    const now = DateTime.now()
    if (key.lastUsedAt && now.diff(key.lastUsedAt, 'minutes').minutes < 1) return

    key.lastUsedAt = now
    await key.save()
  }

  private static generateToken(): string {
    return `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  }
}
