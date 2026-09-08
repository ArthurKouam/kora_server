import { BasePolicy } from '@adonisjs/bouncer'
import type Interview from '#models/interview'
import type User from '#models/user'
import { can } from '#services/authorization'

/**
 * Règles contextuelles sur les entretiens.
 * Le RBAC global (rôles) est géré par le middleware `permission` ;
 * ce Bouncer ajoute la dimension ressource :
 * un interviewer ne travaille que sur les entretiens qui lui sont assignés.
 */
export default class InterviewPolicy extends BasePolicy {
  /**
   * Mise à jour complète (statut + notes) : rôles pipeline.
   */
  update(user: User, _interview: Interview) {
    return can(user.role, 'interviews.update')
  }

  /**
   * Feedback (notes) : tout rôle avec `interviews.feedback`, mais
   * l'interviewer doit être assigné à l'entretien concerné.
   */
  updateFeedback(user: User, interview: Interview) {
    if (!can(user.role, 'interviews.feedback')) return false

    // Les autres rôles ont interviews.update : accès complet
    if (can(user.role, 'interviews.update')) return true

    // Interviewer : uniquement ses entretiens assignés
    return interview.assignedTo === user.id
  }
}
