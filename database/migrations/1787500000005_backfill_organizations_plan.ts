import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Rattache les organizations existantes au forfait Plus.
 *
 * Déseparate de la migration qui ajoute les colonnes : un `defer` dans cette
 * migration-là s'exécutait silencieusement sans rien écrire, et une
 * organisation sans `plan_id` se retrouve bloquée sans explication.
 *
 * Idempotent (`WHERE plan_id IS NULL`) : le rejouer ne change rien.
 * `plan_expires_at` reste NULL, ce qui signifie « jamais facturé » — donc
 * pas de blocage. Voir `PlanService.isActive`.
 */
export default class extends BaseSchema {
  async up() {
    await this.db.raw(
      `UPDATE organizations
       SET plan_id = (SELECT id FROM plans WHERE slug = 'plus')
       WHERE plan_id IS NULL`
    )
  }

  async down() {
    // Réversible : on ne retire pas les plans, une organisation peut avoir
    // été facturée depuis.
  }
}