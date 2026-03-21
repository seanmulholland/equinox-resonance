/**
 * LandingPage — Pacific Sunset.
 * Full-screen CSS gradient (matches the shader aesthetic).
 * "Enter the Equinox" glows on the horizon.
 */

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  onEnter: () => void
}

export function LandingPage({ onEnter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!containerRef.current || !btnRef.current) return
    const tl = gsap.timeline()
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.inOut' })
    tl.fromTo(btnRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' },
      '-=0.5'
    )
  }, [])

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Layered sunset gradient */}
      <div style={styles.sky} />

      {/* Horizon glow line */}
      <div style={styles.horizon} />

      {/* Sun orb — large, clickable as main CTA */}
      <button
        ref={btnRef}
        onClick={onEnter}
        style={styles.sunButton}
        onMouseEnter={e => {
          gsap.to(e.currentTarget, { scale: 1.06, duration: 0.4, ease: 'power2.out' })
        }}
        onMouseLeave={e => {
          gsap.to(e.currentTarget, { scale: 1.0, duration: 0.4, ease: 'power2.out' })
        }}
      >
        <div style={styles.sunOrb} />
        <span style={styles.sunLabel}>Enter the Resonance</span>
      </button>

      {/* Title */}
      <div style={styles.titleWrap}>
        <h1 style={styles.title}>Equinox Resonance</h1>
        <p style={styles.subtitle}>a harmonic mirror for the turning of the year</p>
      </div>

      {/* Shimmer stars */}
      <div style={styles.stars} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  },
  sky: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(
      to top,
      #05091f 0%,
      #0d1f50 18%,
      #14388c 32%,
      #c05878 50%,
      #f29a3e 62%,
      #74a8db 80%,
      #b4cbef 100%
    )`,
  },
  horizon: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(to right, transparent, #f5c060, #fff8e1, #f5c060, transparent)',
    opacity: 0.6,
    boxShadow: '0 0 40px 12px rgba(245,192,96,0.4)',
  },
  sunButton: {
    position: 'absolute',
    top: 'calc(52% - 100px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 200,
    height: 200,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: 0,
  },
  sunOrb: {
    width: 180,
    height: 180,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #fff8c0 0%, #f5c060 30%, #f5a623 55%, rgba(245,166,35,0.3) 80%, rgba(245,100,35,0) 100%)',
    boxShadow: '0 0 80px 50px rgba(245,166,35,0.5), 0 0 160px 90px rgba(245,100,35,0.25), 0 0 250px 120px rgba(200,80,50,0.1)',
  },
  sunLabel: {
    marginTop: 16,
    fontSize: 'clamp(0.8rem, 1.3vw, 1rem)',
    letterSpacing: '0.25em',
    color: 'rgba(255,248,200,0.8)',
    fontFamily: 'Georgia, serif',
    textShadow: '0 0 16px rgba(255,220,100,0.7)',
  },
  titleWrap: {
    position: 'relative',
    textAlign: 'center',
    zIndex: 2,
    marginBottom: '42vh',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 4rem)',
    fontWeight: 200,
    letterSpacing: '0.25em',
    color: '#fff8e8',
    textShadow: '0 0 30px rgba(255,220,100,0.6), 0 0 60px rgba(200,150,50,0.3)',
    fontFamily: 'Georgia, serif',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
    letterSpacing: '0.3em',
    color: 'rgba(255,240,200,0.7)',
    textTransform: 'lowercase',
    fontFamily: 'Georgia, serif',
  },
  stars: {
    position: 'absolute',
    inset: 0,
    background: 'transparent',
    backgroundImage: `
      radial-gradient(1px 1px at 15% 12%, rgba(255,255,255,0.9) 0%, transparent 100%),
      radial-gradient(1px 1px at 35% 8%, rgba(255,255,255,0.7) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 55% 5%, rgba(255,255,255,0.8) 0%, transparent 100%),
      radial-gradient(1px 1px at 72% 10%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 88% 7%, rgba(255,255,255,0.9) 0%, transparent 100%),
      radial-gradient(1px 1px at 8% 22%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 92% 18%, rgba(255,255,255,0.7) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 3%, rgba(255,255,255,0.8) 0%, transparent 100%),
      radial-gradient(1px 1px at 65% 2%, rgba(255,255,255,0.6) 0%, transparent 100%)
    `,
    opacity: 0.8,
    pointerEvents: 'none',
  },
}
