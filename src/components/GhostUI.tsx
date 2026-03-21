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
  onToggleMute?: () => void
  isMuted?: boolean
}

export function GhostUI({ appState, onReturnToLanding, onToggleMute, isMuted }: Props) {
  const uiRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visible, setVisible] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const show = useCallback(() => {
    if (!uiRef.current) return
    setVisible(true)
    gsap.to(uiRef.current, { opacity: 1, duration: 0.4 })
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!uiRef.current) return
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
    <>
      <div
        ref={uiRef}
        style={{ ...styles.wrapper, opacity: 0 }}
      >
        <div style={{ ...styles.topBar, pointerEvents: visible ? 'auto' : 'none' }}>
          <span style={styles.logo}>&#10022; Equinox Resonance</span>
          <div style={styles.btnGroup}>
            <button onClick={onReturnToLanding} style={styles.ghostBtn}>
              &#8592; Return
            </button>
            {onToggleMute && (
              <button onClick={onToggleMute} style={styles.ghostBtn}>
                {isMuted ? '\u{1F507} Unmute' : '\u{1F50A} Mute'}
              </button>
            )}
            <button onClick={() => setAboutOpen(true)} style={styles.ghostBtn}>
              About
            </button>
          </div>
        </div>

        </div>

      {/* About modal */}
      {aboutOpen && (
        <div style={styles.modalOverlay} onClick={() => setAboutOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>About Equinox Resonance</h2>
            <p style={styles.modalText}>
              An interactive audio-visual experience for the spring equinox, built during the 2026 spring equinox on March 20, 2026.
            </p>
            <p style={styles.modalText}>
              Grant microphone access to let your voice and environment affect the visuals.
              Grant camera access to see your face rendered as a constellation of light.
            </p>
            <p style={styles.modalText}>
              Built by <a href="http://seanmulholland.com" target="_blank" style={{ color: '#C45B28' }}>Sean Mulholland</a> with sacred geometry, 432 Hz tuning, and the Pacific sunset in California.
            </p>
            <button onClick={() => setAboutOpen(false)} style={styles.modalClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const glass: React.CSSProperties = {
  background: 'rgba(245, 240, 225, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(180, 160, 120, 0.35)',
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
  btnGroup: {
    display: 'flex',
    gap: 8,
  },
  logo: {
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    color: '#4A3A1E',
    fontFamily: "'Coiny', Georgia, serif",
    textShadow: '0 0 6px rgba(212,168,67,0.3)',
  },
  ghostBtn: {
    background: 'transparent',
    border: '1px solid rgba(180,160,120,0.4)',
    borderRadius: 20,
    color: '#4A3A1E',
    fontSize: '0.8rem',
    letterSpacing: '0.1em',
    padding: '6px 14px',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: "'Coiny', Georgia, serif",
    textShadow: '0 0 6px rgba(212,168,67,0.25)',
    transition: 'color 0.2s, border-color 0.2s, background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(245,240,225,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  modal: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(180, 160, 120, 0.35)',
    borderRadius: 16,
    padding: '32px 36px',
    maxWidth: 480,
    width: '90%',
    color: '#4A3A1E',
    fontFamily: "'Coiny', Georgia, serif",
  },
  modalTitle: {
    fontSize: '1.2rem',
    letterSpacing: '0.15em',
    marginTop: 0,
    marginBottom: 16,
    color: '#4A3A1E',
    textShadow: '0 0 8px rgba(212,168,67,0.3)',
  },
  modalText: {
    fontSize: '0.9rem',
    lineHeight: 1.6,
    marginBottom: 12,
    color: '#6B5B3A',
  },
  modalClose: {
    marginTop: 12,
    background: 'transparent',
    border: '1px solid rgba(180,160,120,0.4)',
    borderRadius: 20,
    color: '#4A3A1E',
    textShadow: '0 0 6px rgba(212,168,67,0.25)',
    fontSize: '0.85rem',
    padding: '8px 24px',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: "'Coiny', Georgia, serif",
  },
}
