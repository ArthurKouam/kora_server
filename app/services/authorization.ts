/**
 * ─────────────────────────────────────────────────────────────────────
 * RBAC — Source de vérité unique des permissions par rôle.
 *
 * - Le middleware `permission` applique le RBAC global sur les routes.
 * - Les Bouncers (`app/policies/*`) ajoutent les règles contextuelles sur
 *   les ressources (ex : un interviewer ne modifie que les entretiens qui
 *   lui sont assignés).
 * - Aucun controller ne doit contenir de `if (user.role === ...)`.
 * ─────────────────────────────────────────────────────────────────────
 */

export const USER_ROLES = ['owner', 'admin', 'recruiter', 'hiring_manager', 'interviewer'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const PERMISSIONS = [
  // Jobs
  'jobs.read',
  'jobs.create',
  'jobs.update',
  'jobs.publish',
  'jobs.delete',

  // Formulaires de candidature dynamiques
  'forms.update',
  'forms.publish',

  // Candidatures
  'applications.read',
  'applications.pipeline',
  'applications.request_information',

  // Candidats
  'candidates.read',

  // Entretiens
  'interviews.schedule',
  'interviews.update',
  'interviews.feedback',

  // Organisation
  'settings.org',

  // Futur
  'team.invite',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const READ_ONLY: readonly Permission[] = ['jobs.read', 'applications.read', 'candidates.read']

const PIPELINE: readonly Permission[] = [
  ...READ_ONLY,
  'applications.pipeline',
  'interviews.schedule',
  'interviews.update',
  'interviews.feedback',
]

/** Matrice rôle → permissions accordées */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter(
    (permission) =>
      permission !== 'team.invite' && permission !== 'applications.request_information'
  ),
  recruiter: [
    ...PIPELINE,
    'applications.request_information',
    'jobs.create',
    'jobs.update',
    'jobs.publish',
    'jobs.delete',
    'forms.update',
    'forms.publish',
  ],
  hiring_manager: [...PIPELINE],
  interviewer: [...READ_ONLY, 'interviews.feedback'],
}

/**
 * Vérifie qu'un rôle détient une permission.
 */
export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false
  const granted = ROLE_PERMISSIONS[role as UserRole]
  return granted?.includes(permission) ?? false
}
