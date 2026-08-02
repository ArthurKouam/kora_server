import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'emails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('organization_id').notNullable()
      table.uuid('application_id').nullable()
      table.uuid('candidate_id').nullable()
      table.uuid('template_id').nullable()
      table.string('recipient').notNullable()
      table.string('subject').nullable()
      table.text('body').nullable()
      table.enum('type', ['application_received', 'application_rejected', 'interview_invitation', 'interview_reminder', 'offer', 'custom']).nullable()
      table.enum('status', ['pending', 'sent', 'failed']).nullable().defaultTo('pending')
      table.timestamp('sent_at').nullable()
      table.timestamp('failed_at').nullable()
      table.text('error').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('application_id').references('id').inTable('applications').onDelete('SET NULL')
      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('SET NULL')
      table.foreign('template_id').references('id').inTable('email_templates').onDelete('SET NULL')
      table.index(['application_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
