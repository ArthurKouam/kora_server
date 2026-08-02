import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'application_status_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('application_id').notNullable()
      table.enum('from_status', ['new', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']).notNullable()
      table.enum('to_status', ['new', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']).notNullable()
      table.enum('changed_by_type', ['user', 'candidate', 'system']).notNullable()
      table.uuid('changed_by_user_id').nullable()
      table.uuid('changed_by_candidate_id').nullable()
      table.text('reason').nullable()
      table.timestamp('created_at').notNullable()

      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('changed_by_user_id').references('id').inTable('users').onDelete('SET NULL')
      table.foreign('changed_by_candidate_id').references('id').inTable('candidates').onDelete('SET NULL')
      table.index(['application_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
