import type { Species } from '../domain/types'

export const SCENE_WIDTH = 900
export const SCENE_HEIGHT = 640

export const BEAKER = {
  left: 306,
  right: 594,
  top: 148,
  bottom: 512,
  innerLeft: 320,
  innerRight: 580,
  innerTop: 170,
  innerBottom: 498,
  bottomRadius: 26,
}

export const MICRO = {
  cx: 450,
  cy: 328,
  radius: 236,
}

export const PALETTE = {
  paper: '#F4F0E6',
  paperDeep: '#EBE4D5',
  ink: '#1C2A23',
  muted: '#68736B',
  border: '#DCD2C0',
  cobalt: '#2457D6',
  cobaltDeep: '#173C9E',
  green: '#1F7A66',
  amber: '#C58A2B',
  rose: '#D95F8A',
  glass: '#D8E7EA',
  microDark: '#0C1917',
  microMid: '#14332D',
  microLight: '#2F6B60',
}

export const PARTICLE_LABELS: Record<string, string> = {
  h: 'H⁺',
  na: 'Na⁺',
  k: 'K⁺',
  nh4: 'NH₄⁺',
  cu2: 'Cu²⁺',
  fe2: 'Fe²⁺',
  fe3: 'Fe³⁺',
  ca2: 'Ca²⁺',
  pb2: 'Pb²⁺',
  ag: 'Ag⁺',
  ba2: 'Ba²⁺',
  mg2: 'Mg²⁺',
  zn2: 'Zn²⁺',
  cl: 'Cl⁻',
  oh: 'OH⁻',
  no3: 'NO₃⁻',
  so4: 'SO₄²⁻',
  co3: 'CO₃²⁻',
  hco3: 'HCO₃⁻',
  i: 'I⁻',
  scn: 'SCN⁻',
  ch3coo: 'Ac⁻',
  ch3cooh: 'HAc',
  nh3: 'NH₃',
  h2o2: 'H₂O₂',
  h2o: 'H₂O',
  fescn3: 'Fe(SCN)₃',
  cuoh2: 'Cu(OH)₂',
  feoh3: 'Fe(OH)₃',
  feoh2: 'Fe(OH)₂',
  agcl: 'AgCl',
  baso4: 'BaSO₄',
  pbi2: 'PbI₂',
  ag2co3: 'Ag₂CO₃',
  caco3: 'CaCO₃',
  cuo: 'CuO',
  mno2: 'MnO₂',
  zn: 'Zn',
  mg: 'Mg',
  fe: 'Fe',
  cu: 'Cu',
  o2: 'O₂',
  co2: 'CO₂',
  h2: 'H₂',
  phenolphthalein: '酚酞',
  methyl_orange: '甲基橙',
  litmus: '石蕊',
}

export function particleLabel(species: Species): string {
  return PARTICLE_LABELS[species.id] ?? species.formula
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 把虚拟场景坐标映射到实际 canvas 尺寸 */
export function sceneTransform(canvasWidth: number, canvasHeight: number, dpr: number) {
  const scale = Math.min(canvasWidth / SCENE_WIDTH, canvasHeight / SCENE_HEIGHT)
  const offsetX = (canvasWidth - SCENE_WIDTH * scale) / 2
  const offsetY = (canvasHeight - SCENE_HEIGHT * scale) / 2
  return { scale, offsetX, offsetY, dpr }
}
