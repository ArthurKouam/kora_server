import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('candidate_verification_tokens', (table) => {
      table.string('type', 30).notNullable().defaultTo('otp')
      table.integer('attempts').notNullable().defaultTo(0)
      table.index(['email', 'created_at'])
    })

    this.schema.createTable('pending_applications', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email').notNullable()
      table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE')
      table
        .uuid('candidate_id')
        .nullable()
        .references('id')
        .inTable('candidates')
        .onDelete('SET NULL')
      table
        .uuid('form_version_id')
        .nullable()
        .references('id')
        .inTable('job_form_versions')
        .onDelete('SET NULL')
      // Payload validé en attente de vérification email :
      // { answers, coverLetter, documentIds: string[], cvDocumentId: string | null }
      table.jsonb('payload').notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['email', 'status'])
      table.index(['job_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(
        "CREATE UNIQUE INDEX pending_applications_one_per_email_job ON pending_applications (email, job_id) WHERE status = 'pending'"
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('DROP INDEX IF EXISTS pending_applications_one_per_email_job')
    })
    this.schema.dropTable('pending_applications')

    this.schema.alterTable('candidate_verification_tokens', (table) => {
      table.dropIndex(['email', 'created_at'])
      table.dropColumn('attempts')
      table.dropColumn('type')
    })
  }
}
