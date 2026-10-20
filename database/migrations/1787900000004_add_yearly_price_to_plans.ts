import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Facturation annuelle : 12 mois pour le prix de 10, soit 2 mois offerts.
 *
 * Le prix annuel est stocké (et non calculé depuis `price_xaf`) pour qu'un
 * commercial puisse ajuster la remise forfait par forfait sans redéploiement,
 * comme le reste de la grille tarifaire.
 */
export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // null = pas d'offre annuelle (les forfaits sur devis restent au contact).
      table.integer('price_xaf_yearly').nullable()
    })

    /**
     * Backfill des forfaits existants : 10 × le prix mensuel.
     * `defer` : la migration tourne dans une transaction, et `this.db` ouvrirait
     * une connexion séparée qui ne verrait pas encore la colonne ajoutée.
     */
    this.defer(async () => {
      await this.db
        .from(this.tableName)
        .where('slug', 'plus')
        .update({ price_xaf_yearly: 80000 })
      await this.db
        .from(this.tableName)
        .where('slug', 'pro')
        .update({ price_xaf_yearly: 200000 })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('price_xaf_yearly')
    })
  }
}
