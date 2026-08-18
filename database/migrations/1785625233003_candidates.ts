import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email').notNullable().unique()
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('phone').nullable()
      table.string('avatar_url').nullable()
      table.date('date_of_birth').nullable()
      table.string('location').nullable()
      table.string('city').nullable()
      table.string('country').nullable()
      table.text('bio').nullable()
      table.string('linkedin_url').nullable()
      table.string('github_url').nullable()
      table.string('portfolio_url').nullable()
      table.string('website_url').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
