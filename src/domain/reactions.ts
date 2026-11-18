import { getSpecies } from './species'
import type { EquationDisplay, EquationPart, Reaction } from './types'

function part(formula: string, coeff = 1, state?: 's' | 'g'): EquationPart {
  return { coeff, formula, state }
}

function ionicPart(speciesId: string, coeff = 1, withState = false): EquationPart {
  const species = getSpecies(speciesId)
  return {
    coeff,
    formula: species.formula,
    charge: species.charge || undefined,
    state:
      withState && species.phase === 's'
        ? 's'
        : withState && species.phase === 'g'
          ? 'g'
          : undefined,
  }
}

function molecular(
  left: EquationPart[],
  right: EquationPart[],
  condition?: string,
): EquationDisplay {
  return { left, right, arrow: '=', condition }
}

function ionic(left: [string, number][], right: [string, number][]): EquationDisplay {
  return {
    left: left.map(([speciesId, coeff]) => ionicPart(speciesId, coeff)),
    right: right.map(([speciesId, coeff]) => ionicPart(speciesId, coeff, true)),
    arrow: '=',
  }
}

export const REACTIONS: Reaction[] = [
  {
    id: 'cu-oh',
    reactants: [
      { speciesId: 'cu2', coeff: 1 },
      { speciesId: 'oh', coeff: 2 },
    ],
    products: [{ speciesId: 'cuoh2', coeff: 1 }],
    priority: 72,
    durationMs: 2400,
    deltaH: -15,
    display: {
      molecular: molecular(
        [part('CuSO4'), part('NaOH', 2)],
        [part('Cu(OH)2', 1, 's'), part('Na2SO4')],
      ),
      ionic: ionic(
        [
          ['cu2', 1],
          ['oh', 2],
        ],
        [['cuoh2', 1]],
      ),
    },
    phenomenon: '产生蓝色絮状沉淀，溶液的蓝色逐渐变浅。',
    effects: { precipitate: '#4A9BE8', thermal: 'exo' },
  },
  {
    id: 'fe3-oh',
    reactants: [
      { speciesId: 'fe3', coeff: 1 },
      { speciesId: 'oh', coeff: 3 },
    ],
    products: [{ speciesId: 'feoh3', coeff: 1 }],
    priority: 71,
    durationMs: 2400,
    deltaH: -18,
    display: {
      molecular: molecular(
        [part('FeCl3'), part('NaOH', 3)],
        [part('Fe(OH)3', 1, 's'), part('NaCl', 3)],
      ),
      ionic: ionic(
        [
          ['fe3', 1],
          ['oh', 3],
        ],
        [['feoh3', 1]],
      ),
    },
    phenomenon: '产生红褐色絮状沉淀，黄色溶液逐渐变浅。',
    effects: { precipitate: '#9A4B2E', thermal: 'exo' },
  },
  {
    id: 'fe2-oh',
    reactants: [
      { speciesId: 'fe2', coeff: 1 },
      { speciesId: 'oh', coeff: 2 },
    ],
    products: [{ speciesId: 'feoh2', coeff: 1 }],
    priority: 70,
    durationMs: 2400,
    deltaH: -14,
    display: {
      molecular: molecular(
        [part('FeCl2'), part('NaOH', 2)],
        [part('Fe(OH)2', 1, 's'), part('NaCl', 2)],
      ),
      ionic: ionic(
        [
          ['fe2', 1],
          ['oh', 2],
        ],
        [['feoh2', 1]],
      ),
    },
    phenomenon: '产生白色带浅绿色的絮状沉淀，在空气中会逐渐变深。',
    effects: { precipitate: '#A8C8A0', thermal: 'exo' },
  },
  {
    id: 'ag-cl',
    reactants: [
      { speciesId: 'ag', coeff: 1 },
      { speciesId: 'cl', coeff: 1 },
    ],
    products: [{ speciesId: 'agcl', coeff: 1 }],
    priority: 78,
    durationMs: 2200,
    deltaH: -20,
    display: {
      molecular: molecular([part('AgNO3'), part('NaCl')], [part('AgCl', 1, 's'), part('NaNO3')]),
      ionic: ionic(
        [
          ['ag', 1],
          ['cl', 1],
        ],
        [['agcl', 1]],
      ),
    },
    phenomenon: '产生白色沉淀，溶液保持无色。',
    effects: { precipitate: '#F2F0E6', thermal: 'exo' },
  },
  {
    id: 'ba-so4',
    reactants: [
      { speciesId: 'ba2', coeff: 1 },
      { speciesId: 'so4', coeff: 1 },
    ],
    products: [{ speciesId: 'baso4', coeff: 1 }],
    priority: 80,
    durationMs: 2400,
    deltaH: -22,
    display: {
      molecular: molecular(
        [part('BaCl2'), part('Na2SO4')],
        [part('BaSO4', 1, 's'), part('NaCl', 2)],
      ),
      ionic: ionic(
        [
          ['ba2', 1],
          ['so4', 1],
        ],
        [['baso4', 1]],
      ),
    },
    phenomenon: '立即产生白色沉淀，溶液保持无色。',
    effects: { precipitate: '#F5F3EA', thermal: 'exo' },
  },
  {
    id: 'pb-i',
    reactants: [
      { speciesId: 'pb2', coeff: 1 },
      { speciesId: 'i', coeff: 2 },
    ],
    products: [{ speciesId: 'pbi2', coeff: 1 }],
    priority: 76,
    durationMs: 2400,
    deltaH: -16,
    display: {
      molecular: molecular(
        [part('Pb(NO3)2'), part('KI', 2)],
        [part('PbI2', 1, 's'), part('KNO3', 2)],
      ),
      ionic: ionic(
        [
          ['pb2', 1],
          ['i', 2],
        ],
        [['pbi2', 1]],
      ),
    },
    phenomenon: '产生金黄色沉淀，像细小的金色晶体缓缓落下。',
    effects: { precipitate: '#E8B923', thermal: 'exo' },
  },
  {
    id: 'ca-co3',
    reactants: [
      { speciesId: 'ca2', coeff: 1 },
      { speciesId: 'co3', coeff: 1 },
    ],
    products: [{ speciesId: 'caco3', coeff: 1 }],
    priority: 68,
    durationMs: 2400,
    deltaH: -12,
    display: {
      molecular: molecular(
        [part('Ca(OH)2'), part('Na2CO3')],
        [part('CaCO3', 1, 's'), part('NaOH', 2)],
      ),
      ionic: ionic(
        [
          ['ca2', 1],
          ['co3', 1],
        ],
        [['caco3', 1]],
      ),
    },
    phenomenon: '澄清石灰水变浑浊，产生白色沉淀。',
    effects: { precipitate: '#EFEDE2', thermal: 'exo' },
  },
  {
    id: 'ag-co3',
    reactants: [
      { speciesId: 'ag', coeff: 2 },
      { speciesId: 'co3', coeff: 1 },
    ],
    products: [{ speciesId: 'ag2co3', coeff: 1 }],
    priority: 66,
    durationMs: 2400,
    deltaH: -12,
    display: {
      molecular: molecular(
        [part('AgNO3', 2), part('Na2CO3')],
        [part('Ag2CO3', 1, 's'), part('NaNO3', 2)],
      ),
      ionic: ionic(
        [
          ['ag', 2],
          ['co3', 1],
        ],
        [['ag2co3', 1]],
      ),
    },
    phenomenon: '产生淡黄色沉淀。',
    effects: { precipitate: '#E6D9A8', thermal: 'exo' },
  },
  {
    id: 'h-oh',
    reactants: [
      { speciesId: 'h', coeff: 1 },
      { speciesId: 'oh', coeff: 1 },
    ],
    products: [{ speciesId: 'h2o', coeff: 1 }],
    priority: 100,
    durationMs: 1400,
    deltaH: -57.3,
    display: {
      molecular: molecular([part('HCl'), part('NaOH')], [part('NaCl'), part('H2O')]),
      ionic: ionic(
        [
          ['h', 1],
          ['oh', 1],
        ],
        [['h2o', 1]],
      ),
    },
    phenomenon: '酸碱中和，溶液温度略微升高，pH 向中性靠近。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'ch3cooh-oh',
    reactants: [
      { speciesId: 'ch3cooh', coeff: 1 },
      { speciesId: 'oh', coeff: 1 },
    ],
    products: [
      { speciesId: 'ch3coo', coeff: 1 },
      { speciesId: 'h2o', coeff: 1 },
    ],
    priority: 96,
    durationMs: 1800,
    deltaH: -50,
    display: {
      molecular: molecular([part('CH3COOH'), part('NaOH')], [part('CH3COONa'), part('H2O')]),
      ionic: ionic(
        [
          ['ch3cooh', 1],
          ['oh', 1],
        ],
        [
          ['ch3coo', 1],
          ['h2o', 1],
        ],
      ),
    },
    phenomenon: '醋酸被中和，溶液由酸性逐渐接近中性。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'co3-h',
    reactants: [
      { speciesId: 'co3', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'h2o', coeff: 1 },
      { speciesId: 'co2', coeff: 1 },
    ],
    priority: 92,
    durationMs: 2400,
    deltaH: -20,
    display: {
      molecular: molecular(
        [part('Na2CO3'), part('HCl', 2)],
        [part('NaCl', 2), part('H2O'), part('CO2', 1, 'g')],
      ),
      ionic: ionic(
        [
          ['co3', 1],
          ['h', 2],
        ],
        [
          ['h2o', 1],
          ['co2', 1],
        ],
      ),
    },
    phenomenon: '产生大量气泡，气体从液面逸出。',
    effects: { gas: 'co2', thermal: 'exo' },
  },
  {
    id: 'hco3-h',
    reactants: [
      { speciesId: 'hco3', coeff: 1 },
      { speciesId: 'h', coeff: 1 },
    ],
    products: [
      { speciesId: 'h2o', coeff: 1 },
      { speciesId: 'co2', coeff: 1 },
    ],
    priority: 91,
    durationMs: 2200,
    deltaH: -18,
    display: {
      molecular: molecular(
        [part('NaHCO3'), part('HCl')],
        [part('NaCl'), part('H2O'), part('CO2', 1, 'g')],
      ),
      ionic: ionic(
        [
          ['hco3', 1],
          ['h', 1],
        ],
        [
          ['h2o', 1],
          ['co2', 1],
        ],
      ),
    },
    phenomenon: '迅速产生气泡，溶液中有气体逸出。',
    effects: { gas: 'co2', thermal: 'exo' },
  },
  {
    id: 'caco3-h',
    reactants: [
      { speciesId: 'caco3', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'ca2', coeff: 1 },
      { speciesId: 'h2o', coeff: 1 },
      { speciesId: 'co2', coeff: 1 },
    ],
    priority: 90,
    durationMs: 3200,
    deltaH: -15,
    display: {
      molecular: molecular(
        [part('CaCO3'), part('HCl', 2)],
        [part('CaCl2'), part('H2O'), part('CO2', 1, 'g')],
      ),
      ionic: ionic(
        [
          ['caco3', 1],
          ['h', 2],
        ],
        [
          ['ca2', 1],
          ['h2o', 1],
          ['co2', 1],
        ],
      ),
    },
    phenomenon: '白色固体逐渐溶解，表面持续产生气泡。',
    effects: { gas: 'co2', thermal: 'exo' },
  },
  {
    id: 'caco3-ch3cooh',
    reactants: [
      { speciesId: 'caco3', coeff: 1 },
      { speciesId: 'ch3cooh', coeff: 2 },
    ],
    products: [
      { speciesId: 'ca2', coeff: 1 },
      { speciesId: 'ch3coo', coeff: 2 },
      { speciesId: 'h2o', coeff: 1 },
      { speciesId: 'co2', coeff: 1 },
    ],
    priority: 82,
    durationMs: 3600,
    deltaH: -10,
    display: {
      molecular: molecular(
        [part('CaCO3'), part('CH3COOH', 2)],
        [part('Ca(CH3COO)2'), part('H2O'), part('CO2', 1, 'g')],
      ),
      ionic: ionic(
        [
          ['caco3', 1],
          ['ch3cooh', 2],
        ],
        [
          ['ca2', 1],
          ['ch3coo', 2],
          ['h2o', 1],
          ['co2', 1],
        ],
      ),
    },
    phenomenon: '固体缓慢溶解，产生细小气泡，反应比盐酸温和。',
    effects: { gas: 'co2', thermal: 'exo' },
  },
  {
    id: 'zn-h',
    reactants: [
      { speciesId: 'zn', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'zn2', coeff: 1 },
      { speciesId: 'h2', coeff: 1 },
    ],
    priority: 87,
    durationMs: 3600,
    deltaH: -150,
    display: {
      molecular: molecular([part('Zn'), part('HCl', 2)], [part('ZnCl2'), part('H2', 1, 'g')]),
      ionic: ionic(
        [
          ['zn', 1],
          ['h', 2],
        ],
        [
          ['zn2', 1],
          ['h2', 1],
        ],
      ),
    },
    phenomenon: '锌粒表面产生气泡，锌粒逐渐溶解，溶液温度升高。',
    effects: { gas: 'h2', thermal: 'exo' },
  },
  {
    id: 'mg-h',
    reactants: [
      { speciesId: 'mg', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'mg2', coeff: 1 },
      { speciesId: 'h2', coeff: 1 },
    ],
    priority: 89,
    durationMs: 2600,
    deltaH: -160,
    display: {
      molecular: molecular([part('Mg'), part('HCl', 2)], [part('MgCl2'), part('H2', 1, 'g')]),
      ionic: ionic(
        [
          ['mg', 1],
          ['h', 2],
        ],
        [
          ['mg2', 1],
          ['h2', 1],
        ],
      ),
    },
    phenomenon: '镁条表面剧烈产生气泡，反应放热明显。',
    effects: { gas: 'h2', thermal: 'exo' },
  },
  {
    id: 'fe-cu',
    reactants: [
      { speciesId: 'fe', coeff: 1 },
      { speciesId: 'cu2', coeff: 1 },
    ],
    products: [
      { speciesId: 'fe2', coeff: 1 },
      { speciesId: 'cu', coeff: 1 },
    ],
    priority: 65,
    durationMs: 4200,
    deltaH: -100,
    display: {
      molecular: molecular([part('Fe'), part('CuSO4')], [part('FeSO4'), part('Cu')]),
      ionic: ionic(
        [
          ['fe', 1],
          ['cu2', 1],
        ],
        [
          ['fe2', 1],
          ['cu', 1],
        ],
      ),
    },
    phenomenon: '铁钉表面析出红色铜，蓝色溶液逐渐变浅。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'zn-cu',
    reactants: [
      { speciesId: 'zn', coeff: 1 },
      { speciesId: 'cu2', coeff: 1 },
    ],
    products: [
      { speciesId: 'zn2', coeff: 1 },
      { speciesId: 'cu', coeff: 1 },
    ],
    priority: 64,
    durationMs: 3800,
    deltaH: -110,
    display: {
      molecular: molecular([part('Zn'), part('CuSO4')], [part('ZnSO4'), part('Cu')]),
      ionic: ionic(
        [
          ['zn', 1],
          ['cu2', 1],
        ],
        [
          ['zn2', 1],
          ['cu', 1],
        ],
      ),
    },
    phenomenon: '锌粒表面析出红色铜，蓝色溶液变浅。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'mg-cu',
    reactants: [
      { speciesId: 'mg', coeff: 1 },
      { speciesId: 'cu2', coeff: 1 },
    ],
    products: [
      { speciesId: 'mg2', coeff: 1 },
      { speciesId: 'cu', coeff: 1 },
    ],
    priority: 63,
    durationMs: 3200,
    deltaH: -120,
    display: {
      molecular: molecular([part('Mg'), part('CuSO4')], [part('MgSO4'), part('Cu')]),
      ionic: ionic(
        [
          ['mg', 1],
          ['cu2', 1],
        ],
        [
          ['mg2', 1],
          ['cu', 1],
        ],
      ),
    },
    phenomenon: '镁条表面快速析出红色铜，蓝色褪去。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'fe-fe3',
    reactants: [
      { speciesId: 'fe', coeff: 1 },
      { speciesId: 'fe3', coeff: 2 },
    ],
    products: [{ speciesId: 'fe2', coeff: 3 }],
    priority: 66,
    durationMs: 3200,
    deltaH: -80,
    display: {
      molecular: molecular([part('Fe'), part('FeCl3', 2)], [part('FeCl2', 3)]),
      ionic: ionic(
        [
          ['fe', 1],
          ['fe3', 2],
        ],
        [['fe2', 3]],
      ),
    },
    phenomenon: '黄色溶液逐渐变为浅绿色。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'h2o2-mno2',
    reactants: [{ speciesId: 'h2o2', coeff: 2 }],
    products: [
      { speciesId: 'h2o', coeff: 2 },
      { speciesId: 'o2', coeff: 1 },
    ],
    catalyst: 'mno2',
    priority: 50,
    durationMs: 4500,
    deltaH: -98,
    display: {
      molecular: molecular([part('H2O2', 2)], [part('H2O', 2), part('O2', 1, 'g')], 'MnO2'),
      ionic: ionic([['h2o2', 2]], [
        ['h2o', 2],
        ['o2', 1],
      ]),
    },
    phenomenon: '产生大量气泡，黑色二氧化锰不消耗；带火星木条可复燃。',
    effects: { gas: 'o2', thermal: 'exo' },
  },
  {
    id: 'fe3-scn',
    reactants: [
      { speciesId: 'fe3', coeff: 1 },
      { speciesId: 'scn', coeff: 3 },
    ],
    products: [{ speciesId: 'fescn3', coeff: 1 }],
    priority: 55,
    durationMs: 1200,
    deltaH: 0,
    display: {
      molecular: molecular(
        [part('FeCl3'), part('KSCN', 3)],
        [part('Fe(SCN)3'), part('KCl', 3)],
      ),
      ionic: ionic(
        [
          ['fe3', 1],
          ['scn', 3],
        ],
        [['fescn3', 1]],
      ),
    },
    phenomenon: '溶液迅速变为血红色，这是 Fe³⁺ 的特征检验。',
  },
  {
    id: 'fe3-nh3',
    reactants: [
      { speciesId: 'fe3', coeff: 1 },
      { speciesId: 'nh3', coeff: 3 },
    ],
    products: [
      { speciesId: 'feoh3', coeff: 1 },
      { speciesId: 'nh4', coeff: 3 },
    ],
    priority: 70,
    durationMs: 2400,
    deltaH: -18,
    display: {
      molecular: molecular(
        [part('FeCl3'), part('NH3·H2O', 3)],
        [part('Fe(OH)3', 1, 's'), part('NH4Cl', 3)],
      ),
      ionic: ionic(
        [
          ['fe3', 1],
          ['nh3', 3],
        ],
        [
          ['feoh3', 1],
          ['nh4', 3],
        ],
      ),
    },
    phenomenon: '产生红褐色沉淀，氨水过量也不会使沉淀溶解。',
    effects: { precipitate: '#9A4B2E', thermal: 'exo' },
  },
  {
    id: 'cuo-h',
    reactants: [
      { speciesId: 'cuo', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'cu2', coeff: 1 },
      { speciesId: 'h2o', coeff: 1 },
    ],
    priority: 88,
    durationMs: 2800,
    deltaH: -30,
    display: {
      molecular: molecular([part('CuO'), part('HCl', 2)], [part('CuCl2'), part('H2O')]),
      ionic: ionic(
        [
          ['cuo', 1],
          ['h', 2],
        ],
        [
          ['cu2', 1],
          ['h2o', 1],
        ],
      ),
    },
    phenomenon: '黑色氧化铜逐渐溶解，溶液变为蓝绿色。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'cuoh2-h',
    reactants: [
      { speciesId: 'cuoh2', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'cu2', coeff: 1 },
      { speciesId: 'h2o', coeff: 2 },
    ],
    priority: 85,
    durationMs: 2000,
    deltaH: -30,
    display: {
      molecular: molecular([part('Cu(OH)2'), part('HCl', 2)], [part('CuCl2'), part('H2O', 2)]),
      ionic: ionic(
        [
          ['cuoh2', 1],
          ['h', 2],
        ],
        [
          ['cu2', 1],
          ['h2o', 2],
        ],
      ),
    },
    phenomenon: '蓝色沉淀逐渐溶解，溶液重新变成蓝色。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'feoh3-h',
    reactants: [
      { speciesId: 'feoh3', coeff: 1 },
      { speciesId: 'h', coeff: 3 },
    ],
    products: [
      { speciesId: 'fe3', coeff: 1 },
      { speciesId: 'h2o', coeff: 3 },
    ],
    priority: 85,
    durationMs: 2200,
    deltaH: -35,
    display: {
      molecular: molecular([part('Fe(OH)3'), part('HCl', 3)], [part('FeCl3'), part('H2O', 3)]),
      ionic: ionic(
        [
          ['feoh3', 1],
          ['h', 3],
        ],
        [
          ['fe3', 1],
          ['h2o', 3],
        ],
      ),
    },
    phenomenon: '红褐色沉淀逐渐溶解，溶液变为黄色。',
    effects: { thermal: 'exo' },
  },
  {
    id: 'feoh2-h',
    reactants: [
      { speciesId: 'feoh2', coeff: 1 },
      { speciesId: 'h', coeff: 2 },
    ],
    products: [
      { speciesId: 'fe2', coeff: 1 },
      { speciesId: 'h2o', coeff: 2 },
    ],
    priority: 85,
    durationMs: 2000,
    deltaH: -30,
    display: {
      molecular: molecular([part('Fe(OH)2'), part('HCl', 2)], [part('FeCl2'), part('H2O', 2)]),
      ionic: ionic(
        [
          ['feoh2', 1],
          ['h', 2],
        ],
        [
          ['fe2', 1],
          ['h2o', 2],
        ],
      ),
    },
    phenomenon: '浅绿色沉淀逐渐溶解，溶液变为浅绿色。',
    effects: { thermal: 'exo' },
  },
]

export const REACTIONS_BY_ID: Record<string, Reaction> = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.id, reaction]),
)

export function getReaction(reactionId: string): Reaction {
  const reaction = REACTIONS_BY_ID[reactionId]
  if (!reaction) {
    throw new Error(`未知反应: ${reactionId}`)
  }
  return reaction
}
