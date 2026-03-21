/**
 * PermissionModal — retro 70s glassmorphic permission request.
 * Appears after "Enter the Resonance" is clicked.
 * Two paths: grant mic+cam, or skip to fallback.
 */

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
  onGrant: (stream: { mic: MediaStream; cam: MediaStream }) => void
  onDeny: () => void
}

export function PermissionModal({ onGrant, onDeny }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 })
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.5)', delay: 0.2 }
    )
  }, [])

  async function handleGrant() {
    try {
      const [mic, cam] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } }),
      ])
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, onComplete: () => onGrant({ mic, cam }) })
    } catch {
      // Partial grant — try mic only
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
        gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, onComplete: () => onGrant({ mic, cam: null as any }) })
      } catch {
        handleDeny()
      }
    }
  }

  function handleDeny() {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, onComplete: onDeny })
  }

  return (
    <div ref={overlayRef} style={styles.overlay}>
      <div ref={cardRef} style={styles.card}>
        {/* Sacred symbol */}
        <div style={styles.symbol}>&#10022;</div>

        <h2 style={styles.heading}>Merge with the Resonance</h2>
        <p style={styles.body}>
          To project your presence into the harmonic field,<br />
          we request access to your <em>camera</em> and <em>microphone</em>.
        </p>
        <p style={styles.sub}>
          Your data stays local — nothing leaves your device.
        </p>

        <div style={styles.btnRow}>
          <button onClick={handleGrant} style={styles.grantBtn}>
            Open the Portal
          </button>
          <button onClick={handleDeny} style={styles.denyBtn}>
            Continue Without
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(245,240,225,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 100,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: 420,
    width: '90%',
    padding: '40px 36px',
    background: 'rgba(255,255,255,0.6)',
    border: '2px solid rgba(180,160,120,0.3)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 40px rgba(120,90,50,0.1)',
    textAlign: 'center',
  },
  symbol: {
    fontSize: 32,
    color: '#C45B28',
    textShadow: '0 0 15px rgba(196,91,40,0.4)',
    lineHeight: 1,
    marginBottom: 4,
  },
  heading: {
    fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
    fontWeight: 400,
    letterSpacing: '0.12em',
    color: '#4A3A1E',
    fontFamily: "'Akaya Kanadaka', Georgia, serif",
  },
  body: {
    fontSize: '0.95rem',
    lineHeight: 1.7,
    color: '#6B5B3A',
    fontFamily: "'Akaya Kanadaka', Georgia, serif",
  },
  sub: {
    fontSize: '0.75rem',
    color: '#9B8B6A',
    letterSpacing: '0.08em',
    fontFamily: "'Akaya Kanadaka', Georgia, serif",
  },
  btnRow: {
    display: 'flex',
    gap: 14,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  grantBtn: {
    padding: '12px 28px',
    fontSize: '0.9rem',
    letterSpacing: '0.12em',
    color: '#4A3A1E',
    background: 'rgba(212,168,67,0.2)',
    border: '1px solid rgba(196,91,40,0.35)',
    borderRadius: 30,
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(212,168,67,0.15)',
    textShadow: '0 0 8px rgba(212,168,67,0.3)',
    outline: 'none',
    fontFamily: "'Akaya Kanadaka', Georgia, serif",
    transition: 'background 0.2s',
  },
  denyBtn: {
    padding: '12px 28px',
    fontSize: '0.9rem',
    letterSpacing: '0.12em',
    color: '#8B7B5A',
    background: 'transparent',
    border: '1px solid rgba(180,160,120,0.3)',
    borderRadius: 30,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: "'Akaya Kanadaka', Georgia, serif",
    transition: 'color 0.2s',
  },
}
