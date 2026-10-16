import { colors } from '../colors'
import { MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { ExitMask } from '../map/types'
import { E, N, S, W } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { chebyshev } from './dungeon-state'
import { exitState } from './movement'
import { whisperAlpha, WHISPER_TOTAL_MS } from '../log/whisper'
import {
  LOGICAL_W,
  LOGICAL_H,
  STATUS_BAR_H,
  PANEL_TOP,
  PANEL_CORNER,
  VIEWPORT_COLS,
  VIEWPORT_ROWS,
} from '../screens/game-layout'

interface HitRect {
  x: number; y: number; w: number; h: number; id: string
}

interface WhisperState {
  text: string
  startTime: number
}

const BTN_W = 64
const BTN_H = 64
const BTN_STEP = 72
const BTN_RADIUS = 8
const PANEL_CENTER_X = LOGICAL_W / 2
const PANEL_CENTER_Y = PANEL_TOP + (LOGICAL_H - PANEL_TOP) / 2

const PANEL_WHISPER_Y = PANEL_TOP + 20

const DIR_BTN = {
  none: { fill: 'rgba(58,58,80,0.17)',   stroke: '#3a3a50', label: '#3a3a50' },
  fog:  { fill: 'rgba(200,148,30,0.17)', stroke: '#c8941e', label: '#c8941e' },
  back: { fill: 'rgba(122,80,16,0.17)',  stroke: '#7a5010', label: '#7a5010' },
} as const

type DirSpec = { dir: ExitMask; label: string; cx: number; cy: number }
const DIR_SPECS: DirSpec[] = [
  { dir: N, label: '↑', cx: PANEL_CENTER_X,             cy: PANEL_CENTER_Y - BTN_STEP },
  { dir: S, label: '↓', cx: PANEL_CENTER_X,             cy: PANEL_CENTER_Y + BTN_STEP },
  { dir: W, label: '←', cx: PANEL_CENTER_X - BTN_STEP,  cy: PANEL_CENTER_Y },
  { dir: E, label: '→', cx: PANEL_CENTER_X + BTN_STEP,  cy: PANEL_CENTER_Y },
]

function drawStatusBar(ctx: CanvasRenderingContext2D, state: DungeonState): void {
  const barMidY = STATUS_BAR_H / 2

  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Floor ${state.floor}`, LOGICAL_W / 2, barMidY)

  const depth = chebyshev(state.pip, state.floorEntryPosition)
  ctx.textAlign = 'right'
  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textMuted
  const depthLabel = 'Depth '
  const depthNum = String(depth)
  const numW = ctx.measureText(depthNum).width
  const rightX = LOGICAL_W - 16
  ctx.fillText(depthLabel, rightX - numW, barMidY)
  ctx.fillStyle = colors.gold
  ctx.fillText(depthNum, rightX, barMidY)
}

function drawPanelBackground(ctx: CanvasRenderingContext2D): void {
  const panelH = LOGICAL_H - PANEL_TOP
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number[]) => void
  }

  ctx.fillStyle = colors.surface
  ctx.beginPath()
  if (ctxAny.roundRect) {
    ctxAny.roundRect(MAP_X, PANEL_TOP, MAP_W, panelH, [PANEL_CORNER, PANEL_CORNER, 0, 0])
  } else {
    ctx.rect(MAP_X, PANEL_TOP, MAP_W, panelH)
  }
  ctx.fill()

  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, PANEL_TOP)
  ctx.lineTo(MAP_X + MAP_W, PANEL_TOP)
  ctx.stroke()
}

function drawDirButton(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  dirState: 'none' | 'fog' | 'back',
): void {
  const x = cx - BTN_W / 2
  const y = cy - BTN_H / 2
  const col = DIR_BTN[dirState]
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void
  }

  ctx.save()
  ctx.beginPath()
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, y, BTN_W, BTN_H, BTN_RADIUS)
  } else {
    ctx.rect(x, y, BTN_W, BTN_H)
  }
  ctx.fillStyle = col.fill
  ctx.fill()
  ctx.strokeStyle = col.stroke
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = col.label
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy)
  ctx.restore()
}

function drawDirectionCross(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  hitRects: HitRect[],
): void {
  for (const { dir, label, cx, cy } of DIR_SPECS) {
    const ds = exitState(state, dir)
    drawDirButton(ctx, cx, cy, label, ds)
    if (ds === 'fog' || ds === 'back') {
      hitRects.push({ x: cx - BTN_W / 2, y: cy - BTN_H / 2, w: BTN_W, h: BTN_H, id: `dir-${dir}` })
    }
  }
}

function drawPanelWhisper(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.save()
  ctx.font = 'italic 13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(text, LOGICAL_W / 2, PANEL_WHISPER_Y)
  ctx.restore()
}

function hitTest(x: number, y: number, hitRects: HitRect[]): string | null {
  for (const rect of hitRects) {
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return rect.id
    }
  }
  return null
}

export function createNavigationPanel(
  getDungeonState: () => DungeonState,
  getInEncounterRegister: () => boolean,
  callbacks: {
    onDirButton: (dir: ExitMask) => void
    onWhisperEnd: () => void
  },
): {
  draw: (ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp) => void
  handleClick: (x: number, y: number) => boolean
  handlePointerMove: (x: number, y: number) => boolean
  triggerWhisper: (text: string) => void
  clearWhisper: () => void
} {
  let whisper: WhisperState | null = null
  let hitRects: HitRect[] = []

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    const state = getDungeonState()
    const inEncounterRegister = getInEncounterRegister()

    hitRects = []

    drawStatusBar(ctx, state)
    drawPanelBackground(ctx)

    if (!inEncounterRegister) {
      ctx.save()
      drawDirectionCross(ctx, state, hitRects)
      ctx.restore()
    }

    if (whisper !== null) {
      const elapsed = timestamp - whisper.startTime
      if (elapsed >= WHISPER_TOTAL_MS) {
        whisper = null
        callbacks.onWhisperEnd()
      } else {
        const wAlpha = whisperAlpha(elapsed)
        if (wAlpha > 0) {
          ctx.save()
          ctx.globalAlpha = wAlpha
          drawPanelWhisper(ctx, whisper.text)
          ctx.restore()
        }
      }
    }
  }

  function handleClick(x: number, y: number): boolean {
    const hit = hitTest(x, y, hitRects)
    if (hit?.startsWith('dir-')) {
      const dir = parseInt(hit.split('-')[1]) as ExitMask
      callbacks.onDirButton(dir)
      return true
    }
    return false
  }

  function handlePointerMove(_x: number, _y: number): boolean {
    return false
  }

  function triggerWhisper(text: string): void {
    whisper = { text, startTime: performance.now() }
  }

  function clearWhisper(): void {
    whisper = null
  }

  return { draw, handleClick, handlePointerMove, triggerWhisper, clearWhisper }
}
