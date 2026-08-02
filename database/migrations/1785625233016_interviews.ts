import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'interviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('application_id').notNullable()
      table.timestamp('scheduled_at').nullable()
      table.integer('duration').nullable()
      table.enum('type', ['phone', 'video', 'onsite']).nullable()
      table.string('location').nullable()
      table.string('meeting_url').nullable()
      table.enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show']).nullable().defaultTo('scheduled')
      table.text('notes').nullable()
      table.uuid('created_by').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL')
      table.index(['application_id'])
      table.index(['scheduled_at'])
      table.index(['created_by', 'scheduled_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
