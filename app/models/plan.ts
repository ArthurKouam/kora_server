import { PlanSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

/** Une capacité annoncée sur la page tarifs. `defined: false` = pas encore dans le produit. */
export interface PlanFeature {
  label: string
  defined: boolean
}

export default class Plan extends PlanSchema {
  static selfAssignPrimaryKey = false

  @hasMany(() => Organization)
  declare organizations: HasMany<typeof Organization>

  /** `null` = illimité. */
  isOverJobLimit(currentActiveJobs: number): boolean {
    if (this.maxActiveJobs === null) return false
    return currentActiveJobs >= this.maxActiveJobs
  }

  /** `null` = illimité. */
  isOverMemberLimit(currentMembers: number): boolean {
    if (this.maxMembers === null) return false
    return currentMembers >= this.maxMembers
  }

  /** Une seule conditionsubscription estFacturable en ligne. */
  isPurchasable(): boolean {
    return this.isActive && this.isPublic && this.priceXaf !== null
  }
}
