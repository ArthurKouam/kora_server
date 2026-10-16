import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type Organization from '#models/organization'
import Plan from '#models/plan'

/**
 * ─────────────────────────────────────────────────────────────────────
 * Plans et quotas — source de vérité unique.
 *
 * Règles :
 * - aucun contrôleur ne doit contenir de `if (plan.maxActiveJobs > ...)`.
 * - un quota `null` signifie « illimité », pas « zéro ».
 * - une organisation sans forfait n'en reçoit pas par défaut : elle reste
 *   utilisable (sinon toute inscription serait morte-née) mais n'accède à
 *   aucune capacité payante, et c'est au client de choisir son forfait.
 * - `plan_expires_at` est null pour une organisation qui n'a jamais payé
 *   (offre commerciale, organization créée hors ligne) : dans ce cas on ne
 *   bloque rien.
 * ─────────────────────────────────────────────────────────────────────
 */

export default class PlanService {
  static async forOrganization(organization: Organization): Promise<Plan | null> {
    if (!organization.planId) return null

    return Plan.find(organization.planId)
  }

  /**
   * L'abonnement est-il actif ? Une organisation sans échéance n'a jamais
   * été facturée : on la laisse working plutôt que de la bloquer.
   */
  static isActive(organization: Organization): boolean {
    if (!organization.planExpiresAt) return true
    return organization.planExpiresAt > DateTime.now()
  }

  /** Jours restants, 0 si expiré ou non facturé. */
  static remainingDays(organization: Organization): number {
    if (!organization.planExpiresAt) return 0
    const diff = organization.planExpiresAt.diff(DateTime.now(), 'days').days
    return Math.max(0, Math.floor(diff))
  }

  /** Actif mais proche de l'échéance — sert à afficher le rappel de renouvellement. */
  static isExpiringSoon(organization: Organization, withinDays = 5): boolean {
    if (!organization.planExpiresAt) return false
    if (!this.isActive(organization)) return false
    return organization.planExpiresAt.diff(DateTime.now(), 'days').days <= withinDays
  }

  /**
   * Offres « actives » au sens quota : tout ce qui n'est ni clôturé ni archivé.
   * Un brouillon compte, sinon le contournement serait de tout laisser en
   * brouillon.
   */
  static async countActiveJobs(organizationId: string): Promise<number> {
    const row = (await db
      .from('jobs')
      .where('organization_id', organizationId)
      .whereNotIn('status', ['closed', 'archived'])
      .count('* as total')
      .first()) as { total: string } | null

    return Number(row?.total ?? 0)
  }

  static async countMembers(organizationId: string): Promise<number> {
    const row = (await db
      .from('users')
      .where('organization_id', organizationId)
      .count('* as total')
      .first()) as { total: string } | null

    return Number(row?.total ?? 0)
  }

  /**
   * Garde de quota d'offres. Retourne `null` si l'organisation peut créer,
   * sinon le message d'erreur à renvoyer tel quel au client.
   */
  static async checkJobQuota(organization: Organization): Promise<string | null> {
    const plan = await this.forOrganization(organization)
    if (!plan || plan.maxActiveJobs === null) return null

    const active = await this.countActiveJobs(organization.id)
    if (active < plan.maxActiveJobs) return null

    return `Votre forfait ${plan.name} est limité à ${plan.maxActiveJobs} offres actives. Vous en avez ${active}. Passez au forfait supérieur pour continuer.`
  }

  /** Garde de quota de membres, même logique. */
  static async checkMemberQuota(organization: Organization): Promise<string | null> {
    const plan = await this.forOrganization(organization)
    if (!plan || plan.maxMembers === null) return null

    const members = await this.countMembers(organization.id)
    if (members < plan.maxMembers) return null

    return `Votre forfait ${plan.name} est limité à ${plan.maxMembers} membres. L'organisation en compte déjà ${members}. Passez au forfait supérieur pour inviter un collègue.`
  }

  /**
   * Active le plan après un paiement confirmé.
   * On prolonge depuis l'échéance si l'organisation est encore active
   * (renouvellement anticipé), sinon on part de maintenant.
   */
  static async activate(organization: Organization, plan: Plan): Promise<void> {
    const now = DateTime.now()
    const from =
      organization.planExpiresAt && organization.planExpiresAt > now
        ? organization.planExpiresAt
        : now

    organization.planId = plan.id
    organization.planExpiresAt = from.plus({ days: plan.durationDays })
    await organization.save()
  }

  /** Consommation courante, pour afficher « 3 / 5 offres » côté client. */
  static async usage(organization: Organization) {
    const plan = await this.forOrganization(organization)
    const [activeJobs, members] = await Promise.all([
      this.countActiveJobs(organization.id),
      this.countMembers(organization.id),
    ])

    return {
      plan,
      activeJobs,
      members,
      isActive: this.isActive(organization),
      expiresAt: organization.planExpiresAt?.toISO() ?? null,
      remainingDays: this.remainingDays(organization),
      isExpiringSoon: this.isExpiringSoon(organization),
      limits: {
        maxActiveJobs: plan?.maxActiveJobs ?? null,
        maxMembers: plan?.maxMembers ?? null,
      },
      /**
       * Capacités d'accès sans quota. Le frontend s'en sert pour afficher ou
       * masquer un menu plutôt que de laisser tomber sur une page verrouillée.
       */
      capabilities: {
        talentPool: this.planHasFeature(plan, 'talentPool'),
      },
    }
  }

  /** Plans achetables en ligne, pour la page tarifs. */
  static async publicPlans(): Promise<Plan[]> {
    return Plan.query()
      .where('is_active', true)
      .where('is_public', true)
      .orderBy('sort_order', 'asc')
  }

  /**
   * Le forfait inclut-il cette capacité ? Lue dans `plans.features` et non
   * déduite du prix : le vivier est réservé aux forfaits ≥ 20 000 XAF, mais
   * reste une donnée commerciale.
   */
  static async hasFeature(organization: Organization, feature: string): Promise<boolean> {
    const plan = await this.forOrganization(organization)
    return this.planHasFeature(plan, feature)
  }

  static planHasFeature(plan: Plan | null, feature: string): boolean {
    const features = (plan?.features ?? {}) as Record<string, { defined?: boolean }>
    return features[feature]?.defined === true
  }

  /** Premier forfait, en ordre commercial, incluant la capacité. */
  static async firstPlanWithFeature(feature: string): Promise<Plan | null> {
    const plans = await Plan.query().where('is_active', true).orderBy('sort_order', 'asc')
    return plans.find((plan) => this.planHasFeature(plan, feature)) ?? null
  }

  /** Tous les plans, y compris enterprise — pour l'affichage marketing. */
  static async allPlans(): Promise<Plan[]> {
    return Plan.query().where('is_active', true).orderBy('sort_order', 'asc')
  }
}
