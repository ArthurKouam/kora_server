import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_status_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE')

      table.string('from_status', 20).nullable()
      table.string('to_status', 20).notNullable()

      table.enum('changed_by_type', ['user', 'system']).notNullable()

      table
        .uuid('changed_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')

      table.text('reason').nullable()

      table.timestamp('created_at').notNullable()

      table.index(['job_id', 'created_at'], 'job_status_history_job_id_created_at_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
