/**
 * LandingPage — Retro 70s Album Art.
 * Warm cream base with graph paper grid, rainbow circle portal.
 * "Enter the Resonance" in the center.
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
      {/* Warm cream base */}
      <div style={styles.sky} />

      {/* Graph paper grid */}
      <div style={styles.grid} />

      {/* Small decorative colored squares — scattered like the album art border */}
      <div style={styles.decorRow}>
        {['#D44A3A','#C47228','#D4A843','#4A7A3D','#5B8EC2','#C45B28','#D44A3A'].map((c, i) => (
          <div key={i} style={{ ...styles.decorSquare, background: c }} />
        ))}
      </div>

      {/* Rainbow ring portal — the central focus */}
      <div style={styles.rainbowRing}>
        <div style={styles.innerCircle}>
          {/* Sky blue center like the album art */}
          <div style={styles.skyCenter} />
        </div>
      </div>

      {/* Click target over the persistent sun — no duplicate orb */}
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
        <span style={styles.sunLabel}>Enter the Resonance</span>
      </button>

      {/* Title */}
      <div style={styles.titleWrap}>
        <h1 style={styles.title}>Equinox Resonance</h1>
        <p style={styles.subtitle}>a harmonic mirror for the turning of the year</p>
      </div>

      {/* Vignette */}
      <div style={styles.vignette} />
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
    background: '#F5F0E1',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    opacity: 0.12,
    backgroundImage: `
      linear-gradient(rgba(180,160,120,1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(180,160,120,1) 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  decorRow: {
    position: 'absolute',
    bottom: '6%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 16,
    zIndex: 5,
  },
  decorSquare: {
    width: 18,
    height: 18,
    borderRadius: 3,
    opacity: 0.7,
  },
  rainbowRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(70vw, 70vh)',
    height: 'min(70vw, 70vh)',
    borderRadius: '50%',
    background: `conic-gradient(
      from 0deg,
      #D44A3A 0deg,
      #C47228 51deg,
      #D4A843 102deg,
      #7AB355 153deg,
      #4A7A3D 204deg,
      #5B8EC2 255deg,
      #5A5198 306deg,
      #D44A3A 360deg
    )`,
    padding: 16,
    zIndex: 1,
    pointerEvents: 'none',
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#F5F0E1',
    border: '3px solid rgba(180,160,120,0.3)',
  },
  skyCenter: {
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      to top,
      #4A7A3D 0%,
      #6BA352 15%,
      #7CB8D4 40%,
      #5B8EC2 70%,
      #F5F0E1 100%
    )`,
    opacity: 0.15,
  },
  sunButton: {
    position: 'absolute',
    top: 'calc(50% + 70px)',
    left: '50%',
    transform: 'translateX(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    zIndex: 10,
    padding: '8px 24px',
  },
  sunLabel: {
    marginTop: 16,
    fontSize: 'clamp(0.8rem, 1.3vw, 1rem)',
    letterSpacing: '0.25em',
    color: '#6B5B3A',
    fontFamily: "'Amarante', Georgia, serif",
    textShadow: '0 0 12px rgba(212,168,67,0.4)',
  },
  titleWrap: {
    position: 'relative',
    textAlign: 'center',
    zIndex: 2,
    marginBottom: '38vh',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 4rem)',
    fontWeight: 200,
    letterSpacing: '0.25em',
    color: '#4A3A1E',
    textShadow: '0 0 20px rgba(212,168,67,0.35)',
    fontFamily: "'Amarante', Georgia, serif",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
    letterSpacing: '0.3em',
    color: '#8B7B5A',
    textTransform: 'lowercase',
    fontFamily: "'Amarante', Georgia, serif",
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180,150,100,0.15) 70%, rgba(120,90,50,0.25) 100%)',
  },
}
