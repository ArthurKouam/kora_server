import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Notation par critères.
 *
 * `criteria` stocke le détail par critère de l'offre :
 *   [{ criterionId, label, score }]
 * Le label est figé au moment de l'évaluation : l'historique reste lisible
 * même si les critères de l'offre évoluent.
 *
 * `interview_id = NULL` → évaluation du dossier de candidature ;
 * `interview_id` renseigné → évaluation d'un entretien précis.
 */
export default class extends BaseSchema {
  protected tableName = 'evaluations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('criteria').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('criteria')
    })
  }
}
