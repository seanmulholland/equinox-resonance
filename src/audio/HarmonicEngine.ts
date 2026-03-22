/**
 * HarmonicEngine — ambient dreamscape generator.
 *
 * Layers:
 *  1. Noise wash  — filtered pink noise that breathes with a slow LFO
 *  2. Pad tones   — slow-attack/long-release sine pads, randomly triggered
 *  3. Sparkles    — high, quiet bell tones with long reverb tails
 *
 * All tuned to 432 Hz just intonation.
 * Long convolver reverb (6s tail) for spacious dreamscape feel.
 * No constant drone — silence between events creates breathing room.
 */

import type { AudioData } from '../types'

// Just-intonation ratios from 432 Hz
const BASE = 432
const SCALE = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2].map(r => BASE * r)

// Solfeggio accents
const SOLFEGGIO = [396, 528, 639, 741]

export class HarmonicEngine {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private micAnalyser: AnalyserNode | null = null
  private micWaveData: Float32Array<ArrayBuffer> = new Float32Array(0)
  private masterGain: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private dryGain: GainNode | null = null
  private _muted = false

  // Noise wash
  private noiseNode: AudioBufferSourceNode | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private noiseLfo: OscillatorNode | null = null
  private noiseGain: GainNode | null = null

  // Timers
  private padTimer: ReturnType<typeof setTimeout> | null = null
  private sparkleTimer: ReturnType<typeof setTimeout> | null = null

  // Analysis
  private freqData: Float32Array<ArrayBuffer> = new Float32Array(0)
  private waveData: Float32Array<ArrayBuffer> = new Float32Array(0)

  async init(micStream?: MediaStream) {
    this.ctx = new AudioContext()

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime)

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.85
    this.freqData = new Float32Array(this.analyser.frequencyBinCount) as Float32Array<ArrayBuffer>
    this.waveData = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>

    this.masterGain.connect(this.ctx.destination)

    // Long reverb — 6s tail, spacious dreamscape
    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(6.0, 0.35)
    this.reverbGain = this.ctx.createGain()
    this.reverbGain.gain.value = 0.7  // heavy wet mix
    this.dryGain = this.ctx.createGain()
    this.dryGain.gain.value = 0.4

    this.dryGain.connect(this.masterGain)
    this.reverb.connect(this.reverbGain)
    this.reverbGain.connect(this.masterGain)

    // Layer 1: Breathing noise wash
    this.buildNoiseWash()

    // Layer 2: Pad tones
    this.schedulePads()

    // Layer 3: Sparkles
    this.scheduleSparkles()

    // Mic input
    if (micStream) {
      const micSrc = this.ctx.createMediaStreamSource(micStream)
      const micGain = this.ctx.createGain()
      micGain.gain.value = 1
      micSrc.connect(micGain)
      micGain.connect(this.analyser)

      this.micAnalyser = this.ctx.createAnalyser()
      this.micAnalyser.fftSize = 2048
      this.micAnalyser.smoothingTimeConstant = 0.5
      this.micWaveData = new Float32Array(this.micAnalyser.fftSize) as Float32Array<ArrayBuffer>
      micSrc.connect(this.micAnalyser)
    }

    // Gentle fade in
    this.masterGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 5)
  }

  // ─── Noise Wash ──────────────────────────────────────────────────

  private buildNoiseWash() {
    if (!this.ctx || !this.dryGain || !this.reverb) return

    // Create a looping noise buffer (pink-ish)
    const len = this.ctx.sampleRate * 4
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      // Simple pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + white * 0.0990460
        b1 = 0.96300 * b1 + white * 0.2965164
        b2 = 0.57000 * b2 + white * 1.0526913
        d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.06
      }
    }

    this.noiseNode = this.ctx.createBufferSource()
    this.noiseNode.buffer = buf
    this.noiseNode.loop = true

    // Bandpass filter — breathes with LFO
    this.noiseFilter = this.ctx.createBiquadFilter()
    this.noiseFilter.type = 'bandpass'
    this.noiseFilter.frequency.value = 400
    this.noiseFilter.Q.value = 0.8

    // Slow LFO modulating the filter frequency — creates breathing
    this.noiseLfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    this.noiseLfo.frequency.value = 0.04  // one breath every ~25s
    lfoGain.gain.value = 300
    this.noiseLfo.connect(lfoGain)
    lfoGain.connect(this.noiseFilter.frequency)

    this.noiseGain = this.ctx.createGain()
    this.noiseGain.gain.value = 0.25  // background texture

    this.noiseNode.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.dryGain)
    this.noiseGain.connect(this.reverb)

    this.noiseNode.start()
    this.noiseLfo.start()
  }

  // ─── Pad Tones ───────────────────────────────────────────────────

  private schedulePads() {
    if (!this.ctx) return

    const play = () => {
      if (!this.ctx) return
      const now = this.ctx.currentTime

      // Pick a random note from the scale, 1-2 octaves down
      const note = SCALE[Math.floor(Math.random() * SCALE.length)]
      const octave = Math.random() < 0.3 ? 0.25 : 0.5
      this.playPad(note * octave, now, 6 + Math.random() * 4, 0.12)

      // Sometimes layer a solfeggio harmony
      if (Math.random() < 0.3) {
        const sf = SOLFEGGIO[Math.floor(Math.random() * SOLFEGGIO.length)]
        this.playPad(sf * 0.5, now + 1.5, 5 + Math.random() * 3, 0.06)
      }

      // Next pad in 4-8 seconds — creates breathing room
      const next = 4000 + Math.random() * 4000
      this.padTimer = setTimeout(play, next)
    }

    this.padTimer = setTimeout(play, 2000)
  }

  private playPad(freq: number, time: number, duration: number, gain: number) {
    if (!this.ctx || !this.dryGain || !this.reverb) return

    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq

    // Very slow attack, long sustain, gentle release
    const attack = 1.5 + Math.random() * 1.5
    const release = duration * 0.4
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(gain, time + attack)
    env.gain.setValueAtTime(gain, time + duration - release)
    env.gain.exponentialRampToValueAtTime(0.001, time + duration)

    // Subtle detune for warmth
    osc.detune.value = (Math.random() - 0.5) * 8

    osc.connect(env)
    env.connect(this.dryGain)
    env.connect(this.reverb!)

    osc.start(time)
    osc.stop(time + duration + 0.1)
  }

  // ─── Sparkles ────────────────────────────────────────────────────

  private scheduleSparkles() {
    if (!this.ctx) return

    const play = () => {
      if (!this.ctx) return
      const now = this.ctx.currentTime

      // High, quiet bell tone
      const note = SCALE[Math.floor(Math.random() * SCALE.length)]
      // 1-2 octaves UP for sparkle
      const octave = Math.random() < 0.5 ? 2 : 4
      this.playSparkle(note * octave, now, 0.04 + Math.random() * 0.04)

      // Next sparkle in 3-10 seconds
      const next = 3000 + Math.random() * 7000
      this.sparkleTimer = setTimeout(play, next)
    }

    this.sparkleTimer = setTimeout(play, 3000)
  }

  private playSparkle(freq: number, time: number, gain: number) {
    if (!this.ctx || !this.reverb) return

    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = Math.min(freq, 4000) // cap to avoid harshness

    // Quick attack, long decay — bell-like
    const decay = 1.5 + Math.random() * 2
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(gain, time + 0.01)
    env.gain.exponentialRampToValueAtTime(0.001, time + decay)

    osc.connect(env)
    // Sparkles go mostly to reverb for that dreamy tail
    env.connect(this.reverb!)

    osc.start(time)
    osc.stop(time + decay + 0.1)
  }

  // ─── Reverb impulse synthesis ──────────────────────────────────────

  private makeImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const length = Math.floor(ctx.sampleRate * duration)
    const buf = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return buf
  }

  // ─── Analysis ─────────────────────────────────────────────────────

  getAudioData(): AudioData {
    if (!this.analyser || !this.ctx) {
      return { frequency: new Float32Array(0), waveform: new Float32Array(0), bass: 0, mid: 0, high: 0, rms: 0 }
    }

    this.analyser.getFloatFrequencyData(this.freqData)
    this.analyser.getFloatTimeDomainData(this.waveData)

    const binHz = (this.ctx.sampleRate / 2) / this.freqData.length
    const avg = (lo: number, hi: number) => {
      const s = Math.floor(lo / binHz)
      const e = Math.min(Math.ceil(hi / binHz), this.freqData.length - 1)
      let sum = 0
      for (let i = s; i <= e; i++) sum += this.freqData[i]
      return Math.max(0, Math.min(1, (sum / (e - s + 1) + 140) / 140))
    }

    let rmsSum = 0
    for (let i = 0; i < this.waveData.length; i++) rmsSum += this.waveData[i] ** 2
    const rms = Math.sqrt(rmsSum / this.waveData.length)

    return {
      frequency: this.freqData,
      waveform:  this.waveData,
      bass:  avg(20, 250),
      mid:   avg(250, 4000),
      high:  avg(4000, 20000),
      rms,
    }
  }

  getMicRms(): number {
    if (!this.micAnalyser) return 0
    this.micAnalyser.getFloatTimeDomainData(this.micWaveData)
    let sum = 0
    for (let i = 0; i < this.micWaveData.length; i++) sum += this.micWaveData[i] ** 2
    return Math.sqrt(sum / this.micWaveData.length)
  }

  reactToInput(rms: number) {
    if (!this.ctx || !this.masterGain || this._muted) return
    const t = this.ctx.currentTime
    const vol = 0.55 + rms * 0.25
    this.masterGain.gain.linearRampToValueAtTime(Math.min(vol, 0.8), t + 0.1)
  }

  resume() {
    this._muted = false
    if (!this.masterGain || !this.ctx) return
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 0.3)
  }
  suspend() {
    this._muted = true
    if (!this.masterGain || !this.ctx) return
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime)
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3)
  }

  destroy() {
    if (this.padTimer) clearTimeout(this.padTimer)
    if (this.sparkleTimer) clearTimeout(this.sparkleTimer)
    try { this.noiseNode?.stop() } catch {}
    try { this.noiseLfo?.stop() } catch {}
    this.ctx?.close()
    this.ctx = null
  }
}
