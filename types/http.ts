import type Organization from '#models/organization'
import type ApiKey from '#models/api_key'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /**
     * Tenant de l'utilisateur authentifié, posé par le middleware
     * `requireOrganization`. Les contrôleurs peuvent le lire sans refaire
     * le `Organization.find`.
     */
    organization?: Organization

    /**
     * Clé API ayant authentifié la requête, posée par `apiKey`.
     * Absente sur les routes staff et le portail candidat.
     */
    apiKey?: ApiKey
  }
}
