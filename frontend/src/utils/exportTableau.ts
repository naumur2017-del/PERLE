import { getSession } from '../auth/session'

export type FormatExport = 'csv' | 'xlsx' | 'pdf'

// Données d'un tableau telles qu'affichées à l'écran : le fichier reprend exactement ces valeurs.
export interface TableauExport {
  nom: string          // nom du fichier, sans extension
  titre: string
  periode?: string     // libellé de la période affichée (ex. « Juin 2026 »)
  kpis?: [string, string][]
  colonnes: string[]
  lignes: string[][]
}

const base = () => import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export function telechargerFichier(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nom
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function envoyerRequeteFichier(path: string, body: unknown, nom: string) {
  const response = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Token ${getSession()?.token ?? ''}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Impossible de générer le fichier. Réessayez.')
  telechargerFichier(await response.blob(), nom)
}

export function exporterTableau(format: FormatExport, tableau: TableauExport) {
  return envoyerRequeteFichier('/exports/tableau/', { format, ...tableau }, `${tableau.nom}.${format}`)
}
