import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('candidate_id').notNullable()
      table.string('token_hash').notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('CASCADE')
      table.unique(['token_hash'])
      table.index(['candidate_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
