import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('candidate_id').notNullable()
      table.enum('type', ['cv', 'cover_letter', 'certificate', 'portfolio', 'other']).notNullable()
      table.string('name').nullable()
      table.string('file_path').notNullable()
      table.string('mime_type').nullable()
      table.integer('file_size').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('CASCADE')
      table.index(['candidate_id'])
      table.index(['candidate_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
