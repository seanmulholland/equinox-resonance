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
    <div style={{ position: 'fixed', inset: 0, background: '#02040f' }}>
      <div ref={sceneWrap} style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 1 }}>
        <Scene audioDataRef={audioDataRef} landmarks={landmarks} appState={appState} />
        {/* Vignette overlay — sits ON TOP of canvas + bloom, masks edge bleed */}
        {/* Radial gradient: transparent center → sunset-colored edges */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(
            ellipse 70% 60% at 50% 50%,
            transparent 0%,
            transparent 30%,
            rgba(5, 9, 31, 0.3) 50%,
            rgba(5, 9, 31, 0.6) 65%,
            rgba(5, 9, 31, 0.85) 80%,
            rgba(2, 4, 15, 0.95) 100%
          )`,
        }} />
        {/* Top-to-bottom gradient to reinforce dark bottom / lighter top */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(
            to bottom,
            rgba(5, 9, 31, 0.0) 0%,
            rgba(5, 9, 31, 0.0) 40%,
            rgba(5, 9, 31, 0.4) 70%,
            rgba(2, 4, 15, 0.7) 100%
          )`,
        }} />
      </div>

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
