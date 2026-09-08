import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'application_information_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.uuid('application_id').notNullable()
      table.uuid('requested_by').notNullable()
      table.jsonb('definition').notNullable()
      table.jsonb('answers').nullable()
      table.text('message').nullable()
      table
        .enum('status', ['open', 'submitted', 'expired', 'cancelled'])
        .notNullable()
        .defaultTo('open')
      table
        .enum('delivery_status', ['pending', 'processing', 'sent', 'retrying', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table
        .enum('response_delivery_status', ['pending', 'processing', 'sent', 'retrying', 'failed'])
        .nullable()
      table.string('token_hash', 64).notNullable().unique()
      table.text('delivery_error').nullable()
      table.text('response_delivery_error').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('submitted_at').nullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('requested_by').references('id').inTable('users').onDelete('RESTRICT')
      table.index(['organization_id', 'application_id'])
      table.index(['status', 'expires_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        CREATE UNIQUE INDEX application_information_requests_one_open_per_application
        ON application_information_requests (application_id)
        WHERE status = 'open'
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
