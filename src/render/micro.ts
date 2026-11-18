import { lightenHex } from '../domain/color'
import type { EngineState } from '../domain/engine'
import { SPECIES_BY_ID } from '../domain/species'
import type { EngineEvent, Species } from '../domain/types'
import {
  MICRO,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  clamp,
  mulberry32,
  particleLabel,
} from './theme'

type ParticleMode = 'free' | 'converge' | 'fade' | 'settle' | 'gas'

interface Particle {
  id: number
  speciesId: string
  color: string
  label: string
  charge: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
  mode: ParticleMode
  phase: number
  flash: number
  targetX?: number
  targetY?: number
  targetAlpha?: number
}

interface WaterDot {
  x: number
  y: number
  phase: number
  speed: number
  r: number
}

interface ReactionSite {
  x: number
  y: number
  alpha: number
  active: boolean
  flash: number
}

const AQ_SCALE = 10000
const PRECIPITATE_SCALE = 8000
const BULK_SCALE = 4000
const MAX_PARTICLES = 560

export class MicroRenderer {
  private particles = new Map<string, Particle[]>()
  private gasParticles: Particle[] = []
  private waterDots: WaterDot[] = []
  private site: ReactionSite = {
    x: MICRO.cx,
    y: MICRO.cy,
    alpha: 0,
    active: false,
    flash: 0,
  }
  private time = 0
  private reconcileTimer = 0
  private convergeTimer = 0
  private gasPending = 0
  private nextId = 1
  private rand = mulberry32(93017)

  constructor() {
    this.seedWaterDots()
  }

  private seedWaterDots() {
    this.waterDots = []
    for (let i = 0; i < 160; i += 1) {
      const point = this.randomPoint(20)
      this.waterDots.push({
        x: point.x,
        y: point.y,
        phase: this.rand() * Math.PI * 2,
        speed: 0.2 + this.rand() * 0.5,
        r: 0.7 + this.rand() * 1.2,
      })
    }
  }

  handleEvents(events: EngineEvent[]) {
    for (const event of events) {
      if (event.type === 'reset') {
        this.particles.clear()
        this.gasParticles = []
        this.site.active = false
        this.site.alpha = 0
        this.site.flash = 0
        this.gasPending = 0
        this.seedWaterDots()
      } else if (event.type === 'reaction-start') {
        this.site.active = true
        this.site.alpha = 1
        this.site.flash = 1
      } else if (event.type === 'reaction-end') {
        this.site.active = false
      } else if (event.type === 'gas') {
        this.gasPending += event.moles
        let guard = 0
        while (this.gasPending >= 0.00055 && this.gasParticles.length < 42 && guard < 8) {
          this.gasPending -= 0.00055
          const species = SPECIES_BY_ID[event.speciesId]
          if (species) this.gasParticles.push(this.makeGasParticle(species))
          guard += 1
        }
      }
    }
  }

  update(dt: number, state: EngineState) {
    this.time += dt
    this.reconcileTimer += dt
    this.convergeTimer += dt
    this.site.flash = Math.max(0, this.site.flash - dt * 2.2)

    if (this.site.active) {
      this.site.alpha += (1 - this.site.alpha) * Math.min(1, dt * 5)
      this.site.x = MICRO.cx + Math.sin(this.time * 0.55) * 46
      this.site.y = MICRO.cy + Math.cos(this.time * 0.43) * 30
    } else {
      this.site.alpha += (0 - this.site.alpha) * Math.min(1, dt * 3)
    }

    for (const dot of this.waterDots) {
      dot.phase += dt * dot.speed
      dot.x += Math.sin(dot.phase * 0.7) * 0.35
      dot.y += Math.cos(dot.phase * 0.6) * 0.28
      this.keepInsideCircle(dot, 8)
    }

    for (const list of this.particles.values()) {
      for (const particle of list) {
        this.updateParticle(particle, dt)
      }
    }
    for (const particle of this.gasParticles) {
      this.updateParticle(particle, dt)
    }

    for (const list of this.particles.values()) {
      for (const particle of list) {
        if (particle.mode !== 'free') continue
        const dx = particle.x - MICRO.cx
        const dy = particle.y - MICRO.cy
        particle.vx += -dy * 0.00055
        particle.vy += dx * 0.00055
        particle.vx *= 0.988
        particle.vy *= 0.988
        const speed = Math.hypot(particle.vx, particle.vy)
        if (speed > 46) {
          particle.vx = (particle.vx / speed) * 46
          particle.vy = (particle.vy / speed) * 46
        }
      }
      list.splice(
        0,
        list.length,
        ...list.filter((particle) => particle.alpha > 0.01),
      )
    }
    this.gasParticles = this.gasParticles.filter(
      (particle) => particle.alpha > 0.02 && particle.y > MICRO.cy - MICRO.radius + 18,
    )

    if (this.reconcileTimer >= 0.24) {
      this.reconcileTimer = 0
      this.reconcile(state)
    }

    if (this.site.active && this.convergeTimer >= 0.28) {
      this.convergeTimer = 0
      this.scheduleConvergence(state)
    }
  }

  private makeGasParticle(species: Species): Particle {
    const x = MICRO.cx + (this.rand() - 0.5) * MICRO.radius * 1.1
    const y = MICRO.cy + MICRO.radius * (0.35 + this.rand() * 0.35)
    return {
      id: this.nextId++,
      speciesId: species.id,
      color: species.color,
      label: particleLabel(species),
      charge: species.charge,
      x,
      y,
      vx: (this.rand() - 0.5) * 8,
      vy: -16 - this.rand() * 18,
      r: 3 + this.rand() * 3.4,
      alpha: 0.9,
      mode: 'gas',
      phase: this.rand() * Math.PI * 2,
      flash: 0,
    }
  }

  private makeParticle(species: Species, mode: ParticleMode): Particle {
    let x: number
    let y: number
    if (mode === 'settle') {
      const point = this.randomPoint(24)
      x = point.x
      y = MICRO.cy - MICRO.radius * 0.2 + this.rand() * MICRO.radius * 0.75
    } else if (species.phase === 's') {
      x = MICRO.cx + (this.rand() - 0.5) * MICRO.radius * 1.2
      y = MICRO.cy + MICRO.radius * (0.55 + this.rand() * 0.15)
    } else {
      const point = this.randomPoint(26)
      x = point.x
      y = point.y
    }

    const isIon = species.kind === 'ion'
    const isBulk = species.phase === 's' && !species.isPrecipitate
    const r = isBulk
      ? 10 + this.rand() * 8
      : species.isPrecipitate
        ? 4.2 + this.rand() * 2.6
        : isIon
          ? 6.2 + this.rand() * 2.4
          : 7.4 + this.rand() * 2.2

    return {
      id: this.nextId++,
      speciesId: species.id,
      color: species.color,
      label: particleLabel(species),
      charge: species.charge,
      x,
      y,
      vx: (this.rand() - 0.5) * 12,
      vy: (this.rand() - 0.5) * 12,
      r,
      alpha: 0.05,
      mode,
      phase: this.rand() * Math.PI * 2,
      flash: 1,
    }
  }

  private updateParticle(particle: Particle, dt: number) {
    particle.phase += dt * 1.8
    particle.flash = Math.max(0, particle.flash - dt * 2.5)
    if (particle.alpha < 0.92) {
      particle.alpha += dt * 2.2
    }

    if (particle.mode === 'free') {
      particle.vx += (this.rand() - 0.5) * 190 * dt
      particle.vy += (this.rand() - 0.5) * 190 * dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      this.bounceInside(particle)
    } else if (particle.mode === 'settle') {
      particle.vy += 20 * dt
      particle.vx += Math.sin(particle.phase) * 2 * dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      const bottom = MICRO.cy + MICRO.radius - 18 - (particle.id % 5) * 4
      if (particle.y > bottom) {
        particle.y = bottom
        particle.vy *= -0.18
        particle.vx *= 0.85
      }
      this.bounceInside(particle)
    } else if (particle.mode === 'converge') {
      const tx = particle.targetX ?? this.site.x
      const ty = particle.targetY ?? this.site.y
      const t = Math.min(1, dt * 4.6)
      particle.x += (tx - particle.x) * t
      particle.y += (ty - particle.y) * t
      if (Math.hypot(tx - particle.x, ty - particle.y) < 7) {
        particle.alpha -= dt * 3.2
        particle.flash = 0
      }
    } else if (particle.mode === 'fade') {
      particle.alpha -= dt * 1.5
    } else if (particle.mode === 'gas') {
      particle.x += Math.sin(particle.phase) * 0.7
      particle.y += particle.vy * dt
      particle.vy -= 4 * dt
      particle.alpha -= dt * 0.28
    }
  }

  private bounceInside(particle: Particle) {
    const dx = particle.x - MICRO.cx
    const dy = particle.y - MICRO.cy
    const distance = Math.hypot(dx, dy)
    const limit = MICRO.radius - particle.r - 12
    if (distance > limit) {
      const nx = dx / (distance || 1)
      const ny = dy / (distance || 1)
      particle.x = MICRO.cx + nx * limit
      particle.y = MICRO.cy + ny * limit
      const dot = particle.vx * nx + particle.vy * ny
      particle.vx -= 1.7 * dot * nx
      particle.vy -= 1.7 * dot * ny
      particle.vx *= 0.8
      particle.vy *= 0.8
    }
  }

  private keepInsideCircle(point: { x: number; y: number }, margin: number) {
    const dx = point.x - MICRO.cx
    const dy = point.y - MICRO.cy
    const distance = Math.hypot(dx, dy)
    const limit = MICRO.radius - margin
    if (distance > limit) {
      point.x = MICRO.cx + (dx / (distance || 1)) * limit
      point.y = MICRO.cy + (dy / (distance || 1)) * limit
    }
  }

  private randomPoint(margin: number) {
    const angle = this.rand() * Math.PI * 2
    const radius = Math.sqrt(this.rand()) * (MICRO.radius - margin)
    return {
      x: MICRO.cx + Math.cos(angle) * radius,
      y: MICRO.cy + Math.sin(angle) * radius,
    }
  }

  private reconcile(state: EngineState) {
    const targets = new Map<string, number>()
    for (const [speciesId, moles] of state.amounts) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species || moles <= 1e-8) continue
      if (species.id === 'h2o' || species.kind === 'indicator') continue

      let count = 0
      if (species.isPrecipitate) {
        count = clamp(Math.round(moles * PRECIPITATE_SCALE), 1, 70)
      } else if (species.phase === 'aq') {
        count = clamp(Math.round(moles * AQ_SCALE), 1, 90)
      } else if (species.phase === 's') {
        count = clamp(Math.round(moles * BULK_SCALE), 1, 6)
      }
      if (count > 0) targets.set(speciesId, count)
    }

    let total = 0
    for (const count of targets.values()) total += count
    if (total > MAX_PARTICLES) {
      const factor = MAX_PARTICLES / total
      for (const [speciesId, count] of targets) {
        targets.set(speciesId, Math.max(1, Math.round(count * factor)))
      }
    }

    for (const [speciesId, target] of targets) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species) continue
      let list = this.particles.get(speciesId)
      if (!list) {
        list = []
        this.particles.set(speciesId, list)
      }
      const activeCount = list.filter((particle) => particle.mode !== 'fade').length
      if (activeCount < target) {
        const toAdd = target - activeCount
        const mode: ParticleMode = species.phase === 's' ? 'settle' : 'free'
        for (let i = 0; i < toAdd; i += 1) {
          list.push(this.makeParticle(species, mode))
        }
      } else if (activeCount > target) {
        let toRemove = activeCount - target
        const activeReaction = state.active?.reaction
        const isReactant = activeReaction?.reactants.some(
          (entry) => entry.speciesId === speciesId,
        )
        for (const particle of list) {
          if (toRemove <= 0) break
          if (particle.mode === 'fade') continue
          if (isReactant && particle.mode === 'free' && this.rand() > 0.45) {
            particle.mode = 'converge'
            particle.targetX = this.site.x + (this.rand() - 0.5) * 16
            particle.targetY = this.site.y + (this.rand() - 0.5) * 16
            continue
          }
          particle.mode = 'fade'
          toRemove -= 1
        }
      }
    }

    for (const [speciesId, list] of this.particles) {
      if (!targets.has(speciesId) && list.length > 0) {
        for (const particle of list) particle.mode = 'fade'
      }
    }
  }

  private scheduleConvergence(state: EngineState) {
    const active = state.active
    if (!active) return
    for (const entry of active.reaction.reactants) {
      const list = this.particles.get(entry.speciesId)
      if (!list) continue
      let picked = 0
      for (const particle of list) {
        if (picked >= 2) break
        if (particle.mode !== 'free') continue
        particle.mode = 'converge'
        particle.targetX = this.site.x + (this.rand() - 0.5) * 18
        particle.targetY = this.site.y + (this.rand() - 0.5) * 18
        picked += 1
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, state: EngineState) {
    const background = ctx.createRadialGradient(
      MICRO.cx,
      MICRO.cy - 40,
      30,
      MICRO.cx,
      MICRO.cy,
      MICRO.radius * 1.25,
    )
    background.addColorStop(0, '#173A33')
    background.addColorStop(0.55, '#102720')
    background.addColorStop(1, '#081310')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)

    ctx.save()
    ctx.strokeStyle = 'rgba(130,210,190,0.055)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath()
      ctx.arc(MICRO.cx, MICRO.cy, (MICRO.radius / 5.6) * i, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(MICRO.cx + Math.cos(angle) * 28, MICRO.cy + Math.sin(angle) * 28)
      ctx.lineTo(
        MICRO.cx + Math.cos(angle) * (MICRO.radius - 10),
        MICRO.cy + Math.sin(angle) * (MICRO.radius - 10),
      )
      ctx.stroke()
    }
    ctx.restore()

    for (const dot of this.waterDots) {
      ctx.beginPath()
      ctx.fillStyle = 'rgba(164,226,214,0.1)'
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      ctx.fill()
    }

    this.drawPrecipitates(ctx)
    this.drawFreeParticles(ctx)
    this.drawReactionSite(ctx)
    this.drawGas(ctx)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(214,240,233,0.38)'
    ctx.font = '500 9px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('微观示意 · 粒子数量按物质的量缩放', MICRO.cx, MICRO.cy + MICRO.radius - 16)
    ctx.restore()

    if (state.amounts.size === 0) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(214,240,233,0.32)'
      ctx.font = '500 13px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText('烧杯里还没有试剂', MICRO.cx, MICRO.cy)
      ctx.restore()
    }
  }

  private drawPrecipitates(ctx: CanvasRenderingContext2D) {
    const list: Particle[] = []
    for (const [speciesId, particles] of this.particles) {
      const species = SPECIES_BY_ID[speciesId]
      if (!species?.isPrecipitate) continue
      list.push(...particles)
    }
    for (const particle of list) {
      if (particle.alpha <= 0.02) continue
      ctx.save()
      ctx.globalAlpha = particle.alpha * 0.9
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = lightenHex(particle.color, 0.35)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawFreeParticles(ctx: CanvasRenderingContext2D) {
    const all: Particle[] = []
    for (const particle of this.particles.values()) {
      all.push(...particle)
    }
    const dense = this.countFree() > 110
    for (const particle of all) {
      if (particle.alpha <= 0.02) continue
      const species = SPECIES_BY_ID[particle.speciesId]
      if (species?.isPrecipitate) continue
      this.drawParticle(ctx, particle, dense)
    }
  }

  private drawGas(ctx: CanvasRenderingContext2D) {
    for (const particle of this.gasParticles) {
      if (particle.alpha <= 0.02) continue
      ctx.save()
      ctx.globalAlpha = particle.alpha * 0.85
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = lightenHex(particle.color, 0.45)
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.arc(
        particle.x - particle.r * 0.25,
        particle.y - particle.r * 0.3,
        particle.r * 0.24,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, dense: boolean) {
    const alpha = clamp(particle.alpha, 0, 1)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.fillStyle = particle.color
    ctx.globalAlpha = alpha * 0.12
    ctx.arc(particle.x, particle.y, particle.r + 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = alpha

    ctx.beginPath()
    ctx.fillStyle = particle.color
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = lightenHex(particle.color, 0.42)
    ctx.lineWidth = 1.1
    ctx.stroke()

    ctx.beginPath()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.arc(
      particle.x - particle.r * 0.3,
      particle.y - particle.r * 0.34,
      particle.r * 0.22,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    if (particle.flash > 0.1) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(190,255,225,${particle.flash * 0.55})`
      ctx.lineWidth = 2
      ctx.arc(particle.x, particle.y, particle.r + 6 + (1 - particle.flash) * 10, 0, Math.PI * 2)
      ctx.stroke()
    }

    const species = SPECIES_BY_ID[particle.speciesId]
    const showLabel =
      species &&
      !species.isPrecipitate &&
      particle.r >= 6 &&
      particle.label.length <= 8 &&
      (!dense || particle.id % 5 === 0)
    if (showLabel) {
      ctx.font = '600 8px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(5,18,14,0.85)'
      ctx.lineWidth = 2.5
      ctx.strokeText(particle.label, particle.x, particle.y)
      ctx.fillStyle = 'rgba(247,252,248,0.94)'
      ctx.fillText(particle.label, particle.x, particle.y)
    }

    ctx.restore()
  }

  private countFree(): number {
    let count = 0
    for (const list of this.particles.values()) {
      count += list.length
    }
    return count
  }

  private drawReactionSite(ctx: CanvasRenderingContext2D) {
    if (this.site.alpha <= 0.02) return
    const pulse = 1 + Math.sin(this.time * 6.5) * 0.1
    ctx.save()
    ctx.globalAlpha = this.site.alpha

    const glow = ctx.createRadialGradient(
      this.site.x,
      this.site.y,
      2,
      this.site.x,
      this.site.y,
      54,
    )
    glow.addColorStop(0, 'rgba(160,255,215,0.32)')
    glow.addColorStop(0.45, 'rgba(90,220,170,0.12)')
    glow.addColorStop(1, 'rgba(90,220,170,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(this.site.x, this.site.y, 54, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(168,255,220,0.72)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(this.site.x, this.site.y, 17 * pulse, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(168,255,220,0.26)'
    ctx.beginPath()
    ctx.arc(this.site.x, this.site.y, 28 * pulse, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < 6; i += 1) {
      const angle = this.time * 1.6 + (i / 6) * Math.PI * 2
      const radius = 22 + Math.sin(this.time * 3 + i) * 3
      ctx.beginPath()
      ctx.fillStyle = 'rgba(200,255,230,0.7)'
      ctx.arc(
        this.site.x + Math.cos(angle) * radius,
        this.site.y + Math.sin(angle) * radius,
        1.6,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    if (this.site.flash > 0) {
      ctx.globalAlpha = this.site.flash * 0.8
      ctx.strokeStyle = 'rgba(220,255,240,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.site.x, this.site.y, 8 + (1 - this.site.flash) * 26, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.font = '600 9px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(190,255,225,0.72)'
    ctx.fillText('反应中', this.site.x, this.site.y - 38)
    ctx.restore()
  }
}
