/**
 * GhostUI — the non-intrusive control layer.
 * Only visible when the mouse moves. Auto-hides after 3s.
 * CRITICAL: wrapper is ALWAYS pointerEvents:'none' so OrbitControls drag works.
 * Only the bars themselves capture events.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import type { AppState } from '../types'

interface Props {
  appState: AppState
  onReturnToLanding: () => void
}

export function GhostUI({ appState, onReturnToLanding }: Props) {
  const uiRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visible, setVisible] = useState(false)

  const show = useCallback(() => {
    setVisible(true)
    gsap.to(uiRef.current, { opacity: 1, duration: 0.4 })
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      gsap.to(uiRef.current, { opacity: 0, duration: 0.8, onComplete: () => setVisible(false) })
    }, 3000)
  }, [])

  useEffect(() => {
    const handler = () => show()
    window.addEventListener('mousemove', handler)
    window.addEventListener('touchstart', handler)
    return () => {
      window.removeEventListener('mousemove', handler)
      window.removeEventListener('touchstart', handler)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [show])

  if (appState === 'landing' || appState === 'requesting') return null

  return (
    <div
      ref={uiRef}
      style={{ ...styles.wrapper, opacity: 0 }}
    >
      <div style={{ ...styles.topBar, pointerEvents: visible ? 'auto' : 'none' }}>
        <span style={styles.logo}>&#10022; Equinox Resonance</span>
        <button onClick={onReturnToLanding} style={styles.ghostBtn}>
          &#8592; Return
        </button>
      </div>

      <div style={styles.bottomBar}>
        <span style={styles.hint}>
          {appState === 'constellation'
            ? 'your face \u2014 the constellation'
            : 'sacred geometry \u2014 fallback mode'}
        </span>
        <span style={styles.hint}>drag to orbit &middot; equinox 2026</span>
      </div>
    </div>
  )
}

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',    // ALWAYS none — never capture drag events
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 20,
  },
  topBar: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
  },
  logo: {
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    color: 'rgba(255,240,200,0.6)',
    fontFamily: 'Georgia, serif',
    textShadow: '0 0 12px rgba(245,192,96,0.4)',
  },
  ghostBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,240,200,0.15)',
    borderRadius: 20,
    color: 'rgba(255,240,200,0.5)',
    fontSize: '0.8rem',
    letterSpacing: '0.1em',
    padding: '6px 14px',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'Georgia, serif',
    transition: 'color 0.2s, border-color 0.2s',
  },
  bottomBar: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 20px',
    pointerEvents: 'none',
  },
  hint: {
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    color: 'rgba(255,240,200,0.35)',
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
}
