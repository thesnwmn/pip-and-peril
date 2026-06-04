import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { drawSingleTile, MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { RoomType } from '../map/types'
import { N, S, E } from '../map/types'
import type { DungeonState, RoomOffering } from './dungeon-state'
import { chebyshev, DIR_DELTA } from './dungeon-state'
import { availableDirs } from './movement'
import { whisperAlpha, WHISPER_TOTAL_MS } from '../log/whisper'
import {
  LOGICAL_W,
  LOGICAL_H,
  STATUS_BAR_H,
  PANEL_TOP,
  COMBAT_PANEL_TOP,
  PANEL_CORNER,
  PANEL_HEADER_H,
  PANEL_SIDE_MARGIN,
  PANEL_GAP,
  CARD_W,
  CARD_H,
  CARD_TILE_SIZE,
  CARD_BORDER,
  ARROW_HALF,
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

const WHISPER_SCRIM_H = 60
const WHISPER_ANCHOR = COMBAT_PANEL_TOP + 36

function cardColors(roomType: RoomType): { border: string; bg: string; text: string } {
  switch (roomType) {
    case 'enemy':  return { border: colors.cardBorderEnemy,    bg: colors.cardBgEnemy,    text: colors.cardTextEnemy }
    case 'boss':   return { border: colors.cardBorderBoss,     bg: colors.cardBgBoss,     text: colors.cardTextBoss }
    case 'shop':   return { border: colors.cardBorderShop,     bg: colors.cardBgShop,     text: colors.cardTextShop }
    case 'npc':    return { border: colors.cardBorderNpc,      bg: colors.cardBgNpc,      text: colors.cardTextNpc }
    case 'item':   return { border: colors.cardBorderItem,     bg: colors.cardBgItem,     text: colors.cardTextItem }
    case 'chest':  return { border: colors.cardBorderChest,    bg: colors.cardBgChest,    text: colors.cardTextChest }
    default:       return { border: colors.cardBorderCorridor, bg: colors.cardBgCorridor, text: colors.cardTextCorridor }
  }
}

function vpPixel(
  cameraCol: number, cameraRow: number,
  cellCol: number, cellRow: number,
): { px: number; py: number } {
  const startCol = cameraCol - Math.floor(VIEWPORT_COLS / 2)
  const startRow = cameraRow - Math.floor(VIEWPORT_ROWS / 2)
  return {
    px: MAP_X + (cellCol - startCol) * TILE_SIZE,
    py: MAP_Y + (cellRow - startRow) * TILE_SIZE,
  }
}

function drawNavArrows(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  hitRects: HitRect[],
): void {
  const dirs = availableDirs(state)
  for (const dir of dirs) {
    const { dc, dr } = DIR_DELTA[dir]
    const nc = state.pip.col + dc
    const nr = state.pip.row + dr
    const { px, py } = vpPixel(state.camera.col, state.camera.row, nc, nr)
    const cx = px + TILE_SIZE / 2
    const cy = py + TILE_SIZE / 2

    ctx.save()
    ctx.shadowColor = 'rgba(200,148,30,0.5)'
    ctx.shadowBlur = 6
    ctx.fillStyle = 'rgba(200,148,30,0.9)'
    ctx.beginPath()
    const h = ARROW_HALF
    if (dir === N) {
      ctx.moveTo(cx, cy - h)
      ctx.lineTo(cx + h, cy + h)
      ctx.lineTo(cx - h, cy + h)
    } else if (dir === S) {
      ctx.moveTo(cx, cy + h)
      ctx.lineTo(cx - h, cy - h)
      ctx.lineTo(cx + h, cy - h)
    } else if (dir === E) {
      ctx.moveTo(cx + h, cy)
      ctx.lineTo(cx - h, cy - h)
      ctx.lineTo(cx - h, cy + h)
    } else {
      ctx.moveTo(cx - h, cy)
      ctx.lineTo(cx + h, cy - h)
      ctx.lineTo(cx + h, cy + h)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    hitRects.push({ x: px, y: py, w: TILE_SIZE, h: TILE_SIZE, id: `arrow-${dir}` })
  }
}

function drawStatusBar(ctx: CanvasRenderingContext2D, state: DungeonState): void {
  const barMidY = STATUS_BAR_H / 2

  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('FLOOR 1', LOGICAL_W / 2, barMidY)

  const depth = chebyshev(state.pip, state.startPos)
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

function drawSituatedWhisper(ctx: CanvasRenderingContext2D, text: string, alpha: number): void {
  if (alpha <= 0) return

  const scrimTop = WHISPER_ANCHOR - WHISPER_SCRIM_H
  const grad = ctx.createLinearGradient(0, scrimTop, 0, WHISPER_ANCHOR)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, `rgba(15,13,10,${0.25 * alpha})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, scrimTop, LOGICAL_W, WHISPER_SCRIM_H)

  ctx.globalAlpha = alpha
  ctx.font = '13px monospace'
  ctx.fillStyle = colors.logNormal
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, LOGICAL_W / 2, WHISPER_ANCHOR - 14)
  ctx.globalAlpha = 1
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width <= maxW) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  offering: RoomOffering,
  tease: string,
  x: number,
  y: number,
  isHovered: boolean,
): void {
  const col = cardColors(offering.roomType)
  const bg = isHovered ? colors.surfaceRaised : col.bg
  const r = 4

  ctx.save()
  ctx.beginPath()
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void
  }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, y, CARD_W, CARD_H, r)
  } else {
    ctx.rect(x, y, CARD_W, CARD_H)
  }
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = col.border
  ctx.lineWidth = CARD_BORDER
  ctx.stroke()
  ctx.clip()

  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = col.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(offering.roomType.toUpperCase(), x + CARD_W / 2, y + 7)

  ctx.globalAlpha = 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, y + 21)
  ctx.lineTo(x + CARD_W - 6, y + 21)
  ctx.stroke()
  ctx.globalAlpha = 1

  const tileY = y + 24
  const tileX = x + (CARD_W - CARD_TILE_SIZE) / 2
  drawSingleTile(ctx, { roomType: offering.roomType, exits: offering.exits }, tileX, tileY, CARD_TILE_SIZE, DUNGEON)

  const sepY = y + 24 + CARD_TILE_SIZE + 4
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, sepY)
  ctx.lineTo(x + CARD_W - 6, sepY)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.font = 'italic 11px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const textX = x + 6
  const maxTW = CARD_W - 12
  const lines = wrapText(ctx, tease, maxTW)
  const teaseY = sepY + 5
  for (let li = 0; li < Math.min(2, lines.length); li++) {
    ctx.fillText(lines[li], textX, teaseY + li * 13)
  }

  ctx.restore()
}

function drawRoomPanel(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  teases: string[],
  hoveredElement: string | null,
  hitRects: HitRect[],
): void {
  const panelH = LOGICAL_H - COMBAT_PANEL_TOP

  ctx.fillStyle = colors.surface
  ctx.beginPath()
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number[]) => void
  }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(MAP_X, COMBAT_PANEL_TOP, MAP_W, panelH, [PANEL_CORNER, PANEL_CORNER, 0, 0])
  } else {
    ctx.rect(MAP_X, COMBAT_PANEL_TOP, MAP_W, panelH)
  }
  ctx.fill()

  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, COMBAT_PANEL_TOP)
  ctx.lineTo(MAP_X + MAP_W, COMBAT_PANEL_TOP)
  ctx.stroke()

  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('WHERE DOES THIS LEAD?', MAP_X + MAP_W / 2, COMBAT_PANEL_TOP + PANEL_HEADER_H / 2)

  const cardsStartX = MAP_X + PANEL_SIDE_MARGIN
  const cardsY = COMBAT_PANEL_TOP + PANEL_HEADER_H

  for (let i = 0; i < 3; i++) {
    const cx = cardsStartX + i * (CARD_W + PANEL_GAP)
    const isHovered = hoveredElement === `card-${i}`
    drawCard(ctx, state.offerings[i], teases[i] ?? '', cx, cardsY, isHovered)
    hitRects.push({ x: cx, y: cardsY, w: CARD_W, h: CARD_H, id: `card-${i}` })
  }
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
    onCardChosen: (index: number) => void
  },
): {
  draw: (ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp) => void
  handleClick: (x: number, y: number) => boolean
  handlePointerMove: (x: number, y: number) => boolean
  setTeases: (teases: string[]) => void
  clearTeases: () => void
  triggerWhisper: (text: string) => void
  clearWhisper: () => void
} {
  let cardTeases: string[] = []
  let hoveredElement: string | null = null
  let whisper: WhisperState | null = null
  let hitRects: HitRect[] = []

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    const state = getDungeonState()
    const inEncounterRegister = getInEncounterRegister()

    hitRects = []

    drawStatusBar(ctx, state)

    if (!inEncounterRegister && state.uiState === 'idle') {
      drawNavArrows(ctx, state, hitRects)

      if (whisper !== null) {
        const elapsed = timestamp - whisper.startTime
        if (elapsed >= WHISPER_TOTAL_MS) {
          whisper = null
        } else {
          drawSituatedWhisper(ctx, whisper.text, whisperAlpha(elapsed))
        }
      }
    }

    if (state.uiState === 'choosing') {
      drawRoomPanel(ctx, state, cardTeases, hoveredElement, hitRects)
    }
  }

  function handleClick(x: number, y: number): boolean {
    const state = getDungeonState()
    if (state.uiState !== 'choosing') return false

    const hit = hitTest(x, y, hitRects)
    if (hit?.startsWith('card-')) {
      const idx = parseInt(hit.split('-')[1])
      callbacks.onCardChosen(idx)
      return true
    }
    return false
  }

  function handlePointerMove(x: number, y: number): boolean {
    const state = getDungeonState()
    if (state.uiState === 'choosing') {
      const hit = hitTest(x, y, hitRects)
      hoveredElement = hit?.startsWith('card-') ? hit : null
      return true
    }
    hoveredElement = null
    return false
  }

  function setTeases(teases: string[]): void {
    cardTeases = teases
  }

  function clearTeases(): void {
    cardTeases = []
  }

  function triggerWhisper(text: string): void {
    whisper = { text, startTime: performance.now() }
  }

  function clearWhisper(): void {
    whisper = null
  }

  return { draw, handleClick, handlePointerMove, setTeases, clearTeases, triggerWhisper, clearWhisper }
}
