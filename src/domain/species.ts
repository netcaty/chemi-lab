import type { Species } from './types'

function ion(
  id: string,
  formula: string,
  name: string,
  charge: number,
  color: string,
  tintStrength = 0,
  note?: string,
): Species {
  return { id, formula, name, charge, color, tintStrength, kind: 'ion', phase: 'aq', note }
}

function molecule(
  id: string,
  formula: string,
  name: string,
  color: string,
  tintStrength = 0,
  note?: string,
): Species {
  return { id, formula, name, charge: 0, color, tintStrength, kind: 'molecule', phase: 'aq', note }
}

function solid(
  id: string,
  formula: string,
  name: string,
  color: string,
  isPrecipitate = false,
): Species {
  return {
    id,
    formula,
    name,
    charge: 0,
    color,
    tintStrength: 0,
    kind: 'solid',
    phase: 's',
    isPrecipitate,
  }
}

function gas(id: string, formula: string, name: string, color: string): Species {
  return { id, formula, name, charge: 0, color, tintStrength: 0, kind: 'gas', phase: 'g' }
}

function indicator(id: string, formula: string, name: string, color: string): Species {
  return {
    id,
    formula,
    name,
    charge: 0,
    color,
    tintStrength: 0,
    kind: 'indicator',
    phase: 'aq',
  }
}

export const SPECIES: Species[] = [
  // 常见离子
  ion('h', 'H', '氢离子', 1, '#D07A7A'),
  ion('na', 'Na', '钠离子', 1, '#7C8FA3'),
  ion('k', 'K', '钾离子', 1, '#8A8FA8'),
  ion('nh4', 'NH4', '铵根离子', 1, '#8AA39A'),
  ion('cu2', 'Cu', '铜离子', 2, '#2E7BD6', 240),
  ion('fe2', 'Fe', '亚铁离子', 2, '#6FAE8A', 140),
  ion('fe3', 'Fe', '铁离子', 3, '#C98A2E', 180),
  ion('ca2', 'Ca', '钙离子', 2, '#9AA7A0'),
  ion('pb2', 'Pb', '铅离子', 2, '#8C8FA0'),
  ion('ag', 'Ag', '银离子', 1, '#A8A8B0'),
  ion('ba2', 'Ba', '钡离子', 2, '#9AA7A0'),
  ion('mg2', 'Mg', '镁离子', 2, '#9AA7A0'),
  ion('zn2', 'Zn', '锌离子', 2, '#9AA7A0'),
  ion('cl', 'Cl', '氯离子', -1, '#8A9B8E'),
  ion('oh', 'OH', '氢氧根离子', -1, '#6FA8C9'),
  ion('no3', 'NO3', '硝酸根离子', -1, '#9A8C7A'),
  ion('so4', 'SO4', '硫酸根离子', -2, '#8B7FA8'),
  ion('co3', 'CO3', '碳酸根离子', -2, '#8B7FA8'),
  ion('hco3', 'HCO3', '碳酸氢根离子', -1, '#8B7FA8'),
  ion('i', 'I', '碘离子', -1, '#B08A6A'),
  ion('scn', 'SCN', '硫氰酸根离子', -1, '#A08A7A'),
  ion('ch3coo', 'CH3COO', '醋酸根离子', -1, '#8B9A8A'),

  // 分子 / 弱电解质
  molecule('ch3cooh', 'CH3COOH', '醋酸', '#8B9A8A'),
  molecule('nh3', 'NH3·H2O', '氨水', '#7FA39A'),
  molecule('h2o2', 'H2O2', '过氧化氢', '#CFE8F0', 30),
  { ...molecule('h2o', 'H2O', '水', '#CFE8F0'), phase: 'l' },
  molecule('fescn3', 'Fe(SCN)3', '硫氰化铁', '#A31818', 5000),

  // 沉淀
  solid('cuoh2', 'Cu(OH)2', '氢氧化铜', '#4A9BE8', true),
  solid('feoh3', 'Fe(OH)3', '氢氧化铁', '#9A4B2E', true),
  solid('feoh2', 'Fe(OH)2', '氢氧化亚铁', '#A8C8A0', true),
  solid('agcl', 'AgCl', '氯化银', '#F2F0E6', true),
  solid('baso4', 'BaSO4', '硫酸钡', '#F5F3EA', true),
  solid('pbi2', 'PbI2', '碘化铅', '#E8B923', true),
  solid('ag2co3', 'Ag2CO3', '碳酸银', '#E6D9A8', true),

  // 块状固体反应物 / 产物
  solid('caco3', 'CaCO3', '碳酸钙', '#EFEDE2'),
  solid('cuo', 'CuO', '氧化铜', '#2E2A26'),
  solid('mno2', 'MnO2', '二氧化锰', '#3A3630'),
  solid('zn', 'Zn', '锌', '#A8ADB0'),
  solid('mg', 'Mg', '镁', '#C8CCCE'),
  solid('fe', 'Fe', '铁', '#8A8F94'),
  solid('cu', 'Cu', '铜', '#B5653A'),

  // 气体
  gas('o2', 'O2', '氧气', '#D8EEF5'),
  gas('co2', 'CO2', '二氧化碳', '#DCE8E8'),
  gas('h2', 'H2', '氢气', '#E8F4F8'),

  // 指示剂
  indicator('phenolphthalein', 'C20H14O4', '酚酞', '#E85D9E'),
  indicator('methyl_orange', 'C14H14N3NaO3S', '甲基橙', '#E8B923'),
  indicator('litmus', 'C7H7NO4', '石蕊', '#7A8FD0'),
]

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(
  SPECIES.map((species) => [species.id, species]),
)

export function getSpecies(speciesId: string): Species {
  const species = SPECIES_BY_ID[speciesId]
  if (!species) {
    throw new Error(`未知物种: ${speciesId}`)
  }
  return species
}

export const INDICATOR_SPECIES = SPECIES.filter((species) => species.kind === 'indicator')
