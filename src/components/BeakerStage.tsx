import { useEffect, useRef } from 'react'
import { SceneRenderer } from '../render/scene'
import { engine } from '../state/engineInstance'
import { useLabStore } from '../state/labStore'
import { FormulaText } from './FormulaText'

function formatAmount(moles: number): string {
  const mmol = moles * 1000
  if (mmol >= 10) return `${mmol.toFixed(0)} mmol`
  if (mmol >= 1) return `${mmol.toFixed(1)} mmol`
  return `${mmol.toFixed(2)} mmol`
}

export function BeakerStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<SceneRenderer | null>(null)

  const view = useLabStore((state) => state.view)
  const paused = useLabStore((state) => state.paused)
  const snapshot = useLabStore((state) => state.snapshot)
  const setView = useLabStore((state) => state.setView)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const renderer = new SceneRenderer(canvas, engine)
    rendererRef.current = renderer
    renderer.setView(useLabStore.getState().view)

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1)
    }
    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    renderer.start()

    return () => {
      observer.disconnect()
      renderer.stop()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.setView(view)
  }, [view])

  const active = snapshot.activeReaction
  const status = paused ? '已暂停' : active ? '反应进行中' : snapshot.volumeMl > 0 ? '观察中' : '待机'
  const statusClass = paused ? 'is-paused' : active ? 'is-live' : snapshot.volumeMl > 0 ? 'is-observing' : 'is-idle'

  const legend = [...snapshot.contents]
    .filter((entry) => entry.moles > 1e-7)
    .sort((a, b) => b.moles - a.moles)
    .slice(0, 8)

  return (
    <div className="stage-shell">
      <div className="stage-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          role="img"
          aria-label={view === 'macro' ? '烧杯宏观视图' : '微观粒子视图'}
        />
      </div>

      <div className="stage-badge">
        <span className={`stage-badge-dot ${view === 'micro' ? 'is-micro' : ''}`} />
        {view === 'macro' ? '宏观视图' : '微观视图'}
      </div>

      <div className={`stage-status ${statusClass}`}>
        <span className="status-dot" />
        {status}
      </div>

      {active && view === 'macro' ? (
        <div className="stage-caption">
          <span className="stage-caption-label">反应中</span>
          <span className="stage-caption-text">{active.reaction.phenomenon}</span>
        </div>
      ) : null}

      {view === 'micro' ? (
        <aside className="micro-legend" aria-label="粒子图例">
          <div className="micro-legend-head">
            <span>粒子图例</span>
            <span className="micro-legend-note">按物质的量缩放</span>
          </div>
          {legend.length === 0 ? (
            <p className="micro-legend-empty">加入试剂后显示离子与分子</p>
          ) : (
            <div className="micro-legend-list">
              {legend.map(({ species, moles }) => (
                <div className="micro-legend-item" key={species.id} title={species.name}>
                  <span
                    className="micro-legend-dot"
                    style={{ background: species.color }}
                    aria-hidden="true"
                  />
                  <span className="micro-legend-formula">
                    <FormulaText formula={species.formula} charge={species.charge} />
                  </span>
                  <span className="micro-legend-amount">{formatAmount(moles)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      ) : null}

      <div className="stage-readouts">
        <span className="readout-chip">
          <span className="readout-label">体积</span>
          <strong>{snapshot.volumeMl.toFixed(0)}</strong>
          <span className="readout-unit">mL</span>
        </span>
        <span className="readout-chip">
          <span className="readout-label">温度</span>
          <strong>{snapshot.temperatureC.toFixed(1)}</strong>
          <span className="readout-unit">°C</span>
        </span>
        <span className="readout-chip">
          <span className="readout-label">pH</span>
          <strong>{snapshot.ph.toFixed(1)}</strong>
        </span>
      </div>

      <div className="stage-bottom">
        <span className="stage-hint">
          {view === 'macro'
            ? '点击左侧试剂加入烧杯，反应会自动开始'
            : '粒子是教学示意，颜色与种类与宏观体系保持同步'}
        </span>
        <button
          type="button"
          className="stage-cta"
          onClick={() => setView(view === 'macro' ? 'micro' : 'macro')}
        >
          {view === 'macro' ? '看微观粒子' : '回到宏观'}
          <span aria-hidden="true">{view === 'macro' ? '→' : '↩'}</span>
        </button>
      </div>
    </div>
  )
}
