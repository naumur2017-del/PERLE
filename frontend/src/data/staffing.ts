export type AffectationStatut = 'en-attente' | 'en-cours' | 'termine'

export interface Affectation {
  id: string
  collaborateur: string
  collaborateurProfil: string
  heures: number
  staffeLe: string
  statut: AffectationStatut
}

export interface TacheWrike {
  id: string
  projet: string
  tache: string
  equipe: string
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  creeLe: string
  echeance: string
  ligneBudgetaire: string
  ehsPrevu: number
  affectations: Affectation[]
}

export const COLLABORATEURS = [
  { nom: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', equipe: 'BO1 - Back Office 1' },
  { nom: 'Belomo Edwige', profil: 'Analyste Financier', equipe: 'BO1 - Back Office 1' },
  { nom: 'Essogo Erine', profil: 'Analyste Financier', equipe: 'BO1 - Back Office 1' },
  { nom: 'Pamella Guebediang', profil: 'Contrôleur de gestion', equipe: 'MO1 - Middle Office 1' },
  { nom: 'Herman Tsaffock', profil: 'Analyste Financier', equipe: 'MO1 - Middle Office 1' },
  { nom: 'Mbarga Thibaut', profil: 'Opérateur ERP', equipe: 'OP1 - Opérations 1' },
  { nom: 'Théodore Bessala', profil: 'Chef de projet', equipe: 'PI1 - Pilotage 1' },
  { nom: 'Brayan Ebongue', profil: 'Développeur Senior', equipe: 'IT1 - Développement 1' },
]

export const TACHES_INITIAL: TacheWrike[] = [
  { id: 'WRK-1442', projet: 'ERP Academy', tache: 'Cartographie des processus', equipe: 'MO1 - Middle Office 1', priorite: 'Moyenne', creeLe: '02/05/2025', echeance: '18/05/2025', ligneBudgetaire: 'Consultation externe', ehsPrevu: 12, affectations: [] },
  { id: 'WRK-1443', projet: 'Mission Audit Interne', tache: 'Revue des contrôles internes', equipe: 'BO1 - Back Office 1', priorite: 'Haute', creeLe: '03/05/2025', echeance: '22/05/2025', ligneBudgetaire: 'Déplacement terrain', ehsPrevu: 20, affectations: [] },
  { id: 'WRK-1444', projet: 'Digitalisation RH', tache: 'Paramétrage du SIRH', equipe: 'IT1 - Développement 1', priorite: 'Basse', creeLe: '04/05/2025', echeance: '28/05/2025', ligneBudgetaire: 'Formation équipe', ehsPrevu: 8, affectations: [] },
  { id: 'WRK-1445', projet: 'Étude de faisabilité usine', tache: 'Analyse des coûts', equipe: 'PI1 - Pilotage 1', priorite: 'Moyenne', creeLe: '05/05/2025', echeance: '02/06/2025', ligneBudgetaire: 'Achat matériel', ehsPrevu: 15, affectations: [] },
  { id: 'WRK-1446', projet: 'ERP Academy', tache: "Tests d'intégration module RH", equipe: 'IT1 - Développement 1', priorite: 'Haute', creeLe: '06/05/2025', echeance: '10/06/2025', ligneBudgetaire: 'Support technique', ehsPrevu: 10, affectations: [] },
]

export const STATUT_AFFECTATION_LABEL: Record<AffectationStatut, string> = { 'en-attente': 'En attente', 'en-cours': 'En cours', termine: 'Terminé' }
export const STATUT_AFFECTATION_CLASS: Record<AffectationStatut, string> = { 'en-attente': 'orange', 'en-cours': 'blue', termine: 'green' }

export function initiales(nom: string) {
  return nom.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

export const fmtHeures = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
