import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { particlesVert, particlesFrag } from '../shaders'
import type { AudioData } from '../types'

interface Props {
  positions: Float32Array
  audioData: AudioData
}

export function ParticleField({ positions, audioData }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const count  = positions.length / 3

  const scales = useMemo(() => {
    const PHI = 1.6180339887
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) arr[i] = 0.4 + ((i * PHI) % 1.0) * 1.0
    return arr
  }, [count])

  const uniforms = useMemo(() => ({
    uTime:              { value: 0 },
    uBass:              { value: 0 },
    uMid:               { value: 0 },
    uRms:               { value: 0 },
    uSize:              { value: 2.5 },
    uConstellationMode: { value: 0.0 }, // always fallback palette for bg
  }), [])

  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    matRef.current.uniforms.uBass.value = audioData.bass
    matRef.current.uniforms.uMid.value  = audioData.mid
    matRef.current.uniforms.uRms.value  = audioData.rms
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale"   args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={particlesVert}
        fragmentShader={particlesFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
