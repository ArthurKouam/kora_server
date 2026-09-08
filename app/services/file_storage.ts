import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { randomUUID } from 'node:crypto'

export interface StoredFileInfo {
  /** Clé/chemin dans le disque de stockage */
  key: string
  name: string
  mimeType: string | null
  size: number | null
}

/**
 * Abstraction de stockage fichiers.
 * Dev : disque local fs (storage/uploads).
 * Prod : Cloudflare R2 via le driver S3 (DRIVE_DISK=r2).
 * Le reste du code ne connaît que cette classe — jamais le disque sous-jacent.
 */
export default class FileStorage {
  /**
   * Stocke un fichier uploadé et retourne ses métadonnées pour candidate_documents.
   */
  static async store(
    file: MultipartFile,
    folder: 'cvs' | 'application-documents'
  ): Promise<StoredFileInfo> {
    const safeName = file.clientName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
    const key = `${folder}/${randomUUID()}-${safeName}`

    await file.moveToDisk(key)

    return {
      key,
      name: file.clientName,
      mimeType: file.headers?.['content-type'] ?? null,
      size: file.size,
    }
  }

  static async delete(key: string): Promise<void> {
    await drive.use().delete(key)
  }
}
