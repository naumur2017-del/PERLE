import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPostUpload } from './client'
import { getSession } from '../auth/session'

export interface Paiement {
  id: number
  numero: string
  paiement_numero: string
  projet: number | null
  projet_nom: string
  ligne_budgetaire: number | null
  ligne_budgetaire_nom: string
  fournisseur: string
  type_depense: string
  montant: number
  devise: string
  date_depense: string | null
  objet: string
  commentaires: string
  mode_paiement: string
  statut: 'brouillon' | 'attente' | 'execute' | 'refuse'
  statut_libelle: string
  initie_par: string
  commentaire_execution: string
  justificatif_nom: string
  decided_at: string | null
  created_at: string
  updated_at: string
}

export type PaiementForm = Pick<Paiement, 'projet' | 'ligne_budgetaire' | 'fournisseur' | 'type_depense' | 'montant' | 'date_depense' | 'objet' | 'commentaires'> & { statut: 'brouillon' | 'attente' }
export const fetchPaiements = () => apiGet<Paiement[]>('/paiements/')
export const createPaiement = (data: PaiementForm) => apiPost<Paiement>('/paiements/', data)
export const updatePaiement = (id: number, data: PaiementForm) => apiPatch<Paiement>(`/paiements/${id}/`, data)
export const deletePaiement = (id: number) => apiDelete(`/paiements/${id}/`)
export const decidePaiement = (id: number, decision: 'accepte' | 'refuse', commentaire: string, fichier: File | null, mode: string) => {
  const data = new FormData()
  data.append('decision', decision)
  data.append('commentaire', commentaire)
  if (mode) data.append('mode_paiement', mode)
  if (fichier) data.append('fichier', fichier)
  return apiPostUpload<Paiement>(`/paiements/${id}/decision/`, data)
}

export async function downloadJustificatif(paiement: Paiement) {
  const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
  const response = await fetch(`${base}/paiements/${paiement.id}/justificatif/`, {
    headers: { Authorization: `Token ${getSession()?.token ?? ''}` },
  })
  if (!response.ok) throw new Error('Impossible de télécharger le justificatif.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = paiement.justificatif_nom
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function paiementError(error: unknown): string {
  if (error instanceof ApiError && error.payload) {
    const flatten = (value: unknown): string => {
      if (Array.isArray(value)) return value.map(flatten).join(' ')
      if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key === 'detail' || key === 'non_field_errors' ? '' : `${key} : `}${flatten(item)}`).join(' ')
      return String(value)
    }
    return flatten(error.payload)
  }
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

export const paiementDate = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : '—'
