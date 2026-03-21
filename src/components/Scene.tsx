import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { FractalBackground } from './FractalBackground'
import { ParticleField } from './ParticleField'
import { AvatarConstellation } from './AvatarConstellation'
import { fermatSpiral } from '../geometry/sacredGeometry'
import type { AudioData, AppState } from '../types'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface Props {
  audioDataRef: React.RefObject<AudioData>
  landmarks: number[][] | null
  appState: AppState
}

/**
 * CameraWander — smoothly orbits via Lissajous path on the OrbitControls' target object.
 * Trick: we move the orbit *target* (not the camera) along a small wander path.
 * OrbitControls always keeps the camera looking at the target, so shifting the target
 * creates a natural parallax drift. Mouse drag still works because it rotates around
 * wherever the target currently is.
 */
function CameraWander({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  useFrame(({ clock }) => {
    const c = controlsRef.current
    if (!c) return

    const t = clock.getElapsedTime()

    // Non-linear Lissajous wander on the look-at target
    // Irrational frequency ratios so it never exactly repeats
    const tx = Math.sin(t * 0.031) * 0.8
             + Math.sin(t * 0.017 * 1.618) * 0.5
             + Math.sin(t * 0.009 * 2.236) * 0.3

    const ty = Math.sin(t * 0.023) * 0.3
             + Math.sin(t * 0.013 * 1.414) * 0.2

    c.target.x = tx
    c.target.y = ty
    c.update()
  })

  return null
}

function SceneInner({ audioDataRef, landmarks, appState }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const bgPositions = useMemo(() => fermatSpiral(3000), [])
  const bgScaled = useMemo(() => {
    const out = new Float32Array(bgPositions.length)
    for (let i = 0; i < bgPositions.length; i += 3) {
      out[i + 0] = bgPositions[i + 0] * 12
      out[i + 1] = bgPositions[i + 1] * 4
      out[i + 2] = bgPositions[i + 2] * 5
    }
    return out
  }, [bgPositions])

  const mode = appState === 'constellation' ? 'constellation' : 'fallback'

  return (
    <>
      <FractalBackground audioDataRef={audioDataRef} />
      <ParticleField     audioDataRef={audioDataRef} positions={bgScaled} />
      <group position={[0, 0, 0]}>
        <AvatarConstellation
          audioDataRef={audioDataRef}
          landmarks={landmarks}
          mode={mode}
        />
      </group>
      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.35}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
        minAzimuthAngle={-Math.PI / 2.5}
        maxAzimuthAngle={Math.PI / 2.5}
      />
      <CameraWander controlsRef={controlsRef} />
      <EffectComposer>
        <Bloom intensity={1.6} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

export function Scene({ audioDataRef, landmarks, appState }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 7], fov: 65, near: 0.1, far: 200 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: '#02040f' }}
    >
      <Suspense fallback={null}>
        <SceneInner audioDataRef={audioDataRef} landmarks={landmarks} appState={appState} />
      </Suspense>
    </Canvas>
  )
}
