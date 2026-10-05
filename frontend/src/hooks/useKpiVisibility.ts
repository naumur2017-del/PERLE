import { useState } from 'react'

/** Visibilité repliable des indicateurs/KPI d'une page, mémorisée d'une visite à l'autre (même
 * principe que le repli de la barre latérale, voir App.tsx) — une clé de stockage par page pour
 * que chacune garde sa propre préférence. */
export function useKpiVisibility(storageKey: string) {
  const [visible, setVisible] = useState(() => localStorage.getItem(storageKey) !== '1')

  const toggle = () => {
    setVisible((prev) => {
      const next = !prev
      localStorage.setItem(storageKey, next ? '0' : '1')
      return next
    })
  }

  return { visible, toggle }
}
