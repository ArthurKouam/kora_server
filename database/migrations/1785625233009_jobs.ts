import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jobs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('organization_id').notNullable()
      table.uuid('created_by').notNullable()
      table.string('title').notNullable()
      table.string('slug').notNullable()
      table.text('description').nullable()
      table.text('requirements').nullable()
      table.text('responsibilities').nullable()
      table.text('benefits').nullable()
      table.string('location').nullable()
      table.string('city').nullable()
      table.string('country').nullable()
      table
        .enum('employment_type', [
          'full_time',
          'part_time',
          'contract',
          'internship',
          'freelance',
          'temporary',
        ])
        .nullable()
      table.enum('workplace_type', ['onsite', 'remote', 'hybrid']).nullable()
      table.string('experience_level').nullable()
      table.decimal('salary_min', 12, 2).nullable()
      table.decimal('salary_max', 12, 2).nullable()
      table.string('salary_currency').nullable()
      table
        .enum('status', ['draft', 'published', 'paused', 'closed', 'archived'])
        .notNullable()
        .defaultTo('draft')
      table.timestamp('published_at').nullable()
      table.date('closing_date').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE')
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL')
      table.unique(['organization_id', 'slug'])
      table.index(['organization_id', 'status'])
      table.index(['status', 'published_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
