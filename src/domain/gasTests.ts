import { SPECIES_BY_ID } from './species'

export type GasTestId = 'splint' | 'limewater' | 'ignite'
export type GasTestEffect = 'glow' | 'milky' | 'flame' | 'none'

export interface GasTestOption {
  id: GasTestId
  name: string
  description: string
  targetGasId: string
}

export interface GasSample {
  speciesId: string
  moles: number
}

export interface GasTestResult {
  success: boolean
  gasId: string | null
  gasName: string | null
  gasFormula: string | null
  title: string
  detail: string
  effect: GasTestEffect
}

export const GAS_TESTS: GasTestOption[] = [
  {
    id: 'splint',
    name: '带火星木条',
    description: '伸入集气瓶，观察木条是否复燃',
    targetGasId: 'o2',
  },
  {
    id: 'limewater',
    name: '澄清石灰水',
    description: '通入石灰水，观察是否变浑浊',
    targetGasId: 'co2',
  },
  {
    id: 'ignite',
    name: '点燃',
    description: '验纯后点燃，观察火焰和声音',
    targetGasId: 'h2',
  },
]

const FAILURE_DETAIL: Record<GasTestId, string> = {
  splint: '带火星的木条没有复燃，说明这种气体不是氧气。',
  limewater: '澄清石灰水没有变浑浊，说明这种气体不是二氧化碳。',
  ignite: '气体没有被点燃，也没有出现淡蓝色火焰和爆鸣声。',
}

/**
 * 根据当前收集到的气体和选择的检验方法给出结果。
 * 只看气泡无法判断气体身份，必须依赖特征现象。
 */
export function runGasTest(testId: GasTestId, gases: GasSample[]): GasTestResult {
  const test = GAS_TESTS.find((item) => item.id === testId)
  if (!test) {
    return {
      success: false,
      gasId: null,
      gasName: null,
      gasFormula: null,
      title: '未知检验方法',
      detail: '请选择一种检验方法。',
      effect: 'none',
    }
  }

  if (gases.length === 0) {
    return {
      success: false,
      gasId: null,
      gasName: null,
      gasFormula: null,
      title: '还没有收集到气体',
      detail: '先让反应产生气体，再来检验。',
      effect: 'none',
    }
  }

  const match = gases.find((gas) => gas.speciesId === test.targetGasId)
  if (match) {
    const species = SPECIES_BY_ID[match.speciesId]
    if (!species) {
      return {
        success: false,
        gasId: null,
        gasName: null,
        gasFormula: null,
        title: '检验失败',
        detail: '气体信息不完整。',
        effect: 'none',
      }
    }

    if (testId === 'splint') {
      return {
        success: true,
        gasId: species.id,
        gasName: species.name,
        gasFormula: species.formula,
        title: '木条复燃了',
        detail: '带火星的木条复燃，说明收集到的气体是氧气（O₂）。',
        effect: 'glow',
      }
    }
    if (testId === 'limewater') {
      return {
        success: true,
        gasId: species.id,
        gasName: species.name,
        gasFormula: species.formula,
        title: '石灰水变浑浊',
        detail: '澄清石灰水变浑浊，说明收集到的气体是二氧化碳（CO₂）。',
        effect: 'milky',
      }
    }
    return {
      success: true,
      gasId: species.id,
      gasName: species.name,
      gasFormula: species.formula,
      title: '淡蓝色火焰 + 爆鸣声',
      detail: '点燃时产生淡蓝色火焰并发出爆鸣声，说明收集到的气体是氢气（H₂）。实验前应先验纯。',
      effect: 'flame',
    }
  }

  return {
    success: false,
    gasId: null,
    gasName: null,
    gasFormula: null,
    title: '现象不符',
    detail: `${FAILURE_DETAIL[testId]}换一种检验方法试试。`,
    effect: 'none',
  }
}
