import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { backgroundVert, backgroundFrag } from '../shaders'
import type { AudioData } from '../types'

interface Props {
  audioDataRef: React.RefObject<AudioData>
}

export function FractalBackground({ audioDataRef }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid:  { value: 0 },
    uRms:  { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (!matRef.current) return
    const ad = audioDataRef.current
    matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    matRef.current.uniforms.uBass.value = ad.bass
    matRef.current.uniforms.uMid.value  = ad.mid
    matRef.current.uniforms.uRms.value  = ad.rms
  })

  const w = viewport.width  * 4
  const h = viewport.height * 4

  return (
    <mesh position={[0, 0, -12]} renderOrder={-1}>
      <planeGeometry args={[w, h]} />
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
