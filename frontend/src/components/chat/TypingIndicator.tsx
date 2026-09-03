import './TypingIndicator.css'

/** Bandeau « X est en train d'écrire » avec des points animés — n'affiche rien si personne ne
 * tape actuellement (voir useTypingSignal / fetchTaskTyping / fetchConversationTyping). */
export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null
  const label = names.length === 1
    ? `${names[0]} est en train d'écrire`
    : names.length === 2
      ? `${names[0]} et ${names[1]} sont en train d'écrire`
      : `${names.length} personnes sont en train d'écrire`

  return (
    <div className="typing-indicator">
      <span className="typing-dots"><i /><i /><i /></span>
      {label}
    </div>
  )
}
