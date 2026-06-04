import { colors } from '../colors'
import type { DicePool, DieColor, PipCost } from './pool'
import { canAfford, rollPool, spendPips } from './pool'
import { iconGlyph } from '../satchel/icon'

// ── Layout constants ─────────────────────────────────────────────────────────

// Panel occupies the map tile zone: MAP_X (10) to MAP_X + MAP_W (370), width 360 px.
// Must match MAP_X and MAP_W (VIEWPORT_COLS × TILE_SIZE) in src/map/renderer.ts.
const MAP_X = 10
const MAP_W = 360
const LOGICAL_H = 844

// PANEL_TOP must match game.ts (MAP_BOTTOM + 20 = 430)
export const PANEL_TOP = 430
const PANEL_CORNER = 8
const SIDE_MARGIN = 16

// HP bars — two side-by-side columns within the 360 px panel
const HP_BAR_H = 8
const HP_BAR_EMPTY = '#2a2a3a'
const ENEMY_RED = colors.logEnemy
const HP_COL_GAP = 8
const HP_COL_W = (MAP_W - SIDE_MARGIN * 2 - HP_COL_GAP) / 2  // = 160
const HP_COL1_X = MAP_X + SIDE_MARGIN                          // = 26
const HP_COL2_X = HP_COL1_X + HP_COL_W + HP_COL_GAP           // = 194
const HP_LABEL_Y = PANEL_TOP + 10                                  // = 426, top of name/total text
const HP_BAR_Y = HP_LABEL_Y + 14                                   // = 440, top of bar
const HP_SECTION_BOTTOM = HP_BAR_Y + HP_BAR_H + 12                // = 460

// Die faces (no heading label)
const DIE_SIZE = 68
const DIE_GAP = 10
const DIE_RADIUS = 12
const DIE_ROW_Y = HP_SECTION_BOTTOM + 8   // = 468
const PIP_DOT_R = 4.5                     // pip circle radius

// Colour label row
const LABEL_Y = DIE_ROW_Y + DIE_SIZE + 6  // = 542

// Badge row
const BADGE_Y = LABEL_Y + 16              // = 558
const BADGE_H = 26
const BADGE_PAD_X = 8

// ROLL button
const ROLL_BTN_Y = BADGE_Y + BADGE_H + 10  // = 594
const ROLL_BTN_H = 44
const ROLL_BTN_X = MAP_X + SIDE_MARGIN      // = 26
const ROLL_BTN_W = MAP_W - SIDE_MARGIN * 2  // = 328

// Action buttons (4-column grid, 1 row)
const ACTION_Y = ROLL_BTN_Y + ROLL_BTN_H + 10  // = 648
const ACTION_BTN_H = 46
const ACTION_GAP = 8
const ACTION_BTN_W = (MAP_W - SIDE_MARGIN * 2 - ACTION_GAP * 3) / 4  // = 79
const ACTION_BTN_RADIUS = 8

// Encounter log zone — below action buttons
const ACTION_ROWS = 1
const ACTIONS_BOTTOM = ACTION_Y + ACTION_ROWS * ACTION_BTN_H
const LOG_RULE_Y = ACTIONS_BOTTOM + 6
const LOG_LINE_H = 14
const LOG_LINE1_Y = LOG_RULE_Y + 5

// Item row — inline item selector that appears below action buttons
const ITEM_ROW_Y = ACTION_Y + ACTION_BTN_H + 8  // = 702
const ITEM_ROW_H = ACTION_BTN_H                   // = 46, same grid height

// ── Pip dot patterns for d6 ───────────────────────────────────────────────────

// 3×3 grid: indices 0–8, left→right top→bottom
const PIP_SLOTS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// ── Die colour palette helpers ────────────────────────────────────────────────

const DIE_FACE_BG: Record<DieColor, string> = {
  red: colors.dieFaceRed,
  blue: colors.dieFaceBlue,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
}

const BADGE_BG: Record<DieColor, string> = {
  red: colors.pipBadgeRedBg,
  blue: colors.pipBadgeBlueBg,
  green: colors.pipBadgeGreenBg,
  yellow: colors.pipBadgeYellowBg,
}

const BADGE_TEXT: Record<DieColor, string> = {
  red: colors.pipBadgeRedText,
  blue: colors.pipBadgeBlueText,
  green: colors.pipBadgeGreenText,
  yellow: colors.pipBadgeYellowText,
}

const BADGE_BORDER: Record<DieColor, string> = {
  red: '#5a1a1a',
  blue: '#1a2060',
  green: '#1a4a1a',
  yellow: '#4a3800',
}

const COLOR_LABEL: Record<DieColor, string> = {
  red: 'RED',
  blue: 'BLUE',
  green: 'GREEN',
  yellow: 'YELLOW',
}

const COLOR_EMOJI: Record<DieColor, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
}

// ── Action definitions ────────────────────────────────────────────────────────

interface ActionDef {
  id: string
  label: string
  cost: PipCost
}

const ACTIONS: ActionDef[] = [
  { id: 'strike', label: 'Strike', cost: { red: 2 } },
  { id: 'evade',  label: 'Evade',  cost: { green: 2 } },
  { id: 'focus',  label: 'Focus',  cost: { blue: 1 } },
  { id: 'item',   label: 'ITEM',   cost: {} },
]

// ── Utilities ─────────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const ctxAny = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
  ctx.beginPath()
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

function dieCentres(diceCount: number): number[] {
  const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
  const startX = MAP_X + (MAP_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawDieFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  color: DieColor,
  sides: number,
  value: number | null,    // null = blank (idle)
  scrambleValue: number | null,
): void {
  const bg = DIE_FACE_BG[color]
  roundRect(ctx, x, DIE_ROW_Y, DIE_SIZE, DIE_SIZE, DIE_RADIUS)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  const displayValue = scrambleValue ?? value
  if (displayValue === null) return

  ctx.fillStyle = 'rgba(255,255,255,0.88)'

  if (sides > 6) {
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(displayValue), x + DIE_SIZE / 2, DIE_ROW_Y + DIE_SIZE / 2)
    return
  }

  const slots = PIP_SLOTS[displayValue] ?? []
  const cellW = DIE_SIZE / 3
  for (const slot of slots) {
    const col = slot % 3
    const row = Math.floor(slot / 3)
    const cx = x + col * cellW + cellW / 2
    const cy = DIE_ROW_Y + row * cellW + cellW / 2
    ctx.beginPath()
    ctx.arc(cx, cy, PIP_DOT_R, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  color: DieColor,
  total: number | null,   // null = not yet rolled (show —)
  cx: number,
): void {
  const label = total === null ? '—' : String(total)
  const emoji = COLOR_EMOJI[color]
  ctx.font = 'bold 14px monospace'
  const numW = ctx.measureText(label).width
  ctx.font = '12px monospace'
  const emojiW = ctx.measureText(emoji).width
  const innerW = emojiW + 4 + numW
  const badgeW = innerW + BADGE_PAD_X * 2
  const bx = cx - badgeW / 2
  const by = BADGE_Y

  roundRect(ctx, bx, by, badgeW, BADGE_H, 6)
  ctx.fillStyle = BADGE_BG[color]
  ctx.fill()
  ctx.strokeStyle = BADGE_BORDER[color]
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const midY = by + BADGE_H / 2
  ctx.font = '12px monospace'
  ctx.fillStyle = BADGE_TEXT[color]
  ctx.fillText(emoji, bx + BADGE_PAD_X, midY)
  ctx.font = 'bold 14px monospace'
  ctx.fillText(label, bx + BADGE_PAD_X + emojiW + 4, midY)
}

function drawRollButton(
  ctx: CanvasRenderingContext2D,
  disabled: boolean,
  hovered: boolean,
): void {
  ctx.globalAlpha = disabled ? 0.4 : 1
  roundRect(ctx, ROLL_BTN_X, ROLL_BTN_Y, ROLL_BTN_W, ROLL_BTN_H, 8)
  ctx.fillStyle = hovered && !disabled ? colors.surfaceRaised : colors.surface
  ctx.fill()
  ctx.strokeStyle = colors.gold
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.gold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ROLL DICE', MAP_X + MAP_W / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)
  ctx.globalAlpha = 1
}

function drawCostPill(
  ctx: CanvasRenderingContext2D,
  cost: PipCost,
  cx: number,
  y: number,
): void {
  const entries = Object.entries(cost) as [DieColor, number][]
  const pillParts = entries.map(([c, n]) => `${n}${COLOR_EMOJI[c]}`)
  const label = pillParts.join(' ')

  ctx.font = 'bold 11px monospace'
  const textW = ctx.measureText(label).width
  const pw = textW + 12
  const ph = 18
  const px = cx - pw / 2
  const py = y

  // Use the first colour for the pill tint
  const pillColor = entries[0][0]
  roundRect(ctx, px, py, pw, ph, 4)
  ctx.fillStyle = BADGE_BG[pillColor]
  ctx.fill()
  ctx.strokeStyle = BADGE_BORDER[pillColor]
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = BADGE_TEXT[pillColor]
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, py + ph / 2)
}

function drawActionButton(
  ctx: CanvasRenderingContext2D,
  action: ActionDef,
  x: number,
  y: number,
  affordable: boolean,
  hovered: boolean,
  flashing: boolean,
): void {
  ctx.globalAlpha = affordable ? 1 : 0.4
  roundRect(ctx, x, y, ACTION_BTN_W, ACTION_BTN_H, ACTION_BTN_RADIUS)
  ctx.fillStyle = hovered && affordable ? colors.surfaceRaised : colors.surface
  ctx.fill()
  ctx.strokeStyle = flashing ? '#ff3030' : colors.logNormal
  ctx.lineWidth = flashing ? 2 : 1
  ctx.stroke()

  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (action.id !== 'item') {
    const LABEL_H = 14, PILL_GAP = 3, PILL_H = 18
    const totalH = LABEL_H + PILL_GAP + PILL_H
    const top = y + (ACTION_BTN_H - totalH) / 2
    ctx.fillText(action.label, x + ACTION_BTN_W / 2, top + LABEL_H / 2)
    drawCostPill(ctx, action.cost, x + ACTION_BTN_W / 2, top + LABEL_H + PILL_GAP)
  } else {
    ctx.fillText(action.label, x + ACTION_BTN_W / 2, y + ACTION_BTN_H / 2)
  }
  ctx.globalAlpha = 1
}

// ── HP bars ───────────────────────────────────────────────────────────────────

function drawHpBars(ctx: CanvasRenderingContext2D, info: HpInfo): void {
  ctx.textBaseline = 'top'

  // PIP column (left half)
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.fillText('PIP', HP_COL1_X, HP_LABEL_Y)

  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  ctx.fillText(`${info.pipHp}/${info.pipMaxHp}`, HP_COL1_X + HP_COL_W, HP_LABEL_Y)

  ctx.fillStyle = HP_BAR_EMPTY
  ctx.fillRect(HP_COL1_X, HP_BAR_Y, HP_COL_W, HP_BAR_H)
  ctx.fillStyle = colors.gold
  ctx.fillRect(HP_COL1_X, HP_BAR_Y, Math.max(0, info.pipHp / info.pipMaxHp) * HP_COL_W, HP_BAR_H)

  // Enemy column (right half)
  const enemyName = info.enemyName.toUpperCase()
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = ENEMY_RED
  ctx.textAlign = 'left'
  ctx.fillText(enemyName, HP_COL2_X, HP_LABEL_Y)

  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  ctx.fillText(`${info.enemyHp}/${info.enemyMaxHp}`, HP_COL2_X + HP_COL_W, HP_LABEL_Y)

  ctx.fillStyle = HP_BAR_EMPTY
  ctx.fillRect(HP_COL2_X, HP_BAR_Y, HP_COL_W, HP_BAR_H)
  ctx.fillStyle = ENEMY_RED
  ctx.fillRect(HP_COL2_X, HP_BAR_Y, Math.max(0, info.enemyHp / info.enemyMaxHp) * HP_COL_W, HP_BAR_H)
}

// ── Encounter log zone ────────────────────────────────────────────────────────

const LOG_OPACITIES = [1.00, 0.70, 0.50, 0.30, 0.15]

function drawEncounterLogZone(
  ctx: CanvasRenderingContext2D,
  entries: CombatLogEntry[],
): void {
  // Hairline rule always visible (separates HP bars from log/dice area)
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X + SIDE_MARGIN, LOG_RULE_Y)
  ctx.lineTo(MAP_X + MAP_W - SIDE_MARGIN, LOG_RULE_Y)
  ctx.stroke()
  ctx.globalAlpha = 1

  if (entries.length === 0) return

  ctx.font = '11px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  for (let i = 0; i < entries.length; i++) {
    ctx.globalAlpha = LOG_OPACITIES[i] ?? 1
    ctx.fillStyle = colors.textPrimary
    ctx.fillText(entries[i].message, MAP_X + SIDE_MARGIN, LOG_LINE1_Y + i * LOG_LINE_H)
  }
  ctx.globalAlpha = 1
}

// ── Item row ─────────────────────────────────────────────────────────────────

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

function drawItemRow(
  ctx: CanvasRenderingContext2D,
  inventory: any,
  rowY: number,
  hoveredIndex: number | null,
): void {
  const combatItems = inventory.items.filter((i: any) => i.usableInCombat)
  if (combatItems.length === 0) return

  const ITEMS_PER_ROW = 4
  const rows = Math.ceil(combatItems.length / ITEMS_PER_ROW)

  for (let row = 0; row < rows; row++) {
    const y = rowY + row * (ITEM_ROW_H + ACTION_GAP)
    for (let col = 0; col < ITEMS_PER_ROW; col++) {
      const idx = row * ITEMS_PER_ROW + col
      if (idx >= combatItems.length) break
      const item = combatItems[idx]
      const x = MAP_X + SIDE_MARGIN + col * (ACTION_BTN_W + ACTION_GAP)
      const hovered = idx === hoveredIndex

      roundRect(ctx, x, y, ACTION_BTN_W, ITEM_ROW_H, ACTION_BTN_RADIUS)
      ctx.fillStyle = hovered ? colors.surfaceRaised : colors.surface
      ctx.fill()
      ctx.strokeStyle = colors.gold
      ctx.lineWidth = 1
      ctx.stroke()

      // Icon glyph
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(iconGlyph(item.iconType), x + ACTION_BTN_W / 2, y + ITEM_ROW_H / 2 - 7)

      // Item name (truncated to fit button width)
      ctx.font = '8px system-ui, -apple-system, sans-serif'
      const name = truncateText(ctx, item.name, ACTION_BTN_W - 6)
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, x + ACTION_BTN_W / 2, y + ITEM_ROW_H - 9)

      // Quantity badge (top-right corner)
      ctx.font = 'bold 8px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(`×${item.quantity}`, x + ACTION_BTN_W - 3, y + 2)
    }
  }
}

// ── Hit rect type ─────────────────────────────────────────────────────────────

interface HitRect {
  x: number; y: number; w: number; h: number; id: string
}

// ── Panel state ───────────────────────────────────────────────────────────────

interface AnimState {
  startTime: number | null
  lastTickTime: number
  scramble: number[]   // one random value per die (shown during scramble)
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CombatLogEntry {
  message: string
}

export interface HpInfo {
  pipHp: number
  pipMaxHp: number
  enemyHp: number
  enemyMaxHp: number
  enemyName: string
}

export interface DicePanelCallbacks {
  onStateChange: (pool: DicePool) => void
  addLog: (message: string) => void
  onAction?: (actionId: string) => void
  onItem?: (item: any) => void
  onBeforeRoll?: () => boolean
  getCombatLog?: () => CombatLogEntry[]
  getHpInfo?: () => HpInfo | null
  getInventory?: () => any
  getItemUsedThisTurn?: () => boolean
}

export function createDicePanel(
  getPool: () => DicePool,
  getPanelTop: () => number,
  callbacks: DicePanelCallbacks,
): {
  draw: (ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp) => void
  handleClick: (x: number, y: number) => void
  handlePointerMove: (x: number, y: number) => void
  startRollAnimation: () => void
} {
  let hoveredElement: string | null = null
  let flashingAction: string | null = null
  let flashEndTime: number | null = null
  let showItemPicker = false
  let itemPickerHovered: number | null = null
  const anim: AnimState = { startTime: null, lastTickTime: 0, scramble: [] }

  function yOffset(): number { return getPanelTop() - PANEL_TOP }

  function actionButtonPos(i: number): { x: number; y: number } {
    const col = i % 4
    return {
      x: MAP_X + SIDE_MARGIN + col * (ACTION_BTN_W + ACTION_GAP),
      y: ACTION_Y,
    }
  }

  function buildHitRects(pool: DicePool): HitRect[] {
    const rects: HitRect[] = []
    const off = yOffset()

    if (pool.state !== 'rolling') {
      rects.push({ x: ROLL_BTN_X, y: ROLL_BTN_Y + off, w: ROLL_BTN_W, h: ROLL_BTN_H, id: 'roll' })
    }

    if (pool.state === 'rolled') {
      for (let i = 0; i < ACTIONS.length; i++) {
        const { x, y } = actionButtonPos(i)
        rects.push({ x, y: y + off, w: ACTION_BTN_W, h: ACTION_BTN_H, id: `action-${ACTIONS[i].id}` })
      }
    }

    return rects
  }

  function hitTest(x: number, y: number, pool: DicePool): string | null {
    for (const r of buildHitRects(pool)) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id
    }
    return null
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    let pool = getPool()

    // Tick animation
    if (pool.state === 'rolling' && anim.startTime !== null) {
      const elapsed = timestamp - anim.startTime

      if (elapsed >= 500) {
        // Animation done — transition to 'rolled' and draw the final state this frame
        anim.startTime = null
        pool = { ...pool, state: 'rolled' }
        callbacks.onStateChange(pool)
      } else if (timestamp - anim.lastTickTime >= 50) {
        // Scramble tick every ~50 ms
        anim.lastTickTime = timestamp
        anim.scramble = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
      }
    }

    // Clear flash when expired
    if (flashEndTime !== null && timestamp > flashEndTime) {
      flashingAction = null
      flashEndTime = null
    }

    // Translate so panel content renders at the animated panel position
    const off = yOffset()
    ctx.save()
    ctx.translate(0, off)

    // Panel background — extend height to cover screen bottom regardless of offset
    const extraH = Math.max(0, -off)
    const panelH = LOGICAL_H - PANEL_TOP + extraH
    roundRect(ctx, MAP_X, PANEL_TOP, MAP_W, panelH, PANEL_CORNER)
    ctx.fillStyle = colors.surface
    ctx.fill()
    ctx.strokeStyle = colors.logNormal
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MAP_X, PANEL_TOP)
    ctx.lineTo(MAP_X + MAP_W, PANEL_TOP)
    ctx.stroke()

    // HP bars
    if (callbacks.getHpInfo) {
      const hpInfo = callbacks.getHpInfo()
      if (hpInfo) drawHpBars(ctx, hpInfo)
    }

    // Die faces
    const centres = dieCentres(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      const roll = pool.rolls[i] ?? null
      const scramble = pool.state === 'rolling' && anim.scramble[i] != null
        ? anim.scramble[i]
        : null
      drawDieFace(ctx, centres[i], die.color, die.sides, roll?.value ?? null, scramble)
    }

    // Colour labels
    ctx.font = '10px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i < pool.dice.length; i++) {
      ctx.fillText(COLOR_LABEL[pool.dice[i].color], centres[i] + DIE_SIZE / 2, LABEL_Y)
    }

    // Pip badges
    for (let i = 0; i < pool.dice.length; i++) {
      const color = pool.dice[i].color
      const total = pool.state === 'idle' ? null : pool.totals[color]
      drawBadge(ctx, color, total, centres[i] + DIE_SIZE / 2)
    }

    // ROLL button
    const rollDisabled = pool.state === 'rolling'
    drawRollButton(ctx, rollDisabled, hoveredElement === 'roll')

    // Action buttons (only in rolled state)
    if (pool.state === 'rolled') {
      const inventory = callbacks.getInventory ? callbacks.getInventory() : null
      const itemUsedThisTurn = callbacks.getItemUsedThisTurn ? callbacks.getItemUsedThisTurn() : false
      const hasCombatItems = inventory && inventory.items.some((i: any) => i.usableInCombat)

      for (let i = 0; i < ACTIONS.length; i++) {
        const action = ACTIONS[i]
        const { x, y } = actionButtonPos(i)

        let affordable: boolean
        if (action.id === 'item') {
          affordable = hasCombatItems && !itemUsedThisTurn
        } else {
          affordable = canAfford(pool, action.cost)
        }

        const hovered = hoveredElement === `action-${action.id}`
        const flashing = flashingAction === action.id

        // Don't show ITEM button if no combat items
        if (action.id === 'item' && !hasCombatItems) continue

        drawActionButton(ctx, action, x, y, affordable, hovered, flashing)
      }
    }

    // Encounter log zone (below action buttons)
    drawEncounterLogZone(ctx, callbacks.getCombatLog ? callbacks.getCombatLog() : [])

    // Item row drawn on top of log zone so it remains fully visible when open
    if (pool.state === 'rolled' && showItemPicker) {
      const itemInv = callbacks.getInventory ? callbacks.getInventory() : null
      if (itemInv) drawItemRow(ctx, itemInv, ITEM_ROW_Y, itemPickerHovered)
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    const pool = getPool()
    const inventory = callbacks.getInventory ? callbacks.getInventory() : null
    const off = yOffset()

    // Handle item row clicks
    if (showItemPicker && inventory) {
      const combatItems = inventory.items.filter((i: any) => i.usableInCombat)
      const ITEMS_PER_ROW = 4
      const rows = Math.ceil(combatItems.length / ITEMS_PER_ROW)

      let hitItem: any = null
      for (let row = 0; row < rows && hitItem === null; row++) {
        const rowY = ITEM_ROW_Y + off + row * (ITEM_ROW_H + ACTION_GAP)
        for (let col = 0; col < ITEMS_PER_ROW; col++) {
          const idx = row * ITEMS_PER_ROW + col
          if (idx >= combatItems.length) break
          const btnX = MAP_X + SIDE_MARGIN + col * (ACTION_BTN_W + ACTION_GAP)
          if (x >= btnX && x <= btnX + ACTION_BTN_W && y >= rowY && y <= rowY + ITEM_ROW_H) {
            hitItem = combatItems[idx]
            break
          }
        }
      }

      if (hitItem && callbacks.onItem) callbacks.onItem(hitItem)
      showItemPicker = false
      itemPickerHovered = null
      return
    }

    const hit = hitTest(x, y, pool)
    if (!hit) return

    if (hit === 'roll') {
      if (callbacks.onBeforeRoll && !callbacks.onBeforeRoll()) return
      const rolled = rollPool(pool)
      anim.startTime = performance.now()
      anim.lastTickTime = 0
      anim.scramble = []
      showItemPicker = false
      callbacks.onStateChange(rolled)
      return
    }

    if (hit.startsWith('action-')) {
      const actionId = hit.slice(7)
      const action = ACTIONS.find(a => a.id === actionId)
      if (!action) return

      if (action.id === 'item') {
        showItemPicker = !showItemPicker
        return
      }

      if (!canAfford(pool, action.cost)) {
        flashingAction = actionId
        flashEndTime = performance.now() + 300
        return
      }

      const { pool: updated } = spendPips(pool, action.cost)
      if (callbacks.onAction) {
        callbacks.onStateChange(updated)
        callbacks.onAction(actionId)
      } else {
        const costParts = (Object.entries(action.cost) as [DieColor, number][])
          .map(([c, n]) => `${COLOR_EMOJI[c]}${n} → ${COLOR_EMOJI[c]}${updated.totals[c]}`)
          .join(' ')
        callbacks.addLog(`${action.label} used. (${costParts})`)
        callbacks.onStateChange(updated)
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    const pool = getPool()
    const inventory = callbacks.getInventory ? callbacks.getInventory() : null
    const off = yOffset()

    // Track item row hovers
    if (showItemPicker && inventory) {
      const combatItems = inventory.items.filter((i: any) => i.usableInCombat)
      const ITEMS_PER_ROW = 4
      const rows = Math.ceil(combatItems.length / ITEMS_PER_ROW)

      itemPickerHovered = null
      for (let row = 0; row < rows && itemPickerHovered === null; row++) {
        const rowY = ITEM_ROW_Y + off + row * (ITEM_ROW_H + ACTION_GAP)
        for (let col = 0; col < ITEMS_PER_ROW; col++) {
          const idx = row * ITEMS_PER_ROW + col
          if (idx >= combatItems.length) break
          const btnX = MAP_X + SIDE_MARGIN + col * (ACTION_BTN_W + ACTION_GAP)
          if (x >= btnX && x <= btnX + ACTION_BTN_W && y >= rowY && y <= rowY + ITEM_ROW_H) {
            itemPickerHovered = idx
            break
          }
        }
      }
    } else {
      hoveredElement = hitTest(x, y, pool)
    }
  }

  function startRollAnimation(): void {
    anim.startTime = performance.now()
    anim.lastTickTime = 0
    anim.scramble = []
  }

  return { draw, handleClick, handlePointerMove, startRollAnimation }
}
