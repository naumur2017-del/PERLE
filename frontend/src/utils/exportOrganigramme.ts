// Export PDF et impression de l'organigramme : le schéma affiché est capturé en image puis posé,
// réduit à l'échelle, sur UNE seule page A4 avec des marges fixes. Le PDF et l'impression partagent
// la même mise en page, quelle que soit la taille de l'organigramme ou le navigateur.

const A4_PETIT_COTE_MM = 210
const A4_GRAND_COTE_MM = 297
const MARGE_MM = 12
const ENTETE_MM = 10 // titre + date au-dessus du schéma

type Orientation = 'portrait' | 'landscape'

interface Capture {
  dataUrl: string
  largeurPx: number
  hauteurPx: number
}

interface MiseEnPage {
  orientation: Orientation
  pageLargeurMm: number
  pageHauteurMm: number
  // Position et taille de l'image dans la page, en mm.
  x: number
  y: number
  largeur: number
  hauteur: number
}

/** Capture l'élément à sa taille naturelle : la zone qui défile horizontalement à l'écran est
 * dépliée le temps de la capture (classe og-capture) pour que rien ne soit coupé. */
async function capturer(element: HTMLElement): Promise<Capture> {
  const { toPng } = await import('html-to-image')
  element.classList.add('og-capture')
  try {
    const largeurPx = element.scrollWidth
    const hauteurPx = element.scrollHeight
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      width: largeurPx,
      height: hauteurPx,
      cacheBust: true,
    })
    return { dataUrl, largeurPx, hauteurPx }
  } finally {
    element.classList.remove('og-capture')
  }
}

/** Choisit l'orientation A4 qui affiche le schéma le plus grand, puis l'y centre en
 * respectant les marges, sans jamais l'agrandir au-delà de sa taille réelle. */
function miseEnPage({ largeurPx, hauteurPx }: Capture): MiseEnPage {
  const PX_PAR_MM = 96 / 25.4
  const essai = (orientation: Orientation) => {
    const pageLargeurMm = orientation === 'landscape' ? A4_GRAND_COTE_MM : A4_PETIT_COTE_MM
    const pageHauteurMm = orientation === 'landscape' ? A4_PETIT_COTE_MM : A4_GRAND_COTE_MM
    const zoneLargeur = pageLargeurMm - 2 * MARGE_MM
    const zoneHauteur = pageHauteurMm - 2 * MARGE_MM - ENTETE_MM
    const echelle = Math.min(zoneLargeur / largeurPx, zoneHauteur / hauteurPx, 1 / PX_PAR_MM)
    const largeur = largeurPx * echelle
    const hauteur = hauteurPx * echelle
    return {
      orientation,
      pageLargeurMm,
      pageHauteurMm,
      x: MARGE_MM + (zoneLargeur - largeur) / 2,
      y: MARGE_MM + ENTETE_MM,
      largeur,
      hauteur,
    }
  }
  const paysage = essai('landscape')
  const portrait = essai('portrait')
  return portrait.largeur > paysage.largeur ? portrait : paysage
}

const dateDuJour = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export async function exporterOrganigrammePdf(element: HTMLElement, titre: string, nomFichier: string) {
  const [capture, { jsPDF }] = await Promise.all([capturer(element), import('jspdf')])
  const page = miseEnPage(capture)
  const pdf = new jsPDF({ orientation: page.orientation, unit: 'mm', format: 'a4' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(20, 18, 58)
  pdf.text(titre, MARGE_MM, MARGE_MM + 5)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(108, 108, 133)
  pdf.text(dateDuJour(), page.pageLargeurMm - MARGE_MM, MARGE_MM + 5, { align: 'right' })
  pdf.addImage(capture.dataUrl, 'PNG', page.x, page.y, page.largeur, page.hauteur)
  pdf.save(`${nomFichier}.pdf`)
}

const echapper = (texte: string) => texte.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** Impression : même mise en page que le PDF, dans une iframe invisible dont la feuille de style
 * fixe le format A4, l'orientation et les marges — le reste de l'application n'est pas imprimé. */
export async function imprimerOrganigramme(element: HTMLElement, titre: string) {
  const capture = await capturer(element)
  const page = miseEnPage(capture)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) { iframe.remove(); throw new Error('Impression impossible.') }

  doc.open()
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>
    @page { size: A4 ${page.orientation}; margin: ${MARGE_MM}mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { background: #fff; font-family: Helvetica, Arial, sans-serif; }
    .page { width: ${page.pageLargeurMm - 2 * MARGE_MM}mm; height: ${page.pageHauteurMm - 2 * MARGE_MM - 1}mm; overflow: hidden; break-after: avoid; }
    header { display: flex; justify-content: space-between; align-items: baseline; height: ${ENTETE_MM}mm; padding-top: 1mm; }
    h1 { font-size: 13pt; color: #14123a; }
    header span { font-size: 9pt; color: #6c6c85; }
    img { display: block; width: ${page.largeur}mm; height: ${page.hauteur}mm; margin: 0 auto; }
  </style></head><body><div class="page"><header><h1>${echapper(titre)}</h1><span>${echapper(dateDuJour())}</span></header><img alt="" src="${capture.dataUrl}"></div></body></html>`)
  doc.close()

  const image = doc.querySelector('img')
  if (image && !image.complete) await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve })
  win.focus()
  win.print()
  // Retirée une fois la boîte de dialogue fermée (print() est bloquant dans la plupart des navigateurs).
  setTimeout(() => iframe.remove(), 1000)
}
