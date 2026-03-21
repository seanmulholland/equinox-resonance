/**
 * Sacred geometry generators.
 * Returns Float32Array of XYZ positions for use in BufferGeometry.
 *
 * - Metatron's Cube: 13 circles arranged in the Fruit of Life pattern
 * - Fermat's Spiral: golden-angle point cloud (φ = 137.5°)
 */

const PHI = (1 + Math.sqrt(5)) / 2  // golden ratio ≈ 1.618
const TAU = Math.PI * 2

/** Metatron's Cube — 13-circle Fruit of Life, ~3000 points */
export function metatronsCube(count = 3000): Float32Array {
  const positions: number[] = []

  // 13 circle centers: 1 center + 6 inner + 6 outer
  const centers: [number, number][] = [[0, 0]]
  const innerR = 1.0
  const outerR = 2.0

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    centers.push([Math.cos(a) * innerR, Math.sin(a) * innerR])
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + TAU / 12
    centers.push([Math.cos(a) * outerR, Math.sin(a) * outerR])
  }

  const perCircle = Math.floor(count / 13)
  const circleR = 0.98  // radius of each circle

  for (const [cx, cy] of centers) {
    for (let j = 0; j < perCircle; j++) {
      const t = (j / perCircle) * TAU
      const x = cx + Math.cos(t) * circleR
      const y = cy + Math.sin(t) * circleR
      // Add slight Z variation based on golden ratio
      const z = Math.sin(t * PHI) * 0.15
      positions.push(x, y, z)
    }
  }

  return new Float32Array(positions)
}

/** Fermat's Spiral — golden angle phyllotaxis, ~3000 points */
export function fermatSpiral(count = 3000): Float32Array {
  const positions: number[] = []
  const goldenAngle = TAU / (PHI * PHI)
  const scale = 0.12

  for (let i = 0; i < count; i++) {
    const r = scale * Math.sqrt(i)
    const theta = i * goldenAngle
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    // Height follows a sine wave for 3D volume
    const z = Math.sin(r * 1.5) * 0.5
    positions.push(x, y, z)
  }

  return new Float32Array(positions)
}

/** Torus knot point cloud — (p=3, q=2) trefoil variant */
export function torusKnot(count = 3000, p = 3, q = 2): Float32Array {
  const positions: number[] = []
  const R = 1.2
  const r = 0.4

  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU * p
    // Standard torus knot parametric
    const phi = (q / p) * t
    const x = (R + r * Math.cos(phi)) * Math.cos(t)
    const y = (R + r * Math.cos(phi)) * Math.sin(t)
    const z = r * Math.sin(phi)
    positions.push(x, y, z)
  }

  return new Float32Array(positions)
}

/** Lissajous knot — symmetrical 3D curve, always looks balanced */
export function lissajousKnot(count = 3000, a = 2, b = 3, c = 5): Float32Array {
  const positions: number[] = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU
    const x = Math.sin(a * t + Math.PI / 2)
    const y = Math.sin(b * t)
    const z = Math.sin(c * t) * 0.5
    positions.push(x, y, z)
  }
  return new Float32Array(positions)
}

/** Rose curve — symmetrical petal pattern, flat on XY plane */
export function roseCurve(count = 3000, petals = 5): Float32Array {
  const positions: number[] = []
  // k = petals for odd petals, petals/2 for even
  const k = petals
  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU * 2  // 2 loops to fill all petals
    const r = 1.5 * Math.cos(k * t)
    const x = r * Math.cos(t)
    const y = r * Math.sin(t)
    const z = Math.sin(t * k * 0.5) * 0.2
    positions.push(x, y, z)
  }
  return new Float32Array(positions)
}

/**
 * Pick a random sacred geometry shape. Returns a normalized Float32Array.
 * All shapes are inherently symmetrical.
 */
export function randomSacredGeometry(count: number): Float32Array {
  const shapes = [
    () => metatronsCube(count),
    () => fermatSpiral(count),
    () => torusKnot(count, 3, 2),
    () => torusKnot(count, 2, 3),
    () => torusKnot(count, 5, 3),
    () => lissajousKnot(count, 2, 3, 5),
    () => lissajousKnot(count, 3, 4, 7),
    () => roseCurve(count, 5),
    () => roseCurve(count, 7),
    () => roseCurve(count, 3),
  ]
  const idx = Math.floor(Math.random() * shapes.length)
  return shapes[idx]()
}
