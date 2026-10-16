import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Critères d'évaluation propres à chaque offre.
 *
 * Une offre publie ses critères (par défaut : Technique, Communication,
 * Adéquation au poste) qui servent de grille pour noter le dossier de
 * candidature et chaque entretien. Les critères ne sont plus modifiables une
 * fois l'offre publiée, afin de garder des évaluations comparables.
 */
export default class extends BaseSchema {
  protected tableName = 'job_evaluation_criteria'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_id').notNullable()
      table.string('label').notNullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('job_id').references('id').inTable('jobs').onDelete('CASCADE')
      table.index(['job_id', 'position'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
