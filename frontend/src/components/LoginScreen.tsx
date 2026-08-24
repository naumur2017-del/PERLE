import { useEffect, useRef, useState, type FormEvent } from 'react'
import AnimatedLogo from './AnimatedLogo'
import { searchOrganisations, type Organisation } from './organisations'
import type { UserRole } from '../auth/roles'
import { apiPost, ApiError } from '../api/client'
import { saveSession } from '../auth/session'
import './LoginScreen.css'
import './Registration.css'

type UserSummary = { id: number; email: string; first_name: string; role: UserRole; organisation: { id: number; name: string } | null }
type AuthResponse = { token: string; user: UserSummary }

const formEntries = (form: HTMLFormElement): Record<string, string> => {
  const result: Record<string, string> = {}
  new FormData(form).forEach((value, key) => { result[key] = String(value) })
  return result
}

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué. Vérifiez les informations saisies.'
  }
  return 'Impossible de contacter le serveur. Réessayez.'
}

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

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [requestSubmitted, setRequestSubmitted] = useState(false)

  const timer = useRef<number | undefined>(undefined)
  const formTimer = useRef<number | undefined>(undefined)
  const searchToken = useRef(0)
  const companyStep1Data = useRef<Record<string, string>>({})

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

  const authenticated = (response: AuthResponse) => {
    saveSession({
      token: response.token,
      role: response.user.role,
      email: response.user.email,
      firstName: response.user.first_name,
      organisationName: response.user.organisation?.name ?? '',
    })
    onLogin(response.user.role)
  }

  /* Le rôle est renvoyé par l’API : administrateur applicatif vers l’espace
     d’administration, directeur d’entreprise vers l’accueil métier. */
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const { email, password } = formEntries(event.currentTarget)
    setFormError(null)
    setSubmitting(true)
    try {
      authenticated(await apiPost<AuthResponse>('/auth/login/', { email, password }))
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  /* Le passage à l’étape 2 se fait par la soumission du formulaire : la validation
     native des champs de l’étape 1 s’applique donc avant d’avancer. Le fieldset de
     l’étape 1 devient `disabled` à l’étape 2 (donc absent du FormData final) : ses
     valeurs sont donc capturées ici avant de basculer. */
  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (isCompany && companyStep === 1) {
      companyStep1Data.current = formEntries(event.currentTarget)
      goCompanyStep(2, 'next')
      return
    }

    setSubmitting(true)
    try {
      if (accountType === 'member') {
        if (!selectedOrg) throw new Error('Aucune organisation sélectionnée.')
        const fields = formEntries(event.currentTarget)
        await apiPost('/membership-requests/', { ...fields, organisation: selectedOrg.id })
        setRequestSubmitted(true)
        return
      }

      if (isCompany) {
        const step2 = formEntries(event.currentTarget)
        if (step2.password !== step2.password_confirm) {
          setFormError('Les mots de passe ne correspondent pas.')
          return
        }
        const payload = { ...companyStep1Data.current, ...step2 }
        authenticated(await apiPost<AuthResponse>('/organisations/register/company/', payload))
        return
      }

      const fields = formEntries(event.currentTarget)
      authenticated(await apiPost<AuthResponse>('/organisations/register/personal/', fields))
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
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
    setFormError(null)
    setRequestSubmitted(false)
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
    setFormError(null)
    setRequestSubmitted(false)
    setMode('register')
  })

  const confirmOrganisation = () => {
    if (!selectedOrg) return
    closeChooser(() => {
      setAccountType('member')
      setOrgKind(null)
      setFormError(null)
      setRequestSubmitted(false)
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

        {formError && <p className="form-error">{formError}</p>}

        {mode === 'login' ? <>
          <label className="login-field"><span>Adresse e-mail</span><input type="email" name="email" placeholder="nom@entreprise.com" required /></label>
          <label className="login-field"><span>Mot de passe</span><input type="password" name="password" placeholder="Saisissez votre mot de passe" required minLength={4} /></label>
          <div className="login-options"><label><input type="checkbox" /> Se souvenir de moi</label><button type="button">Mot de passe oublié ?</button></div>
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Connexion…' : <>Se connecter &nbsp;→</>}</button>
          <button className="register-switch" type="button" onClick={openChooser}>Créer un compte — Inscription</button>
          <p className="login-help">Besoin d’aide ? <button type="button">Contacter le support</button></p>
        </> : <>
          <div className="selected-type">
            <i>{summary.icon}</i>
            <span><strong>{summary.title}</strong><small>{summary.text}</small></span>
            <button type="button" onClick={openChooser}>Changer</button>
          </div>

          {accountType === 'member' ? (requestSubmitted ? <div className="registration-success">
            <i>✓</i>
            <h3>Demande envoyée</h3>
            <p>Votre demande d’accès à {selectedOrg ? selectedOrg.name : 'l’organisation'} a bien été transmise. Un administrateur doit l’approuver avant que vous puissiez vous connecter.</p>
          </div> : <div className="registration-fields member-fields">
            <div className="registration-row"><label className="login-field"><span>Nom</span><input name="last_name" required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input name="first_name" required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail professionnelle</span><input type="email" name="email" required placeholder="prenom.nom@organisation.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" name="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <div className="registration-row"><label className="login-field"><span>Fonction / poste</span><input name="fonction" required placeholder="Ex. Chargé HSE" /></label><label className="login-field"><span>Matricule (facultatif)</span><input name="matricule" placeholder="Ex. NM-2041" /></label></div>
            <label className="login-field"><span>Date de naissance</span><input type="date" name="date_naissance" required /></label>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input name="pays" required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input name="ville" required placeholder="Votre ville" /></label></div>
            <p className="registration-note">Votre demande d’accès sera soumise à un administrateur de {selectedOrg ? selectedOrg.name : 'l’organisation'}.</p>
          </div>) : isCompany ? <>
            <ol className="form-steps" aria-label="Étapes de l’inscription">
              <li className={companyStep === 1 ? 'current' : 'done'}><b>{companyStep === 1 ? '1' : '✓'}</b><span>Informations de l’entreprise</span></li>
              <li className={companyStep === 2 ? 'current' : ''}><b>2</b><span>Administrateur de l’entreprise</span></li>
            </ol>

            {/* Les deux étapes restent montées : `disabled` conserve les valeurs saisies
                tout en excluant l’étape masquée de la validation native. */}
            <div className="registration-fields company-fields">
              <fieldset className={stepClass(1)} hidden={companyStep !== 1} disabled={companyStep !== 1}>
                <label className="login-field"><span>Raison sociale</span><input name="organisation_name" required placeholder="Nom légal de l’entreprise" /></label>
                <div className="registration-row"><label className="login-field"><span>Numéro d’identification</span><input name="registration_number" required placeholder="SIREN / RCS / IFU" /></label><label className="login-field"><span>Effectif</span><select name="headcount" required defaultValue=""><option value="" disabled>Sélectionnez</option><option value="1-10">1 à 10</option><option value="11-50">11 à 50</option><option value="51-250">51 à 250</option><option value="251-1000">251 à 1000</option><option value="1000+">Plus de 1000</option></select></label></div>
                <label className="login-field"><span>Secteur d’activité</span><input name="sector" required placeholder="Ex. Industrie, BTP, énergie…" /></label>
                <div className="registration-row"><label className="login-field"><span>E-mail de l’entreprise</span><input type="email" name="org_email" required placeholder="contact@entreprise.com" /></label><label className="login-field"><span>Téléphone</span><input type="tel" name="org_phone" required placeholder="+33 1 00 00 00 00" /></label></div>
                <label className="login-field"><span>Adresse du siège</span><input name="address" required placeholder="Rue, numéro, code postal" /></label>
                <div className="registration-row"><label className="login-field"><span>Pays</span><input name="country" required placeholder="Pays du siège" /></label><label className="login-field"><span>Ville</span><input name="city" required placeholder="Ville du siège" /></label></div>
                <label className="login-field"><span>Site web (facultatif)</span><input type="url" name="website" placeholder="https://" /></label>
              </fieldset>

              <fieldset className={stepClass(2)} hidden={companyStep !== 2} disabled={companyStep !== 2}>
                <div className="registration-row"><label className="login-field"><span>Nom</span><input name="last_name" required placeholder="Nom de l’administrateur" /></label><label className="login-field"><span>Prénom</span><input name="first_name" required placeholder="Prénom de l’administrateur" /></label></div>
                <label className="login-field"><span>Fonction dans l’entreprise</span><input name="fonction" required placeholder="Ex. Directeur QHSE" /></label>
                <div className="registration-row"><label className="login-field"><span>E-mail professionnel</span><input type="email" name="email" required placeholder="prenom.nom@entreprise.com" /></label><label className="login-field"><span>Téléphone direct</span><input type="tel" name="phone" required placeholder="+33 6 00 00 00 00" /></label></div>
                <div className="registration-row"><label className="login-field"><span>Mot de passe</span><input type="password" name="password" required minLength={4} placeholder="Créez un mot de passe" /></label><label className="login-field"><span>Confirmation</span><input type="password" name="password_confirm" required minLength={4} placeholder="Confirmez le mot de passe" /></label></div>
                <label className="registration-consent"><input type="checkbox" required /> <span>Je certifie être habilité à créer et administrer l’espace PERLE de cette entreprise.</span></label>
              </fieldset>
            </div>
          </> : <div className="registration-fields organization-fields">
            <label className="login-field"><span>Nom de l’organisation</span><input name="organisation_name" required placeholder="Nom de votre activité" /></label>
            <div className="registration-row"><label className="login-field"><span>Nom</span><input name="last_name" required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input name="first_name" required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail</span><input type="email" name="email" required placeholder="nom@exemple.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" name="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <div className="registration-row"><label className="login-field"><span>Domaine d’activité</span><input name="sector" required placeholder="Ex. Conseil, formation…" /></label><label className="login-field"><span>Téléphone</span><input type="tel" name="phone" required placeholder="+33 6 00 00 00 00" /></label></div>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input name="country" required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input name="city" required placeholder="Votre ville" /></label></div>
          </div>}

          {!(accountType === 'member' && requestSubmitted) && <button className="login-submit registration-submit" type="submit" disabled={submitting}>
            {submitting ? 'Envoi…' : isCompany && companyStep === 1 ? <>Continuer &nbsp;→</> : <>Créer mon compte &nbsp;→</>}
          </button>}
          {accountType === 'member' && requestSubmitted ? null : isCompany && companyStep === 2
            ? <button className="register-switch" type="button" onClick={() => goCompanyStep(1, 'back')}>← Revenir aux informations de l’entreprise</button>
            : <button className="register-switch" type="button" onClick={() => { setFormError(null); setRequestSubmitted(false); setMode('login') }}>← Retour à la connexion</button>}
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
