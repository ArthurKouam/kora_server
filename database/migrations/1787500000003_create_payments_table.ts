import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Journal des paiements Mobile Money. Contraint à un seul `reference` NotchPay
 * par ligne : si l'API réémet une notification, l'upsert échoue au lieu de
 * créer un doublon.
 */
export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.uuid('plan_id').notNullable()

      /** Référence NotchPay (`trx.*`) — la clé d'idempotence. */
      table.string('notchpay_reference').nullable().unique()
      /** `trxref`, echoed par NotchPay : notre référence interne. */
      table.string('order_reference').notNullable().unique()

      table.integer('amount').notNullable()
      table.string('currency', 3).notNullable().defaultTo('XAF')
      table
        .enum('status', ['pending', 'processing', 'complete', 'failed', 'canceled', 'expired'])
        .notNullable()
        .defaultTo('pending')

      table.string('provider', 20).notNullable().defaultTo('notchpay')
      table.string('authorization_url').nullable()
      table.string('customer_name').nullable()
      table.string('customer_email').nullable()
      table.string('customer_phone').nullable()

      table.jsonb('payload').nullable()

      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('plan_id').references('id').inTable('plans').onDelete('RESTRICT')

      table.index(['organization_id', 'created_at'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}