import { describe, expect, it } from 'vitest'
import { runGasTest } from '../src/domain/gasTests'

describe('气体检验', () => {
  it('带火星木条可以检验氧气', () => {
    const result = runGasTest('splint', [{ speciesId: 'o2', moles: 0.005 }])
    expect(result.success).toBe(true)
    expect(result.gasId).toBe('o2')
    expect(result.effect).toBe('glow')
  })

  it('澄清石灰水可以检验二氧化碳', () => {
    const result = runGasTest('limewater', [{ speciesId: 'co2', moles: 0.005 }])
    expect(result.success).toBe(true)
    expect(result.gasId).toBe('co2')
    expect(result.effect).toBe('milky')
  })

  it('点燃可以检验氢气', () => {
    const result = runGasTest('ignite', [{ speciesId: 'h2', moles: 0.005 }])
    expect(result.success).toBe(true)
    expect(result.gasId).toBe('h2')
    expect(result.effect).toBe('flame')
  })

  it('错误的方法不会误判', () => {
    const result = runGasTest('splint', [{ speciesId: 'co2', moles: 0.005 }])
    expect(result.success).toBe(false)
    expect(result.effect).toBe('none')
  })

  it('没有收集到气体时提示先产生气体', () => {
    const result = runGasTest('limewater', [])
    expect(result.success).toBe(false)
    expect(result.title).toContain('还没有')
  })

  it('混合气体中可以检出目标气体', () => {
    const result = runGasTest('limewater', [
      { speciesId: 'o2', moles: 0.002 },
      { speciesId: 'co2', moles: 0.003 },
    ])
    expect(result.success).toBe(true)
    expect(result.gasId).toBe('co2')
  })
})
