import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('jobs', (table) => {
      table.uuid('active_form_version_id').nullable()
    })

    this.schema.alterTable('applications', (table) => {
      table.uuid('form_version_id').nullable()
      table.jsonb('answers').notNullable().defaultTo('{}')
    })

    this.defer(async (db) => {
      await db.schema.alterTable('jobs', (table) => {
        table
          .foreign('active_form_version_id')
          .references('id')
          .inTable('job_form_versions')
          .onDelete('SET NULL')
      })
      await db.schema.alterTable('applications', (table) => {
        table
          .foreign('form_version_id')
          .references('id')
          .inTable('job_form_versions')
          .onDelete('RESTRICT')
        table.index(['form_version_id'])
      })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.schema.alterTable('applications', (table) => {
        table.dropForeign(['form_version_id'])
      })
      await db.schema.alterTable('jobs', (table) => {
        table.dropForeign(['active_form_version_id'])
      })
    })

    this.schema.alterTable('applications', (table) => {
      table.dropColumn('answers')
      table.dropColumn('form_version_id')
    })
    this.schema.alterTable('jobs', (table) => {
      table.dropColumn('active_form_version_id')
    })
  }
}
