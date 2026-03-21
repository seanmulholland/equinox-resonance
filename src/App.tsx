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

      {/* Persistent sun orb — warmer, more saturated like the album art */}
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
      }} />

      {/* Canvas — multiply blend so colours darken the cream base */}
      <div ref={sceneWrap} style={{
        position: 'absolute', inset: 0, opacity: 0, zIndex: 1,
        mixBlendMode: 'multiply',
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

      <GhostUI
        appState={appState}
        onReturnToLanding={handleReturnToLanding}
        onToggleMute={handleToggleMute}
        isMuted={muted}
      />
    </div>
  )
}
