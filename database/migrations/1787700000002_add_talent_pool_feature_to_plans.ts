import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Le vivier de talents est réservé aux forfaits à partir de 20 000 XAF (Pro,
 * Enterprise). Déclaré dans `plans.features` et non lu comme `price_xaf >= 20000`
 * dans le code : les plans sont des données, pas du code.
 */
export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    // `jsonb_set` plutôt qu'un read-modify-write en JS : pas d'écrasement
    // possible d'une capacité ajoutée entre-temps.
    for (const [slug, defined] of [
      ['plus', false],
      ['pro', true],
      ['enterprise', true],
    ] as const) {
      await this.raw(
        `UPDATE ${this.tableName}
            SET features = jsonb_set(features, '{talentPool}', ?::jsonb)
          WHERE slug = ?`,
        [JSON.stringify({ label: 'Vivier de talents', defined }), slug]
      )
    }
  }

  async down() {
    await this.raw(
      `UPDATE ${this.tableName} SET features = features - 'talentPool' WHERE slug IN (?, ?, ?)`,
      ['plus', 'pro', 'enterprise']
    )
  }
}
