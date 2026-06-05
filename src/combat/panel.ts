import { colors } from '../colors'
import type { CombatState } from './types'
import type { DicePool, DieColor } from '../dice/pool'
import type { Inventory, Item } from '../satchel/types'
import { canAfford } from '../dice/pool'

// ── Layout constants ──────────────────────────────────────────────────────────

const MAP_X = 10
const MAP_W = 360
const LOGICAL_H = 844
export const PANEL_TOP = 430
const SIDE_MARGIN = 16

// Dice row (no HP bars; dice are the hero element).
export const DIE_ROW_Y = PANEL_TOP + 14
export const DIE_SIZE = 68
const DIE_GAP = 12
const DIE_RADIUS = 12
const PIP_DOT_R = 4.5

// Colour labels and pip-total badges (now become clickable pip buttons).
const LABEL_Y = DIE_ROW_Y + DIE_SIZE + 6
export const PIP_BTN_Y = LABEL_Y + 16
export const PIP_BTN_H = 44

// Middle zone (for submenu or enemy action display).
const MIDDLE_ZONE_Y = PIP_BTN_Y + PIP_BTN_H + 10
const MIDDLE_ZONE_H = 120
export const SUBMENU_Y = MIDDLE_ZONE_Y + 12  // Add padding to top of submenu
const SUBMENU_TOP_PAD = 12

// Bottom button row (Flee | ROLL/END TURN | Item).
export const ROLL_BTN_H = 44
// Pinned to screen bottom with small margin
const BOTTOM_BTN_Y = LOGICAL_H - ROLL_BTN_H - 10
export const ROLL_BTN_Y = BOTTOM_BTN_Y
const ROLL_BTN_X = MAP_X + SIDE_MARGIN
const ROLL_BTN_W = MAP_W - SIDE_MARGIN * 2

// Pip buttons sizing - spread across full width matching bottom buttons
const PIP_BTN_W = Math.floor((ROLL_BTN_W - 24) / 4)  // 4 buttons with 6px gaps
const PIP_BTN_GAP = 6

// Bottom button row sizing
const BTN_ROW_SIDE_W = Math.floor((ROLL_BTN_W - 10) / 4)  // Flee and Item: ~84px each
const BTN_ROW_CENTER_W = ROLL_BTN_W - BTN_ROW_SIDE_W * 2 - 20  // ROLL/END TURN: ~180px

// Submenu area
const SUBMENU_BTN_W = Math.floor((MAP_W - SIDE_MARGIN * 2 - 8) / 2)  // 160
const SUBMENU_BTN_H = 50  // Increased from 40
const SUBMENU_NOTE_H = 32  // Increased from 20

// Legacy category button constants (for compatibility)
export const CAT_BTN_Y = PIP_BTN_Y
export const CAT_BTN_H = PIP_BTN_H
const ACTION_GAP = 8
const CAT_BTN_W = Math.floor((MAP_W - SIDE_MARGIN * 2 - ACTION_GAP * 5) / 6)  // 48

// Enemy action display — shown during awaiting-roll in the cat-button slot.
const ENEMY_RED_COLOR = '#b03030'
const GUARD_STEEL_COLOR = '#5a6b82'

// ── Pip dot patterns for d6 ───────────────────────────────────────────────────

const PIP_SLOTS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// ── Colour palette maps ───────────────────────────────────────────────────────

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
  red: 'Power', blue: 'Focus', green: 'Agility', yellow: 'Fortune',
}

const COLOR_EMOJI: Record<DieColor, string> = {
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡',
}

// ── Round-rect helper ─────────────────────────────────────────────────────────

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

// ── Die layout helpers ────────────────────────────────────────────────────────

export function dieCentres(diceCount: number): number[] {
  const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
  const startX = MAP_X + (MAP_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
}

export function pipBtnX(idx: number, totalDice: number): number {
  // Spread pip buttons across full width, matching bottom button row
  const totalW = totalDice * PIP_BTN_W + (totalDice - 1) * PIP_BTN_GAP
  const startX = ROLL_BTN_X + (ROLL_BTN_W - totalW) / 2
  return startX + idx * (PIP_BTN_W + PIP_BTN_GAP)
}

// ── Die face ──────────────────────────────────────────────────────────────────

function drawDieFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  color: DieColor,
  sides: number,
  value: number | null,
  scramble: number | null,
): void {
  roundRect(ctx, x, DIE_ROW_Y, DIE_SIZE, DIE_SIZE, DIE_RADIUS)
  ctx.fillStyle = DIE_FACE_BG[color]
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  const display = scramble ?? value
  if (display === null) return

  ctx.fillStyle = 'rgba(255,255,255,0.88)'

  if (sides > 6) {
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(display), x + DIE_SIZE / 2, DIE_ROW_Y + DIE_SIZE / 2)
    return
  }

  const slots = PIP_SLOTS[display] ?? []
  const cellW = DIE_SIZE / 3
  for (const slot of slots) {
    const col = slot % 3
    const row = Math.floor(slot / 3)
    ctx.beginPath()
    ctx.arc(x + col * cellW + cellW / 2, DIE_ROW_Y + row * cellW + cellW / 2, PIP_DOT_R, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Pip button (clickable pip counter) ─────────────────────────────────────────

function drawPipBtn(
  ctx: CanvasRenderingContext2D,
  color: DieColor,
  total: number,
  x: number,
  isOpen: boolean,
  affordable: boolean,
  hovered: boolean,
  flashing: boolean,
): void {
  const disabled = !affordable
  ctx.globalAlpha = disabled ? 0.38 : 1

  const emoji = COLOR_EMOJI[color]
  const label = String(total)
  const btnText = emoji + label

  roundRect(ctx, x, PIP_BTN_Y, PIP_BTN_W, PIP_BTN_H, 6)
  ctx.fillStyle = isOpen ? colors.surfaceRaised : (hovered && !disabled ? colors.surfaceRaised : colors.surface)
  ctx.fill()

  const borderColor = flashing ? '#ff3030' : isOpen ? colors.gold : colors.logNormal
  ctx.strokeStyle = borderColor
  ctx.lineWidth = flashing ? 2 : isOpen ? 1.5 : 1
  ctx.stroke()

  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(btnText, x + PIP_BTN_W / 2, PIP_BTN_Y + PIP_BTN_H / 2)
  ctx.globalAlpha = 1
}

// ── Pip-total badge (deprecated, kept for reference) ────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, color: DieColor, total: number | null, cx: number): void {
  const label = total === null ? '—' : String(total)
  const emoji = COLOR_EMOJI[color]
  ctx.font = 'bold 14px monospace'
  const numW = ctx.measureText(label).width
  ctx.font = '12px monospace'
  const emojiW = ctx.measureText(emoji).width
  const innerW = emojiW + 4 + numW
  const badgeW = innerW + 16
  const bx = cx - badgeW / 2

  roundRect(ctx, bx, PIP_BTN_Y, badgeW, PIP_BTN_H, 6)
  ctx.fillStyle = BADGE_BG[color]
  ctx.fill()
  ctx.strokeStyle = BADGE_BORDER[color]
  ctx.lineWidth = 1
  ctx.stroke()

  const midY = PIP_BTN_Y + PIP_BTN_H / 2
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = '12px monospace'
  ctx.fillStyle = BADGE_TEXT[color]
  ctx.fillText(emoji, bx + 8, midY)
  ctx.font = 'bold 14px monospace'
  ctx.fillText(label, bx + 8 + emojiW + 4, midY)
}

// ── Category button (for four colour categories plus item) ─────────────────────

export type CatId = 'red' | 'green' | 'blue' | 'yellow' | 'item'

export function catBtnX(idx: number): number {
  return pipBtnX(idx, 4)
}

// ── Bottom button row buttons ──────────────────────────────────────────────────

function bottomBtnFleeX(): number {
  return MAP_X + SIDE_MARGIN
}

function bottomBtnRollX(): number {
  return bottomBtnFleeX() + BTN_ROW_SIDE_W + 10
}

function bottomBtnItemX(): number {
  return bottomBtnRollX() + BTN_ROW_CENTER_W + 10
}

function drawBottomBtn(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  w: number,
  hovered: boolean,
  disabled: boolean,
  isHero: boolean,
): void {
  ctx.globalAlpha = disabled ? 0.4 : 1
  roundRect(ctx, x, ROLL_BTN_Y, w, ROLL_BTN_H, 8)
  ctx.fillStyle = hovered && !disabled ? colors.surfaceRaised : colors.surface
  ctx.fill()
  const borderColor = isHero ? colors.gold : colors.logNormal
  const borderWidth = isHero ? 1.5 : 1
  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderWidth
  ctx.stroke()

  ctx.font = isHero ? 'bold 16px system-ui, -apple-system, sans-serif' : 'bold 11px monospace'
  ctx.fillStyle = isHero ? colors.gold : (label === 'Flee' ? '#e8a0a0' : colors.textPrimary)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)
  ctx.globalAlpha = 1
}

// ── Submenu buttons ───────────────────────────────────────────────────────────

export interface SubmenuAction {
  id: string
  label: string
  costLabel: string
  affordable: boolean
}

function subBtnX(col: number): number {
  return MAP_X + SIDE_MARGIN + col * (SUBMENU_BTN_W + ACTION_GAP)
}

function drawSubmenuBtn(
  ctx: CanvasRenderingContext2D,
  action: SubmenuAction,
  col: number,
  y: number,
  hovered: boolean,
  flashing: boolean,
): void {
  const x = subBtnX(col)
  ctx.globalAlpha = action.affordable ? 1 : 0.38

  roundRect(ctx, x, y, SUBMENU_BTN_W, SUBMENU_BTN_H, 8)
  ctx.fillStyle = hovered && action.affordable ? colors.surfaceRaised : colors.surface
  ctx.fill()
  ctx.strokeStyle = flashing ? '#ff3030' : colors.logNormal
  ctx.lineWidth = flashing ? 2 : 1
  ctx.stroke()

  // Label line
  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const LABEL_H = 14, PILL_GAP = 3, PILL_H = 18
  const totalH = LABEL_H + PILL_GAP + PILL_H
  const top = y + (SUBMENU_BTN_H - totalH) / 2
  ctx.fillText(action.label, x + SUBMENU_BTN_W / 2, top + LABEL_H / 2)

  // Cost pill
  if (action.costLabel) {
    ctx.font = 'bold 11px monospace'
    const textW = ctx.measureText(action.costLabel).width
    const pw = textW + 12
    const px = x + SUBMENU_BTN_W / 2 - pw / 2
    const py = top + LABEL_H + PILL_GAP

    roundRect(ctx, px, py, pw, PILL_H, 4)
    ctx.fillStyle = '#3a0a0a'
    ctx.fill()
    ctx.strokeStyle = '#5a1a1a'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = colors.pipBadgeRedText
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(action.costLabel, x + SUBMENU_BTN_W / 2, py + PILL_H / 2)
  }

  ctx.globalAlpha = 1
}

// ── Reserve note (Green submenu) ──────────────────────────────────────────────

function reserveNoteText(reservedGreen: number): string {
  if (reservedGreen >= 2) return `${reservedGreen} held — Dodge ready`
  if (reservedGreen === 1) return '1 held — −1 damage'
  return '0 held — full hit'
}

// ── Banner (victory / defeat) ─────────────────────────────────────────────────

const ENEMY_RED_BANNER = '#7a1a1a'

export function drawCombatBanner(
  ctx: CanvasRenderingContext2D,
  timestamp: DOMHighResTimeStamp,
  combat: CombatState,
  bannerStartTime: number,
): void {
  ctx.save()

  const panelH = LOGICAL_H - PANEL_TOP
  const isVictory = combat.phase === 'victory'

  ctx.fillStyle = isVictory ? colors.surface : colors.bg
  roundRect(ctx, MAP_X, PANEL_TOP, MAP_W, panelH, 8)
  ctx.fill()

  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, PANEL_TOP)
  ctx.lineTo(MAP_X + MAP_W, PANEL_TOP)
  ctx.stroke()

  const cx = MAP_X + MAP_W / 2
  const midY = PANEL_TOP + panelH / 2

  ctx.font = 'bold 22px monospace'
  ctx.fillStyle = isVictory ? colors.gold : ENEMY_RED_BANNER
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(isVictory ? '── VICTORY ──' : '── DEFEATED ──', cx, midY - 30)

  ctx.font = isVictory
    ? '14px system-ui, -apple-system, sans-serif'
    : 'italic 14px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = isVictory ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(isVictory ? `${combat.enemy.name} defeated!` : 'Pip has fallen…', cx, midY)

  if (isVictory) {
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`+ ${combat.goldAwarded} gold  ◈`, cx, midY + 26)
  }

  const elapsed = timestamp - bannerStartTime
  const fadeAlpha = Math.min(1, Math.max(0, (elapsed - 500) / 300))
  if (fadeAlpha > 0) {
    ctx.globalAlpha = fadeAlpha
    ctx.font = 'italic 11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Tap to continue', cx, isVictory ? midY + 52 : midY + 40)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

// ── Main panel draw ───────────────────────────────────────────────────────────

export interface CombatPanelDrawState {
  pool: DicePool
  combat: CombatState
  openCategory: CatId | null
  fleePending: boolean
  lastEnemyHeadline: string
  lastEnemyDetail: string
  lastEnemyKind: CombatState['intent']['kind'] | null
  hoveredElement: string | null
  flashingElement: string | null
  flashEndTime: number | null
  animScramble: number[]
  inventory: Inventory
  timestamp: DOMHighResTimeStamp
}

export function drawCombatPanel(ctx: CanvasRenderingContext2D, s: CombatPanelDrawState): void {
  const { pool, combat, openCategory, lastEnemyHeadline, lastEnemyDetail, lastEnemyKind, inventory, timestamp } = s
  const inPlayerTurn = combat.phase === 'player-turn'
  const panelH = LOGICAL_H - PANEL_TOP

  // Panel background
  roundRect(ctx, MAP_X, PANEL_TOP, MAP_W, panelH, 8)
  ctx.fillStyle = colors.surface
  ctx.fill()
  ctx.strokeStyle = colors.logNormal
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, PANEL_TOP)
  ctx.lineTo(MAP_X + MAP_W, PANEL_TOP)
  ctx.stroke()

  // ── Dice faces ──
  const centres = dieCentres(pool.dice.length)
  for (let i = 0; i < pool.dice.length; i++) {
    const die = pool.dice[i]
    const roll = pool.rolls[i] ?? null
    const scramble = pool.state === 'rolling' && s.animScramble[i] != null
      ? s.animScramble[i]
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

  // ── Pip buttons (only during player turn) ──
  if (inPlayerTurn) {
    const flashing = s.flashingElement
    const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime
    const colors4 = ['red', 'green', 'blue', 'yellow'] as const

    for (let i = 0; i < 4 && i < pool.dice.length; i++) {
      const color = colors4[i]
      const total = pool.totals[color]
      const x = catBtnX(i)
      const isOpen = openCategory === color
      const affordable = canAfford(pool, { [color]: color === 'yellow' ? 2 : color === 'red' ? 2 : 1 })
      const hovered = s.hoveredElement === `cat-${color}`
      const flash = flashActive && flashing === `cat-${color}`
      drawPipBtn(ctx, color, total, x, isOpen, affordable, hovered, flash)
    }
  }

  // ── Middle zone: submenu or enemy action ──
  if (inPlayerTurn && openCategory) {
    // Draw submenu for open category
    if (openCategory === 'red') {
      const strikeAffordable = canAfford(pool, { red: 2 })
      const heavyAffordable = canAfford(pool, { red: 4 })
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      drawSubmenuBtn(ctx, {
        id: 'strike', label: 'Strike', costLabel: '2🔴',
        affordable: strikeAffordable,
      }, 0, SUBMENU_Y, s.hoveredElement === 'sub-strike',
      flashActive && flashing === 'sub-strike')

      drawSubmenuBtn(ctx, {
        id: 'heavy', label: 'Heavy Strike', costLabel: '4🔴',
        affordable: heavyAffordable,
      }, 1, SUBMENU_Y, s.hoveredElement === 'sub-heavy',
      flashActive && flashing === 'sub-heavy')
    }

    if (openCategory === 'green') {
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      // Live note
      ctx.font = '11px monospace'
      ctx.fillStyle = colors.pipBadgeGreenText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `Reserve: ${reserveNoteText(combat.reservedGreen)}`,
        MAP_X + MAP_W / 2,
        SUBMENU_Y + SUBMENU_NOTE_H / 2,
      )

      const btnY = SUBMENU_Y + SUBMENU_NOTE_H + 8
      drawSubmenuBtn(ctx, {
        id: 'reserve', label: '+Reserve', costLabel: '1🟢',
        affordable: canAfford(pool, { green: 1 }),
      }, 0, btnY, s.hoveredElement === 'sub-reserve',
      flashActive && flashing === 'sub-reserve')

      drawSubmenuBtn(ctx, {
        id: 'clear', label: 'Clear reserve', costLabel: '',
        affordable: combat.reservedGreen > 0,
      }, 1, btnY, s.hoveredElement === 'sub-clear',
      false)
    }

    if (openCategory === 'blue') {
      const analyseAffordable = canAfford(pool, { blue: 2 }) && !combat.analysedThisTurn
      const exploitAffordable = canAfford(pool, { blue: 4 }) && combat.analysedThisTurn
      const resistAffordable = canAfford(pool, { blue: 3 }) && combat.pipPoison !== null
      const identifyAffordable = canAfford(pool, { blue: 1 }) && !combat.identified
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      drawSubmenuBtn(ctx, {
        id: 'analyse', label: 'Analyse', costLabel: '2🔵',
        affordable: analyseAffordable,
      }, 0, SUBMENU_Y, s.hoveredElement === 'sub-analyse',
      flashActive && flashing === 'sub-analyse')

      drawSubmenuBtn(ctx, {
        id: 'exploit', label: 'Exploit', costLabel: '4🔵',
        affordable: exploitAffordable,
      }, 1, SUBMENU_Y, s.hoveredElement === 'sub-exploit',
      flashActive && flashing === 'sub-exploit')

      const btnY = SUBMENU_Y + SUBMENU_BTN_H + 8
      drawSubmenuBtn(ctx, {
        id: 'resist', label: 'Resist', costLabel: '3🔵',
        affordable: resistAffordable,
      }, 0, btnY, s.hoveredElement === 'sub-resist',
      flashActive && flashing === 'sub-resist')

      drawSubmenuBtn(ctx, {
        id: 'identify', label: 'Identify', costLabel: '1🔵',
        affordable: identifyAffordable,
      }, 1, btnY, s.hoveredElement === 'sub-identify',
      flashActive && flashing === 'sub-identify')
    }

    if (openCategory === 'yellow') {
      const convertAffordable = canAfford(pool, { yellow: 3 })
      const luckyAffordable = canAfford(pool, { yellow: 4 })
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      drawSubmenuBtn(ctx, {
        id: 'convert', label: 'Convert', costLabel: '3🟡',
        affordable: convertAffordable,
      }, 0, SUBMENU_Y, s.hoveredElement === 'sub-convert',
      flashActive && flashing === 'sub-convert')

      drawSubmenuBtn(ctx, {
        id: 'lucky-shot', label: 'Lucky Shot', costLabel: '4🟡',
        affordable: luckyAffordable,
      }, 1, SUBMENU_Y, s.hoveredElement === 'sub-lucky-shot',
      flashActive && flashing === 'sub-lucky-shot')
    }

    if (openCategory === 'item') {
      drawItemList(ctx, inventory, s.hoveredElement, SUBMENU_Y)
    }
  }

  // Flee pending confirmation (drawn outside submenu block so it shows when openCategory is null)
  if (inPlayerTurn && s.fleePending) {
    const fleeMidY = MIDDLE_ZONE_Y + MIDDLE_ZONE_H / 2
    const fleeText = 'Tap Flee again to escape — takes one free hit'

    // Draw semi-transparent background box
    ctx.font = 'bold 13px monospace'
    const textW = ctx.measureText(fleeText).width
    const boxW = textW + 20
    const boxH = 32
    const boxX = MAP_X + MAP_W / 2 - boxW / 2
    const boxY = fleeMidY - boxH / 2

    roundRect(ctx, boxX, boxY, boxW, boxH, 6)
    ctx.fillStyle = 'rgba(139, 0, 0, 0.3)'
    ctx.fill()
    ctx.strokeStyle = '#ff6060'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Draw text
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = '#ff8080'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(fleeText, MAP_X + MAP_W / 2, fleeMidY)
  } else if (!inPlayerTurn && lastEnemyHeadline) {
    // ── Enemy action display (awaiting-roll only, after first turn) ──
    // Center vertically between dice and bottom buttons
    const diceBottomY = DIE_ROW_Y + DIE_SIZE
    const topOfBottomBtn = ROLL_BTN_Y
    const centerY = (diceBottomY + topOfBottomBtn) / 2

    const cx = MAP_X + MAP_W / 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = lastEnemyKind === 'guard' ? GUARD_STEEL_COLOR : ENEMY_RED_COLOR
    ctx.fillText(lastEnemyHeadline, cx, centerY - 16)

    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.fillText(lastEnemyDetail, cx, centerY + 16)
  }

  // ── Bottom button row (Flee | ROLL/END TURN | Item) ──
  const fleeDisabled = !inPlayerTurn || combat.enemy.isBoss
  const rollDisabled = pool.state === 'rolling'
  const hasItems = inventory.items.some(i => i.usableInCombat)
  const itemUsed = combat.itemUsedThisTurn
  const itemDisabled = !hasItems || itemUsed
  const rollLabel = combat.phase === 'player-turn' ? 'END TURN' : 'ROLL DICE'

  // Flee button
  drawBottomBtn(
    ctx,
    'Flee',
    bottomBtnFleeX(),
    BTN_ROW_SIDE_W,
    s.hoveredElement === 'cat-flee' && !fleeDisabled,
    fleeDisabled || rollDisabled,
    false,
  )

  // ROLL/END TURN button (hero)
  drawBottomBtn(
    ctx,
    rollLabel,
    bottomBtnRollX(),
    BTN_ROW_CENTER_W,
    s.hoveredElement === 'roll' && !rollDisabled,
    rollDisabled,
    true,
  )

  // Item button
  drawBottomBtn(
    ctx,
    'Item',
    bottomBtnItemX(),
    BTN_ROW_SIDE_W,
    s.hoveredElement === 'cat-item' && !itemDisabled,
    itemDisabled || rollDisabled,
    false,
  )

}

function drawItemList(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
  hovered: string | null,
  startY: number,
): void {
  const items = inventory.items.filter((i: Item) => i.usableInCombat)
  if (items.length === 0) {
    ctx.font = '11px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('No items', MAP_X + MAP_W / 2, startY + SUBMENU_BTN_H / 2)
    return
  }

  // Two-column layout (max 4 items = 2 rows × 2 columns)
  for (let i = 0; i < Math.min(items.length, 4); i++) {
    const item = items[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = subBtnX(col)
    const y = startY + row * (SUBMENU_BTN_H + 8)
    const isHov = hovered === `item-${i}`

    roundRect(ctx, x, y, SUBMENU_BTN_W, SUBMENU_BTN_H, 8)
    ctx.fillStyle = isHov ? colors.surfaceRaised : colors.surface
    ctx.fill()
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = '11px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, x + SUBMENU_BTN_W / 2, y + SUBMENU_BTN_H / 2 - 8)
    ctx.font = '9px monospace'
    ctx.fillStyle = colors.gold
    ctx.fillText(`×${item.quantity}`, x + SUBMENU_BTN_W / 2, y + SUBMENU_BTN_H / 2 + 8)
  }
}

// ── Hit testing ───────────────────────────────────────────────────────────────

export interface HitRect {
  x: number; y: number; w: number; h: number; id: string
}

export function buildHitRects(
  pool: DicePool,
  combat: CombatState,
  openCategory: CatId | null,
  fleePending: boolean,
  inventory: Inventory,
): HitRect[] {
  const rects: HitRect[] = []
  const inPlayerTurn = combat.phase === 'player-turn'
  const rolling = pool.state === 'rolling'

  if (inPlayerTurn) {
    // Pip buttons (colour categories)
    const colors4 = ['red', 'green', 'blue', 'yellow'] as const
    for (let i = 0; i < 4; i++) {
      const x = catBtnX(i)
      rects.push({ x, y: PIP_BTN_Y, w: PIP_BTN_W, h: PIP_BTN_H, id: `cat-${colors4[i]}` })
    }

    // Submenu buttons
    if (openCategory === 'red') {
      rects.push({ x: subBtnX(0), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-strike' })
      rects.push({ x: subBtnX(1), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-heavy' })
    }

    if (openCategory === 'green') {
      const btnY = SUBMENU_Y + SUBMENU_NOTE_H + 4
      rects.push({ x: subBtnX(0), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-reserve' })
      rects.push({ x: subBtnX(1), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-clear' })
    }

    if (openCategory === 'blue') {
      rects.push({ x: subBtnX(0), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-analyse' })
      rects.push({ x: subBtnX(1), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-exploit' })
      const btnY = SUBMENU_Y + SUBMENU_BTN_H + 8
      rects.push({ x: subBtnX(0), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-resist' })
      rects.push({ x: subBtnX(1), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-identify' })
    }

    if (openCategory === 'yellow') {
      rects.push({ x: subBtnX(0), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-convert' })
      rects.push({ x: subBtnX(1), y: SUBMENU_Y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-lucky-shot' })
    }

    if (openCategory === 'item') {
      const items = inventory.items.filter((i: Item) => i.usableInCombat)
      for (let i = 0; i < Math.min(items.length, 4); i++) {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = subBtnX(col)
        const y = SUBMENU_Y + row * (SUBMENU_BTN_H + 8)
        rects.push({
          x, y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: `item-${i}`,
        })
      }
    }
  }

  // Bottom button row (always available)
  if (!rolling) {
    rects.push({ x: bottomBtnFleeX(), y: ROLL_BTN_Y, w: BTN_ROW_SIDE_W, h: ROLL_BTN_H, id: 'cat-flee' })
    rects.push({ x: bottomBtnRollX(), y: ROLL_BTN_Y, w: BTN_ROW_CENTER_W, h: ROLL_BTN_H, id: 'roll' })
    rects.push({ x: bottomBtnItemX(), y: ROLL_BTN_Y, w: BTN_ROW_SIDE_W, h: ROLL_BTN_H, id: 'cat-item' })
  }

  void fleePending
  return rects
}

export function hitTest(
  x: number, y: number,
  pool: DicePool,
  combat: CombatState,
  openCategory: CatId | null,
  fleePending: boolean,
  inventory: Inventory,
): string | null {
  for (const r of buildHitRects(pool, combat, openCategory, fleePending, inventory)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id
  }
  return null
}
