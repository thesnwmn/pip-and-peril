import { colors } from './colors'
import { createMainMenu, type ScreenController } from './screens/main-menu'
import { createHome } from './screens/home'
import { createGame } from './screens/game'

const LOGICAL_W = 390
const LOGICAL_H = 844

type Screen = 'main-menu' | 'home' | 'game'

export class GameApp {
  private currentScreen: Screen = 'main-menu'
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private screens: Record<Screen, ScreenController>
  private dpr: number

  constructor() {
    this.dpr = window.devicePixelRatio ?? 1

    this.canvas = document.createElement('canvas')
    this.canvas.width = LOGICAL_W * this.dpr
    this.canvas.height = LOGICAL_H * this.dpr
    this.canvas.style.display = 'block'
    this.canvas.style.margin = '0 auto'
    this.canvas.style.width = `${LOGICAL_W}px`
    this.canvas.style.height = `${LOGICAL_H}px`

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    ctx.scale(this.dpr, this.dpr)
    this.ctx = ctx

    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.backgroundColor = colors.bg
    document.body.appendChild(this.canvas)

    this.screens = {
      'main-menu': createMainMenu((screen) => this.transitionTo(screen as Screen)),
      'home': createHome((screen) => this.transitionTo(screen as Screen)),
      'game': createGame((screen) => this.transitionTo(screen as Screen)),
    }

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      const coords = this.toCanvasCoords(e)
      this.screens[this.currentScreen].handleClick(coords.x, coords.y)
    })

    this.canvas.addEventListener('mousemove', (e) => {
      const coords = this.toCanvasCoords(e)
      this.screens[this.currentScreen].handlePointerMove(coords.x, coords.y)
    })
  }

  private toCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (rect.width / LOGICAL_W)
    const y = (e.clientY - rect.top) / (rect.height / LOGICAL_H)
    return { x, y }
  }

  private transitionTo(next: Screen): void {
    if (next === this.currentScreen) return
    this.currentScreen = next
  }

  public start(): void {
    const tick = (timestamp: DOMHighResTimeStamp) => {
      this.screens[this.currentScreen].draw(this.ctx, timestamp)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}
