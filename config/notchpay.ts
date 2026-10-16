import env from '#start/env'

/**
 * Client HTTP NotchPay — Mobile Money (MTN MoMo, Orange Money).
 *
 * Implémentation directe en `fetch` : il n'existe pas de SDK AdonisJS et le
 * wrapper officiel est en PHP/Python.
 *
 * Choix d'authentification : `POST /payments` et `GET /payments/{reference}`
 * acceptent la clé **publique** dans l'en-tête `Authorization` (cf. référence
 * API). La clé privée n'est donc pas utilisée ici — elle reste dans l'env
 * sans être exposée. La clé de hachage sert à vérifier la signature des
 * webhooks entrants, voir `NotchPayService.verifyWebhookSignature`.
 */

const MODE = env.get('NOTCHPAY_MODE', 'sandbox')

/** Même hôte pour le sandbox et la production : seul le préfixe de clé change. */
const API_BASE_URL = 'https://api.notchpay.co'

export const notchpayConfig = {
  mode: MODE,
  apiBaseUrl: API_BASE_URL,
  publicKey: env.get('NOTCHPAY_PUBLIC_KEY'),
  secretKey: env.get('NOTCHPAY_SECRET_KEY'),
  hashKey: env.get('NOTCHPAY_HASH_KEY'),

  /** Devise unique : les plans sont tarifés en XAF (FCFA). */
  currency: 'XAF',

  /**
   * Créer un paiement mobilise un utilisateur dont l'opérateur Mobile Money
   * peut ne jamais répondre. Au-delà de ce délai on considère NotchPay
   * injoignable et on libère la requête.
   */
  requestTimeoutMs: 15_000,

  /** Les clés sont optionnelles (le mode sans paiement reste possible), donc
   * on expose explicitement leur présence plutôt que de laisser `undefined`
   * partir dans un en-tête HTTP. */
  get isConfigured(): boolean {
    return Boolean(this.publicKey)
  },

  get isWebhookConfigured(): boolean {
    return Boolean(this.hashKey)
  },

  /** Where NotchPay redirects the customer once the payment is done. */
  get callbackUrl(): string {
    return `${env.get('FRONTEND_URL')}/billing/return`
  },

  /** Our webhook endpoint, to register in the NotchPay dashboard. */
  get webhookUrl(): string {
    return `${env.get('APP_URL')}/api/v1/billing/webhooks/notchpay`
  },
}

export default notchpayConfig
