import { useCallback, useEffect, useState } from 'react'
import { SPECIES_BY_ID } from '../domain/species'
import { useLabStore } from '../state/labStore'
import { FormulaText } from './FormulaText'
import { GasTestModal } from './GasTestModal'

function formatMoles(moles: number): string {
  const mmol = moles * 1000
  if (mmol >= 10) return `${mmol.toFixed(0)} mmol`
  if (mmol >= 1) return `${mmol.toFixed(1)} mmol`
  if (mmol >= 0.01) return `${mmol.toFixed(2)} mmol`
  return `${(moles * 1e6).toFixed(0)} μmol`
}

function formatMolarity(value: number): string {
  if (value >= 0.1) return `${value.toFixed(2)} mol/L`
  if (value >= 0.001) return `${(value * 1000).toFixed(1)} mmol/L`
  return `${(value * 1e6).toFixed(0)} μmol/L`
}

export function SystemPanel() {
  const snapshot = useLabStore((state) => state.snapshot)
  const ph = snapshot.ph
  const phMarker = `${Math.min(100, Math.max(0, (ph / 14) * 100))}%`
  const isEmpty = snapshot.contents.length === 0 && snapshot.gases.length === 0
  const [gasTestOpen, setGasTestOpen] = useState(false)
  const closeGasTest = useCallback(() => setGasTestOpen(false), [])

  useEffect(() => {
    if (snapshot.gases.length === 0) {
      setGasTestOpen(false)
    }
  }, [snapshot.gases.length])

  return (
    <>
      <section className="card system-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">SYSTEM</p>
          <h2 className="card-title">体系</h2>
        </div>
        <span className="system-volume">
          {snapshot.volumeMl.toFixed(0)}
          <small> / {snapshot.maxVolumeMl} mL</small>
        </span>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric-label">温度</span>
          <span className="metric-value">{snapshot.temperatureC.toFixed(1)}<small> °C</small></span>
        </div>
        <div className="metric">
          <span className="metric-label">pH</span>
          <span className="metric-value">{snapshot.ph.toFixed(1)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">物种</span>
          <span className="metric-value">{snapshot.contents.length}</span>
        </div>
      </div>

      <div className="ph-scale" title="pH 为高中层面的简化平衡模型">
        <div className="ph-gradient" />
        <span className="ph-marker" style={{ left: phMarker }} />
        <div className="ph-scale-labels">
          <span>0</span>
          <span>7</span>
          <span>14</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state compact">
          <p className="empty-title">体系为空</p>
          <p className="empty-text">加入试剂后，这里会显示离子、分子和沉淀。</p>
        </div>
      ) : (
        <div className="content-list">
          {snapshot.contents.map(({ species, moles, concentrationM, suspendedMoles, sedimentMoles }) => {
            const tags: string[] = []
            if (species.isPrecipitate) {
              if (suspendedMoles > 1e-8) tags.push('悬浮')
              if (sedimentMoles > 1e-8) tags.push('沉降')
              if (tags.length === 0) tags.push('沉淀')
            } else if (species.phase === 's') {
              tags.push('固体')
            } else if (species.kind === 'indicator') {
              tags.push('指示剂')
            }
            const pure = SPECIES_BY_ID[species.id]
            return (
              <div className="content-row" key={species.id}>
                <span
                  className="species-dot"
                  style={{ background: pure.color }}
                  aria-hidden="true"
                />
                <div className="species-main">
                  <div className="species-line">
                    <span className="species-formula">
                      <FormulaText formula={pure.formula} charge={pure.charge} />
                    </span>
                    <span className="species-name">{pure.name}</span>
                  </div>
                  <div className="species-meta">
                    <span>{formatMoles(moles)}</span>
                    {concentrationM > 0 ? <span>{formatMolarity(concentrationM)}</span> : null}
                    {tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {snapshot.gases.length > 0 ? (
            <div className="gas-block">
              <div className="gas-title">已逸出气体</div>
              {snapshot.gases.map((gas) => {
                const species = SPECIES_BY_ID[gas.speciesId]
                if (!species) return null
                return (
                  <div className="gas-row" key={gas.speciesId}>
                    <span className="species-dot" style={{ background: species.color }} />
                    <span className="species-formula">
                      <FormulaText formula={species.formula} />
                    </span>
                    <span>{formatMoles(gas.moles)}</span>
                    <span className="tag">逸出</span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}

      {snapshot.gases.length > 0 ? (
        <div className="gas-test-callout">
          <div className="gas-test-callout-copy">
            <strong>气体已收集</strong>
            <span>气泡不等于气体身份，用特征现象来检验。</span>
          </div>
          <button
            type="button"
            className="gas-test-btn"
            onClick={() => setGasTestOpen(true)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M6 2h4M6.5 2v9.2a2.2 2.2 0 0 0 4.4 0V2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path d="M6.8 9h2.8v2.2a1.4 1.4 0 0 1-2.8 0V9Z" fill="currentColor" opacity="0.35" />
            </svg>
            检验气体
          </button>
        </div>
      ) : null}
    </section>
    {gasTestOpen ? (
      <GasTestModal gases={snapshot.gases} onClose={closeGasTest} />
    ) : null}
  </>
  )
}
