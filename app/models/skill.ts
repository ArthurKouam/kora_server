import { SkillSchema } from '#database/schema'
import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import CandidateSkill from '#models/candidate_skill'
import JobSkill from '#models/job_skill'
import Candidate from '#models/candidate'
import Job from '#models/job'

export default class Skill extends SkillSchema {
  static selfAssignPrimaryKey = false

  @hasMany(() => CandidateSkill)
  declare candidateSkills: HasMany<typeof CandidateSkill>

  @hasMany(() => JobSkill)
  declare jobSkills: HasMany<typeof JobSkill>

  @manyToMany(() => Candidate, {
    pivotTable: 'Candidate_skill',
    pivotForeignKey: 'skill_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'candidate_id',
  })
  declare candidates: ManyToMany<typeof Candidate>

  @manyToMany(() => Job, {
    pivotTable: 'Job_skill',
    pivotForeignKey: 'skill_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'job_id',
  })
  declare jobs: ManyToMany<typeof Job>
}
