import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * ─────────────────────────────────────────────────────────────────────
 * Job Seeker — compte, profil maître et documents personnels.
 *
 * Ce socle est volontairement séparé de `candidates` : un candidat peut
 * postuler dans plusieurs organisations, et chaque organisation possède son
 * propre dossier ATS. Le compte et le profil maître, eux, appartiennent au
 * candidat et ne sont jamais partagés implicitement avec un recruteur.
 * ─────────────────────────────────────────────────────────────────────
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('job_seekers', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.timestamp('email_verified_at').nullable()
      table.enum('status', ['active', 'suspended', 'deleted']).notNullable().defaultTo('active')
      table.timestamp('last_login_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status'])
    })

    this.schema.createTable('job_seeker_profiles', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable().unique()
      table.string('first_name', 100).nullable()
      table.string('last_name', 100).nullable()
      table.string('phone', 50).nullable()
      table.string('headline', 200).nullable()
      table.string('location', 255).nullable()
      table.string('city', 100).nullable()
      table.string('country', 100).nullable()
      table.date('date_of_birth').nullable()
      table.text('bio').nullable()
      table.string('avatar_url', 255).nullable()
      table.string('linkedin_url', 255).nullable()
      table.string('github_url', 255).nullable()
      table.string('portfolio_url', 255).nullable()
      table.string('website_url', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
    })

    this.schema.createTable('job_seeker_documents', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table
        .enum('type', ['cv', 'cover_letter', 'certificate', 'portfolio', 'other'])
        .notNullable()
        .defaultTo('cv')
      table.string('name', 255).notNullable()
      table.string('file_path', 255).notNullable()
      table.string('mime_type', 255).nullable()
      table.integer('file_size').nullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.index(['job_seeker_id'])
      table.index(['job_seeker_id', 'type'])
    })

    this.schema.createTable('job_seeker_verification_tokens', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('consumed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.index(['job_seeker_id'])
    })

    this.schema.createTable('job_seeker_password_reset_tokens', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('used_at').nullable()
      table.string('request_ip', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.index(['job_seeker_id'])
    })

    this.schema.createTable('job_seeker_experiences', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table.string('company', 255).nullable()
      table.string('position', 255).nullable()
      table.string('location', 255).nullable()
      table.text('description').nullable()
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.boolean('is_current').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.index(['job_seeker_id'])
    })

    this.schema.createTable('job_seeker_educations', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table.string('institution', 255).nullable()
      table.string('degree', 255).nullable()
      table.string('field_of_study', 255).nullable()
      table.string('location', 255).nullable()
      table.text('description').nullable()
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.index(['job_seeker_id'])
    })

    this.schema.createTable('job_seeker_skills', (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('job_seeker_id').notNullable()
      table.uuid('skill_id').notNullable()
      table.string('level', 50).nullable()
      table.integer('years_of_experience').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table
        .foreign('job_seeker_id')
        .references('id')
        .inTable('job_seekers')
        .onDelete('CASCADE')
      table.foreign('skill_id').references('id').inTable('skills').onDelete('CASCADE')
      table.unique(['job_seeker_id', 'skill_id'])
      table.index(['skill_id'])
    })
  }

  async down() {
    this.schema.dropTable('job_seeker_skills')
    this.schema.dropTable('job_seeker_educations')
    this.schema.dropTable('job_seeker_experiences')
    this.schema.dropTable('job_seeker_password_reset_tokens')
    this.schema.dropTable('job_seeker_verification_tokens')
    this.schema.dropTable('job_seeker_documents')
    this.schema.dropTable('job_seeker_profiles')
    this.schema.dropTable('job_seekers')
  }
}
