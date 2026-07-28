interface AnimatedLogoProps {
  size?: number
  animate?: boolean
  showBackground?: boolean
  uid?: string
  duration?: number
  loop?: boolean
}

const P_PATH = 'M 120 30 A 60 60 0 1 1 75 130 L 75 210'

function AnimatedLogo({
  size = 40,
  animate = true,
  showBackground = true,
  uid = 'perle-logo',
  duration = 2.2,
  loop = false,
}: AnimatedLogoProps) {
  const strokeGradId = `${uid}-stroke`
  const dotGradId = `${uid}-dot`
  const strokeGlowId = `${uid}-glow`
  const dotGlowId = `${uid}-dot-glow`
  const pathId = `${uid}-path`

  return (
    <svg
      className={`animated-logo-neon ${animate ? 'is-animating' : ''} ${loop ? 'is-looping' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo PERLE"
      style={{ '--logo-duration': `${duration}s` } as React.CSSProperties}
    >
      <defs>
        <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="50%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>

        <radialGradient id={dotGradId}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#a5f3fc" stopOpacity="1" />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>

        <filter id={strokeGlowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={dotGlowId} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2" result="innerGlow" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="outerGlow" />
          <feMerge>
            <feMergeNode in="outerGlow" />
            <feMergeNode in="innerGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <path id={pathId} d={P_PATH} fill="none" />
      </defs>

      {showBackground && (
        <rect
          x="0"
          y="0"
          width="240"
          height="240"
          rx="28"
          fill="#1a0f3d"
        />
      )}

      {/* Tracé du P (néon) */}
      <path
        className="logo-neon-path"
        d={P_PATH}
        fill="none"
        stroke={`url(#${strokeGradId})`}
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${strokeGlowId})`}
        pathLength={100}
      />

      {/* Halo du point lumineux */}
      <circle
        className="logo-neon-dot-halo"
        r="14"
        fill={`url(#${dotGradId})`}
        cx="120"
        cy="30"
      >
        {animate && (
          <animateMotion dur={`${duration}s`} fill="freeze" calcMode="linear" rotate="auto" repeatCount={loop ? 'indefinite' : 1}>
            <mpath href={`#${pathId}`} />
          </animateMotion>
        )}
      </circle>

      {/* Cœur brillant du point */}
      <circle
        className="logo-neon-dot-core"
        r="4"
        fill="#ffffff"
        filter={`url(#${dotGlowId})`}
        cx="120"
        cy="30"
      >
        {animate && (
          <animateMotion dur={`${duration}s`} fill="freeze" calcMode="linear" repeatCount={loop ? 'indefinite' : 1}>
            <mpath href={`#${pathId}`} />
          </animateMotion>
        )}
      </circle>
    </svg>
  )
}

export default AnimatedLogo
