import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('interviews', (table) => {
      table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.index(['assigned_to'])
    })
  }

  async down() {
    this.schema.alterTable('interviews', (table) => {
      table.dropIndex(['assigned_to'])
      table.dropForeign(['assigned_to'])
      table.dropColumn('assigned_to')
    })
  }
}
