import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Présentation de l'organisation sur les pages carrière publiques.
 *
 * Déclarée dans une migration dédiée et non dans `1785625233001_organizations` :
 * cette migration-là a déjà été exécutée sur les bases existantes, l'y ajouter
 * n'aurait donc aucun effet sur le déploiement et laisserait le schéma Lucid
 * incohérent avec la base.
 */
export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('about').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('about')
    })
  }
}
