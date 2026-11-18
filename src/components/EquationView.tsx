import { Fragment } from 'react'
import type { EquationDisplay, EquationPart } from '../domain/types'
import { FormulaText } from './FormulaText'

function Part({ part }: { part: EquationPart }) {
  return (
    <span className="equation-part">
      {part.coeff !== 1 ? <span className="equation-coeff">{part.coeff}</span> : null}
      <FormulaText formula={part.formula} charge={part.charge} />
      {part.state === 's' ? <span className="equation-state">↓</span> : null}
      {part.state === 'g' ? <span className="equation-state">↑</span> : null}
    </span>
  )
}

export function EquationView({ display }: { display: EquationDisplay }) {
  return (
    <div className="equation" aria-label="化学方程式">
      {display.left.map((part, index) => (
        <Fragment key={`left-${index}`}>
          {index > 0 ? <span className="equation-op">+</span> : null}
          <Part part={part} />
        </Fragment>
      ))}
      <span className="equation-arrow">
        {display.condition ? <span className="equation-condition">{display.condition}</span> : null}
        <span>{display.arrow === '=' ? '=' : '→'}</span>
      </span>
      {display.right.map((part, index) => (
        <Fragment key={`right-${index}`}>
          {index > 0 ? <span className="equation-op">+</span> : null}
          <Part part={part} />
        </Fragment>
      ))}
    </div>
  )
}
