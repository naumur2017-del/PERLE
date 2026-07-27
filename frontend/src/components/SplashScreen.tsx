import AnimatedLogo from './AnimatedLogo'

interface SplashScreenProps {
  fadingOut: boolean
}

const welcomeMessages: Record<string, string> = {
  ar: 'مرحباً بكم في PERLE',
  de: 'Willkommen bei PERLE',
  en: 'Welcome to PERLE',
  es: 'Bienvenido a PERLE',
  fr: 'Bienvenue sur PERLE',
  it: 'Benvenuto su PERLE',
  ja: 'PERLEへようこそ',
  pt: 'Bem-vindo ao PERLE',
  zh: '欢迎使用 PERLE',
}

function getDeviceLanguage() {
  const language = navigator.languages?.[0] ?? navigator.language ?? 'fr'
  return language.toLowerCase().split('-')[0]
}

function SplashScreen({ fadingOut }: SplashScreenProps) {
  const language = getDeviceLanguage()
  const welcomeMessage = welcomeMessages[language] ?? welcomeMessages.fr

  return (
    <div className={`splash-screen ${fadingOut ? 'fade-out' : ''}`}>
      <div className="splash-bg-orbs">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="splash-content">
        <AnimatedLogo size={140} animate uid="splash-logo" />
        <h1 className="splash-title">
          <span className="splash-title-letter" style={{ animationDelay: '0.6s' }}>P</span>
          <span className="splash-title-letter" style={{ animationDelay: '0.75s' }}>E</span>
          <span className="splash-title-letter" style={{ animationDelay: '0.9s' }}>R</span>
          <span className="splash-title-letter" style={{ animationDelay: '1.05s' }}>L</span>
          <span className="splash-title-letter" style={{ animationDelay: '1.2s' }}>E</span>
        </h1>
        <p className="splash-subtitle">Pilotage par les EHS</p>
        <p className="splash-welcome" dir={language === 'ar' ? 'rtl' : 'auto'}>{welcomeMessage}</p>

        <div className="splash-loader">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
