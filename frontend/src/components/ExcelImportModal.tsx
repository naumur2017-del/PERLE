import { useState, type ChangeEvent } from 'react'
import { Download, UploadCloud, X } from 'lucide-react'
import './ExcelImportModal.css'

export interface ImportRowError { ligne: number; code: string; erreurs: Record<string, unknown> }
export interface ImportRowWarning { ligne: number; code: string; message: string }
export interface ImportResult { created: number; errors: ImportRowError[]; avertissements?: ImportRowWarning[]; items: unknown[] }

function formatRowError(erreurs: Record<string, unknown>): string {
  return Object.entries(erreurs)
    .map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value)
      return field === 'detail' ? text : `${field} : ${text}`
    })
    .join(' · ')
}

/** Modale générique « Importer depuis Excel » pour les pages Architecture : télécharge un
 * modèle .xlsx (avec exemples) puis importe le classeur rempli, en affichant le nombre
 * d'éléments créés et le détail des lignes en erreur. `onImported` ne se déclenche qu'après au
 * moins une création réussie, pour rafraîchir la liste côté appelant. */
export default function ExcelImportModal({ title, hint, onDownloadModele, onImport, onClose, onImported }: {
  title: string
  hint: string
  onDownloadModele: () => Promise<void>
  onImport: (file: File) => Promise<ImportResult>
  onClose: () => void
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setResult(null)
    setError(null)
  }

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      await onDownloadModele()
    } catch {
      setError('Impossible de télécharger le modèle.')
    } finally {
      setDownloading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError(null)
    try {
      const res = await onImport(file)
      setResult(res)
      if (res.created > 0) onImported()
    } catch {
      setError('L’import a échoué : vérifiez que le fichier est bien un classeur Excel (.xlsx).')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={() => { if (!importing) onClose() }}>
      <div className="ge-modal param-modal excel-import-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{title}</h3>
            <p className="ge-modal-subtitle">{hint}</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={importing}><X size={16} /></button>
        </div>

        <div className="param-form">
          {error && <p className="ge-form-error">{error}</p>}

          <button type="button" className="ge-btn-outline" onClick={handleDownload} disabled={downloading}>
            <Download size={14} />{downloading ? 'Téléchargement…' : 'Télécharger le modèle Excel'}
          </button>

          <label className="param-field">Fichier Excel rempli (.xlsx)
            <span className="excel-import-file">
              <input type="file" accept=".xlsx,.xlsm" onChange={handleFileChange} />
            </span>
          </label>

          {result && (
            <div className="excel-import-summary">
              <strong>{result.created}</strong> élément{result.created > 1 ? 's' : ''} importé{result.created > 1 ? 's' : ''} avec succès.
              {result.avertissements && result.avertissements.length > 0 && (
                <ul className="excel-import-warnings">
                  {result.avertissements.map((warning, index) => (
                    <li key={index}>Ligne {warning.ligne}{warning.code ? ` (${warning.code})` : ''} : {warning.message}</li>
                  ))}
                </ul>
              )}
              {result.errors.length > 0 && (
                <ul className="excel-import-errors">
                  {result.errors.map((rowError, index) => (
                    <li key={index}>Ligne {rowError.ligne}{rowError.code ? ` (${rowError.code})` : ''} : {formatRowError(rowError.erreurs)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={importing}>Fermer</button>
            <button type="button" className="ge-btn-primary" onClick={handleImport} disabled={!file || importing}>
              <UploadCloud size={14} />{importing ? 'Import en cours…' : 'Importer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
