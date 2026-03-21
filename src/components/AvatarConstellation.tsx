/**
 * AvatarConstellation — 468 MediaPipe face landmarks as a glowing particle face.
 * Reference: bright cyan/teal dense particles, pink halo ring behind head.
 * Fallback: Metatron's Cube flat on horizon, rotating.
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { particlesVert, particlesFrag } from '../shaders'
import { metatronsCube } from '../geometry/sacredGeometry'
import type { AudioData } from '../types'

interface Props {
  landmarks: number[][] | null
  audioData: AudioData
  mode: 'constellation' | 'fallback'
}

const LANDMARK_COUNT = 468
const FALLBACK_COUNT = 2000

export function AvatarConstellation({ landmarks, audioData, mode }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef    = useRef<THREE.ShaderMaterial>(null)
  const geoRef    = useRef<THREE.BufferGeometry>(null)
  const haloRef   = useRef<THREE.Mesh>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const livePositions = useRef(new Float32Array(LANDMARK_COUNT * 3))
  const blendT    = useRef(0)
  const modeBlend = useRef(0) // 0=fallback, 1=constellation
  const prevMode  = useRef(mode)

  // Metatron's Cube in horizon plane (XZ) — looks like a mandala from above
  const fallbackPositions = useMemo(() => {
    const raw = metatronsCube(FALLBACK_COUNT)
    const out = new Float32Array(raw.length)
    for (let i = 0; i < raw.length; i += 3) {
      out[i + 0] = raw[i + 0] * 2.5
      out[i + 1] = raw[i + 2] * 0.3
      out[i + 2] = raw[i + 1] * 2.5
    }
    return out
  }, [])

  const uniformCount = Math.max(LANDMARK_COUNT, FALLBACK_COUNT)

  const scales = useMemo(() => {
    const PHI = 1.6180339887
    const arr = new Float32Array(uniformCount)
    for (let i = 0; i < uniformCount; i++) arr[i] = 0.5 + ((i * PHI) % 1.0) * 0.7
    return arr
  }, [uniformCount])

  const uniforms = useMemo(() => ({
    uTime:               { value: 0 },
    uBass:               { value: 0 },
    uMid:                { value: 0 },
    uRms:                { value: 0 },
    uSize:               { value: 4.0 },
    uConstellationMode:  { value: 0.0 },
  }), [])

  // Smooth blend when mode changes
  useEffect(() => {
    if (prevMode.current !== mode) {
      const target = mode === 'constellation' ? 1 : 0
      const tween = { t: modeBlend.current }
      gsap.to(tween, {
        t: target,
        duration: 2.0,
        ease: 'power2.inOut',
        onUpdate: () => { modeBlend.current = tween.t },
      })
      blendT.current = 0
      gsap.to({ t: 0 }, {
        t: 1, duration: 1.8, ease: 'power2.inOut',
        onUpdate: function() { blendT.current = this.targets()[0].t },
      })
      prevMode.current = mode
    }
  }, [mode])

  useFrame(({ clock }) => {
    if (!matRef.current || !geoRef.current) return

    const t = clock.getElapsedTime()
    matRef.current.uniforms.uTime.value = t
    matRef.current.uniforms.uBass.value = audioData.bass
    matRef.current.uniforms.uMid.value  = audioData.mid
    matRef.current.uniforms.uRms.value  = audioData.rms
    matRef.current.uniforms.uConstellationMode.value = modeBlend.current

    // Halo: pink/magenta ring, pulses with bass, only in constellation mode
    if (haloRef.current && haloMatRef.current) {
      const haloScale = 1.0 + audioData.bass * 0.15
      haloRef.current.scale.setScalar(haloScale)
      haloRef.current.rotation.z = t * 0.05
      ;(haloMatRef.current as any).opacity = modeBlend.current * (0.5 + audioData.bass * 0.3)
    }

    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute

    if (landmarks && landmarks.length === LANDMARK_COUNT) {
      for (let i = 0; i < LANDMARK_COUNT; i++) {
        const [lx, ly, lz] = landmarks[i]
        livePositions.current[i * 3 + 0] = (lx - 0.5) * 5
        livePositions.current[i * 3 + 1] = -(ly - 0.5) * 3.8
        livePositions.current[i * 3 + 2] = (lz ?? 0) * 2
      }
    }

    const blend = blendT.current
    const rot   = t * 0.18
    const cosR  = Math.cos(rot), sinR = Math.sin(rot)
    const count = Math.min(uniformCount, fallbackPositions.length / 3)

    for (let i = 0; i < count; i++) {
      const fx = fallbackPositions[i * 3 + 0]
      const fy = fallbackPositions[i * 3 + 1]
      const fz = fallbackPositions[i * 3 + 2]
      const rx  = fx * cosR - fz * sinR
      const rz  = fx * sinR + fz * cosR

      if (mode === 'constellation' && i < LANDMARK_COUNT) {
        posAttr.array[i * 3 + 0] = THREE.MathUtils.lerp(rx, livePositions.current[i * 3 + 0], blend)
        posAttr.array[i * 3 + 1] = THREE.MathUtils.lerp(fy, livePositions.current[i * 3 + 1], blend)
        posAttr.array[i * 3 + 2] = THREE.MathUtils.lerp(rz, livePositions.current[i * 3 + 2], blend)
      } else {
        posAttr.array[i * 3 + 0] = rx
        posAttr.array[i * 3 + 1] = fy
        posAttr.array[i * 3 + 2] = rz
      }
    }

    posAttr.needsUpdate = true
  })

  const initPositions = useMemo(
    () => fallbackPositions.slice(0, uniformCount * 3),
    [fallbackPositions, uniformCount]
  )

  return (
    <group>
      {/* Pink/magenta halo arch behind the face — matches reference */}
      <mesh ref={haloRef} position={[0, 0.4, -0.5]}>
        <ringGeometry args={[2.1, 2.55, 80]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={new THREE.Color(0xff44cc)}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow disc — softer center bloom */}
      <mesh position={[0, 0.4, -0.6]}>
        <circleGeometry args={[2.1, 64]} />
        <meshBasicMaterial
          color={new THREE.Color(0x660033)}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Face particles */}
      <points ref={pointsRef}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[initPositions, 3]} />
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
    </group>
  )
}
