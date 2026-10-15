import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'team_invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.uuid('invited_by').notNullable()
      table.string('email', 254).notNullable()
      table.enum('role', ['admin', 'recruiter', 'hiring_manager', 'interviewer']).notNullable()
      table
        .enum('status', ['pending', 'accepted', 'cancelled', 'expired'])
        .notNullable()
        .defaultTo('pending')
      table
        .enum('delivery_status', ['pending', 'processing', 'sent', 'retrying', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table.string('token_hash', 64).notNullable().unique()
      table.text('delivery_error').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('accepted_at').nullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('invited_by').references('id').inTable('users').onDelete('RESTRICT')
      table.index(['organization_id', 'email'])
      table.index(['organization_id', 'status', 'expires_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        CREATE UNIQUE INDEX team_invitations_one_pending_per_email
        ON team_invitations (organization_id, LOWER(email))
        WHERE status = 'pending'
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
