import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_verification_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('candidate_id').nullable()
      table.string('email').notNullable()
      table.string('token_hash').notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('verified_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('SET NULL')
      table.unique(['token_hash'])
      table.index(['email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
