/**
 * FractalBackground — always fills the viewport like an iOS live wallpaper.
 * Parented to the camera so it never shows edges during orbit.
 * Subtle parallax shift from audio gives it life.
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { backgroundVert, backgroundFrag } from '../shaders'
import type { AudioData } from '../types'

interface Props {
  audioDataRef: React.RefObject<AudioData>
}

// Pre-allocated vector — avoids GC pressure from per-frame allocations
const _forward = new THREE.Vector3()

export function FractalBackground({ audioDataRef }: Props) {
  const matRef  = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  // Sustained audio energy accumulator — ramps up with consistent sound
  const audioEnergy = useRef(0)

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uBass:        { value: 0 },
    uMid:         { value: 0 },
    uRms:         { value: 0 },
    uAudioEnergy: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    const ad = audioDataRef.current

    // Audio energy accumulator: builds up when sound is present, decays when silent
    // This keeps phasing "on" during sustained tones/amplitudes
    const signal = ad.rms + ad.bass * 0.5
    if (signal > 0.05) {
      audioEnergy.current = Math.min(audioEnergy.current + signal * 0.02, 2.0)
    } else {
      audioEnergy.current *= 0.995 // very slow decay
    }

    matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    matRef.current.uniforms.uBass.value = ad.bass
    matRef.current.uniforms.uMid.value  = ad.mid
    matRef.current.uniforms.uRms.value  = ad.rms
    matRef.current.uniforms.uAudioEnergy.value = audioEnergy.current

    // Lock to camera — always directly in front, far enough to be behind everything
    meshRef.current.position.copy(camera.position)
    meshRef.current.quaternion.copy(camera.quaternion)
    _forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    meshRef.current.position.addScaledVector(_forward, 50)
  })

  // Oversized plane — covers any FOV generously
  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[200, 120]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={backgroundVert}
        fragmentShader={backgroundFrag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
