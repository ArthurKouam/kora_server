import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_form_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_id').notNullable()
      table.integer('version').notNullable()
      table.jsonb('definition').notNullable()
      table.timestamp('published_at').nullable()
      table.uuid('created_by').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('job_id').references('id').inTable('jobs').onDelete('CASCADE')
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL')
      table.unique(['job_id', 'version'])
      table.index(['job_id', 'published_at'])
    })

    this.defer(async (db) => {
      // Un seul brouillon (published_at IS NULL) par job
      await db.rawQuery(
        'CREATE UNIQUE INDEX job_form_versions_one_draft_per_job ON job_form_versions (job_id) WHERE published_at IS NULL'
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.raw('DROP INDEX IF EXISTS job_form_versions_one_draft_per_job')
    })
    this.schema.dropTable(this.tableName)
  }
}
