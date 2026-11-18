import { create } from 'zustand'
import { sound } from '../audio/sound'
import { PRESETS_BY_ID } from '../domain/presets'
import type { LabSnapshot } from '../domain/types'
import { engine } from './engineInstance'

export type ViewMode = 'macro' | 'micro'

interface LabStore {
  snapshot: LabSnapshot
  view: ViewMode
  speed: number
  paused: boolean
  soundEnabled: boolean
  message: string | null
  activePresetId: string | null
  runningPreset: boolean
  addReagent: (reagentId: string) => void
  setView: (view: ViewMode) => void
  setSpeed: (speed: number) => void
  togglePause: () => void
  toggleSound: () => void
  reset: () => void
  runPreset: (presetId: string) => void
  sync: () => void
  dismissMessage: () => void
}

let timers: ReturnType<typeof setTimeout>[] = []
let messageTimer: ReturnType<typeof setTimeout> | undefined

function clearTimers() {
  timers.forEach((timer) => clearTimeout(timer))
  timers = []
}

export const useLabStore = create<LabStore>((set, get) => {
  const showMessage = (message: string | null) => {
    if (messageTimer) clearTimeout(messageTimer)
    set({ message })
    if (message) {
      messageTimer = setTimeout(() => set({ message: null }), 3200)
    }
  }

  const sync = () => {
    set({
      snapshot: engine.getSnapshot(),
      speed: engine.state.speed,
      paused: engine.state.paused,
    })
  }

  return {
    snapshot: engine.getSnapshot(),
    view: 'macro',
    speed: 1,
    paused: false,
    soundEnabled: true,
    message: null,
    activePresetId: null,
    runningPreset: false,

    addReagent: (reagentId) => {
      clearTimers()
      set({ activePresetId: null, runningPreset: false })
      if (get().soundEnabled) sound.unlock()
      const result = engine.addReagent(reagentId)
      if (!result.ok && get().soundEnabled) sound.playError()
      showMessage(result.ok ? null : result.message)
      sync()
    },

    setView: (view) => set({ view }),

    setSpeed: (speed) => {
      engine.setSpeed(speed)
      set({ speed: engine.state.speed })
    },

    togglePause: () => {
      engine.setPaused(!engine.state.paused)
      set({ paused: engine.state.paused })
    },

    toggleSound: () => {
      const enabled = !get().soundEnabled
      if (enabled) {
        sound.unlock()
        sound.setMuted(false)
        sound.playAdd('drop')
      } else {
        sound.setMuted(true)
      }
      set({ soundEnabled: enabled })
    },

    reset: () => {
      clearTimers()
      engine.reset()
      set({
        view: 'macro',
        speed: 1,
        paused: false,
        activePresetId: null,
        runningPreset: false,
        message: null,
      })
      sync()
    },

    runPreset: (presetId) => {
      const preset = PRESETS_BY_ID[presetId]
      if (!preset) return
      clearTimers()
      if (get().soundEnabled) sound.unlock()
      engine.reset()
      engine.setSpeed(1)
      engine.setPaused(false)
      set({
        view: 'macro',
        speed: 1,
        paused: false,
        activePresetId: presetId,
        runningPreset: true,
        message: null,
      })
      sync()

      let elapsed = 0
      preset.steps.forEach((step, index) => {
        elapsed += step.delayMs
        const timer = setTimeout(() => {
          const result = engine.addReagent(step.reagentId)
          if (!result.ok) {
            showMessage(result.message)
          }
          sync()
          if (index === preset.steps.length - 1) {
            const finishTimer = setTimeout(() => {
              if (get().activePresetId === presetId) {
                set({ runningPreset: false, activePresetId: null })
              }
            }, 2400)
            timers.push(finishTimer)
          }
        }, elapsed)
        timers.push(timer)
      })
    },

    sync,

    dismissMessage: () => {
      if (messageTimer) clearTimeout(messageTimer)
      set({ message: null })
    },
  }
})
