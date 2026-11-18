export type ElementCounts = Record<string, number>

/**
 * 轻量化学式解析器，支持：
 * - 元素与下标：CuSO4、C2H5OH
 * - 括号/方括号：Ca(OH)2、Fe(SCN)3、[Cu(NH3)4]SO4
 * - 水合物点号：NH3·H2O
 * 电荷不写在 formula 里，而是由 Species.charge 单独描述。
 */
export function parseFormula(formula: string): ElementCounts {
  let index = 0

  function readNumber(): number {
    let text = ''
    while (index < formula.length && /\d/.test(formula[index])) {
      text += formula[index]
      index += 1
    }
    return text ? Number(text) : 1
  }

  function parseGroup(stopChar?: string, stopAtDot = false): ElementCounts {
    const result: ElementCounts = {}

    while (index < formula.length) {
      const char = formula[index]

      if (stopChar && char === stopChar) {
        break
      }

      if (stopAtDot && (char === '·' || char === '.')) {
        break
      }

      if (char === '(' || char === '[') {
        const closeChar = char === '(' ? ')' : ']'
        index += 1
        const inner = parseGroup(closeChar)
        if (formula[index] !== closeChar) {
          throw new Error(`化学式括号不匹配: ${formula}`)
        }
        index += 1
        const multiplier = readNumber()
        mergeCounts(result, inner, multiplier)
        continue
      }

      if (char === '·' || char === '.') {
        index += 1
        const multiplier = readNumber()
        const hydratePart = parseGroup(stopChar, true)
        mergeCounts(result, hydratePart, multiplier)
        continue
      }

      if (/\s/.test(char)) {
        index += 1
        continue
      }

      if (/[A-Z]/.test(char)) {
        let symbol = char
        index += 1
        while (index < formula.length && /[a-z]/.test(formula[index])) {
          symbol += formula[index]
          index += 1
        }
        const multiplier = readNumber()
        result[symbol] = (result[symbol] ?? 0) + multiplier
        continue
      }

      throw new Error(`无法解析的化学式字符 "${char}"，化学式: ${formula}`)
    }

    return result
  }

  const counts = parseGroup()
  if (index < formula.length) {
    throw new Error(`化学式解析未完成: ${formula}`)
  }
  return counts
}

function mergeCounts(target: ElementCounts, source: ElementCounts, multiplier = 1) {
  for (const [symbol, count] of Object.entries(source)) {
    target[symbol] = (target[symbol] ?? 0) + count * multiplier
  }
}

export interface FormulaSegment {
  text: string
  sub?: boolean
}

/** 把化学式拆成可直接渲染的片段：所有数字都作为下标 */
export function formulaSegments(formula: string): FormulaSegment[] {
  const segments: FormulaSegment[] = []
  let buffer = ''
  let digits = ''

  const flushBuffer = () => {
    if (buffer) {
      segments.push({ text: buffer })
      buffer = ''
    }
  }
  const flushDigits = () => {
    if (digits) {
      segments.push({ text: digits, sub: true })
      digits = ''
    }
  }

  for (const char of formula) {
    if (/\d/.test(char)) {
      flushBuffer()
      digits += char
    } else {
      flushDigits()
      buffer += char
    }
  }
  flushBuffer()
  flushDigits()
  return segments
}

export function chargeLabel(charge: number): string {
  if (!charge) return ''
  const magnitude = Math.abs(charge)
  return `${magnitude === 1 ? '' : magnitude}${charge > 0 ? '+' : '−'}`
}

export function formulaWithCharge(formula: string, charge: number): string {
  return `${formula}${chargeLabel(charge)}`
}
