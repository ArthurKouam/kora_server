import drive from '@adonisjs/drive/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import type CandidateDocument from '#models/candidate_document'

/**
 * Types MIME que l'on accepte de servir pour un document candidat.
 *
 * Cette liste est volontairement restreinte : elle ne contient aucun type
 * interprétable comme du code par le navigateur (pas de `text/html`,
 * `image/svg+xml`, `application/javascript`, etc.).
 */
export const SAFE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

/**
 * Un document dont le MIME stocké n'est pas dans l'allowlist est servi en
 * `application/octet-stream`. C'est le cas des anciennes lignes enregistrées
 * avant la détection par magic bytes : elles ne doivent jamais être rendues
 * comme du HTML, même si leur `mime_type` en base dit le contraire.
 */
export function safeDocumentMime(mimeType: string | null | undefined): string {
  if (!mimeType) return 'application/octet-stream'
  const normalized = mimeType.split(';', 1)[0]!.trim().toLowerCase()
  return SAFE_DOCUMENT_MIME_TYPES.has(normalized) ? normalized : 'application/octet-stream'
}

/**
 * Construit un `Content-Disposition: attachment` sûr :
 * - supprime les retours à la ligne (injection d'en-tête) ;
 * - fournit un nom ASCII de repli ;
 * - fournit le nom complet encodé en RFC 5987 (`filename*`).
 */
export function attachmentDisposition(name: string | null | undefined): string {
  const raw = (name ?? 'document').replace(/[\r\n]/g, ' ').trim() || 'document'
  const fallback = raw.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(raw).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

/**
 * Sert un document candidat de façon sûre.
 *
 * - `Content-Type` est restreint à l'allowlist (sinon `application/octet-stream`) ;
 * - `Content-Disposition: attachment` empêche tout rendu inline dans le navigateur ;
 * - `X-Content-Type-Options: nosniff` empêche la détection de type côté client.
 *
 * L'aperçu PDF/image côté frontend reste possible : il passe par un blob chargé
 * avec `$api`, pas par un affichage direct de cette réponse.
 */
export async function streamCandidateDocument(
  response: HttpContext['response'],
  document: Pick<CandidateDocument, 'filePath' | 'mimeType' | 'name'>
) {
  try {
    const stream = await drive.use().getStream(document.filePath)
    response.header('content-type', safeDocumentMime(document.mimeType))
    response.header('content-disposition', attachmentDisposition(document.name))
    response.header('x-content-type-options', 'nosniff')
    return response.stream(stream)
  } catch {
    return response.notFound({ error: 'File missing from storage' })
  }
}
