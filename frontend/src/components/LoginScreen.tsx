import { useEffect, useRef, useState, type FormEvent } from 'react'
import AnimatedLogo from './AnimatedLogo'
import { resolveRole, type UserRole } from '../auth/roles'
import './LoginScreen.css'
import './Registration.css'

const CASCADE_BARS = [0, 1, 2, 3, 4, 5, 6]
/* Durée nécessaire aux barres violettes pour tomber et couvrir tout l’écran
   (durée de l’animation + décalage cumulé de la dernière barre). */
const CASCADE_COVER_MS = 950
const CLOSE_MS = 620

export default function LoginScreen({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [curtain, setCurtain] = useState<'open' | 'closing' | null>(null)

  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /* Le rôle est déduit de l’adresse saisie : administrateur applicatif vers l’espace
     d’administration, directeur d’entreprise vers l’accueil métier. */
  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '')
    onLogin(resolveRole(email))
  }

  /* Une inscription crée toujours un administrateur d’entreprise : espace métier. */
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onLogin('directeur')
  }

  /* Un rideau de barres violettes tombe pour couvrir l’écran puis remonte pour
     révéler directement le formulaire d’inscription, sans étape de choix de compte. */
  const startRegistration = () => {
    window.clearTimeout(timer.current)
    setCurtain('open')
    timer.current = window.setTimeout(() => {
      setCurtain('closing')
      timer.current = window.setTimeout(() => {
        setCurtain(null)
        setMode('register')
      }, CLOSE_MS)
    }, CASCADE_COVER_MS)
  }

  const overlayClass = `type-overlay ${curtain === 'closing' ? 'is-closing' : 'is-open'}`

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
            : 'Complétez les informations ci-dessous pour finaliser votre inscription.'}
        </p>

        {mode === 'login' ? <>
          <label className="login-field"><span>Adresse e-mail</span><input type="email" name="email" placeholder="nom@entreprise.com" required /></label>
          <label className="login-field"><span>Mot de passe</span><input type="password" placeholder="Saisissez votre mot de passe" required minLength={4} /></label>
          <div className="login-options"><label><input type="checkbox" /> Se souvenir de moi</label><button type="button">Mot de passe oublié ?</button></div>
          <button className="login-submit" type="submit">Se connecter &nbsp;→</button>
          <button className="register-switch" type="button" onClick={startRegistration}>Créer un compte — Inscription</button>
          <p className="login-help">Besoin d’aide ? <button type="button">Contacter le support</button></p>
        </> : <>
          <div className="registration-fields organization-fields">
            <label className="login-field"><span>Nom de l’organisation</span><input required placeholder="Nom de votre activité" /></label>
            <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail</span><input type="email" required placeholder="nom@exemple.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <div className="registration-row"><label className="login-field"><span>Domaine d’activité</span><input required placeholder="Ex. Conseil, formation…" /></label><label className="login-field"><span>Téléphone</span><input type="tel" required placeholder="+33 6 00 00 00 00" /></label></div>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input required placeholder="Votre ville" /></label></div>
          </div>

          <button className="login-submit registration-submit" type="submit">Créer mon compte &nbsp;→</button>
          <button className="register-switch" type="button" onClick={() => setMode('login')}>← Retour à la connexion</button>
        </>}
      </form>
    </section>

    {curtain && <div className={overlayClass} aria-hidden="true">
      <div className="type-cascade" aria-hidden="true">
        {CASCADE_BARS.map(bar => <span key={bar} style={{ '--bar': bar } as React.CSSProperties} />)}
      </div>
    </div>}
  </main>
}
