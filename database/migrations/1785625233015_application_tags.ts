import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'application_tags'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('application_id').notNullable()
      table.uuid('tag_id').notNullable()
      table.timestamp('created_at').notNullable()

      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE')
      table.unique(['application_id', 'tag_id'])
      table.index(['tag_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
