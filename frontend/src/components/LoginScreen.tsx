import { useState, type FormEvent } from 'react'
import AnimatedLogo from './AnimatedLogo'
import './LoginScreen.css'
import './Registration.css'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [accountType, setAccountType] = useState<'personal' | 'organization'>('personal')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [organizationCreated, setOrganizationCreated] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [organizationEmail, setOrganizationEmail] = useState('')
  const [organizationRole, setOrganizationRole] = useState<'admin' | 'employee'>('admin')

  const emailDomain = organizationEmail.includes('@') ? organizationEmail.split('@').pop()?.toLowerCase() : ''
  const organizationDomain = `@${emailDomain || `${organizationName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'organisation'}.com`}`

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'register' && accountType === 'organization' && !organizationCreated) {
      setOrganizationCreated(true)
      return
    }
    onLogin()
  }

  return <main className="login-screen">
    <section className="login-brand-panel">
      <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
      <div className="login-brand-content">
        <AnimatedLogo size={150} animate loop duration={2.8} uid="login-logo" />
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
            <input type="radio" name="accountType" value="personal" checked={accountType === 'personal'} onChange={() => { setAccountType('personal'); setOrganizationCreated(false) }} />
            <i>♙</i><span><strong>Compte personnel</strong><small>Accéder à mon espace salarié et à mes tâches.</small></span><b>✓</b>
          </label>
          <label className={accountType === 'organization' ? 'selected' : ''}>
            <input type="radio" name="accountType" value="organization" checked={accountType === 'organization'} onChange={() => { setAccountType('organization'); setOrganizationCreated(false) }} />
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
          </div> : !organizationCreated ? <div className="registration-fields organization-fields">
            <label className="login-field"><span>Nom de l’organisation</span><input required placeholder="Nom de votre organisation" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} /></label>
            <label className="login-field"><span>Adresse e-mail de l’organisation</span><input type="email" required placeholder="contact@organisation.com" value={organizationEmail} onChange={(event) => setOrganizationEmail(event.target.value)} /></label>
            <label className="login-field"><span>Mot de passe</span><input type="password" required minLength={4} placeholder="Créez un mot de passe" /></label>
          </div> : <div className="organization-member-step">
            <div className="created-organization"><i>✓</i><span><strong>{organizationName}</strong><small>Organisation créée · Domaine {organizationDomain}</small></span></div>
            <fieldset className="organization-role-fieldset"><legend>Quel est votre rôle dans l’organisation ?</legend><div>
              <label className={organizationRole === 'admin' ? 'selected' : ''}><input type="radio" name="organizationRole" checked={organizationRole === 'admin'} onChange={() => setOrganizationRole('admin')} /><i>♛</i><span><strong>Administrateur</strong><small>Gérer l’organisation et ses membres.</small></span><b>✓</b></label>
              <label className={organizationRole === 'employee' ? 'selected' : ''}><input type="radio" name="organizationRole" checked={organizationRole === 'employee'} onChange={() => setOrganizationRole('employee')} /><i>♙</i><span><strong>Employé</strong><small>Accéder à son espace de travail.</small></span><b>✓</b></label>
            </div></fieldset>
            <div className="registration-row"><label className="login-field"><span>Nom</span><input required placeholder="Votre nom" /></label><label className="login-field"><span>Prénom</span><input required placeholder="Votre prénom" /></label></div>
            <label className="login-field"><span>Adresse e-mail professionnelle</span><div className="domain-email-field"><input required pattern="[A-Za-z0-9._-]+" placeholder="prenom.nom" /><span>{organizationDomain}</span></div><small>L’adresse doit utiliser le domaine de votre organisation.</small></label>
          </div>}
          <button className="login-submit registration-submit" type="submit">{accountType === 'organization' && !organizationCreated ? 'Créer l’organisation et continuer' : 'Créer mon compte'} &nbsp;→</button>
          <button className="register-switch" type="button" onClick={() => organizationCreated ? setOrganizationCreated(false) : setMode('login')}>← {organizationCreated ? 'Retour à l’organisation' : 'Retour à la connexion'}</button>
        </>}
      </form>
    </section>
  </main>
}
