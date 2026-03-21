export type AppState = 'landing' | 'requesting' | 'constellation' | 'fallback'

export interface AudioData {
  frequency: Float32Array
  waveform: Float32Array
  bass: number      // 0–1
  mid: number       // 0–1
  high: number      // 0–1
  rms: number       // 0–1 overall intensity
}
