export type Phase = 'aq' | 's' | 'l' | 'g'

export type SpeciesKind = 'ion' | 'molecule' | 'solid' | 'gas' | 'indicator'

export interface Species {
  id: string
  formula: string
  name: string
  kind: SpeciesKind
  phase: Phase
  /** 净电荷，例如 Cu²⁺ 为 +2，SO₄²⁻ 为 -2 */
  charge: number
  /** 在溶液/粒子视图中的颜色 */
  color: string
  /** 对溶液颜色的染色能力，0 表示近无色 */
  tintStrength: number
  /** 以细小悬浮颗粒形式生成的沉淀（区别于锌粒、铁钉等块状固体） */
  isPrecipitate?: boolean
  note?: string
}

export interface CompositionEntry {
  speciesId: string
  moles: number
}

export type ReagentCategory = '溶液' | '酸' | '碱' | '固体' | '指示剂' | '其他'

export interface Reagent {
  id: string
  name: string
  formula: string
  category: ReagentCategory
  /** 液体加入量（mL）；固体为 0 */
  volumeMl: number
  concentrationM?: number
  /** 一次加入所对应的物质的量 */
  addedMoles: number
  composition: CompositionEntry[]
  addAnimation: 'pour' | 'solid' | 'drop'
  color: string
  note?: string
}

export interface EquationPart {
  coeff: number
  formula: string
  charge?: number
  /** 只在生成物一侧展示 ↓ / ↑ */
  state?: 's' | 'g'
}

export interface EquationDisplay {
  left: EquationPart[]
  right: EquationPart[]
  arrow: '=' | '→'
  condition?: string
}

export interface ReactionEffects {
  gas?: string
  precipitate?: string
  colorFrom?: string
  colorTo?: string
  thermal?: 'exo' | 'endo'
}

export interface Reaction {
  id: string
  reactants: { speciesId: string; coeff: number }[]
  products: { speciesId: string; coeff: number }[]
  catalyst?: string
  /** 数值越大越优先；用于处理竞争反应 */
  priority: number
  durationMs: number
  /** kJ/mol，负值为放热 */
  deltaH?: number
  display: {
    molecular: EquationDisplay
    ionic: EquationDisplay
  }
  phenomenon: string
  effects?: ReactionEffects
}

export interface LogEntry {
  id: number
  time: number
  text: string
  tone: 'info' | 'reaction' | 'warn' | 'success'
}

export interface ActiveReactionView {
  id: string
  progress: number
  reaction: Reaction
}

export interface ContentView {
  species: Species
  moles: number
  concentrationM: number
  suspendedMoles: number
  sedimentMoles: number
}

export interface LabSnapshot {
  contents: ContentView[]
  volumeMl: number
  maxVolumeMl: number
  temperatureC: number
  ph: number
  solutionColor: string
  turbidity: number
  turbidityColor: string
  activeReaction: ActiveReactionView | null
  lastReactionId: string | null
  log: LogEntry[]
  indicators: string[]
  gases: { speciesId: string; moles: number }[]
  canAdd: Record<string, boolean>
}

export interface AddResult {
  ok: boolean
  message: string
}

export type EngineEvent =
  | { type: 'add'; reagentId: string; at: number }
  | { type: 'reaction-start'; reactionId: string; at: number }
  | { type: 'reaction-end'; reactionId: string; at: number }
  | { type: 'gas'; speciesId: string; moles: number; at: number }
  | { type: 'reset'; at: number }
