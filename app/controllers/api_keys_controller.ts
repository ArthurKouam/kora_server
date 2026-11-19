import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'
import ApiKey from '#models/api_key'
import ApiKeyService from '#services/api_key_service'
import { createApiKeyValidator } from '#validators/settings'
import { DateTime } from 'luxon'

/**
 * Un identifiant non-UUID ferait échouer la requête en 500 côté PostgreSQL :
 * on répond 404, comme pour une clé inexistante.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `requireOrganization` dérive le tenant de l'utilisateur authentifié : aucune
 * route ci-dessous ne lit un `organizationId` venu du client.
 */
function tenant(ctx: HttpContext): Organization {
  if (!ctx.organization) throw new Error('Organization middleware is missing')
  return ctx.organization
}

/**
 * Gestion des clés d'API de l'organisation (forfait Enterprise).
 *
 * La liste n'expose jamais le token ni son empreinte : uniquement le préfixe,
 * la dernière utilisation et l'auteur de la création.
 */
export default class ApiKeysController {
  async index(ctx: HttpContext) {
    const organization = tenant(ctx)

    const keys = await ApiKey.query()
      .where('organization_id', organization.id)
      .preload('createdBy', (query) => query.select('id', 'first_name', 'last_name', 'email'))
      .orderBy('created_at', 'desc')

    return ctx.response.ok(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
        createdAt: key.createdAt,
        createdBy: key.createdBy
          ? {
              id: key.createdBy.id,
              name: [key.createdBy.firstName, key.createdBy.lastName].filter(Boolean).join(' '),
              email: key.createdBy.email,
            }
          : null,
      }))
    )
  }

  /**
   * POST /api/v1/settings/api-keys
   * Le token en clair n'est renvoyé qu'ici : il n'est plus récupérable ensuite.
   */
  async store(ctx: HttpContext) {
    const organization = tenant(ctx)
    const user = ctx.auth.use('web').getUserOrFail()
    const payload = await ctx.request.validateUsing(createApiKeyValidator)

    const { key, token } = await ApiKeyService.create(organization.id, payload.name, user.id)

    return ctx.response.created({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      token,
      createdAt: key.createdAt,
    })
  }

  /**
   * DELETE /api/v1/settings/api-keys/:id
   * Révocation logique : la trace de la clé et de son auteur est conservée.
   */
  async destroy(ctx: HttpContext) {
    const organization = tenant(ctx)

    if (!UUID.test(String(ctx.params.id))) {
      return ctx.response.notFound({ error: 'API key not found' })
    }

    const key = await ApiKey.query()
      .where('id', String(ctx.params.id))
      .where('organization_id', organization.id)
      .first()

    if (!key) {
      return ctx.response.notFound({ error: 'API key not found' })
    }

    if (!key.revokedAt) {
      key.revokedAt = DateTime.now()
      await key.save()
    }

    return ctx.response.ok({ id: key.id, revokedAt: key.revokedAt })
  }
}
