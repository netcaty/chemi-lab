import type { Reagent, ReagentCategory } from './types'

type Composition = Record<string, number>

const WATER_TINT = '#DDEEF0'

function solution(
  id: string,
  name: string,
  formula: string,
  color: string,
  composition: Composition,
  options: {
    volumeMl?: number
    concentrationM?: number
    category?: ReagentCategory
    note?: string
  } = {},
): Reagent {
  const volumeMl = options.volumeMl ?? 10
  return {
    id,
    name,
    formula,
    category: options.category ?? '溶液',
    volumeMl,
    concentrationM: options.concentrationM,
    addedMoles: Object.values(composition).reduce((sum, moles) => sum + moles, 0),
    composition: Object.entries(composition).map(([speciesId, moles]) => ({ speciesId, moles })),
    addAnimation: 'pour',
    color,
    note: options.note,
  }
}

function solidReagent(
  id: string,
  name: string,
  formula: string,
  speciesId: string,
  moles: number,
  color: string,
  note?: string,
): Reagent {
  return {
    id,
    name,
    formula,
    category: '固体',
    volumeMl: 0,
    addedMoles: moles,
    composition: [{ speciesId, moles }],
    addAnimation: 'solid',
    color,
    note,
  }
}

function indicatorReagent(
  id: string,
  name: string,
  formula: string,
  speciesId: string,
  color: string,
  note: string,
): Reagent {
  return {
    id,
    name,
    formula,
    category: '指示剂',
    volumeMl: 1,
    concentrationM: 0.01,
    addedMoles: 1e-5,
    composition: [{ speciesId, moles: 1e-5 }],
    addAnimation: 'drop',
    color,
    note,
  }
}

export const REAGENTS: Reagent[] = [
  // 盐溶液
  solution('cuso4', '硫酸铜溶液', 'CuSO4', '#2E7BD6', { cu2: 0.005, so4: 0.005 }, {
    note: '蓝色溶液',
  }),
  solution('fecl3', '氯化铁溶液', 'FeCl3', '#C98A2E', { fe3: 0.005, cl: 0.015 }, {
    note: '黄色溶液',
  }),
  solution('fecl2', '氯化亚铁溶液', 'FeCl2', '#6FAE8A', { fe2: 0.005, cl: 0.01 }, {
    note: '浅绿色溶液',
  }),
  solution('agno3', '硝酸银溶液', 'AgNO3', WATER_TINT, { ag: 0.005, no3: 0.005 }),
  solution('pbno32', '硝酸铅溶液', 'Pb(NO3)2', WATER_TINT, { pb2: 0.005, no3: 0.01 }),
  solution('nacl', '氯化钠溶液', 'NaCl', WATER_TINT, { na: 0.005, cl: 0.005 }),
  solution('bacl2', '氯化钡溶液', 'BaCl2', WATER_TINT, { ba2: 0.005, cl: 0.01 }),
  solution('na2so4', '硫酸钠溶液', 'Na2SO4', WATER_TINT, { na: 0.01, so4: 0.005 }),
  solution('na2co3', '碳酸钠溶液', 'Na2CO3', WATER_TINT, { na: 0.01, co3: 0.005 }),
  solution('ki', '碘化钾溶液', 'KI', WATER_TINT, { k: 0.01, i: 0.01 }, { concentrationM: 1 }),
  solution('nahco3', '碳酸氢钠溶液', 'NaHCO3', WATER_TINT, { na: 0.005, hco3: 0.005 }),
  solution('kscn', '硫氰化钾溶液', 'KSCN', WATER_TINT, { k: 0.005, scn: 0.005 }),

  // 酸
  solution('hcl', '稀盐酸', 'HCl', WATER_TINT, { h: 0.01, cl: 0.01 }, { category: '酸', concentrationM: 1 }),
  solution('h2so4', '稀硫酸', 'H2SO4', WATER_TINT, { h: 0.01, so4: 0.005 }, { category: '酸' }),
  solution('ch3cooh', '醋酸', 'CH3COOH', WATER_TINT, { ch3cooh: 0.005 }, { category: '酸' }),

  // 碱
  solution('naoh', '氢氧化钠溶液', 'NaOH', WATER_TINT, { na: 0.01, oh: 0.01 }, {
    category: '碱',
    concentrationM: 1,
  }),
  solution(
    'caoh2',
    '澄清石灰水',
    'Ca(OH)2',
    WATER_TINT,
    { ca2: 0.001, oh: 0.002 },
    { category: '碱', concentrationM: 0.1, note: '饱和石灰水，浓度较低' },
  ),
  solution('nh3', '氨水', 'NH3·H2O', WATER_TINT, { nh3: 0.005 }, { category: '碱' }),

  // 固体
  solidReagent('zn', '锌粒', 'Zn', 'zn', 0.01, '#A8ADB0'),
  solidReagent('mg', '镁条', 'Mg', 'mg', 0.01, '#C8CCCE'),
  solidReagent('fe', '铁钉', 'Fe', 'fe', 0.01, '#8A8F94'),
  solidReagent('caco3', '碳酸钙', 'CaCO3', 'caco3', 0.01, '#EFEDE2'),
  solidReagent('cuo', '氧化铜', 'CuO', 'cuo', 0.01, '#2E2A26'),
  solidReagent('mno2', '二氧化锰', 'MnO2', 'mno2', 0.005, '#3A3630', '催化剂'),

  // 其他
  solution('h2o2', '过氧化氢溶液', 'H2O2', WATER_TINT, { h2o2: 0.01 }, {
    category: '其他',
    concentrationM: 1,
  }),
  solution('water', '蒸馏水', 'H2O', WATER_TINT, { h2o: 0.5 }, { category: '其他' }),

  // 指示剂
  indicatorReagent('phenolphthalein', '酚酞', 'C20H14O4', 'phenolphthalein', '#E85D9E', 'pH 8.2–10 由无色变粉红'),
  indicatorReagent('methyl_orange', '甲基橙', 'C14H14N3NaO3S', 'methyl_orange', '#E8B923', 'pH 3.1–4.4 由红变黄'),
  indicatorReagent('litmus', '石蕊', 'C7H7NO4', 'litmus', '#7A8FD0', 'pH 5–8 由红变蓝'),
]

export const REAGENTS_BY_ID: Record<string, Reagent> = Object.fromEntries(
  REAGENTS.map((reagent) => [reagent.id, reagent]),
)

export function getReagent(reagentId: string): Reagent {
  const reagent = REAGENTS_BY_ID[reagentId]
  if (!reagent) {
    throw new Error(`未知试剂: ${reagentId}`)
  }
  return reagent
}

export const REAGENT_CATEGORIES: ReagentCategory[] = ['溶液', '酸', '碱', '固体', '指示剂', '其他']
