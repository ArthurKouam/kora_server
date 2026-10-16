import { PaymentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { isNotchPayPaymentStatus, parseNotchPayDate } from '#services/notchpay_service'
import Organization from '#models/organization'
import Plan from '#models/plan'

export default class Payment extends PaymentSchema {
  static selfAssignPrimaryKey = false

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  isCompleted(): boolean {
    return this.status === 'complete'
  }

  /**
   * Retrouve la ligne correspondant à un identifiant fourni par NotchPay.
   *
   * Au retour du client (`?reference=trx.…&trxref=kor_…`) comme dans un
   * webhook, NotchPay peut envoyer son propre identifiant ou celui qu'on lui a
   * transmis, sans que la documentation tranche. On cherche donc sur les deux
   * colonnes, puis dans le `payload` enregistré à la création (`id`,
   * `reference`, `trxref`), au lieu de parier sur une seule convention et de
   * répondre « paiement introuvable » à un client qui vient de payer.
   */
  static async findByAnyReference(
    references: (string | null | undefined)[],
    organizationId?: string
  ): Promise<Payment | null> {
    const values = [...new Set(references.filter((value): value is string => Boolean(value)))]

    if (!values.length) return null

    const query = Payment.query().where((builder) => {
      builder.whereIn('notchpay_reference', values).orWhereIn('order_reference', values)

      for (const key of ['id', 'reference', 'trxref']) {
        for (const value of values) {
          builder.orWhereRaw(`payload->>'${key}' = ?`, [value])
        }
      }
    })

    if (organizationId) query.where('organization_id', organizationId)

    return query.orderBy('created_at', 'desc').first()
  }

  /**
   * Applique l'état renvoyé par NotchPay à la ligne : statut, et `paid_at`
   * quand le paiement aboutit.
   *
   * Deux garde-fous appris à la dure :
   * - le statut est validé avant écriture, car `payments.status` est contraint
   *   en base : un statut inconnu faisait échouer la requête entière ;
   * - `completed_at` est lu en ISO 8601 (`parseNotchPayDate`) et non en SQL.
   *
   * Retourne le statut effectivement appliqué.
   */
  applyProviderTransaction(transaction: {
    status?: string | null
    completed_at?: string | null
  }): string {
    if (!isNotchPayPaymentStatus(transaction.status)) {
      logger.warn(
        { paymentId: this.id, status: transaction.status },
        'Statut NotchPay inconnu, ignoré'
      )
      return this.status
    }

    this.status = transaction.status

    if (transaction.status === 'complete') {
      this.paidAt = parseNotchPayDate(transaction.completed_at) ?? DateTime.now()
    }

    return transaction.status
  }
}
