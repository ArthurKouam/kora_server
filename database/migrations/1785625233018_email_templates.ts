import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.string('name').notNullable()
      table.enum('type', ['application_received', 'application_rejected', 'interview_invitation', 'interview_reminder', 'offer', 'custom']).notNullable()
      table.string('subject').nullable()
      table.text('body').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.index(['organization_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
