import { useState, useRef, useCallback, useEffect } from 'react'
import { gsap } from 'gsap'
import { LandingPage } from './components/LandingPage'
import { PermissionModal } from './components/PermissionModal'
import { Scene } from './components/Scene'
import { GhostUI } from './components/GhostUI'
import { HarmonicEngine } from './audio/HarmonicEngine'
import { useAudioData } from './hooks/useAudioData'
import { useFaceMesh } from './hooks/useFaceMesh'
import type { AppState } from './types'

const SWATCH_COLORS = ['#D44A3A','#C47228','#D4A843','#4A7A3D','#5B8EC2','#C45B28','#D44A3A']
const SZ = 18
const GAP = 16
const PAD = 20

const swatch = (bg: string, x: number, y: number): React.CSSProperties => ({
  position: 'absolute', left: x, top: y,
  width: SZ, height: SZ, borderRadius: 3, opacity: 0.7, background: bg,
})

function CornerSwatches() {
  // Each corner: corner swatch at the corner point, 2 more along X, 2 more along Y
  // Colors rotate per corner so each gets a different slice of the 7
  const step = SZ + GAP // 34px between swatch centers
  const corners: Array<{ bx: number; by: number; dx: 1 | -1; dy: 1 | -1; colorOff: number }> = []

  // We'll compute positions in render using viewport-relative positioning via CSS
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {/* Top-left */}
      <div style={swatch(SWATCH_COLORS[0], PAD, PAD)} />
      <div style={swatch(SWATCH_COLORS[1], PAD + step, PAD)} />
      <div style={swatch(SWATCH_COLORS[2], PAD + step * 2, PAD)} />
      <div style={swatch(SWATCH_COLORS[3], PAD, PAD + step)} />
      <div style={swatch(SWATCH_COLORS[4], PAD, PAD + step * 2)} />

      {/* Top-right */}
      <div style={{ ...swatch(SWATCH_COLORS[2], 0, PAD), right: PAD, left: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[3], 0, PAD), right: PAD + step, left: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[4], 0, PAD), right: PAD + step * 2, left: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[5], 0, PAD + step), right: PAD, left: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[6], 0, PAD + step * 2), right: PAD, left: 'auto' }} />

      {/* Bottom-left */}
      <div style={{ ...swatch(SWATCH_COLORS[4], PAD, 0), bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[5], PAD + step, 0), bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[6], PAD + step * 2, 0), bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[0], PAD, 0), bottom: PAD + step, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[1], PAD, 0), bottom: PAD + step * 2, top: 'auto' }} />

      {/* Bottom-right */}
      <div style={{ ...swatch(SWATCH_COLORS[6], 0, 0), right: PAD, left: 'auto', bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[0], 0, 0), right: PAD + step, left: 'auto', bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[1], 0, 0), right: PAD + step * 2, left: 'auto', bottom: PAD, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[2], 0, 0), right: PAD, left: 'auto', bottom: PAD + step, top: 'auto' }} />
      <div style={{ ...swatch(SWATCH_COLORS[3], 0, 0), right: PAD, left: 'auto', bottom: PAD + step * 2, top: 'auto' }} />
    </div>
  )
}

export default function App() {
  const [appState, setAppState]   = useState<AppState>('landing')
  const [engine, setEngine]       = useState<HarmonicEngine | null>(null)
  const [camStream, setCamStream] = useState<MediaStream | null>(null)
  const [muted, setMuted]         = useState(false)
  const sceneWrap = useRef<HTMLDivElement>(null)

  const audioDataRef = useAudioData(engine)
  const { landmarks, videoRef } = useFaceMesh(camStream)

  const revealScene = useCallback((nextState: 'constellation' | 'fallback') => {
    setAppState(nextState)
    gsap.fromTo(sceneWrap.current,
      { opacity: 0 },
      { opacity: 1, duration: 2.2, ease: 'power2.inOut' }
    )
  }, [])

  const handleEnter = useCallback(() => setAppState('requesting'), [])

  const handleGrant = useCallback(async ({ mic, cam }: { mic: MediaStream; cam: MediaStream | null }) => {
    const e = new HarmonicEngine()
    await e.init(mic ?? undefined)
    setEngine(e)

    if (cam) {
      // Pass the SAME stream to useFaceMesh — no second getUserMedia
      setCamStream(cam)
      revealScene('constellation')
    } else {
      revealScene('fallback')
    }
  }, [revealScene])

  const handleDeny = useCallback(async () => {
    const e = new HarmonicEngine()
    await e.init()
    setEngine(e)
    revealScene('fallback')
  }, [revealScene])

  const handleReturnToLanding = useCallback(() => {
    gsap.to(sceneWrap.current, {
      opacity: 0, duration: 1.2, ease: 'power2.inOut',
      onComplete: () => {
        engine?.suspend()
        // Stop cam stream
        camStream?.getTracks().forEach(t => t.stop())
        setCamStream(null)
        setAppState('landing')
      },
    })
  }, [engine, camStream])

  const handleToggleMute = useCallback(() => {
    if (!engine) return
    setMuted(m => {
      if (m) engine.resume()
      else engine.suspend()
      return !m
    })
  }, [engine])

  useEffect(() => { engine?.resume() }, [engine])
  useEffect(() => () => { engine?.destroy() }, [engine])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* Retro cream base with graph paper grid */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#F5F0E1',
      }} />
      {/* Subtle graph paper grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.12,
        backgroundImage: `
          linear-gradient(rgba(180,160,120,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180,160,120,1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      {/* Warm radial vignette — darker edges like aged paper */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(180,150,100,0.15) 70%, rgba(120,90,50,0.3) 100%)',
      }} />

      {/* Persistent sun orb — always visible, above grid but below overlays */}
      <div style={{
        position: 'absolute',
        top: 'calc(50% - 60px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120, height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #FFE066 0%, #D4A843 35%, #C45B28 65%, rgba(196,91,40,0.2) 85%, transparent 100%)',
        boxShadow: '0 0 50px 30px rgba(212,168,67,0.35), 0 0 100px 50px rgba(196,91,40,0.15)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* Canvas — alpha-transparent, masked to fade corners to cream */}
      <div ref={sceneWrap} style={{
        position: 'absolute', inset: 0, opacity: 0, zIndex: 1,
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 100%)',
      }}>
        <Scene audioDataRef={audioDataRef} landmarks={landmarks} appState={appState} />
      </div>

      {/* Invisible click target over the sun — only active during viz */}
      {(appState === 'constellation' || appState === 'fallback') && (
        <button
          onClick={handleReturnToLanding}
          title="Return to home"
          style={{
            position: 'absolute',
            top: 'calc(50% - 60px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 120,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 5,
          }}
        />
      )}

      {/* Video element for MediaPipe — must be in DOM and renderable (not display:none) */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 1, height: 1, opacity: 0,
          pointerEvents: 'none', zIndex: -1,
        }}
        playsInline muted
      />

      {appState === 'landing' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <LandingPage onEnter={handleEnter} />
        </div>
      )}

      {appState === 'requesting' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <PermissionModal onGrant={handleGrant} onDeny={handleDeny} />
        </div>
      )}

      {/* Corner color swatches — visible during viz mode */}
      {(appState === 'constellation' || appState === 'fallback') && <CornerSwatches />}

      <GhostUI
        appState={appState}
        onReturnToLanding={handleReturnToLanding}
        onToggleMute={handleToggleMute}
        isMuted={muted}
      />
    </div>
  )
}
