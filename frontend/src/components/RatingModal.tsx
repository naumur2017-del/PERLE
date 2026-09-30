// Modale « Noter ce staffing » — partagée entre Suivi des staffings (SuiviStaffingPage) et
// Nouveau staffing (StaffingPage, onglets En revue/Terminées) : une fois l'exécution d'une
// personne terminée, son manager la note (1 à 5 étoiles, commentaire facultatif) via
// rateTaskAssignment. Réutilise les classes su-rating-* (SuiviStaffingPage.css, chargée
// globalement) pour rester visuellement cohérent partout où cette modale apparaît.
import { useState } from 'react'
import { Star, X } from 'lucide-react'
import type { TaskAssignment } from '../api/taskAssignments'
import { ApiError } from '../api/client'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

export default function RatingModal({ assignment, onClose, onSubmit }: {
  assignment: TaskAssignment
  onClose: () => void
  onSubmit: (note: number, commentaire: string) => Promise<void>
}) {
  const [note, setNote] = useState(assignment.note ?? 0)
  const [hovered, setHovered] = useState(0)
  const [commentaire, setCommentaire] = useState(assignment.note_commentaire)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (note < 1) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(note, commentaire.trim())
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Noter le staffing" onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>Noter ce staffing</h3>
            <p className="ge-modal-subtitle">{assignment.user_nom} — {assignment.task_code} · {assignment.template_nom}</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>

        <div className="param-form">
          {error && <p className="ge-form-error">{error}</p>}

          <div className="su-rating-stars su-rating-stars-input">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button" key={value} className="su-rating-star-btn"
                aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                onMouseEnter={() => setHovered(value)} onMouseLeave={() => setHovered(0)}
                onClick={() => setNote(value)}
              >
                <Star size={22} className={(hovered || note) >= value ? 'is-filled' : ''} />
              </button>
            ))}
          </div>

          <label className="param-field">Commentaire (facultatif)
            <textarea rows={3} value={commentaire} placeholder="Retour sur la réalisation de cette tâche..." onChange={(event) => setCommentaire(event.target.value)} />
          </label>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="button" className="ge-btn-primary" disabled={note < 1 || saving} onClick={handleSubmit}>{saving ? 'Enregistrement…' : 'Enregistrer la note'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
