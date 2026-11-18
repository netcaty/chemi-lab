import { blendHexColors, darkenHex, hexToRgb, lightenHex, mixHex } from '../domain/color'
import { MAX_VOLUME_ML, type EngineState } from '../domain/engine'
import { REACTIONS_BY_ID } from '../domain/reactions'
import { REAGENTS_BY_ID } from '../domain/reagents'
import { SPECIES_BY_ID, getSpecies } from '../domain/species'
import type { EngineEvent, Species } from '../domain/types'
import {
  BEAKER,
  MICRO,
  PALETTE,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  clamp,
  easeOutCubic,
  mulberry32,
} from './theme'

interface Bubble {
  x: number
  y: number
  r: number
  speed: number
  wobble: number
  phase: number
  alpha: number
  color: string
}

interface PourAnimation {
  kind: 'pour' | 'solid' | 'drop'
  color: string
  start: number
  duration: number
  reagentName: string
  seed: number
}

interface SuspendedDot {
  x: number
  y: number
  phase: number
  speed: number
  radius: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface EffectRing {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  color: string
  width: number
}

interface SurfaceRipple {
  x: number
  start: number
  radius: number
  maxRadius: number
  alpha: number
  color: string
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function beakerOuterPath(ctx: CanvasRenderingContext2D) {
  const { left, right, top, bottom, bottomRadius } = BEAKER
  ctx.beginPath()
  ctx.moveTo(left, top + 14)
  ctx.quadraticCurveTo(left - 12, top + 2, left + 8, top - 2)
  ctx.lineTo(right - 8, top - 2)
  ctx.quadraticCurveTo(right + 12, top + 2, right, top + 14)
  ctx.lineTo(right, bottom - bottomRadius)
  ctx.quadraticCurveTo(right, bottom, right - bottomRadius, bottom)
  ctx.lineTo(left + bottomRadius, bottom)
  ctx.quadraticCurveTo(left, bottom, left, bottom - bottomRadius)
  ctx.closePath()
}

function beakerInnerPath(ctx: CanvasRenderingContext2D) {
  const { innerLeft, innerRight, innerTop, innerBottom, bottomRadius } = BEAKER
  const r = bottomRadius - 4
  ctx.beginPath()
  ctx.moveTo(innerLeft, innerTop)
  ctx.lineTo(innerRight, innerTop)
  ctx.lineTo(innerRight, innerBottom - r)
  ctx.quadraticCurveTo(innerRight, innerBottom, innerRight - r, innerBottom)
  ctx.lineTo(innerLeft + r, innerBottom)
  ctx.quadraticCurveTo(innerLeft, innerBottom, innerLeft, innerBottom - r)
  ctx.closePath()
}

function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class MacroRenderer {
  private time = 0
  private volume = 0
  private color = PALETTE.glass
  private turbidity = 0
  private turbidityColor = '#F2F0E8'
  private temperature = 25
  private ph = 7
  private bubbles: Bubble[] = []
  private pours: PourAnimation[] = []
  private suspendedDots: SuspendedDot[] = []
  private lastGas = new Map<string, number>()
  private pulse = 0
  private flash = 0
  private endFlash = 0
  private shimmer = 0
  private reactionTone: 'warm' | 'cool' = 'warm'
  private reactionColor = '#FF9B52'
  private sparks: Spark[] = []
  private rings: EffectRing[] = []
  private ripples: SurfaceRipple[] = []
  private colorTransition = 0
  private colorTransitionColor = '#DDEEF0'
  private lastSolutionColor = '#DDEEF0'
  private rand = mulberry32(12871)

  constructor() {
    for (let i = 0; i < 110; i += 1) {
      this.suspendedDots.push({
        x: this.rand(),
        y: this.rand(),
        phase: this.rand() * Math.PI * 2,
        speed: 0.15 + this.rand() * 0.3,
        radius: 1 + this.rand() * 2.4,
      })
    }
  }

  handleEvents(events: EngineEvent[]) {
    for (const event of events) {
      if (event.type === 'add') {
        const reagent = REAGENTS_BY_ID[event.reagentId]
        if (!reagent) continue
        this.pours.push({
          kind: reagent.addAnimation,
          color: reagent.color,
          start: this.time,
          duration: 1050,
          reagentName: reagent.name,
          seed: hashString(`${event.reagentId}-${event.at}`),
        })
        this.ripples.push({
          x: 430 + this.rand() * 40,
          start: this.time + 0.35,
          radius: 0,
          maxRadius: 38 + this.rand() * 22,
          alpha: 0.42,
          color: reagent.addAnimation === 'solid' ? '#D8C9A8' : reagent.color,
        })
        if (reagent.addAnimation === 'solid') {
          this.spawnSparks(5, 450, BEAKER.innerBottom - 18, reagent.color, 26)
        }
      } else if (event.type === 'reaction-start') {
        const reaction = REACTIONS_BY_ID[event.reactionId]
        this.pulse = 1
        this.flash = 1
        this.shimmer = reaction?.effects?.thermal === 'endo' ? 0.55 : 0.9
        this.reactionTone = reaction?.effects?.thermal === 'endo' ? 'cool' : 'warm'
        this.reactionColor =
          reaction?.effects?.precipitate ??
          (reaction?.effects?.gas
            ? '#8BD7FF'
            : reaction?.id === 'fe3-scn'
              ? '#E05252'
              : reaction?.effects?.thermal === 'endo'
                ? '#8FC5FF'
                : '#FF9B52')
        if (reaction?.effects?.gas) {
          this.reactionTone = 'cool'
        }

        const liquidTop = this.getLiquidTop(this.volume)
        const cy = liquidTop + (BEAKER.innerBottom - liquidTop) * 0.55
        this.rings.push(
          {
            x: 450,
            y: cy,
            radius: 8,
            maxRadius: 92,
            alpha: 0.55,
            color: this.reactionColor,
            width: 2.2,
          },
          {
            x: 450,
            y: cy,
            radius: 4,
            maxRadius: 150,
            alpha: 0.3,
            color: this.reactionColor,
            width: 1.2,
          },
        )
        this.spawnSparks(
          reaction?.effects?.thermal === 'endo' ? 10 : 20,
          450,
          cy,
          this.reactionColor,
          86,
        )
      } else if (event.type === 'reaction-end') {
        const reaction = REACTIONS_BY_ID[event.reactionId]
        this.endFlash = 1
        const liquidTop = this.getLiquidTop(this.volume)
        const cy = liquidTop + (BEAKER.innerBottom - liquidTop) * 0.5
        this.rings.push({
          x: 450,
          y: cy,
          radius: 30,
          maxRadius: 190,
          alpha: 0.42,
          color: '#7FE0B6',
          width: 1.8,
        })
        this.spawnSparks(10, 450, cy, reaction?.effects?.precipitate ?? '#7FE0B6', 72)
      } else if (event.type === 'reset') {
        this.bubbles = []
        this.pours = []
        this.sparks = []
        this.rings = []
        this.ripples = []
        this.flash = 0
        this.endFlash = 0
        this.shimmer = 0
        this.colorTransition = 0
        this.lastGas.clear()
        this.volume = 0
        this.turbidity = 0
        this.lastSolutionColor = '#DDEEF0'
      }
    }
  }

  private spawnSparks(
    count: number,
    x: number,
    y: number,
    color: string,
    spread: number,
  ) {
    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI / 2 + (this.rand() - 0.5) * 2.4
      const speed = 20 + this.rand() * 55
      const maxLife = 0.5 + this.rand() * 0.9
      this.sparks.push({
        x: x + (this.rand() - 0.5) * spread,
        y: y + (this.rand() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        size: 1.2 + this.rand() * 2.6,
        color: this.rand() > 0.25 ? color : '#FFF4D8',
      })
    }
  }

  update(dt: number, state: EngineState) {
    this.time += dt

    this.volume += (state.volumeMl - this.volume) * Math.min(1, dt * 5.5)
    if (Math.abs(state.volumeMl - this.volume) < 0.02) this.volume = state.volumeMl
    this.color = mixHex(this.color, state.solutionColor, Math.min(1, dt * 4.5))
    this.turbidity += (state.turbidity - this.turbidity) * Math.min(1, dt * 3.5)
    this.turbidityColor = mixHex(
      this.turbidityColor,
      state.turbidityColor,
      Math.min(1, dt * 3),
    )
    this.temperature += (state.temperatureC - this.temperature) * Math.min(1, dt * 3)
    this.ph += (state.ph - this.ph) * Math.min(1, dt * 4)
    this.pulse = Math.max(0, this.pulse - dt * 1.1)
    this.flash = Math.max(0, this.flash - dt * 1.7)
    this.endFlash = Math.max(0, this.endFlash - dt * 1.15)
    this.shimmer = Math.max(0, this.shimmer - dt * 0.45)

    if (state.solutionColor !== this.lastSolutionColor) {
      this.colorTransition = 1
      this.colorTransitionColor = state.solutionColor
      this.lastSolutionColor = state.solutionColor
    }
    this.colorTransition = Math.max(0, this.colorTransition - dt * 0.42)

    this.rings = this.rings.filter((ring) => {
      ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, dt * 2.8) + 16 * dt
      ring.alpha -= dt * 0.55
      return ring.alpha > 0.01 && ring.radius < ring.maxRadius * 1.25
    })

    this.sparks = this.sparks.filter((spark) => {
      spark.life -= dt
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      spark.vy += 22 * dt
      spark.vx *= 0.985
      return spark.life > 0
    })

    this.ripples = this.ripples.filter((ripple) => {
      const age = this.time - ripple.start
      if (age < 0) return true
      ripple.radius += (ripple.maxRadius - ripple.radius) * Math.min(1, dt * 3) + 8 * dt
      ripple.alpha -= dt * 0.62
      return ripple.alpha > 0.01
    })

    for (const [speciesId, moles] of state.gases) {
      const previous = this.lastGas.get(speciesId) ?? 0
      if (moles < previous) {
        this.lastGas.set(speciesId, moles)
        continue
      }
      const delta = moles - previous
      this.lastGas.set(speciesId, moles)
      if (delta <= 1e-8) continue
      const species = getSpecies(speciesId)
      const count = clamp(Math.round(delta * 90000), 1, 18)
      for (let i = 0; i < count; i += 1) {
        this.spawnBubble(species)
      }
    }

    const liquidTop = this.getLiquidTop(this.volume)
    this.bubbles = this.bubbles.filter((bubble) => {
      bubble.y -= bubble.speed * dt
      bubble.phase += dt * 2.2
      bubble.x += Math.sin(bubble.phase) * 0.22
      bubble.alpha = clamp((bubble.y - liquidTop) / 24, 0, 1)
      const alive = bubble.y > liquidTop + 2 && this.volume > 1
      if (!alive && this.volume > 1) {
        this.ripples.push({
          x: bubble.x,
          start: this.time,
          radius: 2,
          maxRadius: 10 + bubble.r * 2.2,
          alpha: 0.32,
          color: bubble.color,
        })
      }
      return alive
    })

    this.pours = this.pours.filter((pour) => this.time - pour.start < pour.duration)

    for (const dot of this.suspendedDots) {
      dot.phase += dt * dot.speed
      dot.x += Math.sin(dot.phase * 0.7) * 0.0007
      dot.y += Math.cos(dot.phase * 0.9) * 0.0005
      if (dot.x < 0.02) dot.x = 0.98
      if (dot.x > 0.98) dot.x = 0.02
      if (dot.y < 0.03) dot.y = 0.97
      if (dot.y > 0.97) dot.y = 0.03
    }
  }

  private spawnBubble(species: Species) {
    const innerWidth = BEAKER.innerRight - BEAKER.innerLeft
    const x = BEAKER.innerLeft + 12 + this.rand() * (innerWidth - 24)
    const isHydrogen = species.id === 'h2'
    this.bubbles.push({
      x,
      y: BEAKER.innerBottom - 12 - this.rand() * 70,
      r: 2 + this.rand() * (isHydrogen ? 3 : 4.5),
      speed: 32 + this.rand() * 48,
      wobble: 0.4 + this.rand() * 0.8,
      phase: this.rand() * Math.PI * 2,
      alpha: 1,
      color: species.color,
    })
  }

  private getLiquidTop(volume = this.volume): number {
    const fill = clamp(volume / MAX_VOLUME_ML, 0, 1)
    return BEAKER.innerBottom - fill * (BEAKER.innerBottom - BEAKER.innerTop)
  }

  draw(ctx: CanvasRenderingContext2D, state: EngineState) {
    this.drawBackground(ctx)
    this.drawAtmosphere(ctx)
    this.drawBeakerBack(ctx)
    this.drawLiquid(ctx, state)
    this.drawBeakerFront(ctx)
    this.drawRipples(ctx)
    this.drawReactionEffects(ctx)
    this.drawThermometer(ctx)
    this.drawReadouts(ctx, state)
    this.drawPours(ctx)
    if (state.amounts.size === 0 && this.volume < 0.5) {
      this.drawEmptyHint(ctx)
    }
  }

  private drawAtmosphere(ctx: CanvasRenderingContext2D) {
    const intensity = Math.max(
      this.flash * 0.8,
      this.pulse * 0.55,
      this.shimmer * 0.35,
      this.endFlash * 0.5,
    )
    if (intensity <= 0.01) return
    const color = this.endFlash > 0.2 ? '#7FE0B6' : this.reactionColor
    const glow = ctx.createRadialGradient(450, 338, 36, 450, 338, 390)
    glow.addColorStop(0, withAlpha(color, 0.26 * intensity))
    glow.addColorStop(0.52, withAlpha(color, 0.1 * intensity))
    glow.addColorStop(1, withAlpha(color, 0))
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
    ctx.restore()
  }

  private drawColorMixing(
    ctx: CanvasRenderingContext2D,
    top: number,
    height: number,
  ) {
    if (this.colorTransition <= 0.01) return
    const centerX = 450 + Math.sin(this.time * 0.9) * 34
    const centerY = top + height * 0.5 + Math.cos(this.time * 0.7) * 12
    const radius = Math.max(54, height * 0.82)
    const gradient = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, radius)
    gradient.addColorStop(0, withAlpha(this.colorTransitionColor, 0.38 * this.colorTransition))
    gradient.addColorStop(0.5, withAlpha(this.colorTransitionColor, 0.16 * this.colorTransition))
    gradient.addColorStop(1, withAlpha(this.colorTransitionColor, 0))
    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(BEAKER.innerLeft, top, BEAKER.innerRight - BEAKER.innerLeft, height + 4)

    ctx.globalAlpha = 0.12 * this.colorTransition
    ctx.strokeStyle = this.colorTransitionColor
    ctx.lineWidth = 9
    for (let band = 0; band < 2; band += 1) {
      const y =
        top + height * (0.36 + band * 0.3) + Math.sin(this.time * 1.25 + band) * 4
      ctx.beginPath()
      ctx.moveTo(BEAKER.innerLeft + 8, y)
      ctx.bezierCurveTo(380, y - 8, 520, y + 8, BEAKER.innerRight - 8, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawRipples(ctx: CanvasRenderingContext2D) {
    if (this.volume < 0.5) return
    const top = this.getLiquidTop(this.volume) + 2
    for (const ripple of this.ripples) {
      if (this.time < ripple.start || ripple.radius <= 0) continue
      ctx.save()
      ctx.globalAlpha = clamp(ripple.alpha, 0, 0.5)
      ctx.strokeStyle = ripple.color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(ripple.x, top, ripple.radius, ripple.radius * 0.26, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = clamp(ripple.alpha * 0.55, 0, 0.3)
      ctx.beginPath()
      ctx.ellipse(
        ripple.x,
        top,
        ripple.radius * 0.64,
        ripple.radius * 0.16,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawReactionEffects(ctx: CanvasRenderingContext2D) {
    const glowStrength = Math.max(this.pulse * 0.85, this.shimmer * 0.5)
    if (glowStrength > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      beakerOuterPath(ctx)
      ctx.strokeStyle = withAlpha(this.reactionColor, 0.075 * glowStrength)
      ctx.lineWidth = 15
      ctx.stroke()
      beakerOuterPath(ctx)
      ctx.strokeStyle = withAlpha(this.reactionColor, 0.32 * glowStrength)
      ctx.lineWidth = 2.4
      ctx.stroke()
      ctx.restore()
    }

    for (const ring of this.rings) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.strokeStyle = withAlpha(ring.color, clamp(ring.alpha, 0, 1))
      ctx.lineWidth = ring.width
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, Math.max(1, ring.radius), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    for (const spark of this.sparks) {
      const alpha = clamp(spark.life / spark.maxLife, 0, 1)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = alpha * 0.85
      const glow = ctx.createRadialGradient(
        spark.x,
        spark.y,
        0,
        spark.x,
        spark.y,
        spark.size * 4,
      )
      glow.addColorStop(0, withAlpha(spark.color, 0.75))
      glow.addColorStop(1, withAlpha(spark.color, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.size * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFF6DD'
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.size * 0.65, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    if (this.shimmer > 0.02 && this.volume > 0.5) {
      const top = this.getLiquidTop(this.volume)
      if (this.reactionTone === 'warm') {
        ctx.save()
        ctx.globalAlpha = this.shimmer * 0.28
        ctx.strokeStyle = '#FFE1B8'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i += 1) {
          const x = 400 + i * 30 + Math.sin(this.time * 2 + i) * 4
          ctx.beginPath()
          for (let j = 0; j <= 8; j += 1) {
            const y = top - 6 - j * 7
            const dx = Math.sin(this.time * 5 + j * 0.7 + i) * 4
            if (j === 0) ctx.moveTo(x + dx, y)
            else ctx.lineTo(x + dx, y)
          }
          ctx.stroke()
        }
        ctx.restore()
      } else {
        ctx.save()
        ctx.globalAlpha = this.shimmer * 0.55
        ctx.strokeStyle = '#BFE4FF'
        ctx.lineWidth = 1
        for (let i = 0; i < 7; i += 1) {
          const x = 378 + i * 20 + Math.sin(this.time * 1.5 + i) * 6
          const y = top - 20 - Math.cos(this.time * 2 + i) * 8
          ctx.beginPath()
          ctx.moveTo(x - 3, y)
          ctx.lineTo(x + 3, y)
          ctx.moveTo(x, y - 3)
          ctx.lineTo(x, y + 3)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    if (this.flash > 0.01) {
      const flash = ctx.createRadialGradient(450, 340, 30, 450, 340, 420)
      flash.addColorStop(0, withAlpha(this.reactionColor, 0.13 * this.flash))
      flash.addColorStop(1, withAlpha(this.reactionColor, 0))
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = flash
      ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
      ctx.restore()
    }

    if (this.endFlash > 0.01) {
      const top = this.getLiquidTop(this.volume)
      const cy = top + (BEAKER.innerBottom - top) * 0.5
      const radius = 80 + (1 - this.endFlash) * 160
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = this.endFlash * 0.5
      ctx.strokeStyle = '#7FE0B6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(450, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = PALETTE.paper
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)

    const glow = ctx.createRadialGradient(250, 110, 20, 250, 110, 620)
    glow.addColorStop(0, 'rgba(255,255,255,0.62)')
    glow.addColorStop(0.55, 'rgba(255,255,255,0.12)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)

    ctx.save()
    ctx.strokeStyle = 'rgba(28,42,35,0.04)'
    ctx.lineWidth = 1
    for (let x = 40; x < SCENE_WIDTH; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, SCENE_HEIGHT)
      ctx.stroke()
    }
    for (let y = 40; y < SCENE_HEIGHT; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(SCENE_WIDTH, y)
      ctx.stroke()
    }
    ctx.restore()

    const bench = ctx.createLinearGradient(0, 500, 0, 620)
    bench.addColorStop(0, 'rgba(214,199,173,0.16)')
    bench.addColorStop(0.25, 'rgba(214,199,173,0.62)')
    bench.addColorStop(1, 'rgba(199,183,155,0.3)')
    ctx.fillStyle = bench
    ctx.fillRect(0, 512, SCENE_WIDTH, 128)
    ctx.strokeStyle = 'rgba(100,88,66,0.16)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(24, 512)
    ctx.lineTo(SCENE_WIDTH - 24, 512)
    ctx.stroke()

    ctx.save()
    ctx.fillStyle = 'rgba(48,64,52,0.1)'
    ctx.beginPath()
    ctx.ellipse(450, 526, 190, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.fillStyle = 'rgba(28,42,35,0.34)'
    ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('CHEMI LAB · BEAKER 01', 58, 62)
    ctx.fillStyle = 'rgba(28,42,35,0.2)'
    ctx.font = '500 10px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('宏 观 视 图 / MACRO', 58, 82)
    ctx.restore()
  }

  private drawBeakerBack(ctx: CanvasRenderingContext2D) {
    ctx.save()
    beakerOuterPath(ctx)
    const glass = ctx.createLinearGradient(300, 150, 600, 512)
    glass.addColorStop(0, 'rgba(228,242,244,0.5)')
    glass.addColorStop(0.45, 'rgba(208,230,234,0.24)')
    glass.addColorStop(1, 'rgba(188,218,224,0.34)')
    ctx.fillStyle = glass
    ctx.fill()
    ctx.restore()
  }

  private drawLiquid(ctx: CanvasRenderingContext2D, state: EngineState) {
    if (this.volume < 0.4) return
    const top = this.getLiquidTop(this.volume)
    const height = BEAKER.innerBottom - top

    ctx.save()
    beakerInnerPath(ctx)
    ctx.clip()

    const liquid = ctx.createLinearGradient(0, top, 0, BEAKER.innerBottom)
    liquid.addColorStop(0, lightenHex(this.color, 0.18))
    liquid.addColorStop(0.55, this.color)
    liquid.addColorStop(1, darkenHex(this.color, 0.1))
    ctx.fillStyle = liquid
    ctx.fillRect(BEAKER.innerLeft, top, BEAKER.innerRight - BEAKER.innerLeft, height + 4)

    this.drawColorMixing(ctx, top, height)

    if (this.turbidity > 0.01) {
      ctx.save()
      ctx.globalAlpha = clamp(this.turbidity * 0.56, 0, 0.56)
      ctx.fillStyle = this.turbidityColor
      ctx.fillRect(BEAKER.innerLeft, top, BEAKER.innerRight - BEAKER.innerLeft, height + 4)
      ctx.restore()

      const dotCount = Math.round(this.turbidity * 84)
      for (let i = 0; i < dotCount; i += 1) {
        const dot = this.suspendedDots[i]
        const x = BEAKER.innerLeft + dot.x * (BEAKER.innerRight - BEAKER.innerLeft)
        const y = top + 14 + dot.y * Math.max(10, height - 28)
        ctx.beginPath()
        ctx.fillStyle = this.turbidityColor
        ctx.globalAlpha = 0.45 + 0.24 * Math.sin(dot.phase)
        ctx.arc(x, y, dot.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    this.drawSediment(ctx, height, state)
    this.drawBulkSolids(ctx, state)

    for (const bubble of this.bubbles) {
      ctx.beginPath()
      ctx.globalAlpha = bubble.alpha
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.strokeStyle = 'rgba(255,255,255,0.58)'
      ctx.lineWidth = 1
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.arc(bubble.x - bubble.r * 0.25, bubble.y - bubble.r * 0.3, bubble.r * 0.28, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // 液面
    const surface = ctx.createLinearGradient(0, top - 4, 0, top + 12)
    surface.addColorStop(0, 'rgba(255,255,255,0.55)')
    surface.addColorStop(1, 'rgba(255,255,255,0.04)')
    ctx.fillStyle = surface
    ctx.beginPath()
    ctx.moveTo(BEAKER.innerLeft, top + 2)
    const mid = (BEAKER.innerLeft + BEAKER.innerRight) / 2
    ctx.quadraticCurveTo(
      mid,
      top - 3 + Math.sin(this.time * 1.8) * 1.4,
      BEAKER.innerRight,
      top + 2,
    )
    ctx.lineTo(BEAKER.innerRight, top + 10)
    ctx.quadraticCurveTo(
      mid,
      top + 5 + Math.sin(this.time * 1.8) * 1.4,
      BEAKER.innerLeft,
      top + 10,
    )
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.58)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(BEAKER.innerLeft, top + 2)
    ctx.quadraticCurveTo(
      mid,
      top - 3 + Math.sin(this.time * 1.8) * 1.4,
      BEAKER.innerRight,
      top + 2,
    )
    ctx.stroke()

    // 反应微光
    if (state.active) {
      const centerY = top + Math.min(100, height * 0.45)
      const reactionGlow = ctx.createRadialGradient(
        (BEAKER.innerLeft + BEAKER.innerRight) / 2,
        centerY,
        6,
        (BEAKER.innerLeft + BEAKER.innerRight) / 2,
        centerY,
        170,
      )
      const glowColor = withAlpha(this.reactionColor, this.reactionTone === 'warm' ? 0.28 : 0.22)
      reactionGlow.addColorStop(0, glowColor)
      reactionGlow.addColorStop(1, withAlpha(this.reactionColor, 0))
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = reactionGlow
      ctx.globalAlpha = 0.3 + 0.18 * Math.sin(this.time * 4.2) + this.pulse * 0.25
      ctx.fillRect(BEAKER.innerLeft, top, BEAKER.innerRight - BEAKER.innerLeft, height)
      ctx.restore()
    }

    ctx.restore()
  }

  private drawSediment(
    ctx: CanvasRenderingContext2D,
    liquidHeight: number,
    state: EngineState,
  ) {
    let total = 0
    const entries: { color: string; weight: number }[] = []
    for (const [speciesId, moles] of state.sediment) {
      if (moles <= 1e-8) continue
      const species = SPECIES_BY_ID[speciesId]
      if (!species?.isPrecipitate) continue
      total += moles
      entries.push({ color: species.color, weight: moles })
    }
    if (total <= 1e-8) return

    const height = clamp(total * 5200, 3, liquidHeight * 0.55)
    const color = blendHexColors(entries, '#EEE9DA')
    const baseY = BEAKER.innerBottom - 1
    const topY = baseY - height

    ctx.save()
    const sediment = ctx.createLinearGradient(0, topY, 0, baseY)
    sediment.addColorStop(0, lightenHex(color, 0.12))
    sediment.addColorStop(1, darkenHex(color, 0.08))
    ctx.fillStyle = sediment
    ctx.globalAlpha = 0.94
    ctx.beginPath()
    ctx.moveTo(BEAKER.innerLeft, baseY)
    ctx.lineTo(BEAKER.innerLeft, topY)
    for (let x = BEAKER.innerLeft; x <= BEAKER.innerRight; x += 12) {
      const wave = Math.sin(x * 0.09 + this.time * 0.4) * 1.6
      ctx.lineTo(x, topY + wave)
    }
    ctx.lineTo(BEAKER.innerRight, baseY)
    ctx.closePath()
    ctx.fill()

    const rand = mulberry32(hashString(`sediment-${Math.round(total * 100000)}`))
    const grains = clamp(Math.round(total * 1500), 4, 26)
    for (let i = 0; i < grains; i += 1) {
      const x = BEAKER.innerLeft + 8 + rand() * (BEAKER.innerRight - BEAKER.innerLeft - 16)
      const y = topY + rand() * height * 0.9
      ctx.beginPath()
      ctx.fillStyle = darkenHex(color, 0.04 + rand() * 0.1)
      ctx.globalAlpha = 0.55
      ctx.arc(x, y, 1.2 + rand() * 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawBulkSolids(ctx: CanvasRenderingContext2D, state: EngineState) {
    let lane = 0
    for (const [speciesId, moles] of state.amounts) {
      if (moles <= 1e-7) continue
      const species = SPECIES_BY_ID[speciesId]
      if (!species || species.phase !== 's' || species.isPrecipitate) continue
      const count = clamp(Math.round(moles * 5000), 1, 7)
      const rand = mulberry32(hashString(speciesId))
      const baseX = BEAKER.innerLeft + 40 + lane * 64
      for (let i = 0; i < count; i += 1) {
        const x = baseX + (rand() - 0.5) * 42
        const y = BEAKER.innerBottom - 9 - rand() * 10
        const w = 8 + rand() * (speciesId === 'fe' ? 12 : 7)
        const h = 5 + rand() * 7
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((rand() - 0.5) * 0.55)
        roundRectPath(ctx, -w / 2, -h / 2, w, h, 3)
        ctx.fillStyle = species.color
        ctx.globalAlpha = 0.92
        ctx.fill()
        ctx.strokeStyle = darkenHex(species.color, 0.2)
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }
      lane += 1
      if (lane > 4) lane = 0
    }
  }

  private drawBeakerFront(ctx: CanvasRenderingContext2D) {
    ctx.save()
    beakerOuterPath(ctx)
    ctx.strokeStyle = 'rgba(112,151,159,0.9)'
    ctx.lineWidth = 3.2
    ctx.stroke()

    const rim = ctx.createLinearGradient(300, 138, 600, 158)
    rim.addColorStop(0, 'rgba(237,248,249,0.9)')
    rim.addColorStop(0.5, 'rgba(201,229,233,0.7)')
    rim.addColorStop(1, 'rgba(237,248,249,0.9)')
    ctx.fillStyle = rim
    ctx.beginPath()
    ctx.ellipse(450, BEAKER.top + 2, 146, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(104,144,152,0.85)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(328, 196)
    ctx.lineTo(328, 474)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(337, 208)
    ctx.lineTo(337, 438)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(566, 214)
    ctx.lineTo(566, 470)
    ctx.stroke()

    // 刻度
    ctx.save()
    ctx.font = '500 9px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    for (let volume = 20; volume <= MAX_VOLUME_ML; volume += 20) {
      const y = this.getLiquidTop(volume)
      ctx.strokeStyle = 'rgba(68,103,108,0.42)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(BEAKER.innerRight - 22, y)
      ctx.lineTo(BEAKER.innerRight - 5, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(68,103,108,0.5)'
      ctx.fillText(`${volume}`, BEAKER.innerRight + 6, y + 3)
    }
    ctx.restore()

    // 底部阴影
    ctx.save()
    const bottomShadow = ctx.createLinearGradient(0, BEAKER.bottom - 20, 0, BEAKER.bottom + 8)
    bottomShadow.addColorStop(0, 'rgba(80,108,110,0)')
    bottomShadow.addColorStop(1, 'rgba(80,108,110,0.16)')
    ctx.fillStyle = bottomShadow
    ctx.beginPath()
    ctx.ellipse(450, BEAKER.bottom + 2, 148, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  }

  private drawThermometer(ctx: CanvasRenderingContext2D) {
    const x = 660
    const top = 238
    const bottom = 500
    const temp = clamp(this.temperature, 0, 100)
    const fillTop = bottom - ((bottom - top) * temp) / 100

    ctx.save()
    ctx.strokeStyle = 'rgba(96,126,132,0.45)'
    ctx.fillStyle = 'rgba(245,252,252,0.5)'
    ctx.lineWidth = 1.5
    roundRectPath(ctx, x - 8, top, 16, bottom - top - 8, 8)
    ctx.fill()
    ctx.stroke()

    const mercury = ctx.createLinearGradient(0, fillTop, 0, bottom)
    mercury.addColorStop(0, '#E86A54')
    mercury.addColorStop(1, '#C84332')
    ctx.fillStyle = mercury
    ctx.beginPath()
    ctx.arc(x, bottom + 2, 11, 0, Math.PI * 2)
    ctx.fill()
    roundRectPath(ctx, x - 4, fillTop, 8, bottom - fillTop, 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - 1.5, fillTop + 4)
    ctx.lineTo(x - 1.5, bottom - 4)
    ctx.stroke()

    const deviation = clamp((temp - 25) / 20, -1, 1)
    if (Math.abs(deviation) > 0.02) {
      const glowColor = deviation > 0 ? '#FF9A66' : '#8FC5FF'
      const bulbGlow = ctx.createRadialGradient(x, bottom + 2, 2, x, bottom + 2, 40)
      bulbGlow.addColorStop(0, withAlpha(glowColor, 0.12 + Math.abs(deviation) * 0.32))
      bulbGlow.addColorStop(1, withAlpha(glowColor, 0))
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = bulbGlow
      ctx.beginPath()
      ctx.arc(x, bottom + 2, 40, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.strokeStyle = 'rgba(68,103,108,0.4)'
    ctx.fillStyle = 'rgba(68,103,108,0.6)'
    ctx.font = '500 8px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    for (let value = 0; value <= 100; value += 20) {
      const y = bottom - ((bottom - top) * value) / 100
      ctx.beginPath()
      ctx.moveTo(x + 9, y)
      ctx.lineTo(x + 14, y)
      ctx.stroke()
      ctx.fillText(`${value}`, x + 17, y + 3)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = PALETTE.ink
    ctx.font = '600 12px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(`${this.temperature.toFixed(1)} °C`, x, top - 16)
    ctx.restore()
  }

  private drawReadouts(ctx: CanvasRenderingContext2D, state: EngineState) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(28,42,35,0.8)'
    ctx.font = '600 14px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(
      `${this.volume.toFixed(0)} mL`,
      (BEAKER.innerLeft + BEAKER.innerRight) / 2,
      BEAKER.bottom + 38,
    )
    ctx.fillStyle = 'rgba(28,42,35,0.38)'
    ctx.font = '500 10px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(
      `烧杯容量 ${MAX_VOLUME_ML} mL`,
      (BEAKER.innerLeft + BEAKER.innerRight) / 2,
      BEAKER.bottom + 55,
    )

    const ph = this.ph
    const phColor = ph < 6.5 ? '#C65454' : ph > 7.5 ? '#2C6BA8' : '#2F7A5F'
    ctx.textAlign = 'center'
    ctx.fillStyle = phColor
    ctx.font = '600 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(`pH ${ph.toFixed(1)}`, 746, 562)
    ctx.fillStyle = 'rgba(28,42,35,0.38)'
    ctx.font = '500 9px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('酸碱度', 746, 577)
    ctx.restore()

    if (state.active) {
      const progress = state.active.totalExtent
        ? state.active.extent / state.active.totalExtent
        : 0
      ctx.save()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(28,42,35,0.6)'
      ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText('反 应 进 行 中', 450, 596)
      roundRectPath(ctx, 366, 606, 168, 4, 2)
      ctx.fillStyle = 'rgba(28,42,35,0.1)'
      ctx.fill()
      roundRectPath(ctx, 366, 606, 168 * clamp(progress, 0, 1), 4, 2)
      ctx.fillStyle = PALETTE.cobalt
      ctx.fill()
      ctx.restore()
    }
  }

  private drawPours(ctx: CanvasRenderingContext2D) {
    for (const pour of this.pours) {
      const raw = clamp((this.time - pour.start) / pour.duration, 0, 1)
      const enter = easeOutCubic(Math.min(1, raw / 0.22))
      const leave = raw > 0.78 ? 1 - (raw - 0.78) / 0.22 : 1
      const alpha = clamp(leave, 0, 1) * enter
      if (alpha <= 0.01) continue

      const liquidTop = this.getLiquidTop(this.volume)
      ctx.save()
      ctx.globalAlpha = alpha

      if (pour.kind === 'pour') {
        const x = 378 + 18 * (1 - enter)
        const y = 78
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(-0.48 * enter)
        roundRectPath(ctx, -22, -26, 44, 78, 12)
        const bottle = ctx.createLinearGradient(-22, 0, 22, 0)
        bottle.addColorStop(0, 'rgba(250,252,250,0.9)')
        bottle.addColorStop(0.5, 'rgba(221,235,236,0.75)')
        bottle.addColorStop(1, 'rgba(247,250,247,0.9)')
        ctx.fillStyle = bottle
        ctx.fill()
        ctx.strokeStyle = 'rgba(86,121,126,0.7)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = pour.color
        ctx.globalAlpha = alpha * 0.55
        roundRectPath(ctx, -17, 8, 34, 36, 5)
        ctx.fill()
        ctx.globalAlpha = alpha
        ctx.fillStyle = 'rgba(60,82,82,0.7)'
        roundRectPath(ctx, -11, -38, 22, 14, 4)
        ctx.fill()
        ctx.restore()

        ctx.strokeStyle = pour.color
        ctx.lineWidth = 4.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + 34, y + 24)
        ctx.quadraticCurveTo(x + 70, y + 90, 452, liquidTop + 8)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x + 36, y + 26)
        ctx.quadraticCurveTo(x + 72, y + 92, 454, liquidTop + 10)
        ctx.stroke()
      } else if (pour.kind === 'solid') {
        const x = 360 + 30 * enter
        const y = 100
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(-0.2)
        ctx.strokeStyle = 'rgba(105,120,122,0.8)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(92, 42)
        ctx.stroke()
        roundRectPath(ctx, 82, 34, 30, 9, 4)
        ctx.fillStyle = 'rgba(214,223,222,0.85)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(105,120,122,0.7)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = pour.color
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath()
          ctx.arc(88 + i * 4, 34 + (i % 2) * 3, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        const rand = mulberry32(pour.seed)
        for (let i = 0; i < 8; i += 1) {
          const px = 432 + (rand() - 0.5) * 34
          const py = 168 + rand() * 80 + raw * 80
          ctx.fillStyle = pour.color
          ctx.beginPath()
          ctx.arc(px, py, 2 + rand() * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        const x = 450
        const y = 80
        ctx.save()
        roundRectPath(ctx, x - 11, y - 28, 22, 54, 10)
        ctx.fillStyle = 'rgba(241,249,249,0.82)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(86,121,126,0.65)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'rgba(86,121,126,0.7)'
        roundRectPath(ctx, x - 7, y - 38, 14, 12, 4)
        ctx.fill()
        ctx.fillStyle = pour.color
        roundRectPath(ctx, x - 6, y - 12, 12, 22, 6)
        ctx.fill()
        ctx.restore()

        for (let i = 0; i < 4; i += 1) {
          const dropY = y + 36 + ((this.time * 120 + i * 30) % 110)
          ctx.fillStyle = pour.color
          ctx.beginPath()
          ctx.ellipse(x, dropY, 4, 6, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
    }
  }

  private drawEmptyHint(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(28,42,35,0.28)'
    ctx.font = '500 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('从左侧选择试剂加入烧杯', 450, 342)
    ctx.strokeStyle = 'rgba(36,87,214,0.32)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.arc(450, 328, MICRO.radius * 0.58, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}
