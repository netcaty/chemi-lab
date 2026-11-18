import { useMemo, type CSSProperties } from 'react'
import { REAGENT_CATEGORIES, REAGENTS } from '../domain/reagents'
import type { Reagent } from '../domain/types'
import { useLabStore } from '../state/labStore'
import { FormulaText } from './FormulaText'

function reagentMeta(reagent: Reagent): string {
  if (reagent.addAnimation === 'solid') {
    return `固体 · ${(reagent.addedMoles * 1000).toFixed(0)} mmol`
  }
  if (reagent.addAnimation === 'drop') {
    return '滴加 · 指示剂'
  }
  const concentration = reagent.concentrationM ? ` · ${reagent.concentrationM} M` : ''
  return `${reagent.volumeMl} mL${concentration}`
}

export function ReagentShelf() {
  const addReagent = useLabStore((state) => state.addReagent)
  const canAdd = useLabStore((state) => state.snapshot.canAdd)

  const groups = useMemo(
    () =>
      REAGENT_CATEGORIES.map((category) => ({
        category,
        items: REAGENTS.filter((reagent) => reagent.category === category),
      })),
    [],
  )

  return (
    <div className="shelf">
      <div className="shelf-head">
        <div>
          <p className="eyebrow">REAGENTS</p>
          <h2 className="shelf-title">试剂架</h2>
        </div>
        <span className="shelf-count">{REAGENTS.length}</span>
      </div>
      <p className="shelf-sub">点击试剂，把它加入烧杯</p>

      <div className="shelf-scroll">
        {groups.map((group) => (
          <section key={group.category} className="reagent-group">
            <div className="reagent-group-title">
              <span>{group.category}</span>
              <span className="reagent-group-count">{group.items.length}</span>
            </div>
            <div className="reagent-list">
              {group.items.map((reagent) => {
                const enabled = canAdd[reagent.id] !== false
                return (
                  <button
                    key={reagent.id}
                    className={`reagent-card reagent-${reagent.addAnimation}`}
                    type="button"
                    onClick={() => addReagent(reagent.id)}
                    disabled={!enabled}
                    title={enabled ? `加入${reagent.name}` : '烧杯已满，请先重置实验'}
                    style={{ '--reagent-color': reagent.color } as CSSProperties}
                  >
                    <span className={`vial vial-${reagent.addAnimation}`}>
                      <span className="vial-fill" />
                      <span className="vial-cap" />
                    </span>
                    <span className="reagent-text">
                      <span className="reagent-name">{reagent.name}</span>
                      <span className="reagent-formula">
                        <FormulaText formula={reagent.formula} />
                      </span>
                      <span className="reagent-meta">{reagentMeta(reagent)}</span>
                    </span>
                    <span className="reagent-plus" aria-hidden="true">
                      +
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
