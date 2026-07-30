// Utilitaires propres au tableau de bord administrateur.
// Les outils communs à tous les graphiques vivent dans components/dashboard/chartTools.

import { useTooltip as useBaseTooltip } from '../dashboard/chartTools'
import type { Severity } from './adminData'

export const SEVERITY_META: Record<Severity, { label: string; icon: string }> = {
  critical: { label: 'Critique', icon: '⛔' },
  high: { label: 'Élevé', icon: '▲' },
  medium: { label: 'Moyen', icon: '◆' },
  info: { label: 'Information', icon: 'ⓘ' },
}

/** Infobulle de graphique habillée aux styles de l'espace d'administration. */
export function useTooltip() {
  const { show, hide, tip } = useBaseTooltip('.adm-chart-host')
  const node = tip
    ? <div className="adm-tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">{tip.content}</div>
    : null
  return { show, hide, node }
}
