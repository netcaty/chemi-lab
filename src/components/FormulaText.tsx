import { chargeLabel, formulaSegments } from '../domain/formula'

interface FormulaTextProps {
  formula: string
  charge?: number
  className?: string
}

export function FormulaText({ formula, charge = 0, className }: FormulaTextProps) {
  return (
    <span className={className ? `formula ${className}` : 'formula'}>
      {formulaSegments(formula).map((segment, index) =>
        segment.sub ? <sub key={index}>{segment.text}</sub> : <span key={index}>{segment.text}</span>,
      )}
      {charge !== 0 ? <sup>{chargeLabel(charge)}</sup> : null}
    </span>
  )
}
