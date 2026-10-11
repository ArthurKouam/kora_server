import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Plan courant de l'organisation. Pas de table `subscriptions` : l'historisation
 * des changements de plan est volontairement hors périmètre pour l'instant.
 * `payments` garde l'historique de facturation, qui est une obligation
 * comptable — ce n'est pas la même chose.
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('plan_id').nullable()
      table.timestamp('plan_expires_at').nullable()
    })

    this.defer(() => this.db.schema.alterTable(this.tableName, (table) => {
      table.index(['plan_id'])
    }))
  }

  async down() {
    this.defer(() =>
      this.db.schema.alterTable(this.tableName, (table) => {
        table.dropIndex(['plan_id'])
      })
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('plan_id')
      table.dropColumn('plan_expires_at')
    })
  }
}