export interface PresetStep {
  reagentId: string
  /** 距离上一步的等待时间 */
  delayMs: number
}

export interface Preset {
  id: string
  name: string
  tagline: string
  description: string
  steps: PresetStep[]
}

export const PRESETS: Preset[] = [
  {
    id: 'blue-precipitate',
    name: '蓝色沉淀',
    tagline: 'Cu²⁺ + 2OH⁻',
    description: '硫酸铜与氢氧化钠生成蓝色的氢氧化铜沉淀，随后沉淀缓缓沉降。',
    steps: [
      { reagentId: 'cuso4', delayMs: 300 },
      { reagentId: 'naoh', delayMs: 2200 },
    ],
  },
  {
    id: 'golden-rain',
    name: '黄金雨',
    tagline: 'Pb²⁺ + 2I⁻',
    description: '硝酸铅与碘化钾生成金黄色碘化铅沉淀，像一场缓慢落下的金色小雨。',
    steps: [
      { reagentId: 'pbno32', delayMs: 300 },
      { reagentId: 'ki', delayMs: 2200 },
    ],
  },
  {
    id: 'iron-displacement',
    name: '铁钉置换',
    tagline: 'Fe + Cu²⁺',
    description: '铁钉把铜从硫酸铜溶液中置换出来，蓝色逐渐褪去，表面析出红色的铜。',
    steps: [
      { reagentId: 'cuso4', delayMs: 300 },
      { reagentId: 'fe', delayMs: 2000 },
    ],
  },
  {
    id: 'acid-base-indicator',
    name: '酸碱指示',
    tagline: '酚酞 + NaOH + HCl',
    description: '酚酞在碱性溶液中变粉红，加入盐酸中和后重新褪为无色。',
    steps: [
      { reagentId: 'naoh', delayMs: 300 },
      { reagentId: 'phenolphthalein', delayMs: 1200 },
      { reagentId: 'hcl', delayMs: 3000 },
    ],
  },
  {
    id: 'oxygen',
    name: '氧气生成',
    tagline: 'H₂O₂ --MnO₂-->',
    description: '二氧化锰催化过氧化氢分解，产生大量氧气气泡，而催化剂本身不消耗。',
    steps: [
      { reagentId: 'h2o2', delayMs: 300 },
      { reagentId: 'mno2', delayMs: 1500 },
    ],
  },
  {
    id: 'blood-red',
    name: '血红色检验',
    tagline: 'Fe³⁺ + 3SCN⁻',
    description: '硫氰化钾检验铁离子，溶液迅速变为血红色。',
    steps: [
      { reagentId: 'fecl3', delayMs: 300 },
      { reagentId: 'kscn', delayMs: 1600 },
    ],
  },
]

export const PRESETS_BY_ID: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((preset) => [preset.id, preset]),
)
