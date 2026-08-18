import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'evaluations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('application_id').notNullable()
      table.uuid('interview_id').nullable()
      table.uuid('evaluator_id').notNullable()
      table.integer('score').nullable()
      table.enum('recommendation', ['strong_yes', 'yes', 'neutral', 'no', 'strong_no']).nullable()
      table.text('strengths').nullable()
      table.text('weaknesses').nullable()
      table.text('comments').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('application_id').references('id').inTable('applications').onDelete('CASCADE')
      table.foreign('interview_id').references('id').inTable('interviews').onDelete('SET NULL')
      table.foreign('evaluator_id').references('id').inTable('users').onDelete('CASCADE')
      table.index(['application_id'])
      table.index(['interview_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
