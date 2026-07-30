// Jeux de données de démonstration du tableau de bord administrateur PERLE.
// Les séries sont générées de façon déterministe (LCG) afin que la maquette
// reste stable entre deux rendus tout en variant selon la période choisie.

export type PeriodKey = 'today' | '7d' | '30d' | 'custom'
export type Severity = 'critical' | 'high' | 'medium' | 'info'
export type WidgetState = 'ready' | 'loading' | 'empty' | 'error'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Aujourd’hui',
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  custom: 'Période personnalisée',
}

export const REFRESH_LABELS: Record<string, string> = {
  '0': 'Actualisation arrêtée',
  '30': 'Toutes les 30 secondes',
  '60': 'Toutes les minutes',
  '300': 'Toutes les 5 minutes',
}

const seeded = (seed: number) => {
  let state = (seed || 1) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const seedOf = (period: PeriodKey) => ({ today: 17, '7d': 43, '30d': 91, custom: 61 }[period])

/** Libellés de l'axe horizontal : heures pour une journée, jours sinon. */
export function periodBuckets(period: PeriodKey): string[] {
  if (period === 'today') return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`)
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 14
  const today = new Date(2026, 6, 30)
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - i))
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

/** Facteur d'activité : creux la nuit, pics 09h et 14h. */
const hourWeight = (index: number, total: number) => {
  if (total !== 24) return 0.75 + (index % 5) * 0.06
  const h = index
  if (h < 6) return 0.06
  if (h < 8) return 0.35
  if (h < 10) return 1
  if (h < 12) return 0.86
  if (h < 14) return 0.52
  if (h < 17) return 0.92
  if (h < 19) return 0.6
  return 0.18
}

export interface ActivityPoint {
  label: string
  success: number
  failed: number
  uniqueUsers: number
  sessions: number
}

export function activitySeries(period: PeriodKey): ActivityPoint[] {
  const rand = seeded(seedOf(period))
  const labels = periodBuckets(period)
  const scale = period === 'today' ? 1 : 6
  return labels.map((label, index) => {
    const weight = hourWeight(index, labels.length)
    const success = Math.round((4 + rand() * 9) * weight * scale)
    return {
      label,
      success,
      failed: Math.round(rand() * 3 * weight * (scale > 1 ? 2 : 1)),
      uniqueUsers: Math.max(1, Math.round(success * (0.55 + rand() * 0.2))),
      sessions: Math.max(1, Math.round(success * (0.7 + rand() * 0.35))),
    }
  })
}

export interface ErrorPoint {
  label: string
  critical: number
  major: number
  warning: number
  app: number
}

export const ERROR_THRESHOLD = 12

export function errorSeries(period: PeriodKey): ErrorPoint[] {
  const rand = seeded(seedOf(period) + 7)
  const labels = periodBuckets(period)
  const spike = Math.floor(labels.length * 0.62)
  return labels.map((label, index) => {
    const burst = index === spike ? 3.4 : 1
    return {
      label,
      critical: index === spike ? 2 : rand() < 0.12 ? 1 : 0,
      major: Math.round(rand() * 2 * burst),
      warning: Math.round((1 + rand() * 3) * burst),
      app: Math.round((1 + rand() * 4) * burst),
    }
  })
}

/** Index du pic d'erreurs annoté sur le graphique. */
export const errorIncidentIndex = (period: PeriodKey) => Math.floor(periodBuckets(period).length * 0.62)

export interface StorageBreakdown {
  label: string
  usedGo: number
  hint: string
}

export const storage = {
  usedGo: 390,
  totalGo: 500,
  previousUsedGo: 366,
  breakdown: [
    { label: 'Base de données', usedGo: 148, hint: 'PostgreSQL · 42 schémas' },
    { label: 'Pièces jointes', usedGo: 112, hint: '38 240 fichiers' },
    { label: 'Sauvegardes', usedGo: 84, hint: '14 jeux conservés' },
    { label: 'Exports et fichiers temporaires', usedGo: 31, hint: 'Purge automatique à 7 jours' },
    { label: 'Journaux techniques', usedGo: 15, hint: 'Rétention 90 jours' },
  ] as StorageBreakdown[],
}

export const storagePercent = Math.round((storage.usedGo / storage.totalGo) * 100)

export interface CeleryPoint {
  label: string
  done: number
  running: number
  pending: number
  retried: number
  failed: number
}

export function celerySeries(period: PeriodKey): CeleryPoint[] {
  const rand = seeded(seedOf(period) + 21)
  const labels = periodBuckets(period)
  const step = period === 'today' ? 4 : 1
  return labels
    .filter((_, index) => index % step === 0)
    .map((label, index) => {
      const weight = hourWeight(index * step, labels.length)
      return {
        label,
        done: Math.round((18 + rand() * 26) * (period === 'today' ? weight + 0.2 : 1)),
        running: Math.round(rand() * 3),
        pending: Math.round(rand() * 5),
        retried: Math.round(rand() * 2),
        failed: rand() < 0.22 ? 1 : 0,
      }
    })
}

export const celeryStats = {
  successRate: 98.4,
  averageDuration: '4,2 s',
  longestTask: 'export_grand_livre · 3 min 48 s',
  blocked: 1,
}

export interface Backup {
  id: string
  date: string
  time: string
  type: 'Automatique' | 'Manuelle'
  status: 'Réussie' | 'Échouée' | 'En cours'
  duration: string
  sizeGo: number
  restoreTest: string
}

export const backups: Backup[] = [
  { id: 'BK-2026-0724', date: '24/07/2026', time: '03:00', type: 'Automatique', status: 'Réussie', duration: '11 min', sizeGo: 41.2, restoreTest: 'Testée le 12/07' },
  { id: 'BK-2026-0725', date: '25/07/2026', time: '03:00', type: 'Automatique', status: 'Réussie', duration: '12 min', sizeGo: 41.8, restoreTest: 'Non testée' },
  { id: 'BK-2026-0726', date: '26/07/2026', time: '03:00', type: 'Automatique', status: 'Échouée', duration: '2 min', sizeGo: 0, restoreTest: 'Sans objet' },
  { id: 'BK-2026-0727', date: '27/07/2026', time: '03:00', type: 'Automatique', status: 'Réussie', duration: '12 min', sizeGo: 42.1, restoreTest: 'Non testée' },
  { id: 'BK-2026-0728', date: '28/07/2026', time: '14:20', type: 'Manuelle', status: 'Réussie', duration: '13 min', sizeGo: 42.4, restoreTest: 'Non testée' },
  { id: 'BK-2026-0729', date: '29/07/2026', time: '03:00', type: 'Automatique', status: 'Réussie', duration: '12 min', sizeGo: 42.6, restoreTest: 'Non testée' },
  { id: 'BK-2026-0730', date: '30/07/2026', time: '03:00', type: 'Automatique', status: 'Réussie', duration: '12 min', sizeGo: 42.8, restoreTest: 'Non testée' },
]

export const usersByRole = [
  { label: 'Collaborateur', value: 26 },
  { label: 'Manager', value: 12 },
  { label: 'Pilotage', value: 9 },
  { label: 'Trésorerie', value: 5 },
  { label: 'Administrateur', value: 3 },
]

export const usersByStatus = [
  { label: 'Actifs', value: 47 },
  { label: 'Inactifs', value: 4 },
  { label: 'Désactivés', value: 3 },
  { label: 'Verrouillés', value: 1 },
]

export const AUDIT_CATEGORIES = [
  'Comptes',
  'Rôles et permissions',
  'Paramètres globaux',
  'Imports / Exports',
  'Sauvegardes et restaurations',
  'Purges de cache',
] as const

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

export function auditActivitySeries(period: PeriodKey): { label: string; values: Record<AuditCategory, number> }[] {
  const rand = seeded(seedOf(period) + 33)
  const labels = period === 'today' ? periodBuckets('7d') : periodBuckets(period)
  return labels.map((label) => ({
    label,
    values: {
      'Comptes': Math.round(rand() * 4),
      'Rôles et permissions': Math.round(rand() * 3),
      'Paramètres globaux': Math.round(rand() * 2),
      'Imports / Exports': Math.round(rand() * 5),
      'Sauvegardes et restaurations': Math.round(rand() * 2),
      'Purges de cache': rand() < 0.3 ? 1 : 0,
    },
  }))
}

export interface Connection {
  id: string
  datetime: string
  user: string
  email: string
  ip: string
  device: string
  location: string
  result: 'Réussie' | 'Échouée'
  attempts: number
  flags: string[]
}

export const connections: Connection[] = [
  { id: 'CX-1041', datetime: '30/07/2026 09:41', user: 'T. BESSALA', email: 't.bessala@naumur.com', ip: '41.202.219.14', device: 'Chrome 128 · Windows 11', location: 'Douala, CM', result: 'Réussie', attempts: 1, flags: [] },
  { id: 'CX-1040', datetime: '30/07/2026 09:38', user: 'J. EKOUMA', email: 'j.ekouma@naumur.com', ip: '41.202.219.87', device: 'Edge 128 · Windows 11', location: 'Yaoundé, CM', result: 'Réussie', attempts: 1, flags: ['Nouvelle adresse IP'] },
  { id: 'CX-1039', datetime: '30/07/2026 09:12', user: 'A. LAMARE', email: 'a.lamare@naumur.com', ip: '196.44.108.22', device: 'Firefox 130 · Ubuntu', location: 'Inconnue', result: 'Échouée', attempts: 3, flags: ['Échecs répétés', 'Compte verrouillé'] },
  { id: 'CX-1038', datetime: '30/07/2026 08:55', user: 'M. NKOA', email: 'm.nkoa@naumur.com', ip: '41.202.219.14', device: 'Safari 18 · iPhone', location: 'Douala, CM', result: 'Réussie', attempts: 1, flags: [] },
  { id: 'CX-1037', datetime: '30/07/2026 08:31', user: 'H. TSAFFOCK', email: 'h.tsaffock@naumur.com', ip: '102.244.17.9', device: 'Chrome 128 · macOS', location: 'Paris, FR', result: 'Réussie', attempts: 1, flags: ['Connexion inhabituelle', 'Session longue (11 h)'] },
  { id: 'CX-1036', datetime: '30/07/2026 08:04', user: 'B. EDWIGE', email: 'b.edwige@naumur.com', ip: '41.202.219.31', device: 'Chrome 128 · Windows 11', location: 'Douala, CM', result: 'Réussie', attempts: 2, flags: [] },
]

export interface Alert {
  id: string
  severity: Severity
  title: string
  description: string
  datetime: string
  source: string
  status: 'Nouvelle' | 'Prise en charge' | 'Résolue' | 'Ignorée'
  owner: string
}

export const alerts: Alert[] = [
  { id: 'AL-2041', severity: 'critical', title: 'Sauvegarde du 26/07 échouée', description: 'Le job de sauvegarde automatique s’est arrêté après 2 minutes (espace insuffisant sur le volume de destination).', datetime: '26/07/2026 03:02', source: 'Sauvegardes', status: 'Nouvelle', owner: '—' },
  { id: 'AL-2040', severity: 'high', title: 'Stockage utilisé à 78 %', description: '390 Go occupés sur 500 Go. Seuil d’avertissement de 70 % dépassé depuis 6 jours.', datetime: '30/07/2026 06:00', source: 'Infrastructure', status: 'Prise en charge', owner: 'Y. DIEUDONNE' },
  { id: 'AL-2039', severity: 'high', title: '3 échecs de connexion pour A. LAMARE', description: 'Trois tentatives infructueuses en 4 minutes depuis 196.44.108.22. Le compte a été verrouillé automatiquement.', datetime: '30/07/2026 09:12', source: 'Sécurité', status: 'Nouvelle', owner: '—' },
  { id: 'AL-2038', severity: 'medium', title: 'Restauration non testée depuis le 12/07', description: 'Aucun test de restauration n’a été exécuté depuis 18 jours (politique interne : 15 jours).', datetime: '30/07/2026 07:30', source: 'Sauvegardes', status: 'Nouvelle', owner: '—' },
  { id: 'AL-2037', severity: 'medium', title: 'Tâche Celery bloquée', description: 'La tâche export_grand_livre est en cours depuis 47 minutes sans progression.', datetime: '30/07/2026 08:54', source: 'Tâches asynchrones', status: 'Prise en charge', owner: 'S. MBALLA' },
  { id: 'AL-2036', severity: 'medium', title: 'Compte administrateur sans MFA', description: 'Le compte admin.support ne dispose d’aucun second facteur d’authentification.', datetime: '29/07/2026 16:12', source: 'Sécurité', status: 'Nouvelle', owner: '—' },
  { id: 'AL-2035', severity: 'info', title: 'Paramètres sensibles modifiés', description: 'La durée de session a été portée de 4 h à 8 h par Y. DIEUDONNE.', datetime: '29/07/2026 11:48', source: 'Paramètres globaux', status: 'Résolue', owner: 'Y. DIEUDONNE' },
  { id: 'AL-2034', severity: 'info', title: 'Import en erreur (12 lignes rejetées)', description: 'Import du référentiel des grades : 12 lignes rejetées pour code inconnu.', datetime: '28/07/2026 15:02', source: 'Import / Export', status: 'Ignorée', owner: 'J. EKOUMA' },
]

export interface AuditEntry {
  id: string
  date: string
  user: string
  action: string
  entity: string
  summary: string
  ip: string
  sensitivity: 'Élevée' | 'Moyenne' | 'Faible'
  before: string
  after: string
  context: string
  correlationId: string
}

export const auditLog: AuditEntry[] = [
  { id: 'AU-9241', date: '30/07/2026 09:44', user: 'Y. DIEUDONNE', action: 'Modification de rôle', entity: 'Utilisateur · T. BESSALA', summary: 'Rôle Manager → Pilotage', ip: '41.202.219.14', sensitivity: 'Élevée', before: 'Rôle : Manager', after: 'Rôle : Pilotage', context: 'Promotion validée par la direction (ticket RH-2231).', correlationId: 'c8f1-77ad-4b02' },
  { id: 'AU-9240', date: '30/07/2026 09:20', user: 'Système', action: 'Verrouillage de compte', entity: 'Utilisateur · A. LAMARE', summary: 'Compte verrouillé après 3 échecs', ip: '196.44.108.22', sensitivity: 'Élevée', before: 'Statut : Actif', after: 'Statut : Verrouillé', context: 'Politique de sécurité : 3 échecs en moins de 5 minutes.', correlationId: 'a041-2c9e-88bd' },
  { id: 'AU-9239', date: '30/07/2026 08:12', user: 'S. MBALLA', action: 'Purge de cache', entity: 'Système · Cache applicatif', summary: 'Purge complète (référentiels)', ip: '41.202.219.52', sensitivity: 'Moyenne', before: '2 148 clés en cache', after: '0 clé en cache', context: 'Référentiels obsolètes après import.', correlationId: '5db3-1f4a-90c1' },
  { id: 'AU-9238', date: '29/07/2026 17:35', user: 'Y. DIEUDONNE', action: 'Modification de permission', entity: 'Rôle · Trésorerie', summary: 'Ajout de « Valider un paiement »', ip: '41.202.219.14', sensitivity: 'Élevée', before: 'Permissions : 14', after: 'Permissions : 15', context: 'Demande de la direction financière.', correlationId: '7e2c-4aa9-11f6' },
  { id: 'AU-9237', date: '29/07/2026 16:12', user: 'Y. DIEUDONNE', action: 'Création de compte', entity: 'Utilisateur · admin.support', summary: 'Compte administrateur créé', ip: '41.202.219.14', sensitivity: 'Élevée', before: '—', after: 'Compte actif, MFA non configuré', context: 'Compte de support temporaire.', correlationId: '2b90-6cd1-3fa7' },
  { id: 'AU-9236', date: '29/07/2026 11:48', user: 'Y. DIEUDONNE', action: 'Modification de paramètre global', entity: 'Paramètre · Durée de session', summary: 'Durée de session 4 h → 8 h', ip: '41.202.219.14', sensitivity: 'Élevée', before: '4 heures', after: '8 heures', context: 'Demande des équipes terrain.', correlationId: 'ef55-0b23-77ce' },
  { id: 'AU-9235', date: '28/07/2026 15:02', user: 'J. EKOUMA', action: 'Import', entity: 'Référentiel · Grades', summary: '128 lignes importées, 12 rejetées', ip: '41.202.219.87', sensitivity: 'Moyenne', before: '96 grades', after: '212 grades', context: 'Import annuel du référentiel des grades.', correlationId: '9a17-58ee-4c30' },
  { id: 'AU-9234', date: '28/07/2026 14:20', user: 'S. MBALLA', action: 'Sauvegarde manuelle', entity: 'Système · Sauvegarde BK-2026-0728', summary: 'Sauvegarde manuelle réussie (42,4 Go)', ip: '41.202.219.52', sensitivity: 'Moyenne', before: 'Dernière sauvegarde : 27/07 03:00', after: 'Dernière sauvegarde : 28/07 14:20', context: 'Avant migration du module Trésorerie.', correlationId: 'd3b8-9017-2ea5' },
  { id: 'AU-9233', date: '27/07/2026 10:05', user: 'Y. DIEUDONNE', action: 'Export', entity: 'Journal d’audit', summary: 'Export CSV de 1 240 événements', ip: '41.202.219.14', sensitivity: 'Moyenne', before: '—', after: 'Fichier audit_2026-07.csv', context: 'Revue de conformité trimestrielle.', correlationId: '6f24-ac80-1b99' },
  { id: 'AU-9232', date: '26/07/2026 09:15', user: 'Y. DIEUDONNE', action: 'Désactivation de compte', entity: 'Utilisateur · P. NGOMA', summary: 'Compte désactivé (départ)', ip: '41.202.219.14', sensitivity: 'Élevée', before: 'Statut : Actif', after: 'Statut : Désactivé', context: 'Fin de contrat au 25/07/2026.', correlationId: '1c7d-33b5-05af' },
]

export const kpiSnapshot = {
  activeUsers: 47,
  activeUsersDelta: 4,
  totalAccounts: 55,
  disabledAccounts: 3,
  sessions: 12,
  uniqueConnected: 11,
  sessionPeak: 19,
  errors24h: 3,
  errorsCritical: 0,
  errorsMajor: 1,
  errorsMinor: 2,
  errorsDelta: -2,
  lastBackup: '30/07/2026 03:00',
  lastBackupStatus: 'Réussie' as const,
  lastBackupSizeGo: 42.8,
  sinceLastBackup: '6 h 41 min',
  celeryRunning: 2,
  celeryPending: 5,
  celeryFailed: 1,
  celeryAverage: '4,2 s',
  systemStatus: 'Opérationnel' as 'Opérationnel' | 'Dégradé' | 'Critique',
  availability: '99,96 %',
  responseTime: '212 ms',
}
