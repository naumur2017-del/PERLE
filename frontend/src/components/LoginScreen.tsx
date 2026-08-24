import { useEffect, useRef, useState, type FormEvent } from 'react'
import AnimatedLogo from './AnimatedLogo'
import { searchOrganisations, type Organisation } from './organisations'
import { resolveRole, type UserRole } from '../auth/roles'
import './LoginScreen.css'
import './Registration.css'

type AccountType = 'organization' | 'member'
type OrgKind = 'personal' | 'company'
type Step = 'type' | 'orgKind' | 'search'
type Direction = 'right' | 'left'
type FormDirection = 'next' | 'back'

const SWEEP_MS = 430
const CLOSE_MS = 620
const FORM_SWEEP_MS = 320
const CASCADE_BARS = [0, 1, 2, 3, 4, 5, 6]

export default function LoginScreen({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [chooser, setChooser] = useState<'open' | 'closing' | null>(null)
  const [step, setStep] = useState<Step>('type')
  const [sweep, setSweep] = useState<Direction | null>(null)
  const [entering, setEntering] = useState<Direction | null>(null)

  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [orgKind, setOrgKind] = useState<OrgKind | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Organisation[]>([])
  const [searching, setSearching] = useState(false)

  const [companyStep, setCompanyStep] = useState<1 | 2>(1)
  const [formSweep, setFormSweep] = useState<FormDirection | null>(null)
  const [formEntering, setFormEntering] = useState<FormDirection | null>(null)

  const timer = useRef<number | undefined>(undefined)
  const formTimer = useRef<number | undefined>(undefined)
  const searchToken = useRef(0)

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(formTimer.current) }, [])

  /* Le jeton d’appel écarte les réponses d’une recherche périmée par une frappe plus récente. */
  const runSearch = (value: string) => {
    setQuery(value)
    setSelectedOrg(null)
    const token = ++searchToken.current
    if (!value.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    searchOrganisations(value).then(found => {
      if (token !== searchToken.current) return
      setResults(found)
      setSearching(false)
    })
  }

  const isCompany = accountType === 'organization' && orgKind === 'company'

  /* Le rôle est déduit de l’adresse saisie : administrateur applicatif vers l’espace
     d’administration, directeur d’entreprise vers l’accueil métier. */
  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '')
    onLogin(resolveRole(email))
  }

  /* Le passage à l’étape 2 se fait par la soumission du formulaire : la validation
     native des champs de l’étape 1 s’applique donc avant d’avancer. */
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isCompany && companyStep === 1) { goCompanyStep(2, 'next'); return }
    // Une inscription crée toujours un administrateur d’entreprise : espace métier.
    onLogin('directeur')
  }

  const goCompanyStep = (next: 1 | 2, direction: FormDirection) => {
    setFormSweep(direction)
    window.clearTimeout(formTimer.current)
    formTimer.current = window.setTimeout(() => {
      setCompanyStep(next)
      setFormSweep(null)
      setFormEntering(direction)
    }, FORM_SWEEP_MS)
  }

  const resetCompanySteps = () => {
    window.clearTimeout(formTimer.current)
    setCompanyStep(1)
    setFormSweep(null)
    setFormEntering(null)
  }

  const openChooser = () => {
    window.clearTimeout(timer.current)
    setStep('type')
    setSweep(null)
    setEntering(null)
    setChooser('open')
  }

  const goToStep = (next: Step, direction: Direction) => {
    setSweep(direction)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setStep(next)
      setSweep(null)
      setEntering(direction)
    }, SWEEP_MS)
  }

  const closeChooser = (after?: () => void) => {
    setChooser('closing')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setChooser(null); after?.() }, CLOSE_MS)
  }

  const chooseOrgKind = (kind: OrgKind) => closeChooser(() => {
    setAccountType('organization')
    setOrgKind(kind)
    setSelectedOrg(null)
    resetCompanySteps()
    setMode('register')
  })

  const confirmOrganisation = () => {
    if (!selectedOrg) return
    closeChooser(() => {
      setAccountType('member')
      setOrgKind(null)
      setMode('register')
    })
  }

  const summary = accountType === 'member'
    ? { icon: '♙', title: 'Membre d’une organisation', text: selectedOrg ? `${selectedOrg.name} — ${selectedOrg.email}` : 'Organisation à rejoindre' }
    : orgKind === 'company'
      ? { icon: '▦', title: 'Compte organisation — Entreprise', text: 'Société, groupe ou structure à plusieurs équipes.' }
      : { icon: '◆', title: 'Compte organisation — À titre personnel', text: 'Indépendant, cabinet ou entrepreneur individuel.' }

  /* L’étape affichée porte l’animation : elle sort du côté du sens de navigation,
     et l’étape suivante arrive du côté opposé. */
  const stepClass = (index: 1 | 2) => {
    if (index !== companyStep) return 'company-step'
    if (formSweep) return `company-step is-leaving-${formSweep}`
    if (formEntering) return `company-step is-arriving-${formEntering}`
    return 'company-step'
  }

  const overlayClass = [
    'type-overlay',
    chooser === 'closing' ? 'is-closing' : 'is-open',
    sweep ? `is-sweeping-${sweep}` : '',
    entering ? `is-entering-${entering}` : '',
  ].filter(Boolean).join(' ')

  return <main className="login-screen">
    <section className="login-brand-panel">
      <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
      <div className="login-brand-content">
        <AnimatedLogo size={150} animate uid="login-logo" />
        <h1>PERLE</h1>
        <p>Pilotage par les EHS</p>
        <span>Votre espace intégré de pilotage, de collaboration et de performance.</span>
      </div>
    </section>

    <section className="login-form-panel">
      <form className="login-form" onSubmit={mode === 'login' ? submitLogin : submitRegistration}>
        <span className="login-eyebrow">Bienvenue sur PERLE</span>
        <h2>{mode === 'login' ? 'Connectez-vous à votre espace' : 'Créer votre compte'}</h2>
        <p className="login-intro">
          {mode === 'login'
            ? 'Saisissez vos identifiants pour accéder à votre espace.'
            : isCompany
              ? `Étape ${companyStep} sur 2 — ${companyStep === 1 ? 'informations de l’entreprise' : 'administrateur de l’entreprise'}.`
              : 'Complétez les informations ci-dessous pour finaliser votre inscription.'}
        </p>

        {mode === 'login' ? <>
          <label className="login-field"><span>Adresse e-mail</span><input type="email" name="email" placeholder="nom@entreprise.com" required /></label>
          <label className="login-field"><span>Mot de passe</span><input type="password" placeholder="Saisissez votre mot de passe" required minLength={4} /></label>
          <div className="login-options"><label><input type="checkbox" /> Se souvenir de moi</label><button type="button">Mot de passe oublié ?</button></div>
          <button className="login-submit" type="submit">Se connecter &nbsp;→</button>
          <button className="register-switch" type="button" onClick={openChooser}>Créer un compte — Inscription</button>
          <p className="login-help">Besoin d’aide ? <button type="button">Contacter le support</button></p>
        </> : <>
          <div className="selected-type">
            <i>{summary.icon}</i>
            <span><strong>{summary.title}</strong><small>{summary.text}</small></span>
            <button type="button" onClick={openChooser}>Changer</button>
          </div>

          {accountType === 'member' ? <div className="registration-fields member-fields">
            <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail professionnelle</span><input type="email" required placeholder="prenom.nom@organisation.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <div className="registration-row"><label className="login-field"><span>Fonction / poste</span><input required placeholder="Ex. Chargé HSE" /></label><label className="login-field"><span>Matricule (facultatif)</span><input placeholder="Ex. NM-2041" /></label></div>
            <label className="login-field"><span>Date de naissance</span><input type="date" required /></label>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input required placeholder="Votre ville" /></label></div>
            <p className="registration-note">Votre demande d’accès sera soumise à un administrateur de {selectedOrg ? selectedOrg.name : 'l’organisation'}.</p>
          </div> : isCompany ? <>
            <ol className="form-steps" aria-label="Étapes de l’inscription">
              <li className={companyStep === 1 ? 'current' : 'done'}><b>{companyStep === 1 ? '1' : '✓'}</b><span>Informations de l’entreprise</span></li>
              <li className={companyStep === 2 ? 'current' : ''}><b>2</b><span>Administrateur de l’entreprise</span></li>
            </ol>

            {/* Les deux étapes restent montées : `disabled` conserve les valeurs saisies
                tout en excluant l’étape masquée de la validation native. */}
            <div className="registration-fields company-fields">
              <fieldset className={stepClass(1)} hidden={companyStep !== 1} disabled={companyStep !== 1}>
                <label className="login-field"><span>Raison sociale</span><input required placeholder="Nom légal de l’entreprise" /></label>
                <div className="registration-row"><label className="login-field"><span>Numéro d’identification</span><input required placeholder="SIREN / RCS / IFU" /></label><label className="login-field"><span>Effectif</span><select required defaultValue=""><option value="" disabled>Sélectionnez</option><option>1 à 10</option><option>11 à 50</option><option>51 à 250</option><option>251 à 1000</option><option>Plus de 1000</option></select></label></div>
                <label className="login-field"><span>Secteur d’activité</span><input required placeholder="Ex. Industrie, BTP, énergie…" /></label>
                <div className="registration-row"><label className="login-field"><span>E-mail de l’entreprise</span><input type="email" required placeholder="contact@entreprise.com" /></label><label className="login-field"><span>Téléphone</span><input type="tel" required placeholder="+33 1 00 00 00 00" /></label></div>
                <label className="login-field"><span>Adresse du siège</span><input required placeholder="Rue, numéro, code postal" /></label>
                <div className="registration-row"><label className="login-field"><span>Pays</span><input required placeholder="Pays du siège" /></label><label className="login-field"><span>Ville</span><input required placeholder="Ville du siège" /></label></div>
                <label className="login-field"><span>Site web (facultatif)</span><input type="url" placeholder="https://" /></label>
              </fieldset>

              <fieldset className={stepClass(2)} hidden={companyStep !== 2} disabled={companyStep !== 2}>
                <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Nom de l’administrateur" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Prénom de l’administrateur" /></label></div>
                <label className="login-field"><span>Fonction dans l’entreprise</span><input required placeholder="Ex. Directeur QHSE" /></label>
                <div className="registration-row"><label className="login-field"><span>E-mail professionnel</span><input type="email" required placeholder="prenom.nom@entreprise.com" /></label><label className="login-field"><span>Téléphone direct</span><input type="tel" required placeholder="+33 6 00 00 00 00" /></label></div>
                <div className="registration-row"><label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label><label className="login-field"><span>Confirmation</span><input type="password" required minLength={4} placeholder="Confirmez le mot de passe" /></label></div>
                <label className="registration-consent"><input type="checkbox" required /> <span>Je certifie être habilité à créer et administrer l’espace PERLE de cette entreprise.</span></label>
              </fieldset>
            </div>
          </> : <div className="registration-fields organization-fields">
            <label className="login-field"><span>Nom de l’organisation</span><input required placeholder="Nom de votre activité" /></label>
            <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail</span><input type="email" required placeholder="nom@exemple.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <div className="registration-row"><label className="login-field"><span>Domaine d’activité</span><input required placeholder="Ex. Conseil, formation…" /></label><label className="login-field"><span>Téléphone</span><input type="tel" required placeholder="+33 6 00 00 00 00" /></label></div>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input required placeholder="Votre ville" /></label></div>
          </div>}

          <button className="login-submit registration-submit" type="submit">
            {isCompany && companyStep === 1 ? <>Continuer &nbsp;→</> : <>Créer mon compte &nbsp;→</>}
          </button>
          {isCompany && companyStep === 2
            ? <button className="register-switch" type="button" onClick={() => goCompanyStep(1, 'back')}>← Revenir aux informations de l’entreprise</button>
            : <button className="register-switch" type="button" onClick={() => setMode('login')}>← Retour à la connexion</button>}
        </>}
      </form>
    </section>

    {chooser && <div className={overlayClass} role="dialog" aria-modal="true" aria-label="Choix du type de compte">
      <div className="type-cascade" aria-hidden="true">
        {CASCADE_BARS.map(bar => <span key={bar} style={{ '--bar': bar } as React.CSSProperties} />)}
      </div>
      <div className="type-wipe" aria-hidden="true" />

      <div className={`type-panel${entering ? ' instant' : ''}`} key={step}>
        {step === 'type' && <>
          <span className="type-eyebrow">Inscription</span>
          <h2>Quel type de compte voulez-vous ?</h2>
          <p>Sélectionnez la formule qui correspond à votre usage de PERLE.</p>
          <div className="type-cards">
            <button type="button" className="type-card" style={{ '--card': 0 } as React.CSSProperties} onClick={() => goToStep('orgKind', 'right')}>
              <i>▦</i><strong>Compte Organisation</strong><small>Créer et piloter l’espace de mon organisation.</small><em>Continuer &nbsp;→</em>
            </button>
            <button type="button" className="type-card" style={{ '--card': 1 } as React.CSSProperties} onClick={() => goToStep('search', 'left')}>
              <i>♙</i><strong>Vouloir faire partie d’une organisation</strong><small>Rejoindre une organisation déjà présente sur PERLE.</small><em>Continuer &nbsp;→</em>
            </button>
          </div>
          <button className="type-cancel" type="button" onClick={() => closeChooser()}>← Retour</button>
        </>}

        {step === 'orgKind' && <>
          <span className="type-eyebrow">Compte organisation</span>
          <h2>Quel type d’organisation ?</h2>
          <p>Cette information détermine les informations demandées à l’inscription.</p>
          <div className="type-cards">
            <button type="button" className="type-card" style={{ '--card': 0 } as React.CSSProperties} onClick={() => chooseOrgKind('personal')}>
              <i>◆</i><strong>Organisation à titre personnel</strong><small>Indépendant, cabinet ou entrepreneur individuel.</small><em>Choisir &nbsp;→</em>
            </button>
            <button type="button" className="type-card" style={{ '--card': 1 } as React.CSSProperties} onClick={() => chooseOrgKind('company')}>
              <i>🏛</i><strong>Entreprise</strong><small>Société, groupe ou structure à plusieurs équipes.</small><em>Choisir &nbsp;→</em>
            </button>
          </div>
          <button className="type-cancel" type="button" onClick={() => goToStep('type', 'left')}>← Retour</button>
        </>}

        {step === 'search' && <>
          <span className="type-eyebrow">Rejoindre une organisation</span>
          <h2>Recherchez votre organisation</h2>
          <p>Saisissez le nom ou l’adresse e-mail de l’organisation à rejoindre.</p>

          <div className={`org-search${searching ? ' is-searching' : ''}`}>
            <i aria-hidden="true">⌕</i>
            <input
              type="search"
              value={query}
              autoFocus
              placeholder="Nom de l’organisation ou e-mail…"
              aria-label="Rechercher une organisation"
              onChange={event => runSearch(event.target.value)}
            />
            {searching && <b aria-hidden="true" />}
          </div>

          <div className="org-results" role="listbox" aria-label="Organisations trouvées">
            {results.map((org, index) => <button
              key={org.id}
              type="button"
              role="option"
              aria-selected={selectedOrg?.id === org.id}
              className={`org-result${selectedOrg?.id === org.id ? ' selected' : ''}`}
              style={{ '--row': index } as React.CSSProperties}
              onClick={() => setSelectedOrg(org)}
            >
              <i>{org.name.slice(0, 2).toUpperCase()}</i>
              <span><strong>{org.name}</strong><small>{org.email} · {org.sector} · {org.city}</small></span>
              <em>{org.members} membres</em>
            </button>)}
            {!searching && query.trim() && !results.length && <p className="org-empty">Aucune organisation ne correspond à « {query.trim()} ».</p>}
            {!query.trim() && <p className="org-hint">Commencez à saisir pour voir les organisations apparaître.</p>}
          </div>

          <div className="org-actions">
            <button className="type-cancel" type="button" onClick={() => goToStep('type', 'right')}>← Retour</button>
            <button className="org-next" type="button" disabled={!selectedOrg} onClick={confirmOrganisation}>Suivant &nbsp;→</button>
          </div>
        </>}
      </div>
    </div>}
  </main>
}
