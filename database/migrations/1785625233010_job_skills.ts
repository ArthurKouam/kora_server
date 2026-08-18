import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_skills'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_id').notNullable()
      table.uuid('skill_id').notNullable()
      table.boolean('required').defaultTo(false)
      table.string('level').nullable()
      table.timestamp('created_at').notNullable()

      table.foreign('job_id').references('id').inTable('jobs').onDelete('CASCADE')
      table.foreign('skill_id').references('id').inTable('skills').onDelete('CASCADE')
      table.unique(['job_id', 'skill_id'])
      table.index(['skill_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
