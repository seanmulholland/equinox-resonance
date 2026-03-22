import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { FractalBackground } from './FractalBackground'
import { AvatarConstellation } from './AvatarConstellation'
import type { AudioData, AppState } from '../types'

interface Props {
  audioDataRef: React.RefObject<AudioData>
  landmarks: number[][] | null
  appState: AppState
}

const RADIUS = 7
// Slow, sweeping wander across the full view
const BASE_SPEED = 0.18

/**
 * CameraOrbit — continuously orbits the camera along a Lissajous path.
 * Wanders across the full spherical range for immersive coverage.
 * Disables itself when user is dragging (handled by parent via `enabled` prop).
 */
function CameraOrbit({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const wasEnabled = useRef(enabled)
  const azOffset = useRef(0)
  const polOffset = useRef(0)

  const startTime = useRef<number | null>(null)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    // Delay wander start so camera begins centered
    if (startTime.current === null) startTime.current = elapsed
    const t = Math.max(0, elapsed - startTime.current - 3)

    // Lissajous base values — fills ±60° (π/3 ≈ 1.047) organically
    const baseAz = Math.sin(t * BASE_SPEED) * 0.75
                 + Math.sin(t * BASE_SPEED * 1.618) * 0.2
                 + Math.sin(t * BASE_SPEED * 0.37) * 0.1
    const basePol = Math.sin(t * BASE_SPEED * 0.7) * 0.75
                  + Math.sin(t * BASE_SPEED * 0.43) * 0.2
                  + Math.sin(t * BASE_SPEED * 1.13) * 0.1

    // When re-enabling after drag, compute offset so we resume from current camera pos
    if (enabled && !wasEnabled.current) {
      const pos = camera.position
      const currentAz = Math.atan2(pos.x, pos.z)
      const currentPol = Math.acos(Math.max(-1, Math.min(1, pos.y / RADIUS))) - Math.PI * 0.5
      azOffset.current = currentAz - baseAz
      polOffset.current = currentPol - basePol
    }
    wasEnabled.current = enabled

    if (!enabled) return

    // ±60° in both axes — stay in front of the viz
    const LIMIT = Math.PI / 3  // 60°
    const az = Math.max(-LIMIT, Math.min(LIMIT, baseAz + azOffset.current))
    const pol = Math.max(Math.PI * 0.5 - LIMIT, Math.min(Math.PI * 0.5 + LIMIT, (Math.PI * 0.5) + basePol + polOffset.current))

    camera.position.x = RADIUS * Math.sin(pol) * Math.sin(az)
    camera.position.y = RADIUS * Math.cos(pol)
    camera.position.z = RADIUS * Math.sin(pol) * Math.cos(az)
    camera.lookAt(0, 0, 0)
  })

  return null
}

function ClearColorSetup() {
  const { gl } = useThree()
  useEffect(() => {
    // White clear color with 0 alpha — prevents dark edges on particles
    // (default alpha:true clears to black, causing dark halos on alpha-blended edges)
    gl.setClearColor(0xffffff, 0)
  }, [gl])
  return null
}

function SceneInner({ audioDataRef, landmarks, appState }: Props) {
  const [dragging, setDragging] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen on canvas directly — OrbitControls can't detect events when disabled
  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const onDown = () => {
      setDragging(true)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
    const onUp = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setDragging(false), 2000)
    }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  const mode = appState === 'constellation' ? 'constellation' : 'fallback'

  return (
    <>
      <ClearColorSetup />
      <FractalBackground audioDataRef={audioDataRef} />
      <group position={[0, 0, 0]}>
        <AvatarConstellation
          audioDataRef={audioDataRef}
          landmarks={landmarks}
          mode={mode}
        />
      </group>
      {/* OrbitControls only enabled during drag — otherwise CameraOrbit drives */}
      <OrbitControls
        enabled={true}
        target={[0, 0, 0]}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.35}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI / 2 - Math.PI / 3}
        maxPolarAngle={Math.PI / 2 + Math.PI / 3}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
      />
      <CameraOrbit enabled={!dragging} />
      <EffectComposer>
        <Bloom intensity={0.08} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.LINEAR} />
      </EffectComposer>
    </>
  )
}

export function Scene({ audioDataRef, landmarks, appState }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 7], fov: 65, near: 0.1, far: 200 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneInner audioDataRef={audioDataRef} landmarks={landmarks} appState={appState} />
      </Suspense>
    </Canvas>
  )
}
