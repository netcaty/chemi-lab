import { describe, expect, it } from 'vitest'
import { LabEngine, MAX_VOLUME_ML } from '../src/domain/engine'
import { computePH, indicatorAppearance } from '../src/domain/ph'
import type { LabSnapshot } from '../src/domain/types'

function run(engine: LabEngine, seconds: number, dt = 0.05) {
  const steps = Math.ceil(seconds / dt)
  for (let i = 0; i < steps; i += 1) {
    engine.tick(dt)
  }
}

function moles(snapshot: LabSnapshot, speciesId: string): number {
  return snapshot.contents.find((entry) => entry.species.id === speciesId)?.moles ?? 0
}

function gasMoles(snapshot: LabSnapshot, speciesId: string): number {
  return snapshot.gases.find((entry) => entry.speciesId === speciesId)?.moles ?? 0
}

describe('LabEngine 基本行为', () => {
  it('加入液体增加体积，加入固体不增加体积', () => {
    const engine = new LabEngine()
    engine.addReagent('cuso4')
    engine.addReagent('fe')
    const snapshot = engine.getSnapshot()
    expect(snapshot.volumeMl).toBe(10)
    expect(moles(snapshot, 'cu2')).toBeCloseTo(0.005, 6)
    expect(moles(snapshot, 'fe')).toBeCloseTo(0.01, 6)
  })

  it('烧杯容量有上限', () => {
    const engine = new LabEngine()
    for (let i = 0; i < MAX_VOLUME_ML / 10; i += 1) {
      expect(engine.addReagent('water').ok).toBe(true)
    }
    const snapshot = engine.getSnapshot()
    expect(snapshot.volumeMl).toBe(MAX_VOLUME_ML)
    expect(engine.canAddReagent('water')).toBe(false)
    expect(engine.addReagent('water').ok).toBe(false)
    expect(engine.canAddReagent('zn')).toBe(true)
  })
})

describe('沉淀反应', () => {
  it('CuSO4 + NaOH 生成蓝色 Cu(OH)2 沉淀并沉降', () => {
    const engine = new LabEngine()
    engine.addReagent('cuso4')
    run(engine, 0.2)
    engine.addReagent('naoh')
    run(engine, 8)

    const snapshot = engine.getSnapshot()
    expect(moles(snapshot, 'cu2')).toBeLessThan(1e-6)
    expect(moles(snapshot, 'cuoh2')).toBeCloseTo(0.005, 5)
    expect(snapshot.ph).toBeGreaterThan(6.5)
    expect(snapshot.ph).toBeLessThan(8.5)

    const precipitate = snapshot.contents.find((entry) => entry.species.id === 'cuoh2')
    expect(precipitate?.sedimentMoles).toBeGreaterThan(0.002)
    expect(snapshot.activeReaction).toBeNull()
    expect(snapshot.lastReactionId).toBe('cu-oh')
  })

  it('Pb(NO3)2 + KI 生成金黄色 PbI2', () => {
    const engine = new LabEngine()
    engine.addReagent('pbno32')
    run(engine, 0.2)
    engine.addReagent('ki')
    run(engine, 8)

    const snapshot = engine.getSnapshot()
    expect(moles(snapshot, 'pbi2')).toBeCloseTo(0.005, 5)
    expect(snapshot.ph).toBeCloseTo(7, 1)
  })

  it('沉淀可以被酸溶解', () => {
    const engine = new LabEngine()
    engine.addReagent('cuso4')
    engine.addReagent('naoh')
    run(engine, 8)
    expect(moles(engine.getSnapshot(), 'cuoh2')).toBeCloseTo(0.005, 5)

    engine.addReagent('hcl')
    run(engine, 8)

    const snapshot = engine.getSnapshot()
    expect(moles(snapshot, 'cuoh2')).toBeLessThan(1e-6)
    expect(moles(snapshot, 'cu2')).toBeCloseTo(0.005, 5)
    expect(snapshot.lastReactionId).toBe('cuoh2-h')
  })
})

describe('气体与酸碱', () => {
  it('Na2CO3 + HCl 生成 CO2', () => {
    const engine = new LabEngine()
    engine.addReagent('na2co3')
    run(engine, 0.2)
    engine.addReagent('hcl')
    run(engine, 6)

    const snapshot = engine.getSnapshot()
    expect(gasMoles(snapshot, 'co2')).toBeCloseTo(0.005, 5)
    expect(moles(snapshot, 'co3')).toBeLessThan(1e-6)
    expect(snapshot.ph).toBeCloseTo(7, 1)
  })

  it('酸碱中和优先于碳酸盐分解', () => {
    const engine = new LabEngine()
    engine.addReagent('naoh')
    engine.addReagent('na2co3')
    engine.addReagent('hcl')
    run(engine, 8)

    const first = engine.getSnapshot()
    expect(moles(first, 'co3')).toBeCloseTo(0.005, 5)
    expect(gasMoles(first, 'co2')).toBeLessThan(1e-6)

    engine.addReagent('hcl')
    run(engine, 8)

    const second = engine.getSnapshot()
    expect(moles(second, 'co3')).toBeLessThan(1e-6)
    expect(gasMoles(second, 'co2')).toBeCloseTo(0.005, 5)
  })

  it('酚酞在碱性溶液中变粉红，酸化后褪色', () => {
    const engine = new LabEngine()
    engine.addReagent('naoh')
    engine.addReagent('phenolphthalein')
    run(engine, 1)

    const basic = engine.getSnapshot()
    expect(basic.ph).toBeGreaterThan(10)
    expect(indicatorAppearance('phenolphthalein', basic.ph).alpha).toBeGreaterThan(0.5)
    const basicColor = basic.solutionColor

    engine.addReagent('hcl')
    run(engine, 4)

    const neutral = engine.getSnapshot()
    expect(neutral.ph).toBeGreaterThan(6.5)
    expect(neutral.ph).toBeLessThan(7.5)
    expect(indicatorAppearance('phenolphthalein', neutral.ph).alpha).toBe(0)
    expect(neutral.solutionColor).not.toBe(basicColor)
  })
})

describe('置换、催化与络合', () => {
  it('Fe 置换 CuSO4 中的铜', () => {
    const engine = new LabEngine()
    engine.addReagent('cuso4')
    run(engine, 0.2)
    engine.addReagent('fe')
    run(engine, 10)

    const snapshot = engine.getSnapshot()
    expect(moles(snapshot, 'cu2')).toBeLessThan(1e-6)
    expect(moles(snapshot, 'cu')).toBeCloseTo(0.005, 5)
    expect(moles(snapshot, 'fe2')).toBeCloseTo(0.005, 5)
  })

  it('MnO2 催化 H2O2 分解，自身不消耗', () => {
    const engine = new LabEngine()
    engine.addReagent('h2o2')
    run(engine, 0.2)
    engine.addReagent('mno2')
    run(engine, 10)

    const snapshot = engine.getSnapshot()
    expect(gasMoles(snapshot, 'o2')).toBeCloseTo(0.005, 5)
    expect(moles(snapshot, 'mno2')).toBeCloseTo(0.005, 5)
    expect(moles(snapshot, 'h2o2')).toBeLessThan(1e-6)
  })

  it('Fe3+ 与 SCN- 生成血红色络合物', () => {
    const engine = new LabEngine()
    engine.addReagent('fecl3')
    run(engine, 0.2)
    engine.addReagent('kscn')
    run(engine, 4)

    const snapshot = engine.getSnapshot()
    expect(moles(snapshot, 'fescn3')).toBeGreaterThan(0)
    expect(snapshot.contents.some((entry) => entry.species.id === 'fescn3')).toBe(true)
  })
})

describe('pH 简化模型', () => {
  it('强酸、强碱、弱酸、弱碱的 pH 方向正确', () => {
    expect(computePH(new Map([['h', 0.01]]), 10)).toBeLessThan(2)
    expect(computePH(new Map([['oh', 0.01]]), 10)).toBeGreaterThan(12)
    expect(computePH(new Map([['ch3cooh', 0.005]]), 10)).toBeLessThan(4)
    expect(computePH(new Map([['nh3', 0.005]]), 10)).toBeGreaterThan(10)
    expect(computePH(new Map(), 10)).toBe(7)
  })
})
