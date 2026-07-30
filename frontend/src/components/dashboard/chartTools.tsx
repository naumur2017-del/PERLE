// Outils partagés par les graphiques SVG de l'application (tableau de bord
// administrateur et tableau de bord de direction) : infobulle, échelles,
// libellés d'axe et export CSV.

import { useState, type FocusEvent, type ReactNode } from 'react'

/** Arrondit une borne d'axe à une valeur lisible (5, 10, 15, 50, 100…). */
export const niceMax = (value: number) => {
  if (value <= 5) return 5
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2)
}

/** Espacement des étiquettes d'axe pour rester lisible quelle que soit la densité. */
export const labelStep = (count: number) => Math.max(1, Math.ceil(count / 12))

/** Position d'ancrage d'une infobulle déclenchée au clavier plutôt qu'à la souris. */
export const focusPoint = (event: FocusEvent<Element>) => {
  const box = event.currentTarget.getBoundingClientRect()
  return { clientX: box.left + box.width / 2, clientY: box.top, currentTarget: event.currentTarget }
}

/**
 * Infobulle de graphique positionnée au survol ou à la prise de focus.
 * `hostClass` désigne le conteneur positionné auquel les coordonnées se rapportent.
 */
export function useTooltip(hostClass = '.adm-chart-host') {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null)
  const show = (event: { clientX: number; clientY: number; currentTarget: Element }, content: ReactNode) => {
    const host = event.currentTarget.closest(hostClass) as HTMLElement | null
    const box = host?.getBoundingClientRect()
    setTip({ x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0), content })
  }
  const hide = () => setTip(null)
  return { show, hide, tip }
}

export const toCsv = (columns: string[], rows: (string | number)[][]) =>
  [columns, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')

/** Le BOM UTF-8 en tête de fichier permet l'ouverture directe dans Excel. */
export function downloadCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const blob = new Blob([`\uFEFF${toCsv(columns, rows)}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
