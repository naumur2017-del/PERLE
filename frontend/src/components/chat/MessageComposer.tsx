import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText, Mic, Paperclip, Send, Square, X } from 'lucide-react'
import { ApiError } from '../../api/client'
import './MessageComposer.css'

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
  return "Impossible d'envoyer le message."
}

type PreviewKind = 'image' | 'video' | 'audio' | 'file'

interface MessageComposerProps {
  onSend: (contenu: string, attachment?: File) => Promise<void>
  placeholder?: string
  /** Appelé à chaque frappe (pas throttlé ici — c'est à l'appelant de limiter la fréquence des
   * appels réseau réels, voir TaskDetailModal/MessagingPage) pour signaler « en train
   * d'écrire » aux autres participants du fil. */
  onTyping?: () => void
  /** Noms complets qu'on peut taguer avec « @ » dans ce fil (ex. les personnes engagées sur la
   * tâche, voir TaskDetailModal) — absent (donc `undefined`) là où le tag n'a pas de sens, comme
   * la Messagerie 1-à-1 (MessagingPage), qui n'en passe pas. */
  mentionCandidates?: string[]
}

/** Fragment en cours de frappe après le dernier « @ » précédant le curseur, et sa position dans
 * le texte — `null` si le curseur n'est pas dans un tag en cours (pas de « @ » avant lui sur la
 * même ligne, ou fragment trop long pour être un nom). */
function activeMentionFragment(text: string, caret: number): { start: number; fragment: string } | null {
  const uptoCaret = text.slice(0, caret)
  const atIndex = uptoCaret.lastIndexOf('@')
  if (atIndex === -1) return null
  const fragment = uptoCaret.slice(atIndex + 1)
  if (fragment.includes('\n') || fragment.length > 40) return null
  return { start: atIndex, fragment }
}

const fmtRecordTime = (totalSeconds: number) =>
  `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`

/** Composeur de message partagé par la discussion de tâche et la Messagerie : texte, pièce
 * jointe image/vidéo avec prévisualisation avant envoi, et note vocale enregistrée directement
 * dans le navigateur (MediaRecorder) — même design et mêmes animations aux deux endroits. */
export function MessageComposer({ onSend, placeholder, onTyping, mentionCandidates }: MessageComposerProps) {
  const [draft, setDraft] = useState('')
  // Tag « @Prénom Nom » en cours de frappe : `mentionStart` est la position du « @ » dans `draft`,
  // `mentionMatches` la liste filtrée affichée dans le menu, `mentionIndex` l'entrée surlignée
  // (flèches haut/bas) — `null`/vide tant qu'on n'est pas en train d'en taper un.
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [mentionMatches, setMentionMatches] = useState<string[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<PreviewKind | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Coupe proprement le micro et l'intervalle si le composant se démonte pendant un enregistrement.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (recordIntervalRef.current) window.clearInterval(recordIntervalRef.current)
  }, [])

  const clearPending = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
    setPreviewKind(null)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    clearPending()
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setPreviewKind(
      file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('audio/') ? 'audio'
            : 'file'
    )
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `note-vocale-${Date.now()}.webm`, { type: 'audio/webm' })
        clearPending()
        setPendingFile(file)
        setPreviewUrl(URL.createObjectURL(blob))
        setPreviewKind('audio')
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordIntervalRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      setError("Impossible d'accéder au microphone — vérifiez les autorisations du navigateur.")
    }
  }

  const stopRecordingAndKeep = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (recordIntervalRef.current) { window.clearInterval(recordIntervalRef.current); recordIntervalRef.current = null }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setRecording(false)
    if (recordIntervalRef.current) { window.clearInterval(recordIntervalRef.current); recordIntervalRef.current = null }
  }

  const closeMentionMenu = () => { setMentionStart(null); setMentionMatches([]); setMentionIndex(0) }

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setDraft(value)
    onTyping?.()
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }

    if (mentionCandidates && mentionCandidates.length > 0) {
      const active = activeMentionFragment(value, event.target.selectionStart)
      const matches = active
        ? mentionCandidates.filter((name) => name.toLowerCase().startsWith(active.fragment.toLowerCase()))
        : []
      if (active && matches.length > 0) {
        setMentionStart(active.start)
        setMentionMatches(matches)
        setMentionIndex(0)
      } else {
        closeMentionMenu()
      }
    }
  }

  const selectMention = (name: string) => {
    if (mentionStart === null) return
    const caret = textareaRef.current?.selectionStart ?? draft.length
    const next = `${draft.slice(0, mentionStart)}@${name} ${draft.slice(caret)}`
    setDraft(next)
    closeMentionMenu()
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      const pos = mentionStart + name.length + 2
      el.setSelectionRange(pos, pos)
    })
  }

  const handleSend = async () => {
    const contenu = draft.trim()
    if (!contenu && !pendingFile) return
    if (sending) return
    setSending(true)
    setError(null)
    try {
      await onSend(contenu, pendingFile ?? undefined)
      setDraft('')
      closeMentionMenu()
      clearPending()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionStart !== null && mentionMatches.length > 0) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setMentionIndex((i) => (i + 1) % mentionMatches.length); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return }
      if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); selectMention(mentionMatches[mentionIndex]); return }
      if (event.key === 'Escape') { event.preventDefault(); closeMentionMenu(); return }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="mc-composer">
      {error && <p className="mc-error">{error}</p>}

      {mentionStart !== null && mentionMatches.length > 0 && (
        <ul className="mc-mention-menu" role="listbox">
          {mentionMatches.map((name, index) => (
            <li
              key={name} role="option" aria-selected={index === mentionIndex}
              className={index === mentionIndex ? 'is-active' : ''}
              onMouseEnter={() => setMentionIndex(index)}
              onMouseDown={(event) => { event.preventDefault(); selectMention(name) }}
            >
              @{name}
            </li>
          ))}
        </ul>
      )}

      {previewUrl && previewKind && (
        <div className="mc-preview">
          {previewKind === 'image' && <img src={previewUrl} alt="Aperçu" />}
          {previewKind === 'video' && <video src={previewUrl} controls />}
          {previewKind === 'audio' && <audio src={previewUrl} controls />}
          {previewKind === 'file' && (
            <span className="mc-preview-file"><FileText size={18} />{pendingFile?.name}</span>
          )}
          <button type="button" className="mc-preview-remove" onClick={clearPending} aria-label="Retirer la pièce jointe" disabled={sending}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={`mc-row ${recording ? 'mc-row-recording' : ''}`}>
        {recording ? (
          <div className="mc-recording">
            <span className="mc-recording-dot" />
            <span className="mc-recording-time">Enregistrement… {fmtRecordTime(recordSeconds)}</span>
            <button type="button" className="mc-recording-cancel" onClick={cancelRecording}>Annuler</button>
            <button type="button" className="mc-recording-stop" onClick={stopRecordingAndKeep}><Square size={11} />Arrêter</button>
          </div>
        ) : (
          <>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
            <button
              type="button" className="mc-icon-btn" title="Joindre un fichier (image, vidéo, document…)"
              aria-label="Joindre un fichier" onClick={() => fileInputRef.current?.click()} disabled={sending}
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={placeholder ?? 'Écrire un message…'}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              type="button" className="mc-icon-btn" title="Message vocal" aria-label="Enregistrer un message vocal"
              onClick={() => void startRecording()} disabled={sending}
            >
              <Mic size={18} />
            </button>
            <button
              type="button" className="mc-send-btn" disabled={sending || (!draft.trim() && !pendingFile)}
              onClick={() => void handleSend()} aria-label="Envoyer"
            >
              <Send size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
