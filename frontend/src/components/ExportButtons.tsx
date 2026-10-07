import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, Printer } from 'lucide-react'
import { exporterTableau, type FormatExport, type TableauExport } from '../utils/exportTableau'
import './ExportButtons.css'

const NOMBRE = /^[-+]?[\d\s.,]+%?$/

// Rapport imprimé : même contenu que le fichier exporté (titre, période, KPI, lignes affichées).
// Rendu hors de l'application et masqué à l'écran ; seul il sort à l'impression, au format A4.
function RapportImprime({ tableau }: { tableau: TableauExport }) {
  return (
    <div className="rapport-print">
      <h1>{tableau.titre}</h1>
      {tableau.periode && <p className="rapport-periode">{tableau.periode}</p>}
      {tableau.kpis && tableau.kpis.length > 0 && (
        <div className="rapport-kpis">
          {tableau.kpis.map(([label, valeur]) => <span key={label}><strong>{label} :</strong> {valeur}</span>)}
        </div>
      )}
      <table>
        <thead>
          <tr>{tableau.colonnes.map((titre) => <th key={titre}>{titre}</th>)}</tr>
        </thead>
        <tbody>
          {tableau.lignes.map((ligne, i) => (
            <tr key={i}>
              {ligne.map((valeur, j) => (
                <td key={j} className={NOMBRE.test(valeur) && /\d/.test(valeur) ? 'num' : undefined}>{valeur}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FORMATS: { format: FormatExport; label: string }[] = [
  { format: 'pdf', label: 'Exporter en PDF' },
  { format: 'xlsx', label: 'Exporter en Excel' },
  { format: 'csv', label: 'Exporter en CSV' },
]

// Boutons Exporter (PDF, Excel, CSV) et Imprimer, identiques sur toutes les pages : ils travaillent
// sur le tableau tel qu'il est affiché (filtres et période appliqués).
export default function ExportButtons({ tableau, disabled = false, className = 'export-btn', avecImpression = true, exporterPdf }: {
  tableau: TableauExport
  disabled?: boolean
  className?: string
  // false quand la page propose déjà sa propre impression (ex. organigramme).
  avecImpression?: boolean
  // Remplace l'export PDF du tableau quand la page exporte autre chose (ex. le schéma de l'organigramme).
  exporterPdf?: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const lancer = async (format: FormatExport) => {
    setOpen(false)
    if (busy) return
    setBusy(true); setError('')
    try {
      if (format === 'pdf' && exporterPdf) await exporterPdf()
      else await exporterTableau(format, tableau)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="export-wrap">
        <button type="button" className={className} disabled={disabled || busy} onClick={() => setOpen((o) => !o)}>
          <Download size={14} />{busy ? 'Export…' : 'Exporter'}<ChevronDown size={12} />
        </button>
        {open && (
          <ul className="export-menu" onMouseLeave={() => setOpen(false)}>
            {FORMATS.map((f) => <li key={f.format}><button type="button" onClick={() => void lancer(f.format)}>{f.label}</button></li>)}
          </ul>
        )}
      </div>
      {avecImpression && (
        <button type="button" className={className} disabled={disabled} onClick={() => window.print()}>
          <Printer size={14} />Imprimer
        </button>
      )}
      {error && <span role="alert" className="export-error">{error}</span>}
      {avecImpression && createPortal(
        <div id="rapport-print-root"><RapportImprime tableau={tableau} /></div>,
        document.body,
      )}
    </>
  )
}
