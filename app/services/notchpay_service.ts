import { createHmac, timingSafeEqual } from 'node:crypto'
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
  'pending' | 'processing' | 'complete' | 'failed' | 'canceled' | 'expired'

export interface CreatedPayment {
  transaction: NotchPayTransaction
  authorizationUrl: string
}

export class NotchPayError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly body?: unknown
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
    const response = await fetch(`${notchpayConfig.apiBaseUrl}${path}`, {
      method,
      headers: {
        'Authorization': notchpayConfig.publicKey,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const text = await response.text()
    let payload: any = text
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      // On garde le texte brut : utile dans le message d'erreur.
    }

    if (!response.ok) {
      const message = payload?.message ?? `NotchPay request failed with status ${response.status}`
      throw new NotchPayError(message, response.status, payload)
    }

    return payload as T
  }
}
