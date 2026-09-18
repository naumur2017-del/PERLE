import { apiDelete, apiGet, apiPatch, apiPost, apiPostUpload } from './client'
import { getSession } from '../auth/session'

export interface LigneBudgetaire {
  id: number
  code: string
  nom: string
  niveau: 1 | 2 | 3
  parent: number | null
  equipe: number
  equipe_nom: string
  equipe_code: string
  declinaison: string
  montant_prevu: number | null
  actif: boolean
  /** Ligne « Charges transversales » créée automatiquement pour l'équipe Ressources — non éditable. */
  is_transversale: boolean
  created_at: string
}

export const fetchLignesBudgetaires = () => apiGet<LigneBudgetaire[]>('/architecture-monetaire/lignes/')

export const createLigneBudgetaire = (data: { code: string; nom: string; equipe: number; declinaison?: string; montant_prevu?: number | null; parent?: number | null }) =>
  apiPost<LigneBudgetaire>('/architecture-monetaire/lignes/', data)

export const updateLigneBudgetaire = (id: number, data: Partial<{ nom: string; equipe: number; declinaison: string; montant_prevu: number | null; actif: boolean }>) =>
  apiPatch<LigneBudgetaire>(`/architecture-monetaire/lignes/${id}/`, data)

export const deleteLigneBudgetaire = (id: number) => apiDelete(`/architecture-monetaire/lignes/${id}/`)

export interface ImportRowError { ligne: number; code: string; erreurs: Record<string, unknown> }
export interface ImportResult { created: number; errors: ImportRowError[]; items: LigneBudgetaire[] }

export const importLignesBudgetaires = (file: File): Promise<ImportResult> => {
  const data = new FormData()
  data.append('file', file)
  return apiPostUpload<ImportResult>('/architecture-monetaire/lignes/import/', data)
}

/** Télécharge le modèle Excel vierge (avec exemples) pour l'import de l'architecture monétaire. */
export async function downloadLigneBudgetaireModele() {
  const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
  const response = await fetch(`${base}/architecture-monetaire/lignes/import/`, {
    headers: { Authorization: `Token ${getSession()?.token ?? ''}` },
  })
  if (!response.ok) throw new Error('Impossible de télécharger le modèle.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'architecture-monetaire-modele.xlsx'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
