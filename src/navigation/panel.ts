import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { drawSingleTile, MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { ExitMask, RoomType } from '../map/types'
import { E, N, S, W } from '../map/types'
import type { DungeonState, RoomOffering } from './dungeon-state'
import { chebyshev, DIR_DELTA } from './dungeon-state'
import { availableDirs, exitState } from './movement'
import { whisperAlpha, WHISPER_TOTAL_MS } from '../log/whisper'
import {
  LOGICAL_W,
  LOGICAL_H,
  STATUS_BAR_H,
  PANEL_TOP,
  PANEL_CORNER,
  PANEL_HEADER_H,
  PANEL_SIDE_MARGIN,
  PANEL_GAP,
  CARD_W,
  CARD_H,
  CARD_TILE_SIZE,
  CARD_BORDER,
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

// Direction button geometry
const BTN_W = 64
const BTN_H = 64
const BTN_STEP = 72   // center-to-center distance between adjacent buttons
const BTN_RADIUS = 8
const PANEL_CENTER_X = LOGICAL_W / 2
const PANEL_CENTER_Y = PANEL_TOP + (LOGICAL_H - PANEL_TOP) / 2  // 637

// Whisper text position: near the top of the panel zone
const PANEL_WHISPER_Y = PANEL_TOP + 20

// Cross-fade duration between panel modes
const MODE_FADE_MS = 150

// Direction button fill/stroke/label colours per exit state
const DIR_BTN = {
  none: { fill: 'rgba(58,58,80,0.17)',   stroke: '#3a3a50', label: '#3a3a50' },
  fog:  { fill: 'rgba(200,148,30,0.17)', stroke: '#c8941e', label: '#c8941e' },
  back: { fill: 'rgba(122,80,16,0.17)',  stroke: '#7a5010', label: '#7a5010' },
} as const

// Direction button layout spec (static positions, computed once)
type DirSpec = { dir: ExitMask; label: string; cx: number; cy: number }
const DIR_SPECS: DirSpec[] = [
  { dir: N, label: '↑', cx: PANEL_CENTER_X,             cy: PANEL_CENTER_Y - BTN_STEP },
  { dir: S, label: '↓', cx: PANEL_CENTER_X,             cy: PANEL_CENTER_Y + BTN_STEP },
  { dir: W, label: '←', cx: PANEL_CENTER_X - BTN_STEP,  cy: PANEL_CENTER_Y },
  { dir: E, label: '→', cx: PANEL_CENTER_X + BTN_STEP,  cy: PANEL_CENTER_Y },
]


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

// Draws low-contrast "?" glyphs on the map zone for fog exits only.
// Replaces the old directional arrows.
function drawFogMarkers(ctx: CanvasRenderingContext2D, state: DungeonState): void {
  const fogDirs = availableDirs(state)
  for (const dir of fogDirs) {
    const { dc, dr } = DIR_DELTA[dir]
    const nc = state.pip.col + dc
    const nr = state.pip.row + dr
    const { px, py } = vpPixel(state.camera.col, state.camera.row, nc, nr)
    const cx = px + TILE_SIZE / 2
    const cy = py + TILE_SIZE / 2

    ctx.save()
    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = colors.navFogMark
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', cx, cy)
    ctx.restore()
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

// Panel zone surface background and separator line — always drawn.
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

// IDLE mode panel content — cross of four directional buttons.
function drawDirectionCross(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  hitRects: HitRect[],
): void {
  for (const { dir, label, cx, cy } of DIR_SPECS) {
    const ds = exitState(state, dir)
    drawDirButton(ctx, cx, cy, label, ds)
    if (ds === 'fog' || ds === 'back') {
      hitRects.push({ x: cx - BTN_W / 2, y: cy - BTN_H / 2, w: BTN_W, h: BTN_H, id: `dir-${dir}-${ds}` })
    }
  }
}

// WHISPER mode panel content — italic text near top of panel zone.
function drawPanelWhisper(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.save()
  ctx.font = 'italic 13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(text, LOGICAL_W / 2, PANEL_WHISPER_Y)
  ctx.restore()
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
  const parentAlpha = ctx.globalAlpha

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

  ctx.globalAlpha = parentAlpha * 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, y + 21)
  ctx.lineTo(x + CARD_W - 6, y + 21)
  ctx.stroke()
  ctx.globalAlpha = parentAlpha

  const tileY = y + 24
  const tileX = x + (CARD_W - CARD_TILE_SIZE) / 2
  drawSingleTile(ctx, { roomType: offering.roomType, exits: offering.exits }, tileX, tileY, CARD_TILE_SIZE, DUNGEON)

  const sepY = y + 24 + CARD_TILE_SIZE + 4
  ctx.globalAlpha = parentAlpha * 0.4
  ctx.strokeStyle = col.text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, sepY)
  ctx.lineTo(x + CARD_W - 6, sepY)
  ctx.stroke()
  ctx.globalAlpha = parentAlpha

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

// CHOOSING mode panel content — room selection cards, vertically centred.
function drawRoomPanel(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
  teases: string[],
  hoveredElement: string | null,
  hitRects: HitRect[],
): void {
  // Offerings may be cleared during a cross-fade out (placeRoom empties them);
  // bail early so we don't crash trying to access undefined offering slots.
  if (state.offerings.length < 3) return

  // Centre the cards block (header + cards) vertically within the panel zone
  const cardsY = Math.round(PANEL_CENTER_Y - CARD_H / 2)
  const headerCenterY = cardsY - PANEL_HEADER_H / 2 - 4

  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('WHERE DOES THIS LEAD?', MAP_X + MAP_W / 2, headerCenterY)

  const cardsStartX = MAP_X + PANEL_SIDE_MARGIN

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
    onDirButton: (dir: ExitMask, dirState: 'fog' | 'back') => void
    onWhisperEnd: () => void
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

  // Cross-fade state between panel modes
  let panelMode: DungeonState['uiState'] = 'idle'
  let prevPanelMode: DungeonState['uiState'] | null = null
  let modeChangeTime: number | null = null

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    const state = getDungeonState()
    const inEncounterRegister = getInEncounterRegister()

    hitRects = []

    // Detect mode change and start cross-fade
    const uiState = state.uiState
    if (uiState !== panelMode) {
      prevPanelMode = panelMode
      panelMode = uiState
      modeChangeTime = timestamp
    }

    let inAlpha = 1
    let outAlpha = 0
    if (prevPanelMode !== null && modeChangeTime !== null) {
      const t = Math.min(1, (timestamp - modeChangeTime) / MODE_FADE_MS)
      inAlpha = t
      outAlpha = 1 - t
      if (t >= 1) { prevPanelMode = null; modeChangeTime = null }
    }

    drawStatusBar(ctx, state)
    drawPanelBackground(ctx)

    // Fog markers are map-zone decorations; skip during encounter (map may be zoomed/panned)
    if (!inEncounterRegister) {
      drawFogMarkers(ctx, state)
    }

    // Whisper expiry: fire callback when animation ends (not while encounter covers the panel).
    // No early return — draw() continues so the mode-change detection below starts the cross-fade
    // on this same frame rather than leaving a blank-panel frame.
    if (panelMode === 'whisper' && whisper !== null && !inEncounterRegister) {
      const elapsed = timestamp - whisper.startTime
      if (elapsed >= WHISPER_TOTAL_MS) {
        whisper = null
        callbacks.onWhisperEnd()
      }
    }

    // Helper: render one mode's content at a given composite alpha
    const renderMode = (mode: DungeonState['uiState'], alpha: number, registerHits: boolean): void => {
      if (alpha <= 0) return

      if (mode === 'idle' && !inEncounterRegister) {
        ctx.save()
        ctx.globalAlpha = alpha
        drawDirectionCross(ctx, state, registerHits ? hitRects : [])
        ctx.restore()
      } else if (mode === 'choosing' && !inEncounterRegister) {
        ctx.save()
        ctx.globalAlpha = alpha
        drawRoomPanel(ctx, state, cardTeases, hoveredElement, registerHits ? hitRects : [])
        ctx.restore()
      } else if (mode === 'whisper' && whisper !== null) {
        const elapsed = timestamp - whisper.startTime
        const wAlpha = whisperAlpha(elapsed)
        if (wAlpha > 0) {
          ctx.save()
          ctx.globalAlpha = alpha * wAlpha
          drawPanelWhisper(ctx, whisper.text)
          ctx.restore()
        }
      }
    }

    // Outgoing mode fades out; incoming mode fades in
    if (prevPanelMode !== null) renderMode(prevPanelMode, outAlpha, false)
    renderMode(panelMode, inAlpha, true)
  }

  function handleClick(x: number, y: number): boolean {
    const hit = hitTest(x, y, hitRects)

    if (hit?.startsWith('dir-')) {
      const parts = hit.split('-')
      const dir = parseInt(parts[1]) as ExitMask
      const ds = parts[2] as 'fog' | 'back'
      callbacks.onDirButton(dir, ds)
      return true
    }

    if (hit?.startsWith('card-')) {
      if (getDungeonState().uiState !== 'choosing') return false
      const idx = parseInt(hit.split('-')[1])
      callbacks.onCardChosen(idx)
      return true
    }

    return false
  }

  function handlePointerMove(x: number, y: number): boolean {
    const hit = hitTest(x, y, hitRects)
    hoveredElement = hit?.startsWith('card-') ? hit : null
    return hoveredElement !== null
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
