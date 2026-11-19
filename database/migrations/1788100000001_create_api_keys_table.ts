import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Clés d'accès à l'API publique, rattachées à une organisation.
 *
 * Le token en clair n'est jamais stocké : seule son empreinte SHA-256 l'est,
 * avec un préfixe lisible pour identifier la clé dans l'interface. Une clé
 * révoquée reste en base pour garder la trace de qui l'a créée et quand.
 */
export default class extends BaseSchema {
  protected tableName = 'api_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('organization_id')
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .uuid('created_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('name', 80).notNullable()
      table.string('prefix', 24).notNullable()
      table.string('hash', 64).notNullable().unique()
      table.timestamp('last_used_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
