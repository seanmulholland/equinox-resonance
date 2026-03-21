/**
 * useAudioData — smoothed audio analysis at ~60fps.
 * Uses exponential moving average to eliminate jitter.
 * Returns a stable ref object — components read it in useFrame, no React re-renders.
 * Mutates the same object in-place to avoid GC pressure.
 */

import { useEffect, useRef } from 'react'
import type { HarmonicEngine } from '../audio/HarmonicEngine'
import type { AudioData } from '../types'

// How fast to follow audio changes (lower = smoother but more lag)
const ALPHA = 0.22

const emptyAudio = (): AudioData => ({
  frequency: new Float32Array(0),
  waveform:  new Float32Array(0),
  bass: 0, mid: 0, high: 0, rms: 0, micRms: 0,
})

export function useAudioData(engine: HarmonicEngine | null) {
  const dataRef = useRef<AudioData>(emptyAudio())
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    if (!engine) return

    const smoothed = { bass: 0, mid: 0, high: 0, rms: 0, micRms: 0 }

    const tick = () => {
      const raw = engine.getAudioData()
      engine.reactToInput(raw.rms)

      smoothed.bass = smoothed.bass + ALPHA * (raw.bass - smoothed.bass)
      smoothed.mid  = smoothed.mid  + ALPHA * (raw.mid  - smoothed.mid)
      smoothed.high = smoothed.high + ALPHA * (raw.high - smoothed.high)
      smoothed.rms  = smoothed.rms  + ALPHA * (raw.rms  - smoothed.rms)

      // Mic-only RMS — less smoothing for snappier response
      const rawMicRms = engine.getMicRms()
      smoothed.micRms = smoothed.micRms + 0.35 * (rawMicRms - smoothed.micRms)

      // Mutate in-place — no object allocation per frame
      const d = dataRef.current
      d.frequency = raw.frequency
      d.waveform  = raw.waveform
      d.bass  = smoothed.bass
      d.mid   = smoothed.mid
      d.high  = smoothed.high
      d.rms   = smoothed.rms
      d.micRms = smoothed.micRms

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [engine])

  return dataRef
}
