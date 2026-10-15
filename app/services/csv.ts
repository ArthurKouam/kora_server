/**
 * Génération de CSV — RFC 4180.
 *
 * Le point qui casse tout si on l'ignore : un nom de candidat ou une lettre de
 * motivation contenant une virgule, un point-virgule, un guillemet ou un
 * retour à la ligne décale toutes les colonnes. Un candidat nommé
 * `Nguyen; Thuy` casserait l'alignement du fichier entier.
 */

/** Neutralise les séparateurs et les retours à la ligne, et neutralise le CSV de formule. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  let text = value instanceof Date ? value.toISOString() : String(value)
  text = text.replace(/\r?\n/g, ' ')

  // Un champ commençant par =, +, -, @ ou suivi de tab est interprété comme
  // une formule par Excel : on préfixe d'une apostrophe.
  if (/^[=+\-@\t]/.test(text)) {
    text = `'${text}`
  }

  if (/[",;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

/**
 * `delimiter: ';'` : séparateur attendu par Excel en locale française, qui
 * ouvre un CSV UTF-8 par défaut avec un point-virgule. À garder aligné sur
 * le BOM UTF-8 écrit par le contrôleur.
 */
export function buildCsv(headers: string[], rows: unknown[][], delimiter = ';'): string {
  const lines: string[] = []

  lines.push(headers.map((header) => escapeCell(header)).join(delimiter))

  for (const row of rows) {
    lines.push(row.map((cell) => escapeCell(cell)).join(delimiter))
  }

  return lines.join('\r\n')
}

/**
 * BOM UTF-8 : sans lui, Excel affiche « IngÃ©nieur ». Indispensable vu que
 * nos données contiennent des accents.
 */
export const UTF8_BOM = '\uFEFF'
