import { useLabStore } from '../state/labStore'

function BeakerIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4.2 2.4h9.6M5.6 2.6v8.9c0 2.1 1.3 3.6 3.4 3.6s3.4-1.5 3.4-3.6V2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M5.8 10.2c1.1-.7 2.1.6 3.2 0s2-.6 3 0v2.2c0 1.3-.9 2.2-3 2.2s-3.2-.9-3.2-2.2v-2.2Z" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

function ParticleIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="5.2" cy="5.3" r="2.1" fill="currentColor" opacity="0.8" />
      <circle cx="12.4" cy="6.4" r="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="7.4" cy="12.2" r="1.4" fill="currentColor" opacity="0.55" />
      <circle cx="13.1" cy="12.6" r="2.2" fill="currentColor" opacity="0.8" />
      <path d="M7.2 6.1 11 6.8M6 7.1l1 3.5M8.7 11.8l2.3.5" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
    </svg>
  )
}

export function ViewToggle() {
  const view = useLabStore((state) => state.view)
  const setView = useLabStore((state) => state.setView)

  return (
    <div className="segmented view-toggle" role="group" aria-label="视图切换">
      <button
        type="button"
        className={view === 'macro' ? 'is-active' : ''}
        onClick={() => setView('macro')}
        aria-pressed={view === 'macro'}
      >
        <BeakerIcon />
        <span>宏观</span>
      </button>
      <button
        type="button"
        className={view === 'micro' ? 'is-active' : ''}
        onClick={() => setView('micro')}
        aria-pressed={view === 'micro'}
      >
        <ParticleIcon />
        <span>微观</span>
      </button>
    </div>
  )
}
