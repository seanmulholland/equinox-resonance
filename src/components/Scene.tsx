import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { FractalBackground } from './FractalBackground'
import { ParticleField } from './ParticleField'
import { AvatarConstellation } from './AvatarConstellation'
import { fermatSpiral } from '../geometry/sacredGeometry'
import type { AudioData, AppState } from '../types'

interface Props {
  audioDataRef: React.RefObject<AudioData>
  landmarks: number[][] | null
  appState: AppState
}

/**
 * All child components receive audioDataRef directly and read .current
 * inside their own useFrame callback — no prop stale-ness issues.
 */
function SceneInner({ audioDataRef, landmarks, appState }: Props) {
  const bgPositions = useMemo(() => fermatSpiral(6000), [])
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
      <group position={[0, -0.3, 0]}>
        <AvatarConstellation
          audioDataRef={audioDataRef}
          landmarks={landmarks}
          mode={mode}
        />
      </group>
      <OrbitControls
        target={[0, -0.3, 0]}
        enablePan={false}
        enableZoom={false}
        autoRotate={appState !== 'constellation'}
        autoRotateSpeed={0.25}
        rotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.65}
      />
      <EffectComposer>
        <Bloom intensity={2.2} luminanceThreshold={0.1} luminanceSmoothing={0.92} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

export function Scene({ audioDataRef, landmarks, appState }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 7], fov: 65, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#02040f' }}
    >
      <Suspense fallback={null}>
        <SceneInner audioDataRef={audioDataRef} landmarks={landmarks} appState={appState} />
      </Suspense>
    </Canvas>
  )
}
