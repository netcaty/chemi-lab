export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Oklab {
  L: number
  a: number
  b: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function hexToRgb(hex: string): Rgb {
  let value = hex.replace('#', '').trim()
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 221, g: 238, b: 240 }
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function srgbToLinear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value: number): number {
  const clamped = clamp01(value)
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
}

export function hexToOklab(hex: string): Oklab {
  const { r, g, b } = hexToRgb(hex)
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

export function oklabToHex(input: Oklab): string {
  const l_ = input.L + 0.3963377774 * input.a + 0.2158037573 * input.b
  const m_ = input.L - 0.1055613458 * input.a - 0.0638541728 * input.b
  const s_ = input.L - 0.0894841775 * input.a - 1.291485548 * input.b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return rgbToHex({
    r: linearToSrgb(r) * 255,
    g: linearToSrgb(g) * 255,
    b: linearToSrgb(b) * 255,
  })
}

export interface ColorWeight {
  color: string
  weight: number
}

/** 在 OKLab 空间按权重混合颜色，避免蓝+黄变成脏灰 */
export function blendHexColors(entries: ColorWeight[], fallback = '#DDEEF0'): string {
  let total = 0
  let L = 0
  let a = 0
  let b = 0

  for (const entry of entries) {
    if (!Number.isFinite(entry.weight) || entry.weight <= 0) continue
    const lab = hexToOklab(entry.color)
    L += lab.L * entry.weight
    a += lab.a * entry.weight
    b += lab.b * entry.weight
    total += entry.weight
  }

  if (total <= 0) return fallback
  return oklabToHex({ L: L / total, a: a / total, b: b / total })
}

export function mixHex(from: string, to: string, amount: number): string {
  const t = clamp01(amount)
  return blendHexColors([
    { color: from, weight: 1 - t },
    { color: to, weight: t },
  ])
}

export function lightenHex(hex: string, amount: number): string {
  return mixHex(hex, '#FFFFFF', amount)
}

export function darkenHex(hex: string, amount: number): string {
  return mixHex(hex, '#101A16', amount)
}
