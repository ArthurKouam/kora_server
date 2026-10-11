import Organization from '#models/organization'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /**
     * Tenant de l'utilisateur authentifié, posé par le middleware
     * `requireOrganization`. Les contrôleurs peuvent le lire sans refaire
     * le `Organization.find`.
     */
    organization?: Organization
  }
}