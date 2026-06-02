import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import type { ExitMask } from '../map/types'
import { E, N, S, W } from '../map/types'
import { drawMap, drawSingleTile, MAP_X, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { DungeonState, RoomOffering } from '../navigation/dungeon-state'
import { chebyshev, DIR_DELTA, initDungeon, OPP } from '../navigation/dungeon-state'
import { availableDirs, dirFromPipToNeighbour, isBacktrackable, movePip } from '../navigation/movement'
import { generateOfferings, placeRoom, CARD_TEASES, validExitConfigs } from '../navigation/room-selection'
import { pickRandom } from '../navigation/room-pool'
import type { ScreenController } from './main-menu'
import type { DicePool } from '../dice/pool'
import { starterPool } from '../dice/pool'
import { createDicePanel, PANEL_TOP as DICE_PANEL_TOP } from '../dice/panel'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BACK_LINK_X = 16
const BACK_LINK_Y = 16
const BACK_LINK_W = 150
const BACK_LINK_H = 32

// Status bar
const STATUS_BAR_H = 50

// Map zone: 5×5 tiles at TILE_SIZE 72 = 360 px, starting at MAP_Y=50 → bottom at 50+360=410
const MAP_BOTTOM = MAP_Y + 5 * TILE_SIZE  // 410

// Log strip: starts 4 px below map
const LOG_TOP = MAP_BOTTOM + 4            // 414
const LOG_LINE_H = 14
const LOG_LINES = 3
const LOG_STRIP_H = LOG_LINES * LOG_LINE_H + 10  // ~52
const LOG_BOTTOM = LOG_TOP + LOG_STRIP_H  // ~466

// Room selection panel
const PANEL_TOP = LOG_BOTTOM + 6          // ~472
const PANEL_CORNER = 8
const PANEL_HEADER_H = 28
const PANEL_SIDE_MARGIN = 12
const PANEL_GAP = 8
const CARD_W = 116
const CARD_H = 163
const CARD_TILE_SIZE = 88
const CARD_BORDER = 2.5

// Viewport dimensions
const VIEWPORT_COLS = 5
const VIEWPORT_ROWS = 5

// Nav arrow
const ARROW_HALF = 13

interface HitRect {
  x: number; y: number; w: number; h: number; id: string
}

const ALL_DIRS: ExitMask[] = [N, E, S, W]

function cardColors(roomType: import('../map/types').RoomType): {
  border: string; bg: string; text: string
} {
  switch (roomType) {
    case 'enemy':    return { border: colors.cardBorderEnemy,    bg: colors.cardBgEnemy,    text: colors.cardTextEnemy }
    case 'boss':     return { border: colors.cardBorderBoss,     bg: colors.cardBgBoss,     text: colors.cardTextBoss }
    case 'shop':     return { border: colors.cardBorderShop,     bg: colors.cardBgShop,     text: colors.cardTextShop }
    case 'npc':      return { border: colors.cardBorderNpc,      bg: colors.cardBgNpc,      text: colors.cardTextNpc }
    case 'item':     return { border: colors.cardBorderItem,     bg: colors.cardBgItem,     text: colors.cardTextItem }
    case 'chest':    return { border: colors.cardBorderChest,    bg: colors.cardBgChest,    text: colors.cardTextChest }
    default:         return { border: colors.cardBorderCorridor, bg: colors.cardBgCorridor, text: colors.cardTextCorridor }
  }
}

// Viewport tile pixel position for a grid cell (in viewport coords)
function vpPixel(
  pipCol: number, pipRow: number,
  cellCol: number, cellRow: number,
): { px: number; py: number } {
  const startCol = pipCol - Math.floor(VIEWPORT_COLS / 2)
  const startRow = pipRow - Math.floor(VIEWPORT_ROWS / 2)
  const vc = cellCol - startCol
  const vr = cellRow - startRow
  return {
    px: MAP_X + vc * TILE_SIZE,
    py: MAP_Y + vr * TILE_SIZE,
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
    const { px, py } = vpPixel(state.pip.col, state.pip.row, nc, nr)
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

function drawStatusBar(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  isMouseDevice: boolean,
  hoveredElement: string | null,
): void {
  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = isMouseDevice && hoveredElement === 'back' ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('← Quit Run', BACK_LINK_X, BACK_LINK_Y + BACK_LINK_H / 2)

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

function drawLogStrip(ctx: CanvasRenderingContext2D, state: DungeonState): void {
  const opacities = [1.0, 0.7, 0.45]
  const logColorMap: Record<string, string> = {
    system: colors.logSystem,
    enemy: colors.logEnemy,
    boss: colors.logBoss,
    shop: colors.logShop,
    npc: colors.logNpc,
    item: colors.logItem,
    chest: colors.logChest,
    normal: colors.logNormal,
  }

  ctx.font = '11px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const maxEntries = Math.min(LOG_LINES, state.log.length)
  for (let i = 0; i < maxEntries; i++) {
    const entry = state.log[i]
    ctx.globalAlpha = opacities[i]
    ctx.fillStyle = logColorMap[entry.style] ?? colors.logNormal
    ctx.fillText(entry.message, 16, LOG_TOP + 5 + i * LOG_LINE_H)
  }
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

  // Room type title
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = col.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(offering.roomType.toUpperCase(), x + CARD_W / 2, y + 7)

  // Separator
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, y + 21)
  ctx.lineTo(x + CARD_W - 6, y + 21)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Tile preview centred
  const tileY = y + 24
  const tileX = x + (CARD_W - CARD_TILE_SIZE) / 2
  drawSingleTile(ctx, { roomType: offering.roomType, exits: offering.exits }, tileX, tileY, CARD_TILE_SIZE, DUNGEON)

  // Bottom separator
  const sepY = y + 24 + CARD_TILE_SIZE + 4
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, sepY)
  ctx.lineTo(x + CARD_W - 6, sepY)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Flavour tease
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
  const panelH = LOGICAL_H - PANEL_TOP

  // Panel background
  ctx.fillStyle = colors.surface
  ctx.beginPath()
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number[]) => void
  }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(0, PANEL_TOP, LOGICAL_W, panelH, [PANEL_CORNER, PANEL_CORNER, 0, 0])
  } else {
    ctx.rect(0, PANEL_TOP, LOGICAL_W, panelH)
  }
  ctx.fill()

  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, PANEL_TOP)
  ctx.lineTo(LOGICAL_W, PANEL_TOP)
  ctx.stroke()

  // Panel header
  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('WHERE DOES THIS LEAD?', LOGICAL_W / 2, PANEL_TOP + PANEL_HEADER_H / 2)

  // Cards — 12 px margins as specced, 8 px gaps
  const cardsStartX = PANEL_SIDE_MARGIN
  const cardsY = PANEL_TOP + PANEL_HEADER_H

  for (let i = 0; i < 3; i++) {
    const cx = cardsStartX + i * (CARD_W + PANEL_GAP)
    const isHovered = hoveredElement === `card-${i}`
    drawCard(ctx, state.offerings[i], teases[i], cx, cardsY, isHovered)
    hitRects.push({ x: cx, y: cardsY, w: CARD_W, h: CARD_H, id: `card-${i}` })
  }
}

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let state: DungeonState = initDungeon()
  let hoveredElement: string | null = null
  let isMouseDevice = false
  let cardTeases: string[] = []
  let hitRects: HitRect[] = []
  let dicePool: DicePool = starterPool()

  const dicePanel = createDicePanel(
    () => dicePool,
    {
      onStateChange: (pool) => { dicePool = pool },
      addLog: (message) => {
        state = { ...state, log: [{ message, style: 'normal' }, ...state.log] }
      },
    },
  )

  function getCardTeases(offerings: RoomOffering[]): string[] {
    return offerings.map(o => {
      const teaseList = CARD_TEASES[o.roomType]
      return teaseList ? pickRandom(teaseList) : ''
    })
  }

  function isInBackLink(x: number, y: number): boolean {
    return (
      x >= BACK_LINK_X &&
      x <= BACK_LINK_X + BACK_LINK_W &&
      y >= BACK_LINK_Y &&
      y <= BACK_LINK_Y + BACK_LINK_H
    )
  }

  function hitTest(x: number, y: number): string | null {
    for (const rect of hitRects) {
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return rect.id
      }
    }
    return null
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    hitRects = []

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    drawMap(ctx, state.grid, state.fog, state.pip, DUNGEON)

    if (state.uiState === 'idle') {
      drawNavArrows(ctx, state, hitRects)
    }

    drawStatusBar(ctx, state, isMouseDevice, hoveredElement)
    drawLogStrip(ctx, state)

    if (state.uiState === 'idle') {
      dicePanel.draw(ctx, _timestamp)
    } else if (state.uiState === 'choosing') {
      drawRoomPanel(ctx, state, cardTeases, hoveredElement, hitRects)
    }
  }

  function handleClick(x: number, y: number): void {
    if (isInBackLink(x, y)) {
      transitionTo('home')
      return
    }

    if (state.uiState === 'choosing') {
      const hit = hitTest(x, y)
      if (hit?.startsWith('card-')) {
        const idx = parseInt(hit.split('-')[1])
        const offering = state.offerings[idx]
        const { dc, dr } = DIR_DELTA[state.pendingDir!]
        const targetPos = { col: state.pip.col + dc, row: state.pip.row + dr }
        state = placeRoom(state, offering, targetPos)
        cardTeases = []
      }
      return
    }

    // IDLE state: dice panel handles panel zone clicks first
    if (state.uiState === 'idle' && y >= DICE_PANEL_TOP) {
      dicePanel.handleClick(x, y)
      return
    }

    // IDLE state: check nav arrows or backtrack
    if (state.uiState === 'idle') {
      const startCol = state.pip.col - Math.floor(VIEWPORT_COLS / 2)
      const startRow = state.pip.row - Math.floor(VIEWPORT_ROWS / 2)

      const vc = Math.floor((x - MAP_X) / TILE_SIZE)
      const vr = Math.floor((y - MAP_Y) / TILE_SIZE)

      if (vc < 0 || vc >= VIEWPORT_COLS || vr < 0 || vr >= VIEWPORT_ROWS) return

      const nc = startCol + vc
      const nr = startRow + vr

      if (nc < 0 || nc >= state.grid.width || nr < 0 || nr >= state.grid.height) return

      const dir = dirFromPipToNeighbour(state, nc, nr)
      if (dir === null) return

      const neighbour = state.grid.cells[nr][nc]

      if (neighbour === null) {
        // Check this dir has a nav arrow (exit from pip + in bounds + null)
        const pipCell = state.grid.cells[state.pip.row][state.pip.col]
        if (!pipCell || !(pipCell.exits & dir)) return

        const offerings = generateOfferings(state, { col: nc, row: nr }, OPP[dir])
        cardTeases = getCardTeases(offerings)
        state = {
          ...state,
          uiState: 'choosing',
          pendingDir: dir,
          offerings,
        }
      } else if (isBacktrackable(state, dir)) {
        state = movePip(state, dir)
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true

    if (isInBackLink(x, y)) {
      hoveredElement = 'back'
      return
    }

    if (state.uiState === 'choosing') {
      const hit = hitTest(x, y)
      hoveredElement = hit?.startsWith('card-') ? hit : null
      return
    }

    if (state.uiState === 'idle' && y >= DICE_PANEL_TOP) {
      dicePanel.handlePointerMove(x, y)
      hoveredElement = null
      return
    }

    hoveredElement = null
  }

  return { draw, handleClick, handlePointerMove }
}
