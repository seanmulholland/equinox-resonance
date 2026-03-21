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

  useEffect(() => { engine?.resume() }, [engine])
  useEffect(() => () => { engine?.destroy() }, [engine])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* CSS sunset — persistent base layer, identical to landing page */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, #05091f 0%, #0d1f50 18%, #14388c 32%, #c05878 50%, #f29a3e 62%, #74a8db 80%, #b4cbef 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: '52%', left: 0, right: 0, height: '2px', pointerEvents: 'none',
        background: 'linear-gradient(to right, transparent, #f5c060, #fff8e1, #f5c060, transparent)',
        opacity: 0.6, boxShadow: '0 0 40px 12px rgba(245,192,96,0.4)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.8,
        backgroundImage: `
          radial-gradient(1px 1px at 15% 12%, rgba(255,255,255,0.9) 0%, transparent 100%),
          radial-gradient(1px 1px at 35%  8%, rgba(255,255,255,0.7) 0%, transparent 100%),
          radial-gradient(1.5px 1.5px at 55% 5%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(1px 1px at 72% 10%, rgba(255,255,255,0.6) 0%, transparent 100%),
          radial-gradient(1px 1px at 88%  7%, rgba(255,255,255,0.9) 0%, transparent 100%),
          radial-gradient(1px 1px at  8% 22%, rgba(255,255,255,0.5) 0%, transparent 100%),
          radial-gradient(1px 1px at 92% 18%, rgba(255,255,255,0.7) 0%, transparent 100%)`,
      }} />

      {/* Persistent sun — lives in the BG layer so viz effects render over it */}
      <div style={{
        position: 'absolute',
        top: 'calc(52% - 60px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120, height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #fff8c0 0%, #f5c060 30%, #f5a623 55%, rgba(245,166,35,0.3) 80%, rgba(245,100,35,0) 100%)',
        boxShadow: '0 0 60px 35px rgba(245,166,35,0.45), 0 0 120px 60px rgba(245,100,35,0.2)',
        pointerEvents: 'none',
      }} />

      {/* Canvas with mix-blend-mode:screen — black=transparent, colours add over the CSS sunset */}
      <div ref={sceneWrap} style={{
        position: 'absolute', inset: 0, opacity: 0, zIndex: 1,
        mixBlendMode: 'screen',
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
            top: 'calc(52% - 60px)',
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

      <GhostUI appState={appState} onReturnToLanding={handleReturnToLanding} />
    </div>
  )
}
