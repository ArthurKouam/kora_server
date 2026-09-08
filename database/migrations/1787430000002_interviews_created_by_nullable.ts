import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Un entretien peut être créé par le candidat lui-même
    // (choix de créneaux) : created_by devient nullable.
    this.schema.alterTable('interviews', (table) => {
      table.uuid('created_by').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('interviews', (table) => {
      table.uuid('created_by').notNullable().alter()
    })
  }
}
