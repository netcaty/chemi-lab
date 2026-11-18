import { useLabStore } from '../state/labStore'

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ObservationLog() {
  const log = useLabStore((state) => state.snapshot.log)
  const entries = [...log].reverse()

  return (
    <section className="card log-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">NOTEBOOK</p>
          <h2 className="card-title">观察记录</h2>
        </div>
        <span className="log-count">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state compact">
          <p className="empty-title">还没有记录</p>
          <p className="empty-text">每次加入试剂和发生反应，都会记在这里。</p>
        </div>
      ) : (
        <div className="log-list">
          {entries.map((entry) => (
            <div className={`log-row tone-${entry.tone}`} key={entry.id}>
              <span className="log-dot" aria-hidden="true" />
              <span className="log-time">{formatTime(entry.time)}</span>
              <span className="log-text">{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
