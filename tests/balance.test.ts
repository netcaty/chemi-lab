import { describe, expect, it } from 'vitest'
import { validateAllReactions } from '../src/domain/balance'
import { parseFormula } from '../src/domain/formula'
import { REACTIONS } from '../src/domain/reactions'
import { REAGENTS } from '../src/domain/reagents'
import { SPECIES } from '../src/domain/species'
import type { EquationDisplay } from '../src/domain/types'

describe('化学数据完整性', () => {
  it('所有物种的化学式都能被解析', () => {
    for (const species of SPECIES) {
      expect(() => parseFormula(species.formula), species.id).not.toThrow()
    }
  })

  it('所有试剂引用的物种都存在', () => {
    const ids = new Set(SPECIES.map((species) => species.id))
    for (const reagent of REAGENTS) {
      for (const entry of reagent.composition) {
        expect(ids.has(entry.speciesId), `${reagent.id} -> ${entry.speciesId}`).toBe(true)
      }
    }
  })

  it('所有反应都满足元素守恒与电荷守恒', () => {
    const issues = validateAllReactions(REACTIONS)
    expect(issues, issues.map((issue) => issue.message).join('\n')).toEqual([])
  })

  it('分子方程式中的化学式都能被解析', () => {
    const displays: EquationDisplay[] = REACTIONS.flatMap((reaction) => [
      reaction.display.molecular,
      reaction.display.ionic,
    ])
    for (const display of displays) {
      for (const part of [...display.left, ...display.right]) {
        expect(() => parseFormula(part.formula), part.formula).not.toThrow()
      }
    }
  })

  it('反应包含的现象描述不为空', () => {
    for (const reaction of REACTIONS) {
      expect(reaction.phenomenon.length, reaction.id).toBeGreaterThan(0)
    }
  })
})
