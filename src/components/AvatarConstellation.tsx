/**
 * AvatarConstellation — sacred geometry shape (always) + face overlay (constellation mode only).
 * Shape stays in warm sunset palette at all times.
 * Face particles fade in as a separate additive layer when camera permission is granted.
 */

import { useRef, useEffect, useMemo } from 'react'
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

// Generate a random sacred geometry shape scaled for the scene
function generateFallback(): Float32Array {
  const raw = randomSacredGeometry(FALLBACK_COUNT)
  const out = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i += 3) {
    out[i + 0] = raw[i + 0] * 3.5
    out[i + 1] = raw[i + 2] * 0.3
    out[i + 2] = raw[i + 1] * 3.5
  }
  return out
}

export function AvatarConstellation({ audioDataRef, landmarks, mode }: Props) {
  const shapeMatRef = useRef<THREE.ShaderMaterial>(null)
  const shapeGeoRef = useRef<THREE.BufferGeometry>(null)
  const faceMatRef  = useRef<THREE.ShaderMaterial>(null)
  const faceGeoRef  = useRef<THREE.BufferGeometry>(null)
  const haloRef     = useRef<THREE.Mesh>(null)
  const haloMatRef  = useRef<THREE.MeshBasicMaterial>(null)

  const faceAlpha  = useRef(0)
  const shapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Two shape buffers for smooth crossfade morphing
  const fallbackA = useRef(generateFallback())
  const fallbackB = useRef(generateFallback())
  const shapeFade = useRef(0) // 0 = fully A, 1 = fully B

  // Morph to a new shape every ~4s
  useEffect(() => {
    const cycle = () => {
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

  // Fade face overlay in when constellation + landmarks available
  const showFace = mode === 'constellation' && landmarks !== null && landmarks.length > 0
  useEffect(() => {
    gsap.to(faceAlpha, { current: showFace ? 1 : 0, duration: 2.0, ease: 'power2.inOut' })
  }, [showFace])

  const shapeScales = useMemo(() => {
    const PHI = 1.6180339887
    const arr = new Float32Array(FALLBACK_COUNT)
    for (let i = 0; i < FALLBACK_COUNT; i++) arr[i] = 0.5 + ((i * PHI) % 1.0) * 0.7
    return arr
  }, [])

  const faceScales = useMemo(() => {
    const PHI = 1.6180339887
    const arr = new Float32Array(LANDMARK_COUNT)
    for (let i = 0; i < LANDMARK_COUNT; i++) arr[i] = 0.6 + ((i * PHI) % 1.0) * 0.8
    return arr
  }, [])

  // Shape uses constellation palette — bright white/cyan bloomy dots like the reference
  const shapeUniforms = useMemo(() => ({
    uTime:              { value: 0 },
    uBass:              { value: 0 },
    uMid:               { value: 0 },
    uRms:               { value: 0 },
    uSize:              { value: 5.5 },
    uConstellationMode: { value: 1.0 },
    uAlpha:             { value: 1.0 },
  }), [])

  // Face overlay always uses constellation palette (uConstellationMode = 1), alpha driven by faceAlpha
  const faceUniforms = useMemo(() => ({
    uTime:              { value: 0 },
    uBass:              { value: 0 },
    uMid:               { value: 0 },
    uRms:               { value: 0 },
    uSize:              { value: 5.5 },
    uConstellationMode: { value: 1.0 },
    uAlpha:             { value: 0.0 },
  }), [])

  useFrame(({ clock }) => {
    const ad = audioDataRef.current
    const t  = clock.getElapsedTime()

    if (shapeMatRef.current) {
      shapeMatRef.current.uniforms.uTime.value = t
      shapeMatRef.current.uniforms.uBass.value = ad.bass
      shapeMatRef.current.uniforms.uMid.value  = ad.mid
      shapeMatRef.current.uniforms.uRms.value  = ad.rms
    }

    if (faceMatRef.current) {
      faceMatRef.current.uniforms.uTime.value  = t
      faceMatRef.current.uniforms.uBass.value  = ad.bass
      faceMatRef.current.uniforms.uMid.value   = ad.mid
      faceMatRef.current.uniforms.uRms.value   = ad.rms
      faceMatRef.current.uniforms.uAlpha.value = faceAlpha.current
    }

    // Halo pulses with bass, visible only when face is showing
    if (haloRef.current && haloMatRef.current) {
      haloRef.current.scale.setScalar(1.0 + ad.bass * 0.15)
      haloRef.current.rotation.z = t * 0.05
      ;(haloMatRef.current as any).opacity = faceAlpha.current * (0.25 + ad.bass * 0.15)
    }

    // ── Shape geometry — always rotating sacred pattern ──
    if (shapeGeoRef.current) {
      const posAttr = shapeGeoRef.current.attributes.position as THREE.BufferAttribute
      const rot  = t * 0.18
      const cosR = Math.cos(rot), sinR = Math.sin(rot)
      const sf     = shapeFade.current
      const shapeA = fallbackA.current
      const shapeB = fallbackB.current
      const aLen   = shapeA.length / 3
      const bLen   = shapeB.length / 3

      for (let i = 0; i < FALLBACK_COUNT; i++) {
        const ai = i % aLen
        const bi = i % bLen
        const fx = shapeA[ai * 3 + 0] * (1 - sf) + shapeB[bi * 3 + 0] * sf
        const fy = shapeA[ai * 3 + 1] * (1 - sf) + shapeB[bi * 3 + 1] * sf
        const fz = shapeA[ai * 3 + 2] * (1 - sf) + shapeB[bi * 3 + 2] * sf
        posAttr.array[i * 3 + 0] = fx * cosR - fz * sinR
        posAttr.array[i * 3 + 1] = fy
        posAttr.array[i * 3 + 2] = fx * sinR + fz * cosR
      }
      posAttr.needsUpdate = true
    }

    // ── Face geometry — landmarks mapped to 3D space ──
    if (faceGeoRef.current && landmarks && landmarks.length === LANDMARK_COUNT) {
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
      const span = Math.max(maxX - minX || 0.001, maxY - minY || 0.001)
      const scale = (2.8 * 2) / span

      const facePosAttr = faceGeoRef.current.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < LANDMARK_COUNT; i++) {
        const [lx, ly, lz] = landmarks[i]
        facePosAttr.array[i * 3 + 0] = -(lx - cx) * scale
        facePosAttr.array[i * 3 + 1] = -(ly - cy) * scale
        facePosAttr.array[i * 3 + 2] = -((lz ?? 0) - cz) * scale * 0.5
      }
      facePosAttr.needsUpdate = true
    }
  })

  const initShapePositions = useMemo(() => fallbackA.current.slice(0, FALLBACK_COUNT * 3), [])
  const initFacePositions  = useMemo(() => new Float32Array(LANDMARK_COUNT * 3), [])

  return (
    <group>
      {/* Pink/magenta halo ring — only visible when face is showing */}
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

      {/* Sacred geometry — always visible, sunset palette */}
      <points>
        <bufferGeometry ref={shapeGeoRef}>
          <bufferAttribute attach="attributes-position" args={[initShapePositions, 3]} />
          <bufferAttribute attach="attributes-aScale"   args={[shapeScales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={shapeMatRef}
          vertexShader={particlesVert}
          fragmentShader={particlesFrag}
          uniforms={shapeUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Face overlay — fades in with constellation mode */}
      <points>
        <bufferGeometry ref={faceGeoRef}>
          <bufferAttribute attach="attributes-position" args={[initFacePositions, 3]} />
          <bufferAttribute attach="attributes-aScale"   args={[faceScales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={faceMatRef}
          vertexShader={particlesVert}
          fragmentShader={particlesFrag}
          uniforms={faceUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
