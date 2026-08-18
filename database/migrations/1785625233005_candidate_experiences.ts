import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_experiences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('candidate_id').notNullable()
      table.string('company').nullable()
      table.string('position').nullable()
      table.string('location').nullable()
      table.text('description').nullable()
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.boolean('is_current').defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('CASCADE')
      table.index(['candidate_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
