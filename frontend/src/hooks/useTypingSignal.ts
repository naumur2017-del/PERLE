import { useCallback, useRef } from 'react'

const THROTTLE_MS = 2000

/** Throttle l'envoi du signal « en train d'écrire » : au plus un appel réseau toutes les
 * THROTTLE_MS millisecondes, peu importe la fréquence des frappes dans le composeur. */
export function useTypingSignal(sendTyping: () => Promise<unknown>) {
  const lastSentRef = useRef(0)
  return useCallback(() => {
    const now = Date.now()
    if (now - lastSentRef.current < THROTTLE_MS) return
    lastSentRef.current = now
    sendTyping().catch(() => {})
  }, [sendTyping])
}
