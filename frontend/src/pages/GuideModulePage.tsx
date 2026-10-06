import {
  ArrowRight, BookOpen, CornerDownRight, Download, GitBranch, Lightbulb, ListChecks, ShieldCheck, Users, Workflow as WorkflowIcon,
} from 'lucide-react'
import type { GuideModule } from './guidesModules'
import type { Acteur, EtapeFlux, Ton, Workflow } from './guidesWorkflow'
import './GuideModulePage.css'

const initiales = (nom: string) => nom.split(/[\s/]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase()

const trouverActeur = (workflow: Workflow, nom: string): Acteur =>
  workflow.acteurs.find((a) => a.nom === nom) ?? { nom, ton: 'gray', role: '', peut: [], interagitAvec: [] }

// Pastille colorée d'un acteur (utilisée partout où un intervenant est nommé).
export function PastilleActeur({ nom, ton }: { nom: string; ton: Ton }) {
  return <span className={`gm-pastille gm-ton-${ton}`}><i>{initiales(nom)}</i>{nom}</span>
}

// Grille des acteurs : qui ils sont, ce qu'ils peuvent faire et avec qui ils interagissent.
export function ActeursGrille({ workflow }: { workflow: Workflow }) {
  return (
    <div className="gm-acteurs">
      {workflow.acteurs.map((acteur) => (
        <article key={acteur.nom} className={`gm-acteur gm-ton-${acteur.ton}`}>
          <div className="gm-acteur-bande" />
          <header>
            <span className="gm-avatar">{initiales(acteur.nom)}</span>
            <div>
              <strong>{acteur.nom}</strong>
              <p>{acteur.role}</p>
            </div>
          </header>
          <h4>Ce qu’il peut faire</h4>
          <ul>{acteur.peut.map((p) => <li key={p}>{p}</li>)}</ul>
          <h4>Avec qui il interagit</h4>
          <div className="gm-chips">
            {acteur.interagitAvec.map((i) => <span key={i} className="gm-chip"><CornerDownRight size={12} />{i}</span>)}
          </div>
        </article>
      ))}
    </div>
  )
}

// Chronologie du flux principal : une étape par carte, numérotée et colorée selon l'acteur.
export function FluxChronologie({ workflow }: { workflow: Workflow }) {
  return (
    <ol className="gm-flux">
      {workflow.flux.map((etape: EtapeFlux, index) => {
        const acteur = trouverActeur(workflow, etape.acteur)
        return (
          <li key={etape.titre} className={`gm-etape gm-ton-${acteur.ton}`}>
            <span className="gm-etape-num">{index + 1}</span>
            <article>
              <header>
                <strong>{etape.titre}</strong>
                <span className="gm-page-pill">{etape.page}</span>
              </header>
              <div className="gm-etape-acteur"><PastilleActeur nom={acteur.nom} ton={acteur.ton} /></div>
              <p><strong>Action :</strong> {etape.action}</p>
              <p className="gm-resultat"><ArrowRight size={14} /><span>{etape.resultat}</span></p>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export default function GuideModulePage({ contenu, workflow }: { contenu: GuideModule; workflow?: Workflow }) {
  const nbActeurs = workflow?.acteurs.length ?? 0
  const nbEtapes = workflow?.flux.length ?? 0
  return (
    <section className="gm-page">
      <header className="gm-hero">
        <span className="gm-hero-icon"><BookOpen size={22} /></span>
        <div>
          <span className="gm-kicker">Guide d’utilisation</span>
          <h2>{contenu.titre}</h2>
          <p>{contenu.intro}</p>
          {workflow && (
            <div className="gm-hero-stats">
              <span><Users size={14} />{nbActeurs} acteurs</span>
              <span><WorkflowIcon size={14} />{nbEtapes} étapes</span>
              <span><ListChecks size={14} />{contenu.pages.length} pages</span>
            </div>
          )}
        </div>
      </header>

      {workflow && (
        <>
          <section className="gm-section">
            <h3><Users size={16} />Qui intervient</h3>
            <p className="gm-section-intro">Chaque acteur, son périmètre et ses interactions avec les autres.</p>
            <ActeursGrille workflow={workflow} />
          </section>

          <section className="gm-section">
            <h3><WorkflowIcon size={16} />Flux de travail</h3>
            <p className="gm-section-intro">Dans l’ordre, de la première étape à la fin du processus.</p>
            <FluxChronologie workflow={workflow} />
            {workflow.alternative && (
              <div className="gm-alternative">
                <GitBranch size={18} />
                <div>
                  <strong>{workflow.alternative.titre}</strong>
                  <p>{workflow.alternative.description}</p>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <section className="gm-section">
        <h3><ListChecks size={16} />Pages et interactions</h3>
        {contenu.pages.map((page) => {
          const detail = workflow?.pages[page.nom]
          return (
            <article key={page.nom} className="gm-page-card">
              <header>
                <h4>{page.nom}</h4>
                <p className="gm-acces">{page.acces}</p>
              </header>
              <p className="gm-description">{page.description}</p>

              {detail && (
                <div className="gm-intervenants">
                  <span className="gm-label">Qui intervient</span>
                  <div className="gm-chips">
                    {detail.intervenants.map((nom) => {
                      const acteur = trouverActeur(workflow!, nom)
                      return <PastilleActeur key={nom} nom={nom} ton={acteur.ton} />
                    })}
                  </div>
                </div>
              )}

              {detail && (
                <div className="gm-pas-a-pas">
                  <span className="gm-label">Pas à pas</span>
                  <ol>
                    {detail.pasAPas.map((etape) => <li key={etape}>{etape}</li>)}
                  </ol>
                </div>
              )}

              <details className="gm-details">
                <summary>Toutes les actions de cette page</summary>
                <ul>{page.actions.map((action) => <li key={action}>{action}</li>)}</ul>
              </details>
            </article>
          )
        })}
      </section>

      <div className="gm-grille">
        <article className="gm-card">
          <h3><ShieldCheck size={16} />Règles à connaître</h3>
          <ul>{contenu.regles.map((regle) => <li key={regle}>{regle}</li>)}</ul>
        </article>
        <article className="gm-card">
          <h3><Download size={16} />Exporter et imprimer</h3>
          <ul>{contenu.exports.map((texte) => <li key={texte}>{texte}</li>)}</ul>
        </article>
      </div>

      <article className="gm-card gm-astuces">
        <h3><Lightbulb size={16} />Astuces</h3>
        <ul>{contenu.astuces.map((astuce) => <li key={astuce}>{astuce}</li>)}</ul>
      </article>
    </section>
  )
}
