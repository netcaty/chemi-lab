import { parseFormula, type ElementCounts } from './formula'
import { SPECIES_BY_ID } from './species'
import type { Reaction } from './types'

export interface BalanceIssue {
  reactionId: string
  kind: 'missing-species' | 'element' | 'charge'
  message: string
}

function addInto(target: ElementCounts, source: ElementCounts, multiplier: number) {
  for (const [element, count] of Object.entries(source)) {
    target[element] = (target[element] ?? 0) + count * multiplier
  }
}

export function reactionElements(reaction: Reaction): {
  left: ElementCounts
  right: ElementCounts
  leftCharge: number
  rightCharge: number
} {
  const left: ElementCounts = {}
  const right: ElementCounts = {}
  let leftCharge = 0
  let rightCharge = 0

  for (const entry of reaction.reactants) {
    const species = SPECIES_BY_ID[entry.speciesId]
    if (!species) continue
    addInto(left, parseFormula(species.formula), entry.coeff)
    leftCharge += species.charge * entry.coeff
  }

  for (const entry of reaction.products) {
    const species = SPECIES_BY_ID[entry.speciesId]
    if (!species) continue
    addInto(right, parseFormula(species.formula), entry.coeff)
    rightCharge += species.charge * entry.coeff
  }

  return { left, right, leftCharge, rightCharge }
}

export function checkReactionBalance(reaction: Reaction): BalanceIssue[] {
  const issues: BalanceIssue[] = []

  for (const entry of [...reaction.reactants, ...reaction.products]) {
    if (!SPECIES_BY_ID[entry.speciesId]) {
      issues.push({
        reactionId: reaction.id,
        kind: 'missing-species',
        message: `反应 ${reaction.id} 引用了不存在的物种 ${entry.speciesId}`,
      })
    }
  }

  if (reaction.catalyst && !SPECIES_BY_ID[reaction.catalyst]) {
    issues.push({
      reactionId: reaction.id,
      kind: 'missing-species',
      message: `反应 ${reaction.id} 引用了不存在的催化剂 ${reaction.catalyst}`,
    })
  }

  const { left, right, leftCharge, rightCharge } = reactionElements(reaction)
  const elements = new Set([...Object.keys(left), ...Object.keys(right)])

  for (const element of elements) {
    if (Math.abs((left[element] ?? 0) - (right[element] ?? 0)) > 1e-9) {
      issues.push({
        reactionId: reaction.id,
        kind: 'element',
        message: `反应 ${reaction.id} 元素 ${element} 不守恒：左 ${left[element] ?? 0}，右 ${right[element] ?? 0}`,
      })
    }
  }

  if (Math.abs(leftCharge - rightCharge) > 1e-9) {
    issues.push({
      reactionId: reaction.id,
      kind: 'charge',
      message: `反应 ${reaction.id} 电荷不守恒：左 ${leftCharge}，右 ${rightCharge}`,
    })
  }

  return issues
}

export function validateAllReactions(reactions: Reaction[]): BalanceIssue[] {
  return reactions.flatMap(checkReactionBalance)
}
