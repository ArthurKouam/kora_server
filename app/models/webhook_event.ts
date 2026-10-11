import { WebhookEventSchema } from '#database/schema'

/**
 * Trace brute des événements reçus. `eventId` est unique en base : c'est la
 * garantie d'idempotence, pas une vérification applicative.
 */
export default class WebhookEvent extends WebhookEventSchema {
  static selfAssignPrimaryKey = false
}
