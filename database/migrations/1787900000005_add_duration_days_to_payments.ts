import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Durée réellement achetée, figée sur le paiement.
 *
 * Sans elle, l'activation se rabattrait sur `plans.duration_days` (30 jours) et
 * un paiement annuel n'accorderait qu'un mois. Elle sert aussi au garde-fou de
 * réutilisation de `checkout` : un paiement mensuel en attente ne doit pas être
 * réutilisé pour un achat annuel du même forfait, le montant serait différent
 * de celui affiché au client.
 */
export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('duration_days').notNullable().defaultTo(30)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('duration_days')
    })
  }
}
