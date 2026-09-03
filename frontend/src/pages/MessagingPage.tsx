import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, MessageSquare, Search, Users, UsersRound, X } from 'lucide-react'
import { fetchEmployees, fetchMe, type Employee } from '../api/employees'
import {
  createGroupConversation, deleteConversationMessage, editConversationMessage, fetchConversationMessages,
  fetchConversationTyping, fetchConversations, markConversationRead, sendConversationMessage, sendConversationTyping,
  startConversation, type ConversationSummary, type DirectMessage,
} from '../api/conversations'
import { ApiError } from '../api/client'
import { MessageBubble } from '../components/chat/MessageBubble'
import { MessageComposer } from '../components/chat/MessageComposer'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { useTypingSignal } from '../hooks/useTypingSignal'
import './MessagingPage.css'

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

const initiales = (nom: string) => nom.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const fmtListTime = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const attachmentPreviewLabel: Record<string, string> = {
  image: '📷 Photo', video: '🎬 Vidéo', audio: '🎤 Message vocal', fichier: '📎 Fichier',
}

// Sondages discrets pour que la liste des conversations (aperçu, ordre, voyants « non lu »), le
// fil ouvert et l'indicateur « en train d'écrire » restent à jour sans intervention — pas de
// websocket dans ce projet.
const LIST_POLL_MS = 15000
const THREAD_POLL_MS = 6000
const TYPING_POLL_MS = 2500

function GroupCreateModal({ employees, onClose, onCreated }: {
  employees: Employee[]
  onClose: () => void
  onCreated: (conversation: ConversationSummary) => void
}) {
  const [nom, setNom] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!nom.trim() || selected.size < 2) return
    setSaving(true)
    setError(null)
    try {
      const conversation = await createGroupConversation(nom.trim(), Array.from(selected))
      onCreated(conversation)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Nouveau groupe" onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal msg-group-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div><h3>Nouveau groupe</h3><p className="ge-modal-subtitle">Créez une discussion avec plusieurs membres à la fois.</p></div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>
        <div className="param-form">
          {error && <p className="ge-form-error">{error}</p>}
          <label className="param-field">Nom du groupe
            <input value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Ex. Équipe Projet X" disabled={saving} />
          </label>
          <label className="param-field">Membres ({selected.size} sélectionné{selected.size > 1 ? 's' : ''} — 2 minimum)</label>
          <div className="msg-group-members">
            {employees.map((e) => (
              <label key={e.id} className="msg-group-member">
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} disabled={saving} />
                <span className="msg-contact-avatar">{e.profile_photo ? <img src={e.profile_photo} alt="" /> : initiales(`${e.first_name} ${e.last_name}`)}</span>
                {e.first_name} {e.last_name}
              </label>
            ))}
          </div>
          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="button" className="ge-btn-primary" disabled={!nom.trim() || selected.size < 2 || saving} onClick={() => void handleCreate()}>
              {saving ? 'Création…' : 'Créer le groupe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessagingPageProps {
  /** Conversation à ouvrir directement en arrivant (ex. depuis la cloche de notifications). */
  focusConversationId?: number | null
  onFocusConsumed?: () => void
}

export default function MessagingPage({ focusConversationId, onFocusConsumed }: MessagingPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [myId, setMyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [typingNames, setTypingNames] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchConversations(), fetchMe()])
      .then(([employeesData, conversationsData, me]) => {
        if (cancelled) return
        setEmployees(employeesData)
        setConversations(conversationsData)
        setMyId(me.id)
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Rafraîchit la liste (aperçus, ordre, voyants) en tâche de fond, sans jamais bloquer l'écran.
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchConversations().then((data) => setConversations(data)).catch(() => {})
    }, LIST_POLL_MS)
    return () => window.clearInterval(interval)
  }, [])

  // Ouvre directement la conversation demandée (ex. depuis la cloche de notifications) une fois
  // la liste chargée — fonctionne aussi bien pour un 1:1 que pour un groupe.
  useEffect(() => {
    if (!focusConversationId || loading) return
    const target = conversations.find((c) => c.id === focusConversationId)
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à une demande de navigation externe (focusConversationId), pas dérivé du rendu
      if (target.is_group) { setSelectedGroupId(target.id); setSelectedUserId(null) }
      else { setSelectedUserId(target.other_user?.id ?? null); setSelectedGroupId(null) }
    }
    onFocusConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'à focusConversationId/loading/conversations
  }, [focusConversationId, loading, conversations])

  const existingConversationUserIds = useMemo(
    () => new Set(conversations.filter((c) => !c.is_group).map((c) => c.other_user?.id).filter((id): id is number => id != null)),
    [conversations],
  )

  const directoryContacts = useMemo(
    () => employees
      .filter((e) => e.is_active && e.id !== myId && !existingConversationUserIds.has(e.id))
      .filter((e) => search.trim() === '' || `${e.first_name} ${e.last_name} ${e.fonction}`.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [employees, myId, existingConversationUserIds, search],
  )

  const filteredConversations = useMemo(
    () => conversations.filter((c) => search.trim() === '' || c.display_nom.toLowerCase().includes(search.trim().toLowerCase())),
    [conversations, search],
  )

  const selectedConversation = selectedGroupId
    ? conversations.find((c) => c.id === selectedGroupId) ?? null
    : selectedUserId
      ? conversations.find((c) => !c.is_group && c.other_user?.id === selectedUserId) ?? null
      : null
  const selectedContact = !selectedConversation && selectedUserId ? employees.find((e) => e.id === selectedUserId) ?? null : null
  const hasSelection = selectedConversation !== null || selectedContact !== null
  const activeConversationId = selectedConversation?.id ?? null

  const headTitle = selectedConversation?.display_nom
    ?? (selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : '')
  const headSubtitle = selectedConversation?.is_group
    ? `${selectedConversation.participants.length} membres`
    : selectedConversation?.other_user?.is_online || selectedContact?.is_online
      ? 'En ligne'
      : (selectedConversation?.other_user?.fonction ?? selectedContact?.fonction ?? '')

  // Ouvre le fil de la conversation sélectionnée (s'il en existe déjà une) et la marque lue
  // immédiatement — le voyant de la liste s'efface tout de suite, sans attendre le prochain sondage.
  useEffect(() => {
    if (!activeConversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à un changement de sélection externe (conversation désélectionnée), pas dérivé du rendu
      setMessages([])
      return
    }
    let cancelled = false
    const load = (silent: boolean) => {
      if (!silent) setMessagesLoading(true)
      fetchConversationMessages(activeConversationId)
        .then((data) => { if (!cancelled) setMessages(data) })
        .finally(() => { if (!cancelled && !silent) setMessagesLoading(false) })
    }
    load(false)
    markConversationRead(activeConversationId)
      .then(() => {
        if (cancelled) return
        setConversations((current) => current.map((c) => c.id === activeConversationId ? { ...c, unread: false } : c))
      })
      .catch(() => {})
    const interval = window.setInterval(() => load(true), THREAD_POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [activeConversationId])

  useEffect(() => {
    if (!activeConversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à un changement de sélection externe (conversation désélectionnée), pas dérivé du rendu
      setTypingNames([])
      return
    }
    let cancelled = false
    const poll = () => fetchConversationTyping(activeConversationId).then((data) => { if (!cancelled) setTypingNames(data.typing) }).catch(() => {})
    poll()
    const interval = window.setInterval(poll, TYPING_POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [activeConversationId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const triggerTyping = useTypingSignal(() => activeConversationId ? sendConversationTyping(activeConversationId) : Promise.resolve())

  const handleSend = async (contenu: string, attachment?: File) => {
    let conversationId = activeConversationId
    if (!conversationId) {
      if (!selectedUserId) return
      const created = await startConversation(selectedUserId)
      conversationId = created.id
      setConversations((current) => [created, ...current.filter((c) => c.id !== created.id)])
    }
    const message = await sendConversationMessage(conversationId, contenu, attachment)
    setMessages((current) => [...current, message])
    setConversations((current) => current.map((c) => c.id === conversationId ? {
      ...c,
      unread: false,
      last_message: { contenu: message.contenu, attachment_type: message.attachment_type || null, auteur_id: message.auteur, created_at: message.created_at },
    } : c))
  }

  const handleEdit = async (id: number, contenu: string) => {
    const updated = await editConversationMessage(id, contenu)
    setMessages((current) => current.map((m) => m.id === id ? updated : m))
  }

  const handleDelete = async (id: number) => {
    await deleteConversationMessage(id)
    setMessages((current) => current.filter((m) => m.id !== id))
  }

  const selectConversationRow = (conversation: ConversationSummary) => {
    if (conversation.is_group) { setSelectedGroupId(conversation.id); setSelectedUserId(null) }
    else { setSelectedUserId(conversation.other_user?.id ?? null); setSelectedGroupId(null) }
  }

  if (loading) return <section className="msg-page"><p className="msg-loading">Chargement…</p></section>
  if (loadError) return <section className="msg-page"><p className="msg-loading">{loadError}</p></section>

  return (
    <section className={`msg-page ${hasSelection ? 'has-thread' : ''}`}>
      <aside className="msg-sidebar">
        <div className="msg-sidebar-head">
          <h1><MessageSquare size={18} />Messagerie</h1>
          <p>Discutez avec n'importe quel membre de l'organisation.</p>
        </div>
        <label className="msg-search">
          <Search size={14} />
          <input placeholder="Rechercher..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="msg-new-group-btn" onClick={() => setGroupModalOpen(true)}><UsersRound size={14} />Nouveau groupe</button>

        <div className="msg-contacts">
          {filteredConversations.length > 0 && (
            <>
              <p className="msg-section-label">Conversations</p>
              {filteredConversations.map((conversation) => {
                const active = conversation.is_group ? selectedGroupId === conversation.id : selectedUserId === conversation.other_user?.id
                return (
                  <button key={conversation.id} type="button" className={`msg-contact ${active ? 'is-active' : ''}`} onClick={() => selectConversationRow(conversation)}>
                    <span className="msg-contact-avatar">
                      {conversation.is_group ? <Users size={16} /> : conversation.other_user?.profile_photo ? <img src={conversation.other_user.profile_photo} alt="" /> : initiales(conversation.display_nom)}
                      {!conversation.is_group && conversation.other_user?.is_online && <span className="msg-online-dot" />}
                    </span>
                    <span className="msg-contact-body">
                      <span className="msg-contact-top">
                        <strong>{conversation.display_nom}</strong>
                        {conversation.last_message && <small>{fmtListTime(conversation.last_message.created_at)}</small>}
                      </span>
                      <span className="msg-contact-preview">
                        {conversation.last_message
                          ? (conversation.last_message.contenu || attachmentPreviewLabel[conversation.last_message.attachment_type ?? 'fichier'])
                          : 'Aucun message pour l’instant'}
                      </span>
                    </span>
                    {conversation.unread && <span className="msg-contact-dot" />}
                  </button>
                )
              })}
            </>
          )}

          {directoryContacts.length > 0 && (
            <>
              <p className="msg-section-label">Annuaire</p>
              {directoryContacts.map((contact) => (
                <button key={contact.id} type="button" className={`msg-contact ${selectedUserId === contact.id ? 'is-active' : ''}`} onClick={() => { setSelectedUserId(contact.id); setSelectedGroupId(null) }}>
                  <span className="msg-contact-avatar">
                    {contact.profile_photo ? <img src={contact.profile_photo} alt="" /> : initiales(`${contact.first_name} ${contact.last_name}`)}
                    {contact.is_online && <span className="msg-online-dot" />}
                  </span>
                  <span className="msg-contact-body">
                    <span className="msg-contact-top"><strong>{contact.first_name} {contact.last_name}</strong></span>
                    <span className="msg-contact-preview">{contact.fonction || '—'}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          {filteredConversations.length === 0 && directoryContacts.length === 0 && (
            <p className="msg-contacts-empty">Aucun membre ne correspond à cette recherche.</p>
          )}
        </div>
      </aside>

      <div className="msg-thread">
        {!hasSelection ? (
          <div className="msg-thread-empty">
            <MessageSquare size={40} />
            <h2>Sélectionnez une personne</h2>
            <p>Choisissez un membre de l'organisation ou une discussion de groupe pour commencer à échanger.</p>
          </div>
        ) : (
          <>
            <div className="msg-thread-head">
              <button type="button" className="msg-back-btn" onClick={() => { setSelectedUserId(null); setSelectedGroupId(null) }} aria-label="Retour à la liste"><ArrowLeft size={16} /></button>
              <span className="msg-contact-avatar">
                {selectedConversation?.is_group ? <Users size={16} /> : (selectedConversation?.other_user?.profile_photo ?? selectedContact?.profile_photo) ? <img src={(selectedConversation?.other_user?.profile_photo ?? selectedContact?.profile_photo) as string} alt="" /> : initiales(headTitle)}
              </span>
              <div>
                <strong>{headTitle}</strong>
                <small>{headSubtitle}</small>
              </div>
            </div>

            {messagesLoading ? (
              <p className="msg-loading">Chargement…</p>
            ) : (
              <div className="msg-list" ref={listRef} key={activeConversationId ?? `contact-${selectedUserId}`}>
                {messages.length === 0 && (
                  <p className="msg-list-empty">Aucun message avec {headTitle} pour l'instant. Écrivez-lui !</p>
                )}
                {messages.map((m) => {
                  const mine = m.auteur !== null && m.auteur === myId
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      mine={mine}
                      showAuthor={!!selectedConversation?.is_group}
                      onEdit={mine ? (contenu) => handleEdit(m.id, contenu) : undefined}
                      onDelete={mine ? () => handleDelete(m.id) : undefined}
                    />
                  )
                })}
              </div>
            )}

            <TypingIndicator names={typingNames} />
            <MessageComposer onSend={handleSend} onTyping={triggerTyping} placeholder={`Écrire à ${headTitle}...`} />
          </>
        )}
      </div>

      {groupModalOpen && (
        <GroupCreateModal
          employees={employees.filter((e) => e.is_active && e.id !== myId)}
          onClose={() => setGroupModalOpen(false)}
          onCreated={(conversation) => {
            setConversations((current) => [conversation, ...current])
            setSelectedGroupId(conversation.id)
            setSelectedUserId(null)
            setGroupModalOpen(false)
          }}
        />
      )}
    </section>
  )
}
