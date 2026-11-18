import { PRESETS } from '../domain/presets'
import { useLabStore } from '../state/labStore'

export function PresetBar() {
  const runPreset = useLabStore((state) => state.runPreset)
  const activePresetId = useLabStore((state) => state.activePresetId)
  const runningPreset = useLabStore((state) => state.runningPreset)

  return (
    <div className="preset-bar" aria-label="预设实验">
      <span className="preset-label">预设实验</span>
      <div className="preset-scroll">
        {PRESETS.map((preset) => {
          const active = activePresetId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip${active ? ' is-active' : ''}`}
              onClick={() => runPreset(preset.id)}
              aria-pressed={active}
              title={preset.description}
            >
              {active && runningPreset ? <span className="preset-pulse" aria-hidden="true" /> : null}
              <span className="preset-name">{preset.name}</span>
              <span className="preset-tagline">{preset.tagline}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
