/**
 * useAudioData — smoothed audio analysis at ~60fps.
 * Uses exponential moving average to eliminate jitter.
 * Returns a stable ref object — components read it in useFrame, no React re-renders.
 */

import { useEffect, useRef } from 'react'
import type { HarmonicEngine } from '../audio/HarmonicEngine'
import type { AudioData } from '../types'

// How fast to follow audio changes (lower = smoother but more lag)
const ALPHA = 0.06

const emptyAudio = (): AudioData => ({
  frequency: new Float32Array(0),
  waveform:  new Float32Array(0),
  bass: 0, mid: 0, high: 0, rms: 0,
})

export function useAudioData(engine: HarmonicEngine | null) {
  // Return a ref so Three.js reads it directly in useFrame — no React re-renders
  const dataRef = useRef<AudioData>(emptyAudio())
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    if (!engine) return

    const smoothed = { bass: 0, mid: 0, high: 0, rms: 0 }

    const tick = () => {
      const raw = engine.getAudioData()
      engine.reactToInput(raw.rms)

      // Exponential moving average — smooths out jitter without killing responsiveness
      smoothed.bass = smoothed.bass + ALPHA * (raw.bass - smoothed.bass)
      smoothed.mid  = smoothed.mid  + ALPHA * (raw.mid  - smoothed.mid)
      smoothed.high = smoothed.high + ALPHA * (raw.high - smoothed.high)
      smoothed.rms  = smoothed.rms  + ALPHA * (raw.rms  - smoothed.rms)

      dataRef.current = {
        frequency: raw.frequency,
        waveform:  raw.waveform,
        bass:  smoothed.bass,
        mid:   smoothed.mid,
        high:  smoothed.high,
        rms:   smoothed.rms,
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [engine])

  return dataRef
}
