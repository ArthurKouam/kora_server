import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Jetons de réinitialisation du mot de passe (équipe staff).
 * Seul le SHA-256 du token est stocké, comme pour les demandes d'informations.
 */
export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable()
      table.string('email').notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('used_at').nullable()
      table.string('request_ip').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.index(['email'])
      table.index(['user_id', 'used_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
