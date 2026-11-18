import { describe, expect, it } from 'vitest'
import { blendHexColors, hexToOklab, mixHex, oklabToHex } from '../src/domain/color'
import { indicatorAppearance } from '../src/domain/ph'

describe('OKLab 颜色', () => {
  it('颜色转换可往返', () => {
    for (const hex of ['#2E7BD6', '#E8B923', '#F2F0E6', '#8E1B1B']) {
      const roundTrip = oklabToHex(hexToOklab(hex))
      expect(roundTrip.toLowerCase()).toBe(hex.toLowerCase())
    }
  })

  it('混合端点保持原色', () => {
    expect(mixHex('#2E7BD6', '#E8B923', 0).toLowerCase()).toBe('#2e7bd6')
    expect(mixHex('#2E7BD6', '#E8B923', 1).toLowerCase()).toBe('#e8b923')
  })

  it('权重为零时返回兜底色', () => {
    expect(blendHexColors([], '#DDEEF0')).toBe('#DDEEF0')
    expect(blendHexColors([{ color: '#2E7BD6', weight: 0 }], '#DDEEF0')).toBe('#DDEEF0')
  })

  it('蓝黄混合仍产生可辨认的绿色系颜色', () => {
    const mix = mixHex('#2E7BD6', '#E8B923', 0.5)
    const rgb = {
      r: parseInt(mix.slice(1, 3), 16),
      g: parseInt(mix.slice(3, 5), 16),
      b: parseInt(mix.slice(5, 7), 16),
    }
    expect(rgb.g).toBeGreaterThan(rgb.b * 0.7)
  })
})

describe('指示剂变色', () => {
  it('酚酞在酸中无色、在碱中粉红', () => {
    expect(indicatorAppearance('phenolphthalein', 5).alpha).toBe(0)
    expect(indicatorAppearance('phenolphthalein', 9).alpha).toBeGreaterThan(0)
    expect(indicatorAppearance('phenolphthalein', 11).alpha).toBeGreaterThan(0.7)
  })

  it('甲基橙在酸中偏红、在碱中偏黄', () => {
    const acid = indicatorAppearance('methyl_orange', 2)
    const base = indicatorAppearance('methyl_orange', 6)
    expect(acid.alpha).toBeGreaterThan(0)
    expect(base.alpha).toBeGreaterThan(0)
    expect(acid.color).not.toBe(base.color)
  })
})
