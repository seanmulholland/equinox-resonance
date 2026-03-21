/**
 * AvatarConstellation — 468 MediaPipe face landmarks as a glowing particle face.
 * Reference: bright cyan/teal dense particles, pink halo ring behind head.
 * Fallback: Metatron's Cube flat on horizon, rotating.
 */

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { particlesVert, particlesFrag } from '../shaders'
import { randomSacredGeometry } from '../geometry/sacredGeometry'
import type { AudioData } from '../types'

interface Props {
  audioDataRef: React.RefObject<AudioData>
  landmarks: number[][] | null
  mode: 'constellation' | 'fallback'
}

const LANDMARK_COUNT = 468
const FALLBACK_COUNT = 2000

export function AvatarConstellation({ audioDataRef, landmarks, mode }: Props) {
  const matRef    = useRef<THREE.ShaderMaterial>(null)
  const geoRef    = useRef<THREE.BufferGeometry>(null)
  const haloRef   = useRef<THREE.Mesh>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const livePositions = useRef(new Float32Array(LANDMARK_COUNT * 3))
  const blendT    = useRef(0)
  const modeBlend = useRef(0)
  const prevMode  = useRef(mode)
  const shapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Current and next shape for crossfading
  const fallbackA = useRef(generateFallback())
  const fallbackB = useRef(generateFallback())
  const shapeFade = useRef(0) // 0 = show A, 1 = show B
  const [, forceUpdate] = useState(0)

  // Generate a new random sacred geometry shape, scaled for the scene
  function generateFallback(): Float32Array {
    const raw = randomSacredGeometry(FALLBACK_COUNT)
    const out = new Float32Array(raw.length)
    for (let i = 0; i < raw.length; i += 3) {
      out[i + 0] = raw[i + 0] * 2.5
      out[i + 1] = raw[i + 2] * 0.3
      out[i + 2] = raw[i + 1] * 2.5
    }
    return out
  }

  // Periodically morph to a new shape every ~20s
  useEffect(() => {
    const cycle = () => {
      // Generate new shape into the "off" buffer, then crossfade
      if (shapeFade.current < 0.5) {
        fallbackB.current = generateFallback()
        gsap.to(shapeFade, { current: 1, duration: 3, ease: 'power2.inOut' })
      } else {
        fallbackA.current = generateFallback()
        gsap.to(shapeFade, { current: 0, duration: 3, ease: 'power2.inOut' })
      }
      shapeTimer.current = setTimeout(cycle, 4000)
    }
    shapeTimer.current = setTimeout(cycle, 4000)
    return () => { if (shapeTimer.current) clearTimeout(shapeTimer.current) }
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

  useEffect(() => {
    if (prevMode.current !== mode) {
      const target = mode === 'constellation' ? 1 : 0
      const tween = { t: modeBlend.current }
      gsap.to(tween, {
        t: target, duration: 2.0, ease: 'power2.inOut',
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

    const ad = audioDataRef.current
    const t  = clock.getElapsedTime()

    matRef.current.uniforms.uTime.value = t
    matRef.current.uniforms.uBass.value = ad.bass
    matRef.current.uniforms.uMid.value  = ad.mid
    matRef.current.uniforms.uRms.value  = ad.rms
    matRef.current.uniforms.uConstellationMode.value = modeBlend.current

    // Halo: pulses with bass, visible only in constellation mode
    if (haloRef.current && haloMatRef.current) {
      const haloScale = 1.0 + ad.bass * 0.15
      haloRef.current.scale.setScalar(haloScale)
      haloRef.current.rotation.z = t * 0.05
      ;(haloMatRef.current as any).opacity = modeBlend.current * (0.25 + ad.bass * 0.15)
    }

    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute

    // Normalize face to always fill ~65vh regardless of camera distance.
    // 1) Find bounding box of raw landmarks
    // 2) Center and scale to a fixed scene-space size
    if (landmarks && landmarks.length === LANDMARK_COUNT) {
      let minX = Infinity, maxX = -Infinity
      let minY = Infinity, maxY = -Infinity
      let minZ = Infinity, maxZ = -Infinity
      for (let i = 0; i < LANDMARK_COUNT; i++) {
        const [lx, ly, lz] = landmarks[i]
        if (lx < minX) minX = lx; if (lx > maxX) maxX = lx
        if (ly < minY) minY = ly; if (ly > maxY) maxY = ly
        const z = lz ?? 0
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
      }

      const cx = (minX + maxX) * 0.5
      const cy = (minY + maxY) * 0.5
      const cz = (minZ + maxZ) * 0.5
      const spanX = maxX - minX || 0.001
      const spanY = maxY - minY || 0.001
      const spanZ = maxZ - minZ || 0.001
      // Use the larger of X/Y span to maintain aspect ratio
      const span = Math.max(spanX, spanY)

      // Target size: ±2.8 Y (fills ~70vh at cam z=7, fov=65)
      const TARGET_HALF = 2.8
      const scale = (TARGET_HALF * 2) / span

      for (let i = 0; i < LANDMARK_COUNT; i++) {
        const [lx, ly, lz] = landmarks[i]
        livePositions.current[i * 3 + 0] = -(lx - cx) * scale        // centered X, mirrored for natural feel
        livePositions.current[i * 3 + 1] = -(ly - cy) * scale        // centered Y, flipped
        livePositions.current[i * 3 + 2] = -((lz ?? 0) - cz) * scale * 0.5  // Z: negated, less depth exaggeration
      }
    }

    const blend = blendT.current
    const rot   = t * 0.18
    const cosR  = Math.cos(rot), sinR = Math.sin(rot)
    const count = uniformCount
    const sf = shapeFade.current
    const shapeA = fallbackA.current
    const shapeB = fallbackB.current

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      // Blend between two shape buffers for smooth morphing
      const aLen = shapeA.length / 3
      const bLen = shapeB.length / 3
      const ai = i % aLen
      const bi = i % bLen
      const fx = shapeA[ai * 3 + 0] * (1 - sf) + shapeB[bi * 3 + 0] * sf
      const fy = shapeA[ai * 3 + 1] * (1 - sf) + shapeB[bi * 3 + 1] * sf
      const fz = shapeA[ai * 3 + 2] * (1 - sf) + shapeB[bi * 3 + 2] * sf
      const rx = fx * cosR - fz * sinR
      const rz = fx * sinR + fz * cosR

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
    () => fallbackA.current.slice(0, uniformCount * 3),
    [uniformCount]
  )

  return (
    <group>
      {/* Pink/magenta halo arch behind the face — scaled to match larger face */}
      <mesh ref={haloRef} position={[0, 0.6, -1.0]}>
        <ringGeometry args={[4.2, 5.0, 80]} />
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

      {/* Face / sacred geometry particles */}
      <points>
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
