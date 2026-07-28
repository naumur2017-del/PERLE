import { useState, type FormEvent } from 'react'
import AnimatedLogo from './AnimatedLogo'
import './LoginScreen.css'
import './Registration.css'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [accountType, setAccountType] = useState<'personal' | 'organization'>('personal')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onLogin()
  }

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
      <form className="login-form" onSubmit={submitLogin}>
        <span className="login-eyebrow">Bienvenue sur PERLE</span>
        <h2>{mode === 'login' ? 'Connectez-vous à votre espace' : 'Créer votre compte'}</h2>
        <p className="login-intro">Choisissez votre type de compte pour continuer.</p>

        <fieldset className="account-type-fieldset">
          <legend>Quel type de compte utilisez-vous ?</legend>
          <label className={accountType === 'personal' ? 'selected' : ''}>
            <input type="radio" name="accountType" value="personal" checked={accountType === 'personal'} onChange={() => setAccountType('personal')} />
            <i>♙</i><span><strong>Compte personnel</strong><small>Accéder à mon espace salarié et à mes tâches.</small></span><b>✓</b>
          </label>
          <label className={accountType === 'organization' ? 'selected' : ''}>
            <input type="radio" name="accountType" value="organization" checked={accountType === 'organization'} onChange={() => setAccountType('organization')} />
            <i>▦</i><span><strong>Compte organisation</strong><small>Piloter les projets, équipes et opérations.</small></span><b>✓</b>
          </label>
        </fieldset>

        {mode === 'login' ? <>
          <label className="login-field"><span>Adresse e-mail</span><input type="email" placeholder="nom@entreprise.com" required /></label>
          <label className="login-field"><span>Mot de passe</span><input type="password" placeholder="Saisissez votre mot de passe" required minLength={4} /></label>
          <div className="login-options"><label><input type="checkbox" /> Se souvenir de moi</label><button type="button">Mot de passe oublié ?</button></div>
          <button className="login-submit" type="submit">Se connecter &nbsp;→</button>
          <button className="register-switch" type="button" onClick={() => setMode('register')}>Créer un compte — Inscription</button>
          <p className="login-help">Besoin d’aide ? <button type="button">Contacter le support</button></p>
        </> : <>
          {accountType === 'personal' ? <div className="registration-fields personal-fields">
            <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail</span><input type="email" required placeholder="nom@exemple.com" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
            <label className="login-field"><span>Date de naissance</span><input type="date" required /></label>
            <div className="registration-row"><label className="login-field"><span>Pays</span><input required placeholder="Votre pays" /></label><label className="login-field"><span>Ville</span><input required placeholder="Votre ville" /></label></div>
          </div> : <div className="registration-fields organization-fields">
            <label className="login-field"><span>Nom de l’organisation</span><input required placeholder="Nom de votre organisation" /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
          </div>}
          <button className="login-submit registration-submit" type="submit">Créer mon compte &nbsp;→</button>
          <button className="register-switch" type="button" onClick={() => setMode('login')}>← Retour à la connexion</button>
        </>}
      </form>
    </section>
  </main>
}
