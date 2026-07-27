import AnimatedLogo from './AnimatedLogo'

interface SplashScreenProps {
  fadingOut: boolean
}

function SplashScreen({ fadingOut }: SplashScreenProps) {
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

        <div className="splash-loader">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
