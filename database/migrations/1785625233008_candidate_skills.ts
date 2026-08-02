import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_skills'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('candidate_id').notNullable()
      table.uuid('skill_id').notNullable()
      table.string('level').nullable()
      table.integer('years_of_experience').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('CASCADE')
      table.foreign('skill_id').references('id').inTable('skills').onDelete('CASCADE')
      table.unique(['candidate_id', 'skill_id'])
      table.index(['skill_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
