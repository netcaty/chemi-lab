import { useEffect } from 'react'
import { BeakerStage } from '../components/BeakerStage'
import { Controls } from '../components/Controls'
import { ObservationLog } from '../components/ObservationLog'
import { PresetBar } from '../components/PresetBar'
import { ReactionPanel } from '../components/ReactionPanel'
import { ReagentShelf } from '../components/ReagentShelf'
import { SystemPanel } from '../components/SystemPanel'
import { engine } from '../state/engineInstance'
import { useLabStore } from '../state/labStore'

function EngineBridge() {
  const sync = useLabStore((state) => state.sync)
  useEffect(() => {
    sync()
    let last = performance.now()
    const tickTimer = window.setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      engine.tick(dt)
    }, 50)
    const syncTimer = window.setInterval(sync, 100)
    return () => {
      window.clearInterval(tickTimer)
      window.clearInterval(syncTimer)
    }
  }, [sync])
  return null
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8.5 5.5h15M11 5.5v14.2c0 4.6 2.1 7.3 5 7.3s5-2.7 5-7.3V5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M11.3 18.2c2.2-1.5 3.7 1.1 5.6 0 1.9-1.1 3.4-1.2 5.1-.1v2.2c0 3.4-1.8 5.8-5.3 5.8s-5.4-2.4-5.4-5.8v-2.1Z"
        fill="currentColor"
        opacity="0.32"
      />
      <circle cx="23.5" cy="9.5" r="2.4" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export function App() {
  const message = useLabStore((state) => state.message)
  const dismissMessage = useLabStore((state) => state.dismissMessage)

  return (
    <div className="app-shell">
      <EngineBridge />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <BrandMark />
          </div>
          <div className="brand-text">
            <h1>ChemiLab</h1>
            <p>宏观 / 微观 · 高中化学实验室</p>
          </div>
        </div>
        <PresetBar />
        <Controls />
      </header>

      <main className="workspace">
        <aside className="panel shelf-panel">
          <ReagentShelf />
        </aside>

        <section className="stage-card">
          <BeakerStage />
        </section>

        <aside className="info-column">
          <ReactionPanel />
          <SystemPanel />
          <ObservationLog />
          <p className="app-note">
            微观粒子为教学示意；pH、反应速率与颜色为简化模型，用于观察高中化学的典型现象。
          </p>
        </aside>
      </main>

      {message ? (
        <div className="toast" role="status">
          <span>{message}</span>
          <button type="button" onClick={dismissMessage} aria-label="关闭提示">
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
