import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'application_notes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('application_id').notNullable()
      table.uuid('author_id').notNullable()
      table.text('content').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('author_id').references('id').inTable('users').onDelete('CASCADE')
      table.index(['application_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
