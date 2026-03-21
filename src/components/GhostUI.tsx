/**
 * GhostUI — the non-intrusive control layer.
 * Only visible when the mouse moves. Auto-hides after 3s.
 * Glassmorphism: blur 10px, opacity ~0.1 base.
 */

import { useEffect, useRef, useState } from 'react'
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

  function show() {
    if (!visible) {
      setVisible(true)
      gsap.to(uiRef.current, { opacity: 1, duration: 0.4 })
    }
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(hide, 3000)
  }

  function hide() {
    gsap.to(uiRef.current, { opacity: 0, duration: 0.8, onComplete: () => setVisible(false) })
  }

  useEffect(() => {
    window.addEventListener('mousemove', show)
    window.addEventListener('touchstart', show)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('touchstart', show)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [visible])

  if (appState === 'landing' || appState === 'requesting') return null

  return (
    <div
      ref={uiRef}
      style={{
        ...styles.wrapper,
        opacity: 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.logo}>✦ Equinox Resonance</span>
        <button onClick={onReturnToLanding} style={styles.ghostBtn}>
          ← Return
        </button>
      </div>

      {/* Bottom hint */}
      <div style={styles.bottomBar}>
        <span style={styles.hint}>
          {appState === 'constellation'
            ? 'your face — the constellation'
            : 'sacred geometry — fallback mode'}
        </span>
        <span style={styles.hint}>drag to orbit · equinox 2026</span>
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
    pointerEvents: 'none',
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
    pointerEvents: 'auto',
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
