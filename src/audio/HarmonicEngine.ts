/**
 * HarmonicEngine — harmonic song generator.
 *
 * Three layers:
 *  1. Drone bed   — sub + detuned oscillators at 432 Hz, very quiet
 *  2. Arpeggio    — slow melodic sequencer stepping through sacred intervals
 *  3. Chimes      — random bell tones (just-intonation harmonics), reverb tail
 *
 * All tuned to 432 Hz just intonation.
 * Convolver reverb synthesized from a decaying noise burst.
 */

import type { AudioData } from '../types'

// Just-intonation ratios from 432 Hz
const BASE = 432
const SCALE = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2].map(r => BASE * r)
// => [432, 486, 540, 576, 648, 720, 810, 864] Hz

// Solfeggio accents — 396, 528, 639, 741 Hz
const SOLFEGGIO = [396, 528, 639, 741]

// Melodic sequence — indices into SCALE (pentatonic-ish)
const SEQUENCE = [0, 2, 4, 2, 7, 4, 5, 2, 0, 4, 7, 5]

export class HarmonicEngine {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private micAnalyser: AnalyserNode | null = null
  private micWaveData: Float32Array<ArrayBuffer> = new Float32Array(0)
  private masterGain: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private dryGain: GainNode | null = null

  // Drone
  private droneOscs: OscillatorNode[] = []
  private lfo: OscillatorNode | null = null

  // Arpeggio
  private arpeggioTimer: ReturnType<typeof setTimeout> | null = null
  private seqIndex = 0

  // Analysis
  private freqData: Float32Array<ArrayBuffer> = new Float32Array(0)
  private waveData: Float32Array<ArrayBuffer> = new Float32Array(0)

  async init(micStream?: MediaStream) {
    this.ctx = new AudioContext()

    // Master chain: dry → master → destination (synth output)
    //               master → analyser (analysis tap, NOT connected to destination)
    // Mic connects to analyser only — no path to destination = no feedback
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime)

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.85
    this.freqData = new Float32Array(this.analyser.frequencyBinCount) as Float32Array<ArrayBuffer>
    this.waveData = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>

    this.masterGain.connect(this.ctx.destination)  // synth → speakers
    this.masterGain.connect(this.analyser)          // synth → analysis tap (dead end)

    // Reverb — synthesize an impulse response (exponential decay noise)
    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(4.0, 0.5)  // 4s tail, slightly warm
    this.reverbGain = this.ctx.createGain()
    this.reverbGain.gain.value = 0.55
    this.dryGain = this.ctx.createGain()
    this.dryGain.gain.value = 0.7

    // Signal flow: sources → dryGain + reverbGain → masterGain
    this.dryGain.connect(this.masterGain)
    this.reverb.connect(this.reverbGain)
    this.reverbGain.connect(this.masterGain)

    // Layer 1: Drone bed
    this.buildDrone()

    // Layer 2: Arpeggio
    this.scheduleArpeggio()

    // Layer 3: Mic input — separate analyser so we can isolate mic-only signal
    if (micStream) {
      const micSrc = this.ctx.createMediaStreamSource(micStream)
      const micGain = this.ctx.createGain()
      micGain.gain.value = 1
      micSrc.connect(micGain)
      micGain.connect(this.analyser)          // mixed analyser (synth + mic)

      this.micAnalyser = this.ctx.createAnalyser()
      this.micAnalyser.fftSize = 2048
      this.micAnalyser.smoothingTimeConstant = 0.5  // faster response for mic
      this.micWaveData = new Float32Array(this.micAnalyser.fftSize) as Float32Array<ArrayBuffer>
      micSrc.connect(this.micAnalyser)        // mic-only analyser
    }

    // Fade in gently — half volume, background drone
    this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 4)
  }

  // ─── Drone ────────────────────────────────────────────────────────

  private buildDrone() {
    if (!this.ctx || !this.dryGain) return
    const detunes = [0, 3, -3, 7, -5]
    const types: OscillatorType[] = ['sine', 'sine', 'triangle', 'sine', 'triangle']

    detunes.forEach((detune, i) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = types[i]
      // 1-2 octaves lower: sub at BASE/4 (108Hz), harmonics at BASE/2 (216Hz)
      osc.frequency.value = i === 0 ? BASE / 4 : BASE / 2
      osc.detune.value = detune
      g.gain.value = i === 0 ? 0.072 : 0.03  // background drone, +20%
      osc.connect(g)
      g.connect(this.dryGain!)
      osc.start()
      this.droneOscs.push(osc)
    })

    // Slow LFO on filter of the sub
    this.lfo = this.ctx.createOscillator()
    const lfoFilter = this.ctx.createBiquadFilter()
    const lfoGain = this.ctx.createGain()
    lfoFilter.type = 'lowpass'
    lfoFilter.frequency.value = 300
    lfoFilter.Q.value = 2
    this.lfo.frequency.value = 0.08
    lfoGain.gain.value = 150
    this.lfo.connect(lfoGain)
    lfoGain.connect(lfoFilter.frequency)
    this.droneOscs[0].connect(lfoFilter)
    lfoFilter.connect(this.dryGain!)
    this.lfo.start()
  }

  // ─── Arpeggio ─────────────────────────────────────────────────────

  private scheduleArpeggio() {
    if (!this.ctx) return

    // Tempo: quarter note = 3s — very slow, meditative
    // Occasionally insert a Solfeggio accent
    const step = () => {
      if (!this.ctx) return
      const now = this.ctx.currentTime

      const freq = this.nextArpeggioFreq()
      this.playNote(freq, now, 2.8, 0.09)

      // Random Solfeggio harmonic bell ~ 25% of steps
      if (Math.random() < 0.25) {
        const sf = SOLFEGGIO[Math.floor(Math.random() * SOLFEGGIO.length)]
        // Bells 1 octave lower, half volume
        this.playBell(sf * 0.5, now + 0.6, 0.04)
      }

      // Vary tempo slightly — golden-ratio-ish feel
      const interval = 2600 + Math.sin(this.seqIndex * 1.618) * 400
      this.arpeggioTimer = setTimeout(step, interval)
    }

    // First note after 1.5s
    this.arpeggioTimer = setTimeout(step, 1500)
  }

  private nextArpeggioFreq(): number {
    const idx = SEQUENCE[this.seqIndex % SEQUENCE.length]
    this.seqIndex++
    // Drop everything 1 octave, occasionally 2 octaves for depth
    const octave = Math.random() < 0.15 ? 0.25 : 0.5
    return SCALE[idx] * octave
  }

  // A soft sine note with attack + decay
  private playNote(freq: number, time: number, duration: number, gain: number) {
    if (!this.ctx || !this.dryGain || !this.reverb) return
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    // Slight vibrato for life
    const vibLfo = this.ctx.createOscillator()
    const vibGain = this.ctx.createGain()
    vibLfo.frequency.value = 5.5
    vibGain.gain.value = 1.2
    vibLfo.connect(vibGain)
    vibGain.connect(osc.frequency)
    vibLfo.start(time)
    vibLfo.stop(time + duration + 1)

    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(gain, time + 0.08)
    env.gain.setValueAtTime(gain, time + duration * 0.3)
    env.gain.exponentialRampToValueAtTime(0.001, time + duration)

    osc.connect(env)
    env.connect(this.dryGain)
    env.connect(this.reverb!)  // wet signal

    osc.start(time)
    osc.stop(time + duration + 0.1)
  }

  // Bell tone — fundamental + 2 inharmonic partials
  private playBell(freq: number, time: number, gain: number) {
    if (!this.ctx || !this.dryGain || !this.reverb) return

    const partials = [
      { ratio: 1,    gain: gain },
      { ratio: 2.756, gain: gain * 0.4 },
      { ratio: 5.404, gain: gain * 0.15 },
    ]

    partials.forEach(({ ratio, gain: g }) => {
      const osc = this.ctx!.createOscillator()
      const env = this.ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * ratio

      const decay = 2.5 / ratio   // higher partials decay faster
      env.gain.setValueAtTime(0, time)
      env.gain.linearRampToValueAtTime(g, time + 0.005)
      env.gain.exponentialRampToValueAtTime(0.001, time + decay)

      osc.connect(env)
      env.connect(this.dryGain!)
      env.connect(this.reverb!)

      osc.start(time)
      osc.stop(time + decay + 0.1)
    })
  }

  // ─── Reverb impulse synthesis ──────────────────────────────────────

  private makeImpulse(duration: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const length = Math.floor(ctx.sampleRate * duration)
    const buf = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        // Pink-ish noise with exponential decay
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
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const vol = 0.35 + rms * 0.25
    this.masterGain.gain.linearRampToValueAtTime(Math.min(vol, 0.6), t + 0.1)
  }

  resume()  { this.ctx?.resume() }
  suspend() { this.ctx?.suspend() }

  destroy() {
    if (this.arpeggioTimer) clearTimeout(this.arpeggioTimer)
    this.droneOscs.forEach(o => { try { o.stop() } catch {} })
    this.lfo?.stop()
    this.ctx?.close()
    this.ctx = null
  }
}
