import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Idempotence des webhooks NotchPay.
 *
 * Leur doc est explicite : l'API réémet avec un backoff croissant tant qu'elle
 * n'a pas reçu de 200. Sans cette table, un retry arrive après notre traitement
 * et active le plan une seconde fois. `event_id` est unique : le second
 * traitement est rejeté par PostgreSQL, pas par une logique applicative.
 */
export default class extends BaseSchema {
  protected tableName = 'webhook_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.string('provider', 20).notNullable().defaultTo('notchpay')
      /** `evt_*` fourni par NotchPay. */
      table.string('event_id').notNullable().unique()
      table.string('event_type').notNullable()
      table.text('payload').notNullable()

      table.boolean('processed').notNullable().defaultTo(false)
      table.text('error').nullable()
      table.integer('attempts').notNullable().defaultTo(0)

      table.timestamp('received_at').notNullable()
      table.timestamp('processed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['processed'])
      table.index(['event_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}