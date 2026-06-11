import { colors } from './colors'
import { BUILD_ID } from './build-id'
import { createMainMenu, type ScreenController } from './screens/main-menu'
import { createHome } from './screens/home'
import { createGame } from './screens/game'
import { createRunSummary } from './screens/run-summary'
import { createCamp } from './screens/camp'
import type { RunSummary } from './screens/types'
import type { MetaState } from './meta/state'
import { loadMetaState, saveMetaState } from './meta/state'

const LOGICAL_W = 390
const LOGICAL_H = 844

type Screen = 'main-menu' | 'home' | 'camp' | 'game' | 'run-summary'

export class GameApp {
  private currentScreen: Screen = 'main-menu'
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private screens: Record<Screen, ScreenController>
  private dpr: number
  private pendingRunSummary: RunSummary | null = null
  private metaState: MetaState

  constructor() {
    console.log(`GameApp constructor called`)
    const existingCanvas = document.querySelector('canvas')
    if (existingCanvas) {
      console.warn(`Warning: canvas element already exists in DOM, removing it`)
      existingCanvas.remove()
    }

    this.dpr = window.devicePixelRatio ?? 1

    this.canvas = document.createElement('canvas')
    this.canvas.width = 390 * this.dpr
    this.canvas.height = 844 * this.dpr
    this.canvas.style.display = 'block'
    this.canvas.style.margin = '0 auto'
    this.canvas.style.width = `390px`
    this.canvas.style.height = `844px`

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    ctx.scale(this.dpr, this.dpr)
    this.ctx = ctx

    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.backgroundColor = colors.bg
    document.body.appendChild(this.canvas)

    // Load MetaState and check for test mode parameters
    this.metaState = loadMetaState()
    const params = new URLSearchParams(window.location.search)
    const testMode = params.get('testMode')
    const testScraps = parseInt(params.get('testScraps') || '0', 10)

    // Apply test mode settings if provided
    if (testMode === 'camp' && testScraps > 0) {
      this.metaState = { ...this.metaState, scraps: testScraps, runCount: 1 }
      saveMetaState(this.metaState)
      console.log(`🧪 Test mode: Starting at camp with ${testScraps} scraps`)
    }

    const defaultRunSummary: RunSummary = {
      outcome: 'defeat',
      floorReached: 1,
      enemiesDefeated: 0,
      goldEarned: 0,
      killedBy: null,
      killedByFloor: null,
    }

    this.screens = {
      'main-menu': createMainMenu((screen) => this.transitionTo(screen as Screen)),
      'home': createHome((screen) => this.transitionTo(screen as Screen)),
      'camp': createCamp(
        (screen) => this.transitionTo(screen as Screen),
        (metaState) => {
          this.metaState = metaState
          // Recreate game screen with updated metaState
          this.screens['game'] = createGame(
            (screen, summary) => this.transitionTo(screen as Screen, summary),
            metaState,
          )
          this.transitionTo('game')
        },
        this.metaState,
      ),
      'game': createGame(
        (screen, summary) => this.transitionTo(screen as Screen, summary),
        this.metaState,
      ),
      'run-summary': createRunSummary(
        (screen, metaState) => {
          if (metaState) {
            this.metaState = metaState
          }
          // Recreate camp screen with fresh state when returning from run
          if (screen === 'camp') {
            this.screens['camp'] = createCamp(
              (s) => this.transitionTo(s as Screen),
              (m) => {
                this.metaState = m
                this.screens['game'] = createGame(
                  (s, summary) => this.transitionTo(s as Screen, summary),
                  m,
                )
                this.transitionTo('game')
              },
              this.metaState,
            )
          }
          this.transitionTo(screen as Screen)
        },
        defaultRunSummary,
      ),
    }

    // Start at camp if test mode is active
    if (testMode === 'camp') {
      this.currentScreen = 'camp'
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

  private transitionTo(next: Screen, summary?: RunSummary): void {
    if (next === this.currentScreen) return
    if (next === 'run-summary' && summary) {
      this.pendingRunSummary = summary
      // Apply mark-updated MetaState immediately so camp creation uses it
      if (summary.metaWithMarks) {
        this.metaState = summary.metaWithMarks
      }
      this.screens['run-summary'] = createRunSummary(
        (screen, metaState) => {
          if (metaState) {
            this.metaState = metaState
          }
          // Recreate camp screen with fresh state when returning from run
          if (screen === 'camp') {
            this.screens['camp'] = createCamp(
              (s) => this.transitionTo(s as Screen),
              (m) => {
                this.metaState = m
                this.screens['game'] = createGame(
                  (s, summary) => this.transitionTo(s as Screen, summary),
                  m,
                )
                this.transitionTo('game')
              },
              this.metaState,
            )
          }
          this.transitionTo(screen as Screen)
        },
        summary,
      )
    }
    this.currentScreen = next
  }

  public start(): void {
    console.log(`[Pip & Peril] build: ${BUILD_ID}`)
    let lastScreen = this.currentScreen
    const tick = (timestamp: DOMHighResTimeStamp) => {
      if (this.currentScreen !== lastScreen) {
        lastScreen = this.currentScreen
        // Reset canvas completely on screen transition
        this.canvas.width = this.canvas.width
        this.ctx.scale(this.dpr, this.dpr)
      }
      this.screens[this.currentScreen].draw(this.ctx, timestamp)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}
