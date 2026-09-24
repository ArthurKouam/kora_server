import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('jobs', (table) => {
      table.uuid('form_id').nullable()
    })

    this.defer(async (db) => {
      await db.schema.alterTable('jobs', (table) => {
        table
          .foreign('form_id')
          .references('id')
          .inTable('forms')
          .onDelete('SET NULL')
      })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.schema.alterTable('jobs', (table) => table.dropForeign(['form_id']))
    })

    this.schema.alterTable('jobs', (table) => {
      table.dropColumn('form_id')
    })
  }
}
