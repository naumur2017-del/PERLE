import { ChevronDown, ChevronUp } from 'lucide-react'
import './KpiVisibilityToggle.css'

/** Bouton « Masquer/Afficher les indicateurs » — même comportement partout où une page affiche
 * des KPI/indicateurs (voir useKpiVisibility) : un seul composant pour rester visuellement et
 * fonctionnellement identique d'une page à l'autre. */
export default function KpiVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="kvt-btn" onClick={onToggle}>
      {visible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {visible ? 'Masquer les indicateurs' : 'Afficher les indicateurs'}
    </button>
  )
}
