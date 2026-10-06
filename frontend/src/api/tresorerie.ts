import { apiGet, apiPost, apiPostUpload, ApiError } from './client'
import { getSession } from '../auth/session'

export interface CompteTresorerie {
  id: number
  nom: string
  code: string
  sous_libelle: string
  solde_initial: number
  solde_actuel: number
  created_at: string
}

export interface MouvementTresorerie {
  id: number
  reference: string
  created_at: string
  compte: number
  compte_nom: string
  compte_code: string
  type_mouvement: 'Entrée' | 'Sortie'
  nature: 'Approvisionnement' | 'Paiement'
  libelle: string
  montant: number
  // Entrée : la structure elle-même. Sortie : le fournisseur payé.
  beneficiaire: string
  // Origine des fonds d'un approvisionnement (vide pour un paiement).
  origine: string
  projet: number | null
  projet_code: string
  projet_nom: string
  initiateur_nom: string
  executeur_nom: string
  justificatif_nom: string
}

export type CompteForm = Pick<CompteTresorerie, 'nom' | 'code' | 'sous_libelle' | 'solde_initial'>

export interface RapprovisionnementForm {
  montant: number
  libelle: string
  source: string
  justificatif: File | null
}

export const fetchComptes = () => apiGet<CompteTresorerie[]>('/tresorerie/comptes/')
export const createCompte = (data: CompteForm) => apiPost<CompteTresorerie>('/tresorerie/comptes/', data)
export const fetchMouvements = () => apiGet<MouvementTresorerie[]>('/tresorerie/mouvements/')

export const rapprovisionnerCompte = (id: number, data: RapprovisionnementForm) => {
  const formData = new FormData()
  formData.append('montant', String(data.montant))
  formData.append('libelle', data.libelle)
  if (data.source) formData.append('source', data.source)
  if (data.justificatif) formData.append('justificatif', data.justificatif)
  return apiPostUpload<MouvementTresorerie>(`/tresorerie/comptes/${id}/rapprovisionner/`, formData)
}

export function tresorerieError(error: unknown): string {
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

export type FormatExport = 'csv' | 'xlsx' | 'pdf'

// Télécharge le journal de la période pour les mouvements affichés dans le tableau (filtres appliqués).
export async function exporterJournal(format: FormatExport, dateDebut: string, dateFin: string, mouvementIds: number[]) {
  const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
  const response = await fetch(`${base}/tresorerie/journal/export/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Token ${getSession()?.token ?? ''}` },
    body: JSON.stringify({ format, date_debut: dateDebut, date_fin: dateFin, mouvement_ids: mouvementIds }),
  })
  if (!response.ok) throw new Error('Impossible d’exporter le journal. Vérifiez la période puis réessayez.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = `journal-tresorerie_${dateDebut}_${dateFin}.${format}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
