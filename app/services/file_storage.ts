import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { randomUUID } from 'node:crypto'
import { fileTypeFromFile } from 'file-type'

export interface StoredFileInfo {
  /** Clé/chemin dans le disque de stockage */
  key: string
  name: string
  mimeType: string | null
  size: number | null
}

/** Levée quand le contenu réel du fichier n'est pas un type autorisé. */
export class UnsupportedFileTypeError extends Error {
  constructor() {
    super('Unsupported file type')
    this.name = 'UnsupportedFileTypeError'
  }
}

/**
 * Correspondance entre l'extension détectée par `file-type` et le MIME
 * canonique que l'on stocke en base. Le MIME n'est jamais celui envoyé par
 * le client : il est déduit des premiers octets du fichier.
 */
const DETECTED_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Abstraction de stockage fichiers.
 * Dev : disque local fs (DRIVE_DISK=fs).
 * Prod : Cloudflare R2 via le driver S3 (DRIVE_DISK=r2).
 */
export default class FileStorage {
  /**
   * Détecte le type réel d'un fichier uploadé à partir de ses magic bytes.
   *
   * `cfb` correspond au conteneur OLE (Office 97-2003). On ne l'accepte que si
   * le nom du fichier se termine par `.doc`, afin de ne pas accepter au passage
   * un `.xls`, `.msi` ou un exécutable emballé dans ce format.
   */
  static async detectMimeType(file: MultipartFile): Promise<string> {
    if (!file.tmpPath) throw new UnsupportedFileTypeError()

    let detected
    try {
      detected = await fileTypeFromFile(file.tmpPath)
    } catch {
      throw new UnsupportedFileTypeError()
    }
    if (!detected) throw new UnsupportedFileTypeError()

    if (detected.ext === 'cfb' && /\.doc$/i.test(file.clientName)) {
      return 'application/msword'
    }

    const mimeType = DETECTED_MIME_BY_EXTENSION[detected.ext]
    if (!mimeType) throw new UnsupportedFileTypeError()

    return mimeType
  }

  /**
   * Stocke un fichier uploadé et retourne ses métadonnées pour candidate_documents.
   *
   * `allowedMimeTypes` permet de faire respecter la config `accept` d'un champ
   * de formulaire sur le MIME **détecté**, et non sur le content-type déclaré
   * par le client (qui est falsifiable).
   */
  static async store(
    file: MultipartFile,
    folder: 'cvs' | 'application-documents',
    options: { allowedMimeTypes?: string[] } = {}
  ): Promise<StoredFileInfo> {
    const mimeType = await this.detectMimeType(file)

    if (options.allowedMimeTypes?.length && !options.allowedMimeTypes.includes(mimeType)) {
      throw new UnsupportedFileTypeError()
    }

    const safeName = file.clientName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
    const key = `${folder}/${randomUUID()}-${safeName}`

    await file.moveToDisk(key)

    return {
      key,
      name: file.clientName,
      mimeType,
      size: file.size,
    }
  }

  static async delete(key: string): Promise<void> {
    await drive.use().delete(key)
  }
}
