/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/force_json_response_middleware'),
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/initialize_bouncer_middleware'),
  () => import('#middleware/silent_auth_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  permission: () => import('#middleware/permission_middleware'),
  /**
   * Refuse les écritures quand l'abonnement de l'organisation est expiré.
   * La lecture et l'export restent ouvertes : un client qui a payé doit
   * pouvoir récupérer ses données.
   */
  activeSubscription: () => import('#middleware/active_subscription_middleware'),
  /**
   * Refuse une capacité absente du forfait courant (ex. le vivier de talents,
   * réservé aux forfaits ≥ 20 000 XAF). La capacité est lue dans `plans.features`.
   */
  planFeature: () => import('#middleware/plan_feature_middleware'),
  requireOrganization: () => import('#middleware/require_organization_middleware'),
})
