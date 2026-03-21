/**
 * PermissionModal — glassmorphic permission request.
 * Appears after "Enter the Equinox" is clicked.
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
        <div style={styles.symbol}>✦</div>

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
    background: 'rgba(2,4,15,0.7)',
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
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(245,192,96,0.25)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 0 60px rgba(245,166,35,0.15), inset 0 0 40px rgba(245,192,96,0.03)',
    textAlign: 'center',
  },
  symbol: {
    fontSize: 32,
    color: '#f5c060',
    textShadow: '0 0 20px rgba(245,192,96,0.8)',
    lineHeight: 1,
    marginBottom: 4,
  },
  heading: {
    fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
    fontWeight: 300,
    letterSpacing: '0.12em',
    color: '#fff8e8',
    fontFamily: 'Georgia, serif',
  },
  body: {
    fontSize: '0.95rem',
    lineHeight: 1.7,
    color: 'rgba(255,240,200,0.75)',
    fontFamily: 'Georgia, serif',
  },
  sub: {
    fontSize: '0.75rem',
    color: 'rgba(255,240,200,0.4)',
    letterSpacing: '0.08em',
    fontFamily: 'Georgia, serif',
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
    color: '#fff8e0',
    background: 'rgba(245,166,35,0.18)',
    border: '1px solid rgba(245,192,96,0.5)',
    borderRadius: 30,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 0 20px rgba(245,166,35,0.25)',
    textShadow: '0 0 10px rgba(255,220,100,0.6)',
    outline: 'none',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
  },
  denyBtn: {
    padding: '12px 28px',
    fontSize: '0.9rem',
    letterSpacing: '0.12em',
    color: 'rgba(255,240,200,0.5)',
    background: 'transparent',
    border: '1px solid rgba(255,240,200,0.15)',
    borderRadius: 30,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'Georgia, serif',
    transition: 'color 0.2s',
  },
}
