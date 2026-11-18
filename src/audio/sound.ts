import type { GasTestEffect } from '../domain/gasTests'
import type { Reaction } from '../domain/types'

type OscType = OscillatorType

/**
 * 用 Web Audio 实时合成实验音效，不依赖外部音频资源。
 * 浏览器要求音频上下文在用户手势中创建/恢复，所以由 store 在点击时调用 unlock()。
 */
class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false
  private lastBubbleAt = 0

  unlock(): void {
    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      try {
        this.context = new Ctor()
        this.master = this.context.createGain()
        this.master.gain.value = 0.2
        this.master.connect(this.context.destination)
      } catch {
        this.context = null
        this.master = null
        return
      }
    }
    if (this.context.state === 'suspended') {
      void this.context.resume()
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.2, this.context.currentTime, 0.03)
    }
  }

  get isMuted(): boolean {
    return this.muted
  }

  private ready(): boolean {
    if (!this.context || !this.master || this.muted) return false
    if (this.context.state === 'suspended') {
      void this.context.resume()
    }
    return true
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscType,
    gain: number,
    endFrequency?: number,
    delay = 0,
  ): void {
    const ctx = this.context
    const master = this.master
    if (!ctx || !master) return
    const start = ctx.currentTime + delay
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start)
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        start + duration,
      )
    }
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.02, duration * 0.2))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  private noise(
    duration: number,
    filterType: BiquadFilterType,
    frequency: number,
    gain: number,
    endFrequency?: number,
    delay = 0,
    q = 0.8,
  ): void {
    const ctx = this.context
    const master = this.master
    if (!ctx || !master) return
    const start = ctx.currentTime + delay
    const source = ctx.createBufferSource()
    source.buffer = this.getNoiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.Q.value = q
    filter.frequency.setValueAtTime(frequency, start)
    if (endFrequency) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFrequency),
        start + duration,
      )
    }
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.05, duration * 0.2))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(master)
    source.start(start)
    source.stop(start + duration + 0.03)
  }

  private getNoiseBuffer(): AudioBuffer {
    const ctx = this.context!
    if (this.noiseBuffer) return this.noiseBuffer
    const length = Math.floor(ctx.sampleRate * 1.4)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }
    this.noiseBuffer = buffer
    return buffer
  }

  playAdd(kind: 'pour' | 'solid' | 'drop'): void {
    if (!this.ready()) return
    if (kind === 'pour') {
      this.noise(0.6, 'lowpass', 1100, 0.075, 260, 0, 1.2)
      this.tone(190, 0.22, 'sine', 0.045, 120)
      this.tone(420, 0.12, 'sine', 0.02, 300, 0.18)
    } else if (kind === 'solid') {
      this.noise(0.07, 'highpass', 1800, 0.1, 900, 0, 0.7)
      this.tone(230, 0.06, 'square', 0.035, 170)
      this.tone(160, 0.14, 'sine', 0.03, 110, 0.05)
    } else {
      this.tone(920, 0.16, 'sine', 0.08, 460)
      this.tone(1300, 0.08, 'sine', 0.02, 900, 0.03)
    }
  }

  playReactionStart(reaction: Reaction): void {
    if (!this.ready()) return
    const isGas = Boolean(reaction.effects?.gas)
    const isPrecipitate = Boolean(reaction.effects?.precipitate)
    const isComplex = reaction.id === 'fe3-scn'
    const isExo = reaction.effects?.thermal !== 'endo'

    if (isExo) {
      this.noise(0.75, 'lowpass', 260, 0.06, 1300, 0, 1.4)
      this.tone(115, 0.7, 'sine', 0.05, 190)
    } else {
      this.noise(0.7, 'highpass', 900, 0.035, 2400, 0, 0.8)
      this.tone(380, 0.75, 'sine', 0.04, 170)
    }

    if (isGas) {
      this.noise(0.9, 'bandpass', 900, 0.045, 500, 0.05, 2.2)
      for (let i = 0; i < 7; i += 1) {
        this.tone(
          300 + Math.random() * 520,
          0.07 + Math.random() * 0.06,
          'sine',
          0.018,
          220 + Math.random() * 300,
          0.08 + Math.random() * 0.75,
        )
      }
    }

    if (isPrecipitate) {
      this.noise(0.5, 'highpass', 2600, 0.028, 4200, 0.02, 1.2)
      this.tone(520, 0.55, 'sine', 0.035, 690, 0.02)
    }

    if (isComplex) {
      this.tone(660, 0.5, 'sine', 0.05, 990, 0.02)
      this.tone(990, 0.4, 'sine', 0.025, 1320, 0.12)
    }

    if (!isGas && !isPrecipitate && !isComplex) {
      this.tone(330, 0.3, 'sine', 0.03, 440, 0.05)
      this.tone(440, 0.35, 'sine', 0.025, 550, 0.16)
    }
  }

  playReactionEnd(reaction: Reaction): void {
    if (!this.ready()) return
    if (reaction.effects?.gas) {
      this.tone(220, 0.12, 'sine', 0.045, 120)
    }
    this.tone(523.25, 0.55, 'sine', 0.045, 523.25, 0.02)
    this.tone(783.99, 0.7, 'sine', 0.04, 783.99, 0.14)
    this.tone(1046.5, 0.55, 'sine', 0.018, 1046.5, 0.26)
  }

  playBubble(): void {
    if (!this.ready()) return
    const ctx = this.context!
    if (ctx.currentTime - this.lastBubbleAt < 0.14) return
    this.lastBubbleAt = ctx.currentTime
    const frequency = 420 + Math.random() * 620
    this.tone(frequency, 0.055, 'sine', 0.012, frequency * 1.35)
  }

  playGasTest(effect: GasTestEffect, success: boolean): void {
    if (!this.ready()) return
    if (!success) {
      this.tone(190, 0.22, 'sine', 0.035, 140)
      this.tone(150, 0.26, 'sine', 0.02, 120, 0.08)
      return
    }
    if (effect === 'glow') {
      this.tone(880, 0.5, 'sine', 0.045, 1320)
      this.tone(1320, 0.36, 'sine', 0.022, 1760, 0.1)
      this.noise(0.3, 'highpass', 3000, 0.02, 5000, 0.02, 0.8)
    } else if (effect === 'milky') {
      this.noise(0.45, 'lowpass', 950, 0.035, 280, 0.02, 1)
      this.tone(330, 0.4, 'sine', 0.035, 440)
    } else if (effect === 'flame') {
      this.noise(0.4, 'bandpass', 620, 0.055, 1500, 0.01, 1.6)
      this.tone(220, 0.35, 'sine', 0.04, 110)
      this.tone(90, 0.3, 'sine', 0.03, 60, 0.12)
    } else {
      this.tone(660, 0.35, 'sine', 0.035, 880)
    }
  }

  playError(): void {
    if (!this.ready()) return
    this.tone(125, 0.18, 'square', 0.04, 95)
  }
}

export const sound = new SoundEngine()
