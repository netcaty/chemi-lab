import { useLabStore } from '../state/labStore'
import { ViewToggle } from './ViewToggle'

const SPEEDS = [0.5, 1, 2]

function PauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.2v9.6l8-4.8-8-4.8Z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="4" y="3" width="2.8" height="10" rx="1" fill="currentColor" />
      <rect x="9.2" y="3" width="2.8" height="10" rx="1" fill="currentColor" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.1 8a4.9 4.9 0 1 0 1.5-3.5M3.2 2.9v3.2h3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.6 6h2.1L7.7 3.3v9.4L4.7 10H2.6V6Z" fill="currentColor" />
      {muted ? (
        <path
          d="m10.2 6.1 3.2 3.8m0-3.8-3.2 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M9.8 5.5c.9.7 1.4 1.5 1.4 2.5s-.5 1.8-1.4 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M11.5 3.8c1.5 1.2 2.3 2.6 2.3 4.2s-.8 3-2.3 4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.65"
          />
        </>
      )}
    </svg>
  )
}

export function Controls() {
  const speed = useLabStore((state) => state.speed)
  const paused = useLabStore((state) => state.paused)
  const soundEnabled = useLabStore((state) => state.soundEnabled)
  const setSpeed = useLabStore((state) => state.setSpeed)
  const togglePause = useLabStore((state) => state.togglePause)
  const toggleSound = useLabStore((state) => state.toggleSound)
  const reset = useLabStore((state) => state.reset)

  return (
    <div className="controls">
      <ViewToggle />
      <div className="segmented speed-toggle" role="group" aria-label="反应速度">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={speed === value ? 'is-active' : ''}
            onClick={() => setSpeed(value)}
            aria-pressed={speed === value}
          >
            {value}×
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`control-btn icon-only${soundEnabled ? '' : ' is-off'}`}
        onClick={toggleSound}
        title={soundEnabled ? '关闭音效' : '开启音效'}
        aria-label={soundEnabled ? '关闭音效' : '开启音效'}
        aria-pressed={soundEnabled}
      >
        <SoundIcon muted={!soundEnabled} />
      </button>
      <button
        type="button"
        className="control-btn"
        onClick={togglePause}
        title={paused ? '继续反应' : '暂停反应'}
      >
        <PauseIcon paused={paused} />
        <span>{paused ? '继续' : '暂停'}</span>
      </button>
      <button type="button" className="control-btn ghost" onClick={reset} title="重置实验">
        <ResetIcon />
        <span>重置</span>
      </button>
    </div>
  )
}
