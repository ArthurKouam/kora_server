import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Confirmation du candidat sur un entretien planifié
    this.schema.alterTable('interviews', (table) => {
      table.string('candidate_confirmation', 20).nullable()
      table.timestamp('candidate_confirmed_at').nullable()
    })

    // Demande de créneaux : le candidat choisit N dates dans une période
    this.schema.createTable('interview_slot_requests', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('application_id')
        .notNullable()
        .references('id')
        .inTable('applications')
        .onDelete('CASCADE')
      table.integer('requested_slots').notNullable()
      table.date('period_start').notNullable()
      table.date('period_end').notNullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.jsonb('chosen_slots').nullable()
      table.timestamps(false)
    })
  }

  async down() {
    this.schema.dropTable('interview_slot_requests')

    this.schema.alterTable('interviews', (table) => {
      table.dropColumn('candidate_confirmation')
      table.dropColumn('candidate_confirmed_at')
    })
  }
}
