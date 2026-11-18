import { useEffect, useState } from 'react'
import { sound } from '../audio/sound'
import {
  GAS_TESTS,
  runGasTest,
  type GasSample,
  type GasTestId,
  type GasTestResult,
} from '../domain/gasTests'
import { useLabStore } from '../state/labStore'
import { FormulaText } from './FormulaText'

interface GasTestModalProps {
  gases: GasSample[]
  onClose: () => void
}

function GasTestIcon({ id }: { id: GasTestId }) {
  if (id === 'splint') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 21 17 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="5" r="2.4" fill="#E5A13B" />
        <circle cx="18" cy="5" r="4.2" fill="#E5A13B" opacity="0.2" />
      </svg>
    )
  }
  if (id === 'limewater') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 3h8M9 3v15a3 3 0 0 0 6 0V3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M9.4 12h5.2v3.2a2.6 2.6 0 0 1-5.2 0V12Z" fill="currentColor" opacity="0.25" />
        <circle cx="11" cy="14" r="0.8" fill="currentColor" opacity="0.55" />
        <circle cx="13" cy="16" r="0.7" fill="currentColor" opacity="0.45" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c2.6 4 5.2 6.5 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.3 1.3-4.6 2.8-6.2.3 1.4 1.1 2.3 2 2.8.7-2.2.6-4.2.4-6.8Z"
        fill="currentColor"
      />
      <path
        d="M12 10.5c1.3 1.7 2.1 2.4 2.1 4a2.1 2.1 0 0 1-4.2 0c0-1.1.8-2.3 2.1-4Z"
        fill="#FFF4D8"
        opacity="0.85"
      />
    </svg>
  )
}

function formatSampleMoles(moles: number): string {
  const mmol = moles * 1000
  if (mmol >= 10) return `${mmol.toFixed(0)} mmol`
  if (mmol >= 1) return `${mmol.toFixed(1)} mmol`
  return `${mmol.toFixed(2)} mmol`
}

export function GasTestModal({ gases, onClose }: GasTestModalProps) {
  const [result, setResult] = useState<GasTestResult | null>(null)
  const totalMoles = gases.reduce((sum, gas) => sum + gas.moles, 0)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const chooseTest = (testId: GasTestId) => {
    const next = runGasTest(testId, gases)
    setResult(next)
    if (useLabStore.getState().soundEnabled) {
      sound.unlock()
      sound.playGasTest(next.effect, next.success)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="gas-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gas-test-title"
      >
        <div className="gas-modal-head">
          <div>
            <p className="eyebrow">GAS TEST</p>
            <h2 id="gas-test-title" className="gas-modal-title">
              检验气体
            </h2>
          </div>
          <button
            type="button"
            className="gas-modal-close"
            onClick={onClose}
            aria-label="关闭气体检验"
          >
            ×
          </button>
        </div>

        <p className="gas-modal-sub">
          气泡只能说明“有气体生成”。选择一种方法，根据特征现象判断气体的身份。
        </p>

        <div className="gas-sample">
          <span className="gas-sample-dot" aria-hidden="true" />
          已收集到 {gases.length} 种气体 · 共 {formatSampleMoles(totalMoles)}
        </div>

        {result ? (
          <div
            className={`gas-result ${result.success ? 'is-success' : 'is-fail'}`}
            aria-live="polite"
          >
            <div className={`gas-result-visual effect-${result.effect}`} aria-hidden="true">
              {result.effect === 'glow' ? <span className="test-splint" /> : null}
              {result.effect === 'milky' ? (
                <span className="test-tube">
                  <span className="test-liquid" />
                </span>
              ) : null}
              {result.effect === 'flame' ? <span className="test-flame" /> : null}
              {result.effect === 'none' ? <span className="test-none">?</span> : null}
            </div>
            <div className="gas-result-copy">
              <h3 className="gas-result-title">{result.title}</h3>
              <p className="gas-result-text">{result.detail}</p>
              {result.success && result.gasFormula ? (
                <div className="gas-result-formula">
                  检出：
                  <FormulaText formula={result.gasFormula} />
                  {result.gasName ? <span> · {result.gasName}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="gas-test-grid">
            {GAS_TESTS.map((test, index) => (
              <button
                key={test.id}
                type="button"
                className="gas-test-option"
                onClick={() => chooseTest(test.id)}
                autoFocus={index === 0}
              >
                <span className={`gas-test-icon icon-${test.id}`}>
                  <GasTestIcon id={test.id} />
                </span>
                <span className="gas-test-option-text">
                  <span className="gas-test-name">{test.name}</span>
                  <span className="gas-test-desc">{test.description}</span>
                </span>
                <span className="gas-test-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        {result ? (
          <div className="gas-result-actions">
            <button type="button" className="gas-again" onClick={() => setResult(null)}>
              再试一种方法
            </button>
          </div>
        ) : null}

        <p className="gas-modal-note">
          当前实验可能产生的气体：O₂、CO₂、H₂。真正检验时，需要先把气体收集起来，再选择合适的方法。
        </p>
      </div>
    </div>
  )
}
