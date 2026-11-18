import { REACTIONS_BY_ID } from '../domain/reactions'
import { useLabStore } from '../state/labStore'
import { EquationView } from './EquationView'

export function ReactionPanel() {
  const snapshot = useLabStore((state) => state.snapshot)
  const active = snapshot.activeReaction
  const reaction = active?.reaction ?? (snapshot.lastReactionId ? REACTIONS_BY_ID[snapshot.lastReactionId] : null)
  const progress = active ? active.progress : reaction ? 1 : 0

  return (
    <section className="card reaction-card" aria-live="polite">
      <div className="card-head">
        <div>
          <p className="eyebrow">REACTION</p>
          <h2 className="card-title">反应</h2>
        </div>
        {active ? (
          <span className="status-pill is-live">
            <span className="status-dot" />
            反应中
          </span>
        ) : reaction ? (
          <span className="status-pill">已完成</span>
        ) : (
          <span className="status-pill is-idle">待机</span>
        )}
      </div>

      {reaction ? (
        <>
          <p className="phenomenon">{reaction.phenomenon}</p>

          <div className="progress" aria-label={`反应进度 ${Math.round(progress * 100)}%`}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="progress-label">
              {active ? `${Math.round(progress * 100)}%` : '完成'}
            </span>
          </div>

          <div className="equation-block">
            <div className="equation-label">分子方程式</div>
            <EquationView display={reaction.display.molecular} />
            <div className="equation-label">离子方程式</div>
            <EquationView display={reaction.display.ionic} />
          </div>

          <div className="reaction-foot">
            <span className="reaction-tag">
              {reaction.effects?.gas
                ? '生成气体'
                : reaction.effects?.precipitate
                  ? '生成沉淀'
                  : reaction.effects?.thermal === 'exo'
                    ? '放热反应'
                    : '溶液变化'}
            </span>
            <span className="reaction-foot-text">
              {active ? '观察烧杯中的变化，或切换到微观视图' : '可以继续加入试剂'}
            </span>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path
                d="M10 5h20M13 5v18c0 6 3 10 7 10s7-4 7-10V5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path d="M13.4 21c3-2 5 1.6 7.4 0 2.3-1.5 4.2-1.7 6.4-.2v3.4c0 4.3-2.3 7.4-6.8 7.4s-7-3.1-7-7.4V21Z" fill="currentColor" opacity="0.14" />
            </svg>
          </div>
          <p className="empty-title">还没有发生反应</p>
          <p className="empty-text">把两种试剂加进同一个烧杯，反应会自动开始。</p>
        </div>
      )}
    </section>
  )
}
