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

export function FractalBackground({ audioDataRef }: Props) {
  const matRef  = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid:  { value: 0 },
    uRms:  { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    const ad = audioDataRef.current
    matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    matRef.current.uniforms.uBass.value = ad.bass
    matRef.current.uniforms.uMid.value  = ad.mid
    matRef.current.uniforms.uRms.value  = ad.rms

    // Lock to camera — always directly in front, far enough to be behind everything
    meshRef.current.position.copy(camera.position)
    meshRef.current.quaternion.copy(camera.quaternion)
    // Push it forward (into the screen) along the camera's look direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    meshRef.current.position.addScaledVector(forward, 50)
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
