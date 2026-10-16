import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Statuts de paiement NotchPay.
 *
 * La table a été créée avec six valeurs, mais l'API en renvoie davantage :
 * `incomplete`, `rejected`, `abandoned`, `refunded`, `partialy-refunded`
 * (orthographe du fournisseur). Le CHECK les refusait, donc le webhook
 * échouait sur `E_CHECK_CONSTRAINT_VIOLATION` et la transaction restait figée
 * sur son statut précédent — un remboursement n'était jamais enregistré.
 */
const STATUSES = [
  'pending',
  'processing',
  'incomplete',
  'complete',
  'failed',
  'canceled',
  'rejected',
  'abandoned',
  'expired',
  'refunded',
  'partialy-refunded',
]

/** Contrainte d'origine, restaurée au rollback. */
const ORIGINAL_STATUSES = ['pending', 'processing', 'complete', 'failed', 'canceled', 'expired']

function checkClause(statuses: string[]): string {
  return `status = ANY (ARRAY[${statuses.map((status) => `'${status}'`).join(', ')}]::text[])`
}

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    // Nom généré par knex pour un `enum` PostgreSQL : il est stable, mais on
    // reste tolérant pour ne pas échouer si la contrainte a déjà été retirée.
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS payments_status_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT payments_status_check CHECK (${checkClause(STATUSES)})`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS payments_status_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT payments_status_check CHECK (${checkClause(ORIGINAL_STATUSES)})`
    )
  }
}
