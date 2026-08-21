import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'applications'
  protected tablesWithApplicationId = [
    'candidate_documents',
    'candidate_experiences',
    'candidate_educations',
  ]

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_id').notNullable()
      table.uuid('candidate_id').notNullable()
      table
        .enum('status', [
          'new',
          'screening',
          'shortlisted',
          'interview',
          'offer',
          'hired',
          'rejected',
          'withdrawn',
        ])
        .notNullable()
        .defaultTo('new')
      table
        .enum('source', ['career_page', 'linkedin', 'indeed', 'referral', 'direct', 'other'])
        .nullable()
      table.text('cover_letter').nullable()
      table.uuid('cv_document_id').nullable()
      table.timestamp('applied_at').notNullable()
      table.timestamp('rejected_at').nullable()
      table.timestamp('hired_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('job_id').references('id').inTable('jobs').onDelete('CASCADE')
      table.foreign('candidate_id').references('id').inTable('candidates').onDelete('CASCADE')
      table
        .foreign('cv_document_id')
        .references('id')
        .inTable('candidate_documents')
        .onDelete('SET NULL')
      table.unique(['job_id', 'candidate_id'])
      table.index(['candidate_id'])
      table.index(['job_id', 'status'])
    })

    this.defer(async (db) => {
      for (const tableName of this.tablesWithApplicationId) {
        await db.schema.alterTable(tableName, (table) => {
          table
            .foreign('application_id')
            .references('id')
            .inTable('applications')
            .onDelete('SET NULL')
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      for (const tableName of this.tablesWithApplicationId) {
        await db.schema.alterTable(tableName, (table) => {
          table.dropForeign(['application_id'])
        })
      }
    })
    this.schema.dropTable(this.tableName)
  }
}
