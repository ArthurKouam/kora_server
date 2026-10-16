import { createHmac, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import notchpayConfig from '#config/notchpay'

/**
 * ─────────────────────────────────────────────────────────────────────
 * Client NotchPay.
 *
 * Deux responsabilités distinctes :
 * 1. parler à l'API (créer un paiement, vérifier son statut)
 * 2. vérifier la signature des webhooks entrants
 *
 * Le montant et la devise ne sont jamais reçus de l'appelant : ils sont
 * lus sur le plan choisi. Sinon un client pourrait acheter Pro pour 100 F.
 * ─────────────────────────────────────────────────────────────────────
 */

export interface NotchPayCustomer {
  name: string
  email: string
  phone?: string | null
}

export interface NotchPayTransaction {
  id: string
  reference: string
  trxref?: string | null
  amount: number
  currency: string
  status: NotchPayPaymentStatus
  customer?: string | null
  created_at?: string | null
  completed_at?: string | null
}

export type NotchPayPaymentStatus =
  | 'pending'
  | 'processing'
  | 'incomplete'
  | 'complete'
  | 'failed'
  | 'canceled'
  | 'rejected'
  | 'abandoned'
  | 'expired'
  | 'refunded'
  | 'partialy-refunded'

/**
 * Statuts acceptés par la colonne `payments.status` (contrainte CHECK).
 * L'orthographe de `partialy-refunded` est celle du fournisseur : la corriger
 * ici ferait échouer l'écriture d'un remboursement partiel.
 */
export const NOTCHPAY_PAYMENT_STATUSES: readonly NotchPayPaymentStatus[] = [
  'pending',
  'processing',
  'incomplete',
  'complete',
  'failed',
  'canceled',
  'rejected',
  'abandoned',
  'expired',
  'refunded',
  'partialy-refunded',
]

/**
 * NotchPay documente ces statuts mais l'API ne garantit pas la liste : sans
 * filtre, un statut inconnu faisait échouer l'écriture en base (contrainte
 * CHECK) et le webhook n'avançait plus du tout.
 */
export function isNotchPayPaymentStatus(value: unknown): value is NotchPayPaymentStatus {
  return (
    typeof value === 'string' && (NOTCHPAY_PAYMENT_STATUSES as readonly string[]).includes(value)
  )
}

/**
 * NotchPay renvoie ses dates en ISO 8601 (`2026-10-16T12:05:00.000000Z`).
 * `DateTime.fromSQL` les refuse et produit une date invalide, que Lucid refuse
 * ensuite d'enregistrer (`E_INVALID_DATE_COLUMN_VALUE`) : la confirmation
 * partait en 500 et le forfait n'était jamais activé.
 */
export function parseNotchPayDate(value: string | null | undefined): DateTime | null {
  if (!value) return null

  const parsed = DateTime.fromISO(value, { zone: 'utc' })
  return parsed.isValid ? parsed : null
}

export interface CreatedPayment {
  transaction: NotchPayTransaction
  authorizationUrl: string
}

/**
 * Origine de l'échec, pour que l'appelant distingue une erreur de notre
 * configuration ou une panne du fournisseur d'un refus métier.
 */
export type NotchPayErrorCode = 'not_configured' | 'unreachable' | 'provider_error'

export class NotchPayError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly body?: unknown,
    readonly code: NotchPayErrorCode = 'provider_error'
  ) {
    super(message)
    this.name = 'NotchPayError'
  }
}

export default class NotchPayService {
  /**
   * Crée un paiement et renvoie l'URL hébergée (Collect) vers laquelle
   * rediriger le client. `amount` est fourni par l'appelant mais doit venir
   * du plan, jamais du payload HTTP.
   */
  static async createPayment(input: {
    amount: number
    currency?: string
    customer: NotchPayCustomer
    description: string
    reference: string
    callback?: string
    metadata?: Record<string, unknown>
  }): Promise<CreatedPayment> {
    const body = {
      amount: input.amount,
      currency: input.currency ?? notchpayConfig.currency,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        ...(input.customer.phone ? { phone: input.customer.phone } : {}),
      },
      description: input.description,
      reference: input.reference,
      callback: input.callback ?? notchpayConfig.callbackUrl,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }

    const response = await this.request<{
      transaction: NotchPayTransaction
      authorization_url: string
    }>('POST', '/payments', body)

    const transaction = response.transaction
    if (!transaction?.reference) {
      throw new NotchPayError('NotchPay did not return a transaction reference', 502, response)
    }

    return {
      transaction,
      authorizationUrl: response.authorization_url,
    }
  }

  /**
   * Statut courant d'une transaction. C'est la source de vérité pour
   * activer un plan : jamais le paramètre `status` présent sur l'URL de
   * retour, que n'importe qui peut forger.
   */
  static async retrievePayment(reference: string): Promise<NotchPayTransaction> {
    const response = await this.request<{ transaction: NotchPayTransaction }>(
      'GET',
      `/payments/${encodeURIComponent(reference)}`
    )

    if (!response?.transaction) {
      throw new NotchPayError('NotchPay returned no transaction', 502, response)
    }

    return response.transaction
  }

  /**
   * Vérifie la signature d'un webhook (HMAC-SHA256 hex).
   *
   * Deux détails impératifs, documentés par Notch Pay :
   * - la signature porte sur le CORPS BRUT, pas sur le JSON re-sérialisé
   * - la comparaison doit être à temps constant, sinon un attaquant peut
   *   retrouver la signature octet par octet en chronométrant les rejets
   */
  static verifyWebhookSignature(rawBody: string, signature: string | null | undefined): boolean {
    if (!signature || !notchpayConfig.hashKey) return false

    const expected = createHmac('sha256', notchpayConfig.hashKey)
      .update(rawBody, 'utf8')
      .digest('hex')

    const expectedBuf = Buffer.from(expected, 'hex')
    let receivedBuf: Buffer
    try {
      receivedBuf = Buffer.from(signature, 'hex')
    } catch {
      return false
    }

    // Longueurs différentes : timingSafeEqual lève, on renvoie false.
    if (expectedBuf.length !== receivedBuf.length) return false

    return timingSafeEqual(expectedBuf, receivedBuf)
  }

  /** Appels HTTP bruts vers l'API, clé publique dans l'en-tête Authorization. */
  private static async request<T = any>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    /**
     * Sans clé, `Authorization: undefined` part chez NotchPay qui répond 401 :
     * le client voyait un « réessayez » alors que la cause est notre
     * configuration. On échoue donc ici, avec un code explicite.
     */
    if (!notchpayConfig.publicKey) {
      throw new NotchPayError(
        'NOTCHPAY_PUBLIC_KEY est absente : le paiement en ligne est indisponible.',
        500,
        undefined,
        'not_configured'
      )
    }

    let response: Response

    try {
      response = await fetch(`${notchpayConfig.apiBaseUrl}${path}`, {
        method,
        headers: {
          'Authorization': notchpayConfig.publicKey,
          'Content-Type': 'application/json',
        },
        // Sans délai maximal, une panne de NotchPay laisse la requête du client
        // suspendue indéfiniment (et consomme un worker).
        signal: AbortSignal.timeout(notchpayConfig.requestTimeoutMs),
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } catch (error) {
      logger.error({ err: error, method, path }, 'NotchPay injoignable')
      throw new NotchPayError('NotchPay est injoignable', 504, undefined, 'unreachable')
    }

    const text = await response.text()
    let payload: any = text
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      // On garde le texte brut : utile dans le message d'erreur.
    }

    if (!response.ok) {
      const message = payload?.message ?? `NotchPay request failed with status ${response.status}`

      // Tracé ici : l'appelant ne renvoie qu'un message générique au client,
      // donc sans cette ligne une clé expirée restait invisible.
      logger.error(
        { statusCode: response.status, method, path, body: payload },
        'NotchPay a refusé la requête'
      )
      throw new NotchPayError(message, response.status, payload)
    }

    return payload as T
  }
}
