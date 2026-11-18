import { mixHex } from './color'

const KW = 1e-14
const KA_ACETIC = 1.8e-5
const KB_AMMONIA = 1.8e-5
const KB_CARBONATE = 2.1e-4
const KB_BICARBONATE = 2.3e-8

function clampPH(value: number): number {
  return Math.min(14, Math.max(0, value))
}

/**
 * 高中层面的简化 pH 模型：
 * - 强酸/强碱按自由 H⁺ / OH⁻ 计算
 * - 醋酸、氨水、碳酸根、碳酸氢根按一元弱平衡近似
 * - 不处理活度系数、多元平衡、缓冲体系精确解
 */
export function computePH(amounts: Map<string, number>, volumeMl: number): number {
  const volumeL = Math.max(volumeMl, 1) / 1000
  const strongH = (amounts.get('h') ?? 0) / volumeL
  const strongOH = (amounts.get('oh') ?? 0) / volumeL
  const net = strongH - strongOH

  if (net > 1e-7) {
    return clampPH(-Math.log10(net))
  }
  if (net < -1e-7) {
    return clampPH(14 + Math.log10(-net))
  }

  const acetic = (amounts.get('ch3cooh') ?? 0) / volumeL
  const ammonia = (amounts.get('nh3') ?? 0) / volumeL
  const carbonate = (amounts.get('co3') ?? 0) / volumeL
  const bicarbonate = (amounts.get('hco3') ?? 0) / volumeL

  const acidContribution = acetic > 0 ? Math.sqrt(KA_ACETIC * acetic) : 0
  const baseContribution = Math.max(
    ammonia > 0 ? Math.sqrt(KB_AMMONIA * ammonia) : 0,
    carbonate > 0 ? Math.sqrt(KB_CARBONATE * carbonate) : 0,
    bicarbonate > 0 ? Math.sqrt(KB_BICARBONATE * bicarbonate) : 0,
  )

  if (acidContribution > baseContribution && acidContribution > 0) {
    // 极稀溶液由水的自偶电离主导，pH 不应偏离 7 太远
    return clampPH(-Math.log10(Math.max(acidContribution, 1e-7)))
  }
  if (baseContribution > 0) {
    return clampPH(14 + Math.log10(Math.max(baseContribution, 1e-7)))
  }

  // 纯水，弱酸/弱碱的共轭盐视为近中性
  return 7
}

export interface IndicatorDefinition {
  id: string
  name: string
  acidColor: string
  baseColor: string
  lowPH: number
  highPH: number
  /** 完全变色时的可见强度 */
  strength: number
  /** 低 pH 端是否几乎无色 */
  colorlessInAcid?: boolean
}

export const INDICATORS: Record<string, IndicatorDefinition> = {
  phenolphthalein: {
    id: 'phenolphthalein',
    name: '酚酞',
    acidColor: '#F4F0E8',
    baseColor: '#E85D9E',
    lowPH: 8.2,
    highPH: 10,
    strength: 0.9,
    colorlessInAcid: true,
  },
  methyl_orange: {
    id: 'methyl_orange',
    name: '甲基橙',
    acidColor: '#D9483B',
    baseColor: '#E8B923',
    lowPH: 3.1,
    highPH: 4.4,
    strength: 0.75,
  },
  litmus: {
    id: 'litmus',
    name: '石蕊',
    acidColor: '#C94A4A',
    baseColor: '#4A6FC9',
    lowPH: 5,
    highPH: 8,
    strength: 0.7,
  },
}

export interface IndicatorAppearance {
  color: string
  alpha: number
}

export function indicatorAppearance(indicatorId: string, ph: number): IndicatorAppearance {
  const definition = INDICATORS[indicatorId]
  if (!definition) {
    return { color: '#DDEEF0', alpha: 0 }
  }

  const raw = (ph - definition.lowPH) / (definition.highPH - definition.lowPH)
  const t = Math.min(1, Math.max(0, raw))
  const color = mixHex(definition.acidColor, definition.baseColor, t)
  const alpha = definition.colorlessInAcid ? definition.strength * t : definition.strength

  return { color, alpha }
}

export { KW }
