import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * L'appartenance au vivier est portée ici, jamais sur `candidates` : un candidat
 * est global à la plateforme, le vivier appartient à une organisation.
 *
 * Une ligne par couple (organisation, candidat), réactivable : c'est la
 * garantie serveur contre les doublons.
 *
 * `retention_expires_at` est la durée de conservation ; le job de purge s'appuie dessus.
 */
export default class extends BaseSchema {
  protected tableName = 'talent_pool_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('organization_id').notNullable()
      table.uuid('candidate_id').notNullable()
      table.uuid('added_by').nullable()
      table.string('source', 24).notNullable().defaultTo('manual')
      table.uuid('source_application_id').nullable()
      table.string('status', 16).notNullable().defaultTo('active')
      table.string('legal_basis', 32).notNullable().defaultTo('consent')
      table.timestamp('consent_at').nullable()
      table.timestamp('retention_expires_at').notNullable()
      table.timestamp('archived_at').nullable()
      table.text('removal_reason').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .foreign('candidate_id')
        .references('id')
        .inTable('candidates')
        .onDelete('CASCADE')
      // SET NULL : supprimer un recruteur ne doit pas vider le vivier.
      table.foreign('added_by').references('id').inTable('users').onDelete('SET NULL')
      table
        .foreign('source_application_id')
        .references('id')
        .inTable('applications')
        .onDelete('SET NULL')

      table.unique(['organization_id', 'candidate_id'])
      table.index(['organization_id', 'status'])
      table.index(['candidate_id'])
      table.index(['retention_expires_at'])
    })

    this.schema.createTable('talent_pool_notes', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('talent_pool_entry_id').notNullable()
      table.uuid('author_id').nullable()
      table.text('content').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('talent_pool_entry_id')
        .references('id')
        .inTable(this.tableName)
        .onDelete('CASCADE')
      table.foreign('author_id').references('id').inTable('users').onDelete('SET NULL')
      table.index(['talent_pool_entry_id'])
    })

    // Réutilise `tags` (scopée à l'organisation) : les mêmes étiquettes servent
    // aux candidatures et aux profils du vivier.
    this.schema.createTable('talent_pool_tags', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('talent_pool_entry_id').notNullable()
      table.uuid('tag_id').notNullable()
      table.timestamp('created_at').notNullable()

      table
        .foreign('talent_pool_entry_id')
        .references('id')
        .inTable(this.tableName)
        .onDelete('CASCADE')
      table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE')

      table.unique(['talent_pool_entry_id', 'tag_id'])
      table.index(['tag_id'])
    })
  }

  async down() {
    this.schema.dropTable('talent_pool_tags')
    this.schema.dropTable('talent_pool_notes')
    this.schema.dropTable(this.tableName)
  }
}
