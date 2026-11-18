import { blendHexColors, type ColorWeight } from './color'
import { computePH, indicatorAppearance } from './ph'
import { REACTIONS } from './reactions'
import { REAGENTS, REAGENTS_BY_ID } from './reagents'
import { getSpecies, SPECIES_BY_ID } from './species'
import type {
  AddResult,
  ContentView,
  EngineEvent,
  LabSnapshot,
  LogEntry,
  Reaction,
  Species,
} from './types'

export const MAX_VOLUME_ML = 80
const BASE_WATER_COLOR = '#DDEEF0'
const TURBIDITY_FACTOR = 2200
const SETTLE_RATE = 0.34
const AMBIENT_TEMPERATURE = 25
const EPS = 1e-9

export interface ActiveReactionState {
  reaction: Reaction
  totalExtent: number
  extent: number
  rate: number
  startedAt: number
}

export interface EngineState {
  amounts: Map<string, number>
  suspended: Map<string, number>
  sediment: Map<string, number>
  gases: Map<string, number>
  volumeMl: number
  temperatureC: number
  ph: number
  solutionColor: string
  turbidity: number
  turbidityColor: string
  active: ActiveReactionState | null
  lastReactionId: string | null
  indicators: Set<string>
  log: LogEntry[]
  timeSec: number
  speed: number
  paused: boolean
  events: EngineEvent[]
}

function createInitialState(): EngineState {
  return {
    amounts: new Map(),
    suspended: new Map(),
    sediment: new Map(),
    gases: new Map(),
    volumeMl: 0,
    temperatureC: AMBIENT_TEMPERATURE,
    ph: 7,
    solutionColor: BASE_WATER_COLOR,
    turbidity: 0,
    turbidityColor: '#F2F0E8',
    active: null,
    lastReactionId: null,
    indicators: new Set(),
    log: [],
    timeSec: 0,
    speed: 1,
    paused: false,
    events: [],
  }
}

export class LabEngine {
  state: EngineState = createInitialState()
  private nextLogId = 1

  reset(): void {
    this.state = createInitialState()
    this.nextLogId = 1
    this.state.events.push({ type: 'reset', at: 0 })
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.min(3, Math.max(0.25, speed))
  }

  setPaused(paused: boolean): void {
    this.state.paused = paused
  }

  canAddReagent(reagentId: string): boolean {
    const reagent = REAGENTS_BY_ID[reagentId]
    if (!reagent) return false
    if (reagent.volumeMl <= 0) return true
    return this.state.volumeMl + reagent.volumeMl <= MAX_VOLUME_ML + EPS
  }

  addReagent(reagentId: string): AddResult {
    const reagent = REAGENTS_BY_ID[reagentId]
    if (!reagent) {
      return { ok: false, message: '未知试剂' }
    }
    if (!this.canAddReagent(reagentId)) {
      return {
        ok: false,
        message: `烧杯最多容纳 ${MAX_VOLUME_ML} mL 液体，请先重置实验。`,
      }
    }

    this.state.volumeMl += reagent.volumeMl
    for (const entry of reagent.composition) {
      const species = SPECIES_BY_ID[entry.speciesId]
      if (!species) continue
      this.state.amounts.set(
        entry.speciesId,
        (this.state.amounts.get(entry.speciesId) ?? 0) + entry.moles,
      )
      if (species.kind === 'indicator') {
        this.state.indicators.add(entry.speciesId)
      }
    }

    const amountText = reagent.volumeMl > 0 ? `${reagent.volumeMl} mL ` : ''
    this.log(`加入 ${amountText}${reagent.name}`, 'info')
    this.state.events.push({ type: 'add', reagentId, at: this.state.timeSec })
    this.recomputeDerived()
    return { ok: true, message: `已加入${reagent.name}` }
  }

  tick(rawDt: number): void {
    if (this.state.paused) return
    const dt = Math.min(0.1, Math.max(0, rawDt)) * this.state.speed
    if (dt <= 0) return

    this.state.timeSec += dt
    this.state.temperatureC +=
      (AMBIENT_TEMPERATURE - this.state.temperatureC) * Math.min(0.25, 0.04 * dt)

    this.settle(dt)

    if (!this.state.active) {
      this.tryStartReaction()
    }
    if (this.state.active) {
      this.advanceActive(dt)
    }

    this.recomputeDerived()
  }

  private settle(dt: number): void {
    for (const [speciesId, moles] of this.state.suspended) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species?.isPrecipitate || moles <= EPS) continue
      const transfer = Math.min(moles, moles * SETTLE_RATE * dt)
      if (transfer <= 0) continue
      this.state.suspended.set(speciesId, moles - transfer)
      this.state.sediment.set(speciesId, (this.state.sediment.get(speciesId) ?? 0) + transfer)
    }
  }

  private tryStartReaction(): void {
    const candidates = REACTIONS.filter((reaction) => {
      if (!this.hasEnough(reaction.catalyst, 1)) return false
      return reaction.reactants.every((entry) =>
        this.hasEnough(entry.speciesId, entry.coeff),
      )
    }).sort((a, b) => b.priority - a.priority)

    const reaction = candidates[0]
    if (!reaction) return

    const extent = Math.min(
      ...reaction.reactants.map(
        (entry) => (this.state.amounts.get(entry.speciesId) ?? 0) / entry.coeff,
      ),
    )
    if (extent <= EPS) return

    const durationSec = Math.max(0.1, reaction.durationMs / 1000)
    this.state.active = {
      reaction,
      totalExtent: extent,
      extent: 0,
      rate: extent / durationSec,
      startedAt: this.state.timeSec,
    }
    this.state.lastReactionId = reaction.id
    this.log(`开始反应：${reaction.phenomenon}`, 'reaction')
    this.state.events.push({
      type: 'reaction-start',
      reactionId: reaction.id,
      at: this.state.timeSec,
    })
  }

  private advanceActive(dt: number): void {
    const active = this.state.active
    if (!active) return

    const remaining = active.totalExtent - active.extent
    if (remaining <= EPS) {
      this.finishActive()
      return
    }

    let step = Math.min(remaining, active.rate * dt)
    for (const entry of active.reaction.reactants) {
      const available = this.state.amounts.get(entry.speciesId) ?? 0
      step = Math.min(step, available / entry.coeff)
    }

    if (step <= EPS) {
      this.finishActive()
      return
    }

    for (const entry of active.reaction.reactants) {
      this.consumeSpecies(entry.speciesId, entry.coeff * step)
    }

    for (const entry of active.reaction.products) {
      const species = getSpecies(entry.speciesId)
      const amount = entry.coeff * step
      if (species.id === 'h2o') continue
      if (species.phase === 'g') {
        this.state.gases.set(species.id, (this.state.gases.get(species.id) ?? 0) + amount)
        this.state.events.push({
          type: 'gas',
          speciesId: species.id,
          moles: amount,
          at: this.state.timeSec,
        })
        continue
      }

      this.state.amounts.set(species.id, (this.state.amounts.get(species.id) ?? 0) + amount)
      if (species.isPrecipitate) {
        this.state.suspended.set(
          species.id,
          (this.state.suspended.get(species.id) ?? 0) + amount,
        )
      }
    }

    if (active.reaction.deltaH) {
      const heatJ = -active.reaction.deltaH * step * 1000
      const massG = Math.max(this.state.volumeMl, 20)
      this.state.temperatureC = Math.min(
        100,
        Math.max(0, this.state.temperatureC + heatJ / (massG * 4.18)),
      )
    }

    active.extent += step
    if (active.extent >= active.totalExtent - EPS) {
      this.finishActive()
    }
  }

  private finishActive(): void {
    const active = this.state.active
    if (!active) return
    active.extent = active.totalExtent
    this.state.active = null
    this.state.lastReactionId = active.reaction.id
    this.log(`反应完成：${active.reaction.phenomenon}`, 'success')
    this.state.events.push({
      type: 'reaction-end',
      reactionId: active.reaction.id,
      at: this.state.timeSec,
    })
  }

  private consumeSpecies(speciesId: string, requested: number): number {
    const species = SPECIES_BY_ID[speciesId]
    if (!species) return 0
    const current = this.state.amounts.get(speciesId) ?? 0
    const actual = Math.max(0, Math.min(current, requested))
    if (actual <= 0) return 0
    this.state.amounts.set(speciesId, current - actual)

    if (species.isPrecipitate) {
      const suspended = this.state.suspended.get(speciesId) ?? 0
      const fromSuspended = Math.min(suspended, actual)
      this.state.suspended.set(speciesId, suspended - fromSuspended)
      const remainder = actual - fromSuspended
      if (remainder > 0) {
        const sediment = this.state.sediment.get(speciesId) ?? 0
        this.state.sediment.set(speciesId, Math.max(0, sediment - remainder))
      }
    }

    return actual
  }

  private hasEnough(speciesId: string | undefined, coeff = 1): boolean {
    if (!speciesId) return true
    return (this.state.amounts.get(speciesId) ?? 0) > EPS * coeff
  }

  private recomputeDerived(): void {
    this.state.ph = computePH(this.state.amounts, this.state.volumeMl)

    const colorEntries: ColorWeight[] = [{ color: BASE_WATER_COLOR, weight: 0.2 }]
    for (const [speciesId, moles] of this.state.amounts) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species || moles <= EPS || species.phase !== 'aq') continue
      if (species.tintStrength > 0) {
        colorEntries.push({ color: species.color, weight: moles * species.tintStrength })
      }
    }
    for (const indicatorId of this.state.indicators) {
      const appearance = indicatorAppearance(indicatorId, this.state.ph)
      if (appearance.alpha > 0) {
        colorEntries.push({ color: appearance.color, weight: appearance.alpha * 4 })
      }
    }
    this.state.solutionColor = blendHexColors(colorEntries, BASE_WATER_COLOR)

    let suspendedTotal = 0
    const turbidityEntries: ColorWeight[] = []
    for (const [speciesId, moles] of this.state.suspended) {
      if (moles <= EPS) continue
      const species = SPECIES_BY_ID[speciesId]
      if (!species?.isPrecipitate) continue
      suspendedTotal += moles
      turbidityEntries.push({ color: species.color, weight: moles })
    }
    this.state.turbidity = Math.min(
      1,
      (suspendedTotal * TURBIDITY_FACTOR) / Math.max(this.state.volumeMl, 10),
    )
    this.state.turbidityColor = blendHexColors(turbidityEntries, '#F2F0E8')
  }

  getSnapshot(): LabSnapshot {
    const contents: ContentView[] = []
    for (const [speciesId, moles] of this.state.amounts) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species) continue
      if (species.id === 'h2o') continue
      if (moles <= 1e-7 && !this.state.indicators.has(speciesId)) continue
      contents.push({
        species,
        moles,
        concentrationM:
          species.phase === 'aq' && this.state.volumeMl > 0
            ? moles / (this.state.volumeMl / 1000)
            : 0,
        suspendedMoles: this.state.suspended.get(speciesId) ?? 0,
        sedimentMoles: this.state.sediment.get(speciesId) ?? 0,
      })
    }
    contents.sort((a, b) => b.moles - a.moles)

    const active = this.state.active
    const canAdd: Record<string, boolean> = {}
    for (const reagent of REAGENTS) {
      canAdd[reagent.id] = this.canAddReagent(reagent.id)
    }

    return {
      contents,
      volumeMl: this.state.volumeMl,
      maxVolumeMl: MAX_VOLUME_ML,
      temperatureC: this.state.temperatureC,
      ph: this.state.ph,
      solutionColor: this.state.solutionColor,
      turbidity: this.state.turbidity,
      turbidityColor: this.state.turbidityColor,
      activeReaction: active
        ? {
            id: active.reaction.id,
            progress:
              active.totalExtent > 0 ? Math.min(1, active.extent / active.totalExtent) : 0,
            reaction: active.reaction,
          }
        : null,
      lastReactionId: this.state.lastReactionId,
      log: [...this.state.log],
      indicators: [...this.state.indicators],
      gases: [...this.state.gases.entries()].map(([speciesId, moles]) => ({ speciesId, moles })),
      canAdd,
    }
  }

  drainEvents(): EngineEvent[] {
    const events = this.state.events
    this.state.events = []
    return events
  }

  private log(text: string, tone: LogEntry['tone']): void {
    this.state.log.push({
      id: this.nextLogId++,
      time: Date.now(),
      text,
      tone,
    })
    if (this.state.log.length > 80) {
      this.state.log.shift()
    }
  }
}

export function speciesById(speciesId: string): Species {
  return getSpecies(speciesId)
}
