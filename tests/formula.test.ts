import { describe, expect, it } from 'vitest'
import { chargeLabel, formulaSegments, parseFormula } from '../src/domain/formula'

describe('parseFormula', () => {
  it('解析简单化学式', () => {
    expect(parseFormula('CuSO4')).toEqual({ Cu: 1, S: 1, O: 4 })
    expect(parseFormula('H2O2')).toEqual({ H: 2, O: 2 })
    expect(parseFormula('C2H5OH')).toEqual({ C: 2, H: 6, O: 1 })
  })

  it('解析括号与倍数', () => {
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 })
    expect(parseFormula('Fe(SCN)3')).toEqual({ Fe: 1, S: 3, C: 3, N: 3 })
    expect(parseFormula('Ca(CH3COO)2')).toEqual({ Ca: 1, C: 4, H: 6, O: 4 })
  })

  it('解析方括号络合物', () => {
    expect(parseFormula('[Cu(NH3)4]SO4')).toEqual({
      Cu: 1,
      N: 4,
      H: 12,
      S: 1,
      O: 4,
    })
  })

  it('解析水合物点号', () => {
    expect(parseFormula('NH3·H2O')).toEqual({ N: 1, H: 5, O: 1 })
    expect(parseFormula('CuSO4·5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 })
  })

  it('拒绝不匹配的括号', () => {
    expect(() => parseFormula('Ca(OH')).toThrow()
    expect(() => parseFormula('Ca)OH(')).toThrow()
  })
})

describe('formulaSegments', () => {
  it('把所有数字拆成下标', () => {
    expect(formulaSegments('Cu(OH)2')).toEqual([
      { text: 'Cu(OH)' },
      { text: '2', sub: true },
    ])
  })
})

describe('chargeLabel', () => {
  it('格式化电荷', () => {
    expect(chargeLabel(1)).toBe('+')
    expect(chargeLabel(2)).toBe('2+')
    expect(chargeLabel(-1)).toBe('−')
    expect(chargeLabel(-2)).toBe('2−')
    expect(chargeLabel(0)).toBe('')
  })
})
