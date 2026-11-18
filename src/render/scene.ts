import { sound } from '../audio/sound'
import { hexToRgb } from '../domain/color'
import type { LabEngine } from '../domain/engine'
import { REACTIONS_BY_ID } from '../domain/reactions'
import { REAGENTS_BY_ID } from '../domain/reagents'
import type { EngineEvent } from '../domain/types'
import { MacroRenderer } from './macro'
import { MicroRenderer } from './micro'
import {
  MICRO,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  clamp,
  easeInOutCubic,
  sceneTransform,
} from './theme'

export type SceneView = 'macro' | 'micro'

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export class SceneRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private engine: LabEngine
  private macro = new MacroRenderer()
  private micro = new MicroRenderer()
  private blend = 0
  private targetView: SceneView = 'macro'
  private running = false
  private raf = 0
  private lastTime = 0
  private cssWidth = 0
  private cssHeight = 0
  private dpr = 1
  private flash = 0
  private flashColor = '#FFB36A'

  constructor(canvas: HTMLCanvasElement, engine: LabEngine) {
    this.canvas = canvas
    this.engine = engine
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 Canvas 2D 上下文')
    }
    this.ctx = ctx
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  resize(cssWidth: number, cssHeight: number, dpr: number) {
    if (cssWidth <= 0 || cssHeight <= 0) return
    this.cssWidth = cssWidth
    this.cssHeight = cssHeight
    this.dpr = Math.min(2, Math.max(1, dpr))
    this.canvas.width = Math.round(cssWidth * this.dpr)
    this.canvas.height = Math.round(cssHeight * this.dpr)
  }

  setView(view: SceneView) {
    this.targetView = view
  }

  private loop = (now: number) => {
    if (!this.running) return
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000))
    this.lastTime = now
    this.flash = Math.max(0, this.flash - dt * 1.55)

    const events = this.engine.drainEvents()
    this.playSounds(events)
    this.macro.handleEvents(events)
    this.micro.handleEvents(events)

    this.macro.update(dt, this.engine.state)
    this.micro.update(dt, this.engine.state)

    const target = this.targetView === 'micro' ? 1 : 0
    this.blend += (target - this.blend) * Math.min(1, dt * 5.8)
    if (Math.abs(target - this.blend) < 0.001) {
      this.blend = target
    }

    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  private playSounds(events: EngineEvent[]) {
    for (const event of events) {
      if (event.type === 'add') {
        const reagent = REAGENTS_BY_ID[event.reagentId]
        if (reagent) sound.playAdd(reagent.addAnimation)
      } else if (event.type === 'reaction-start') {
        const reaction = REACTIONS_BY_ID[event.reactionId]
        if (reaction) {
          sound.playReactionStart(reaction)
          this.flash = 1
          this.flashColor =
            reaction.effects?.precipitate ??
            (reaction.effects?.gas
              ? '#8BD7FF'
              : reaction.effects?.thermal === 'endo'
                ? '#8FC5FF'
                : '#FFB36A')
        }
      } else if (event.type === 'reaction-end') {
        const reaction = REACTIONS_BY_ID[event.reactionId]
        if (reaction) sound.playReactionEnd(reaction)
      } else if (event.type === 'gas') {
        sound.playBubble()
      }
    }
  }

  private render() {
    if (this.cssWidth <= 0 || this.cssHeight <= 0) return
    const { scale, offsetX, offsetY } = sceneTransform(this.cssWidth, this.cssHeight, this.dpr)

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.setTransform(
      this.dpr * scale,
      0,
      0,
      this.dpr * scale,
      this.dpr * offsetX,
      this.dpr * offsetY,
    )

    this.macro.draw(this.ctx, this.engine.state)

    if (this.blend > 0.001) {
      const eased = easeInOutCubic(clamp(this.blend, 0, 1))
      const radius = MICRO.radius * eased
      const activeReaction = this.engine.state.active?.reaction
      const accent =
        activeReaction?.effects?.precipitate ??
        (activeReaction?.effects?.gas
          ? '#8BD7FF'
          : activeReaction?.effects?.thermal === 'endo'
            ? '#8FC5FF'
            : '#FFB36A')

      this.ctx.save()
      this.ctx.globalAlpha = 0.93 * eased
      this.ctx.fillStyle = '#08120F'
      this.ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
      this.ctx.restore()

      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(MICRO.cx, MICRO.cy, Math.max(1, radius), 0, Math.PI * 2)
      this.ctx.clip()
      this.ctx.globalAlpha = eased
      this.micro.draw(this.ctx, this.engine.state)
      if (this.flash > 0.01) {
        const flash = this.ctx.createRadialGradient(
          MICRO.cx,
          MICRO.cy,
          12,
          MICRO.cx,
          MICRO.cy,
          Math.max(24, radius),
        )
        flash.addColorStop(0, withAlpha(this.flashColor, 0.22))
        flash.addColorStop(1, withAlpha(this.flashColor, 0))
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        this.ctx.globalAlpha = eased * this.flash * 0.7
        this.ctx.fillStyle = flash
        this.ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
        this.ctx.restore()
      }
      this.ctx.restore()

      this.ctx.save()
      this.ctx.globalAlpha = eased
      this.ctx.strokeStyle = activeReaction
        ? withAlpha(accent, 0.5)
        : 'rgba(138,230,205,0.34)'
      this.ctx.lineWidth = 10
      this.ctx.beginPath()
      this.ctx.arc(MICRO.cx, MICRO.cy, Math.max(1, radius + 3), 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.strokeStyle = 'rgba(184,255,231,0.68)'
      this.ctx.lineWidth = 1.2
      this.ctx.beginPath()
      this.ctx.arc(MICRO.cx, MICRO.cy, Math.max(1, radius + 1), 0, Math.PI * 2)
      this.ctx.stroke()

      if (activeReaction) {
        this.ctx.globalAlpha =
          eased * (0.38 + 0.14 * Math.sin(performance.now() / 210))
        this.ctx.strokeStyle = withAlpha(accent, 0.75)
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.arc(MICRO.cx, MICRO.cy, Math.max(1, radius + 7), 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.globalAlpha = eased
      }

      this.ctx.strokeStyle = 'rgba(184,255,231,0.22)'
      this.ctx.lineWidth = 1
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * Math.PI * 2
        const inner = radius + 7
        const outer = radius + (i % 6 === 0 ? 16 : 12)
        this.ctx.beginPath()
        this.ctx.moveTo(
          MICRO.cx + Math.cos(angle) * inner,
          MICRO.cy + Math.sin(angle) * inner,
        )
        this.ctx.lineTo(
          MICRO.cx + Math.cos(angle) * outer,
          MICRO.cy + Math.sin(angle) * outer,
        )
        this.ctx.stroke()
      }
      this.ctx.restore()
    }
  }
}
