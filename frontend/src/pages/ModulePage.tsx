import type { ReactNode } from 'react'
import './ModulePage.css'
export default function ModulePage({ title, description, icon }: { title: string; description: string; icon: ReactNode }) { return <section className="generic-page"><div className="generic-page-card"><div className="module-icon">{icon}</div><span className="section-eyebrow">Module PERLE</span><h2>{title}</h2><p>{description}</p><div className="generic-placeholder"><strong>Espace {title}</strong><span>Le contenu fonctionnel de ce module sera affiché ici.</span></div></div></section> }
