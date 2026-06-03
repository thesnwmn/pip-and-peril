import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import type { ExitMask } from '../map/types'
import { E, N, S, W } from '../map/types'
import { drawMap, drawSingleTile, MAP_X, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { DungeonState, LogStyle, RoomOffering } from '../navigation/dungeon-state'
import { chebyshev, DIR_DELTA, initDungeon, OPP } from '../navigation/dungeon-state'
import { availableDirs, dirFromPipToNeighbour, isBacktrackable, movePip } from '../navigation/movement'
import { generateOfferings, placeRoom, CARD_TEASES } from '../navigation/room-selection'
import { LOG_MESSAGES, pickRandom } from '../navigation/room-pool'
import type { ScreenController } from './main-menu'
import type { DicePool } from '../dice/pool'
import { resetPool, starterPool } from '../dice/pool'
import { createDicePanel } from '../dice/panel'
import type { CombatLogEntry } from '../dice/panel'
import type { CombatState } from '../combat/types'
import { GOBLIN } from '../combat/types'
import { applyEnemyAttack, applyEvade, applyFocus, applyStrike, rollGoldReward } from '../combat/encounter'
import { drawCombatBanner } from '../combat/panel'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'
import { createSatchelOverlay, drawSatchelButton, isInSatchelButton } from '../satchel/overlay'
import type { Inventory } from '../satchel/types'
import { COMBAT_CONFIG } from '../encounter/config'
import { easeIn, easeOut, lerp } from '../animation/easing'
import { whisperAlpha, WHISPER_TOTAL_MS } from '../log/whisper'

const LOGICAL_W = 390
const LOGICAL_H = 844

// Status bar
const STATUS_BAR_H = 50

// Map zone: 5×5 tiles at TILE_SIZE 72 = 360 px, starting at MAP_Y=50 → bottom at 50+360=410
const MAP_BOTTOM = MAP_Y + 5 * TILE_SIZE  // 410

// Room selection panel — sits 6 px below map; map fills to bottom when panel not shown
const PANEL_TOP = MAP_BOTTOM + 20         // 430
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

// Elastic canvas: encounter register constants
const ENCOUNTER_PANEL_GAP = 8  // bg strip between map tiles and combat panel top
const COMBAT_PANEL_TOP = PANEL_TOP + ENCOUNTER_PANEL_GAP  // 438; panel sits 8px below nav panel boundary
const TRANSITION_DURATION = 450  // ms
const COMBAT_MAP_CENTER_Y = MAP_Y + (COMBAT_PANEL_TOP - MAP_Y) / 2  // ~244

interface HitRect {
  x: number; y: number; w: number; h: number; id: string
}

type EncounterTransition =
  | { phase: 'rising'; startTime: number; fromPanelTop: number }
  | { phase: 'falling'; startTime: number; fallAction: 'victory' | 'defeat' }

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

// Viewport tile pixel position for a grid cell relative to camera
function vpPixel(
  cameraCol: number, cameraRow: number,
  cellCol: number, cellRow: number,
): { px: number; py: number } {
  const startCol = cameraCol - Math.floor(VIEWPORT_COLS / 2)
  const startRow = cameraRow - Math.floor(VIEWPORT_ROWS / 2)
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

function drawStatusBar(
  ctx: CanvasRenderingContext2D,
  state: DungeonState,
): void {
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

// Situated whisper: ephemeral narration overlay, anchored just below the panel separator.
// The scrim overlaps the bottom tile row; text appears in the panel-header zone.
const WHISPER_SCRIM_H = 60
const WHISPER_ANCHOR = PANEL_TOP + 36  // = 452; bottom of scrim / text reference point

function drawSituatedWhisper(
  ctx: CanvasRenderingContext2D,
  text: string,
  alpha: number,
): void {
  if (alpha <= 0) return

  const scrimTop = WHISPER_ANCHOR - WHISPER_SCRIM_H  // = 392
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


interface WhisperState {
  text: string
  startTime: number
}

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let state: DungeonState = initDungeon()
  let hoveredElement: string | null = null
  let isMouseDevice = false
  let cardTeases: string[] = []
  let hitRects: HitRect[] = []
  let dicePool: DicePool = starterPool()
  let inventory: Inventory = { gold: 0, items: [] }
  let combatLog: CombatLogEntry[] = []
  let whisper: WhisperState | null = null

  const pipMaxHp = 10
  let pipHp = pipMaxHp
  let combat: CombatState | null = null
  let bannerStartTime: number | null = null
  let transition: EncounterTransition | null = null

  // Last-computed panel top, updated every frame — used by dice panel hit detection
  let livePanelTop = PANEL_TOP

  const satchelOverlay = createSatchelOverlay()

  function resetRunState(): void {
    state = initDungeon()
    dicePool = starterPool()
    pipHp = pipMaxHp
    combat = null
    bannerStartTime = null
    transition = null
    livePanelTop = PANEL_TOP
    cardTeases = []
    hitRects = []
    inventory = { gold: 0, items: [] }
    combatLog = []
    whisper = null
    satchelOverlay.close()
  }

  const menuModal = createMenuModal('game', (screen) => {
    resetRunState()
    transitionTo(screen)
  })

  const dicePanel = createDicePanel(
    () => dicePool,
    () => livePanelTop,
    {
      onStateChange: (pool) => { dicePool = pool },
      addLog: (message) => { addLogEntry(message, 'normal') },
      getCombatLog: () => combatLog,
      getHpInfo: () => combat ? {
        pipHp,
        pipMaxHp,
        enemyHp: combat.enemy.hp,
        enemyMaxHp: combat.enemy.maxHp,
        enemyName: combat.enemy.name,
      } : null,
      onBeforeRoll: (): boolean => {
        if (combat === null) return true
        if (combat.phase === 'awaiting-roll') {
          combat = { ...combat, phase: 'player-turn' }
          return true
        }
        if (combat.phase === 'player-turn') {
          const prevHp = pipHp
          const result = applyEnemyAttack(combat, pipHp)
          pipHp = result.pipHp
          combat = result.combat
          addLogEntry(
            `Goblin strikes — −${result.damage} HP! (Pip: ${prevHp}→${pipHp})`,
            'enemy',
          )
          if (result.defeat) {
            combatLog = []
            bannerStartTime = performance.now()
            return false
          }
          return true
        }
        return false
      },
      onAction: (actionId: string): void => {
        if (combat === null) return
        if (actionId === 'strike') {
          const prevEnemyHp = combat.enemy.hp
          const result = applyStrike(combat)
          combat = result.combat
          addLogEntry(
            `Strike — 2 damage! (Goblin: ${prevEnemyHp}→${combat.enemy.hp})`,
            'enemy',
          )
          if (result.victory) {
            const goldEarned = rollGoldReward(combat.enemy)
            inventory = { ...inventory, gold: inventory.gold + goldEarned }
            combat = { ...result.combat, goldAwarded: goldEarned }
            const newCells = state.grid.cells.map(row => [...row])
            const cell = newCells[state.pip.row][state.pip.col]
            if (cell) {
              newCells[state.pip.row][state.pip.col] = { ...cell, cleared: true }
            }
            state = { ...state, grid: { ...state.grid, cells: newCells } }
            combatLog = []
            bannerStartTime = performance.now()
          }
        } else if (actionId === 'evade') {
          combat = applyEvade(combat)
          addLogEntry('Evade — incoming damage reduced.', 'normal')
        } else if (actionId === 'focus') {
          const prevPipHp = pipHp
          const focusResult = applyFocus(pipHp, pipMaxHp)
          pipHp = focusResult.pipHp
          if (focusResult.heal === 0) {
            addLogEntry(`Focus — +0 HP (Pip: ${prevPipHp}/${pipMaxHp} full)`, 'normal')
          } else {
            addLogEntry(`Focus — +${focusResult.heal} HP (Pip: ${prevPipHp}→${pipHp})`, 'normal')
          }
        }
      },
    },
  )

  function addLogEntry(message: string, _style: LogStyle): void {
    combatLog = [{ message }, ...combatLog.slice(0, 4)]
  }

  function checkCombatTrigger(): void {
    const cell = state.grid.cells[state.pip.row][state.pip.col]
    if (cell && cell.roomType === 'enemy' && cell.cleared !== true) {
      combat = { enemy: { ...GOBLIN }, phase: 'awaiting-roll', evadeBuffer: 0, goldAwarded: 0 }
      combatLog = []
      dicePool = resetPool(dicePool)
      bannerStartTime = null
      whisper = null
      transition = { phase: 'rising', startTime: performance.now(), fromPanelTop: livePanelTop }
    }
  }

  function startFallingTransition(fallAction: 'victory' | 'defeat'): void {
    transition = { phase: 'falling', startTime: performance.now(), fallAction }
    bannerStartTime = null
  }

  function triggerWhisper(roomType: import('../map/types').RoomType): void {
    const messages = LOG_MESSAGES[roomType]
    if (!messages) return
    const text = pickRandom(messages)
    if (text) whisper = { text, startTime: performance.now() }
  }

  function getCardTeases(offerings: RoomOffering[]): string[] {
    return offerings.map(o => {
      const teaseList = CARD_TEASES[o.roomType]
      return teaseList ? pickRandom(teaseList) : ''
    })
  }

  function hitTest(x: number, y: number): string | null {
    for (const rect of hitRects) {
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return rect.id
      }
    }
    return null
  }

  function computeCanvasState(timestamp: DOMHighResTimeStamp): {
    currentPanelTop: number
    currentZoom: number
    pipNatX: number
    pipNatY: number
    pipTargetY: number
  } {
    const vpCol = state.pip.col - (state.camera.col - Math.floor(VIEWPORT_COLS / 2))
    const vpRow = state.pip.row - (state.camera.row - Math.floor(VIEWPORT_ROWS / 2))
    const pipNatX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
    const pipNatY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2

    if (combat === null && transition === null) {
      const panelTop = state.uiState === 'choosing' ? PANEL_TOP : LOGICAL_H
      return { currentPanelTop: panelTop, currentZoom: 1.0, pipNatX, pipNatY, pipTargetY: pipNatY }
    }

    if (transition === null) {
      // Stable combat — panel fully risen
      return { currentPanelTop: COMBAT_PANEL_TOP, currentZoom: COMBAT_CONFIG.cameraZoom, pipNatX, pipNatY, pipTargetY: COMBAT_MAP_CENTER_Y }
    }

    const elapsed = timestamp - transition.startTime
    const t = Math.min(1, Math.max(0, elapsed / TRANSITION_DURATION))

    if (transition.phase === 'rising') {
      const easedT = easeOut(t)
      return {
        currentPanelTop: Math.round(lerp(transition.fromPanelTop, COMBAT_PANEL_TOP, easedT)),
        currentZoom: lerp(1.0, COMBAT_CONFIG.cameraZoom, easedT),
        pipNatX,
        pipNatY,
        pipTargetY: lerp(pipNatY, COMBAT_MAP_CENTER_Y, easedT),
      }
    } else {
      const easedT = easeIn(t)
      return {
        currentPanelTop: Math.round(lerp(COMBAT_PANEL_TOP, LOGICAL_H, easedT)),
        currentZoom: lerp(COMBAT_CONFIG.cameraZoom, 1.0, easedT),
        pipNatX,
        pipNatY,
        pipTargetY: lerp(COMBAT_MAP_CENTER_Y, pipNatY, easedT),
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // ── Transition completion ────────────────────────────────────────────────
    if (transition !== null) {
      const elapsed = timestamp - transition.startTime
      if (elapsed >= TRANSITION_DURATION) {
        if (transition.phase === 'rising') {
          transition = null  // combat stable
        } else {
          const { fallAction } = transition
          transition = null
          livePanelTop = PANEL_TOP
          if (fallAction === 'victory') {
            state = { ...state, enemiesDefeated: state.enemiesDefeated + 1 }
            combat = null
            dicePool = resetPool(dicePool)
            bannerStartTime = null
          } else {
            resetRunState()
            transitionTo('home')
            return
          }
        }
      }
    }

    // ── Banner auto-advance → start falling transition ──────────────────────
    if (combat !== null && bannerStartTime !== null && transition === null &&
        (combat.phase === 'victory' || combat.phase === 'defeat')) {
      const timeout = combat.phase === 'victory' ? 1500 : 2000
      if (timestamp - bannerStartTime >= timeout) {
        startFallingTransition(combat.phase)
      }
    }

    // ── Compute animated canvas state ────────────────────────────────────────
    const { currentPanelTop, currentZoom, pipNatX, pipNatY, pipTargetY } = computeCanvasState(timestamp)
    livePanelTop = currentPanelTop

    hitRects = []

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // ── Map (with zoom transform during encounter register) ──────────────────
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, MAP_Y, LOGICAL_W, LOGICAL_H - MAP_Y)
    ctx.clip()

    if (combat !== null || transition !== null) {
      // Zoom around pip's natural position, shifting it vertically toward the map area centre.
      ctx.translate(pipNatX, pipTargetY)
      ctx.scale(currentZoom, currentZoom)
      ctx.translate(-pipNatX, -pipNatY)
    }

    drawMap(ctx, state.grid, state.fog, state.camera, state.pip, DUNGEON)
    ctx.restore()

    // ── Nav arrows (nav register only, not during transition) ────────────────
    if (state.uiState === 'idle' && combat === null && transition === null) {
      drawNavArrows(ctx, state, hitRects)
    }

    // ── Status bar ───────────────────────────────────────────────────────────
    drawStatusBar(ctx, state)

    // ── Situated whisper (nav register, idle only) ───────────────────────────
    if (whisper !== null && combat === null && transition === null && state.uiState === 'idle') {
      const elapsed = timestamp - whisper.startTime
      if (elapsed >= WHISPER_TOTAL_MS) {
        whisper = null
      } else {
        drawSituatedWhisper(ctx, whisper.text, whisperAlpha(elapsed))
      }
    }

    // MENU button always visible
    drawMenuButton(ctx, !menuModal.isOpen() && isMouseDevice && hoveredElement === 'menu-btn')

    // ── Encounter register: draw satchel BEFORE panel so panel covers it ─────
    const inEncounterRegister = combat !== null || transition !== null
    if (inEncounterRegister) {
      drawSatchelButton(ctx, true, false)
    }

    // ── Panel zone ───────────────────────────────────────────────────────────
    if (inEncounterRegister) {
      // During transitions the nav panel draws first; the combat tray covers and
      // reveals it naturally as it rises/falls rather than snapping in/out.
      if (transition !== null) {
        if (state.uiState === 'choosing') {
          drawRoomPanel(ctx, state, cardTeases, hoveredElement, hitRects)
        }
      }
      if (combat !== null) {
        // Gap strip — bg colour between map and the combat panel surface
        ctx.fillStyle = colors.bg
        ctx.fillRect(0, currentPanelTop - ENCOUNTER_PANEL_GAP, LOGICAL_W, ENCOUNTER_PANEL_GAP)
        // Banner — shown during stable combat and during the falling transition
        if (combat.phase === 'victory' || combat.phase === 'defeat') {
          const bst = bannerStartTime ?? timestamp
          drawCombatBanner(ctx, timestamp, combat, bst, currentPanelTop)
        } else {
          dicePanel.draw(ctx, timestamp)
        }
      }
    } else if (state.uiState === 'choosing') {
      drawRoomPanel(ctx, state, cardTeases, hoveredElement, hitRects)
    }

    // ── Satchel button (nav register — floats on top of nav panels) ──────────
    if (!inEncounterRegister) {
      drawSatchelButton(
        ctx,
        false,
        !menuModal.isOpen() && !satchelOverlay.isOpen() && isMouseDevice && hoveredElement === 'satchel-btn',
      )
    }

    // Satchel overlay and menu modal always on top
    satchelOverlay.draw(ctx, timestamp, inventory, state)
    menuModal.draw(ctx)
  }

  function handleClick(x: number, y: number): void {
    // Modal consumes all input when open
    if (menuModal.handleClick(x, y)) return

    // Satchel overlay consumes all input when open
    if (satchelOverlay.handleClick(x, y)) return

    // Block all game input during transitions
    if (transition !== null) return

    // MENU button
    if (isInMenuButton(x, y)) {
      dicePanel.handlePointerMove(-1, -1)
      menuModal.open()
      return
    }

    // Satchel button — navigation only, not during combat or transition
    if (isInSatchelButton(x, y) && combat === null) {
      satchelOverlay.open()
      return
    }

    // Combat active
    if (combat !== null) {
      if (y >= livePanelTop) {
        if (combat.phase === 'victory') {
          startFallingTransition('victory')
        } else if (combat.phase === 'defeat') {
          startFallingTransition('defeat')
        } else {
          dicePanel.handleClick(x, y)
        }
      }
      return
    }

    // Room selection
    if (state.uiState === 'choosing') {
      const hit = hitTest(x, y)
      if (hit?.startsWith('card-')) {
        const idx = parseInt(hit.split('-')[1])
        const offering = state.offerings[idx]
        const { dc, dr } = DIR_DELTA[state.pendingDir!]
        const targetPos = { col: state.pip.col + dc, row: state.pip.row + dr }
        const chosenRoomType = offering.roomType
        state = placeRoom(state, offering, targetPos)
        state = { ...state, roomsEntered: state.roomsEntered + 1 }
        cardTeases = []
        triggerWhisper(chosenRoomType)
        checkCombatTrigger()
      }
      return
    }

    // Idle navigation
    if (state.uiState === 'idle') {
      const startCol = state.camera.col - Math.floor(VIEWPORT_COLS / 2)
      const startRow = state.camera.row - Math.floor(VIEWPORT_ROWS / 2)

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
        const pipCell = state.grid.cells[state.pip.row][state.pip.col]
        if (!pipCell || !(pipCell.exits & dir)) return

        const offerings = generateOfferings(state, { col: nc, row: nr }, OPP[dir])
        cardTeases = getCardTeases(offerings)
        whisper = null
        state = {
          ...state,
          uiState: 'choosing',
          pendingDir: dir,
          offerings,
        }
      } else if (isBacktrackable(state, dir)) {
        state = movePip(state, dir)
        state = { ...state, roomsEntered: state.roomsEntered + 1 }
        checkCombatTrigger()
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true

    // Modal blocks hover when open
    if (menuModal.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }

    // Satchel overlay consumes pointer when open
    if (satchelOverlay.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }

    if (isInMenuButton(x, y)) {
      hoveredElement = 'menu-btn'
      return
    }

    if (isInSatchelButton(x, y)) {
      hoveredElement = 'satchel-btn'
      return
    }

    // Combat active (or transitioning)
    if (combat !== null || transition !== null) {
      if (y >= livePanelTop && combat !== null &&
          combat.phase !== 'victory' && combat.phase !== 'defeat' &&
          transition === null) {
        dicePanel.handlePointerMove(x, y)
      }
      hoveredElement = null
      return
    }

    if (state.uiState === 'choosing') {
      const hit = hitTest(x, y)
      hoveredElement = hit?.startsWith('card-') ? hit : null
      return
    }

    hoveredElement = null
  }

  return { draw, handleClick, handlePointerMove }
}
