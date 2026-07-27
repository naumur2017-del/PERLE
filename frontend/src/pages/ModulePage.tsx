import type { ReactNode } from 'react'
import './ModulePage.css'
import { useI18n } from '../i18n/I18nContext'
export default function ModulePage({ title, description, icon }: { title: string; description: string; icon: ReactNode }) { const { t } = useI18n(); return <section className="generic-page"><div className="generic-page-card"><div className="module-icon">{icon}</div><span className="section-eyebrow">Module PERLE</span><h2>{t(title)}</h2><p>{t(description)}</p><div className="generic-placeholder"><strong>{t(title)}</strong></div></div></section> }
