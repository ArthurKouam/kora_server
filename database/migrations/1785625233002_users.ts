import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.uuid('organization_id').nullable()
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('email').notNullable().unique()
      table.string('password').notNullable()
      table.string('avatar_url').nullable()
      table.enum('role', ['owner', 'admin', 'recruiter', 'hiring_manager', 'interviewer']).notNullable().defaultTo('recruiter')
      table.timestamp('email_verified_at').nullable()
      table.timestamp('last_login_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table.index(['organization_id'])
      table.index(['organization_id', 'role'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
