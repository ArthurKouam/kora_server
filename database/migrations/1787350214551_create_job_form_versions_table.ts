import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'forms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.string('name', 120).notNullable()
      table.jsonb('definition').notNullable()
      table.uuid('created_by').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL')
      table.index(['organization_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
