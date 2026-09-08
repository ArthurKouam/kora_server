import type { Constructor, LazyImport } from '@adonisjs/core/types/common'
import type { BasePolicy } from '@adonisjs/bouncer'

const policies: Record<string, LazyImport<Constructor<BasePolicy>>> = {
  InterviewPolicy: () => import('./interview_policy.js'),
}

export default policies
