import { colors } from '../colors'
import type { CombatState } from './types'
import type { DicePool, DieColor, Die } from '../dice/pool'
import type { Inventory, Item } from '../satchel/types'
import { canAfford } from '../dice/pool'
import { drawDie, roundRect } from '../dice/draw'
import {
  computePoolLayout, computeRowXPositions, colorGroupCenters,
  ROW_VERTICAL_GAP, type PoolLayout,
} from '../dice/pool-layout'

// ── Layout constants ──────────────────────────────────────────────────────────

const MAP_X = 10
const MAP_W = 360
const LOGICAL_H = 844
export const PANEL_TOP = 430
const SIDE_MARGIN = 16
const CONTAINER_W = MAP_W - SIDE_MARGIN * 2   // 328

// Dice row — pinned directly below panel top (no HP bars in combat panel)
export const DIE_ROW_Y = PANEL_TOP + 14

// Pip buttons (height is fixed; Y is dynamic)
export const PIP_BTN_H = 44

// Bottom button row — always pinned to screen bottom
export const ROLL_BTN_H = 44
const BOTTOM_BTN_Y = LOGICAL_H - ROLL_BTN_H - 10
export const ROLL_BTN_Y = BOTTOM_BTN_Y
const ROLL_BTN_X = MAP_X + SIDE_MARGIN
const ROLL_BTN_W = MAP_W - SIDE_MARGIN * 2

// Pip buttons sizing — spread across full width matching bottom button row
const PIP_BTN_W = Math.floor((ROLL_BTN_W - 24) / 4)  // 4 buttons with 6px gaps
const PIP_BTN_GAP = 6

// Bottom button row sizing
const BTN_ROW_SIDE_W = Math.floor((ROLL_BTN_W - 10) / 4)
const BTN_ROW_CENTER_W = ROLL_BTN_W - BTN_ROW_SIDE_W * 2 - 20

// Submenu area
const ACTION_GAP = 8
const SUBMENU_BTN_W = Math.floor((MAP_W - SIDE_MARGIN * 2 - ACTION_GAP) / 2)
const SUBMENU_BTN_H = 50
const SUBMENU_NOTE_H = 32

// Legacy category button constants (for compatibility)
export const CAT_BTN_H = PIP_BTN_H

// Enemy action display colours
const ENEMY_RED_COLOR = '#b03030'
const GUARD_STEEL_COLOR = '#5a6b82'

// ── Combat geometry ───────────────────────────────────────────────────────────

interface CombatGeom {
  layout: PoolLayout
  rowGeoms: Array<{ row: Die[]; xs: number[]; y: number }>
  diceBottomY: number
  pipBtnY: number
  middleZoneY: number
  submenuY: number
}

function computeCombatGeom(pool: DicePool): CombatGeom {
  const layout = computePoolLayout(pool.dice, CONTAINER_W)
  const rowGeoms = layout.rows.map((row, ri) => ({
    row,
    xs: computeRowXPositions(row, MAP_X + SIDE_MARGIN, CONTAINER_W, layout.size),
    y: DIE_ROW_Y + ri * (layout.size + ROW_VERTICAL_GAP),
  }))
  const diceBottomY = layout.rows.length === 0
    ? DIE_ROW_Y
    : DIE_ROW_Y + layout.rows.length * layout.size + (layout.rows.length - 1) * ROW_VERTICAL_GAP
  // 6px gap below dice + 16px color label height = pip button top
  const pipBtnY = diceBottomY + 22
  const middleZoneY = pipBtnY + PIP_BTN_H + 10
  const submenuY = middleZoneY + 12
  return { layout, rowGeoms, diceBottomY, pipBtnY, middleZoneY, submenuY }
}

// ── Colour palette maps ───────────────────────────────────────────────────────

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

// ── Text wrapping helper ──────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}

// ── Die layout helpers ────────────────────────────────────────────────────────

export function pipBtnX(idx: number, totalDice: number): number {
  const totalW = totalDice * PIP_BTN_W + (totalDice - 1) * PIP_BTN_GAP
  const startX = ROLL_BTN_X + (ROLL_BTN_W - totalW) / 2
  return startX + idx * (PIP_BTN_W + PIP_BTN_GAP)
}

// ── Pip button (clickable pip counter) ─────────────────────────────────────────

function drawPipBtn(
  ctx: CanvasRenderingContext2D,
  color: DieColor,
  total: number,
  x: number,
  y: number,
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

  roundRect(ctx, x, y, PIP_BTN_W, PIP_BTN_H, 6)
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
  ctx.fillText(btnText, x + PIP_BTN_W / 2, y + PIP_BTN_H / 2)
  ctx.globalAlpha = 1
}

// ── Category button ────────────────────────────────────────────────────────────

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
  deathPreventionNotificationEndTime: number | null
}

// Items that are currently usable in combat, respecting the Luck window gate.
// Luck-class items are unavailable once pips have been spent this turn.
export function getCombatUsableItems(inventory: Inventory, pipsSpentThisTurn: boolean): Item[] {
  return inventory.items.filter(i => i.usableInCombat && (!i.luckyClass || !pipsSpentThisTurn))
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

  const geom = computeCombatGeom(pool)
  const sortedAll = geom.layout.rows.flat()

  // ── Dice faces ──
  for (const { row, xs, y } of geom.rowGeoms) {
    const rowOffset = geom.layout.rows
      .slice(0, geom.rowGeoms.findIndex(rg => rg.row === row))
      .reduce((sum, r) => sum + r.length, 0)

    for (let i = 0; i < row.length; i++) {
      const die = row[i]!
      const posInSorted = rowOffset + i
      const colorIdx = sortedAll.slice(0, posInSorted)
        .filter(sd => sd.color === die.color && sd.sides === die.sides).length
      const matchingRolls = pool.rolls.filter(r => r.color === die.color && r.sides === die.sides)
      const rollValue = pool.state === 'idle' ? undefined : matchingRolls[colorIdx]?.value
      const scrambleVal = pool.state === 'rolling' ? s.animScramble[posInSorted] : undefined
      drawDie(ctx, xs[i]!, y, geom.layout.size, die.color, die.sides, scrambleVal ?? rollValue)
    }
  }

  // ── Colour labels (one per group, centred on group) ──
  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const labelY = geom.diceBottomY + 6
  for (const { row, xs } of geom.rowGeoms) {
    for (const [color, cx] of colorGroupCenters(row, xs, geom.layout.size)) {
      ctx.fillText(COLOR_LABEL[color], cx, labelY)
    }
  }

  // Bonus pip assignment prompt
  if (combat.bonusPipsRemaining > 0) {
    ctx.font = '11px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const promptText = `Assign ${combat.bonusPipsRemaining} bonus pip${combat.bonusPipsRemaining !== 1 ? 's' : ''}:`
    ctx.fillText(promptText, MAP_X + MAP_W / 2, geom.pipBtnY - 4)
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
      drawPipBtn(ctx, color, total, x, geom.pipBtnY, isOpen, affordable, hovered, flash)
    }
  }

  // ── Middle zone: submenu or enemy action ──
  if (inPlayerTurn && openCategory) {
    if (openCategory === 'red') {
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      if (combat.strikeAction !== null) {
        const strikeCost = combat.strikeAction.damage
        const strikeAffordable = canAfford(pool, { red: strikeCost })
        drawSubmenuBtn(ctx, {
          id: 'strike', label: 'Strike', costLabel: `${strikeCost}🔴`,
          affordable: strikeAffordable,
        }, 0, geom.submenuY, s.hoveredElement === 'sub-strike',
        flashActive && flashing === 'sub-strike')
      }

      const heavyAffordable = canAfford(pool, { red: 4 })
      drawSubmenuBtn(ctx, {
        id: 'heavy', label: 'Heavy Strike', costLabel: '4🔴',
        affordable: heavyAffordable,
      }, 1, geom.submenuY, s.hoveredElement === 'sub-heavy',
      flashActive && flashing === 'sub-heavy')
    }

    if (openCategory === 'green') {
      const flashing = s.flashingElement
      const flashActive = flashing !== null && s.flashEndTime !== null && timestamp < s.flashEndTime

      ctx.font = '11px monospace'
      ctx.fillStyle = colors.pipBadgeGreenText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `Reserve: ${reserveNoteText(combat.reservedGreen)}`,
        MAP_X + MAP_W / 2,
        geom.submenuY + SUBMENU_NOTE_H / 2,
      )

      const btnY = geom.submenuY + SUBMENU_NOTE_H + 8
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
      }, 0, geom.submenuY, s.hoveredElement === 'sub-analyse',
      flashActive && flashing === 'sub-analyse')

      drawSubmenuBtn(ctx, {
        id: 'exploit', label: 'Exploit', costLabel: '4🔵',
        affordable: exploitAffordable,
      }, 1, geom.submenuY, s.hoveredElement === 'sub-exploit',
      flashActive && flashing === 'sub-exploit')

      const btnY = geom.submenuY + SUBMENU_BTN_H + 8
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
      }, 0, geom.submenuY, s.hoveredElement === 'sub-convert',
      flashActive && flashing === 'sub-convert')

      drawSubmenuBtn(ctx, {
        id: 'lucky-shot', label: 'Lucky Shot', costLabel: '4🟡',
        affordable: luckyAffordable,
      }, 1, geom.submenuY, s.hoveredElement === 'sub-lucky-shot',
      flashActive && flashing === 'sub-lucky-shot')
    }

    if (openCategory === 'item') {
      drawItemList(ctx, inventory, combat, s.hoveredElement, geom.submenuY)
    }
  }

  // Flee pending confirmation (drawn outside submenu block)
  if (inPlayerTurn && s.fleePending) {
    const fleeY = ROLL_BTN_Y - 16
    ctx.font = '11px monospace'
    ctx.fillStyle = '#e8a0a0'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Tap Flee again to take one free hit', MAP_X + MAP_W / 2, fleeY)
  } else if (!inPlayerTurn && lastEnemyHeadline) {
    // ── Enemy action display ──
    const topOfBottomBtn = ROLL_BTN_Y
    const centerY = (geom.diceBottomY + topOfBottomBtn) / 2

    const cx = MAP_X + MAP_W / 2
    const maxTextWidth = ROLL_BTN_W
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = lastEnemyKind === 'guard' ? GUARD_STEEL_COLOR : ENEMY_RED_COLOR
    const headlineLines = wrapText(ctx, lastEnemyHeadline, maxTextWidth)
    const headlineY = centerY - 16 - (headlineLines.length - 1) * 10
    for (let i = 0; i < headlineLines.length; i++) {
      ctx.fillText(headlineLines[i], cx, headlineY + i * 20)
    }

    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textPrimary
    const detailLines = wrapText(ctx, lastEnemyDetail, maxTextWidth)
    const detailY = centerY + 16 + (headlineLines.length - 1) * 10
    for (let i = 0; i < detailLines.length; i++) {
      ctx.fillText(detailLines[i], cx, detailY + i * 20)
    }
  }

  // ── Bottom button row (Flee | ROLL/END TURN | Item) ──
  const fleeDisabled = !inPlayerTurn || combat.enemy.isBoss
  const rollDisabled = pool.state === 'rolling' || combat.bonusPipsRemaining > 0
  const hasUsableItems = getCombatUsableItems(inventory, combat.pipsSpentThisTurn).length > 0
  const itemUsed = combat.itemUsedThisTurn
  const itemDisabled = !hasUsableItems || itemUsed
  const rollLabel = combat.phase === 'player-turn' ? 'END TURN' : 'ROLL DICE'

  drawBottomBtn(ctx, 'Flee', bottomBtnFleeX(), BTN_ROW_SIDE_W,
    s.hoveredElement === 'cat-flee' && !fleeDisabled, fleeDisabled || rollDisabled, false)
  drawBottomBtn(ctx, rollLabel, bottomBtnRollX(), BTN_ROW_CENTER_W,
    s.hoveredElement === 'roll' && !rollDisabled, rollDisabled, true)
  drawBottomBtn(ctx, 'Item', bottomBtnItemX(), BTN_ROW_SIDE_W,
    s.hoveredElement === 'cat-item' && !itemDisabled, itemDisabled || rollDisabled, false)

  // Death prevention notification
  if (s.deathPreventionNotificationEndTime !== null && timestamp < s.deathPreventionNotificationEndTime) {
    drawDeathPreventionNotification(ctx, s.inventory)
  }
}

function drawItemList(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
  combat: CombatState,
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

  for (let i = 0; i < Math.min(items.length, 4); i++) {
    const item = items[i]
    const isTenacity = item.window === 'post-spend-tenacity'
    const isBerserk = item.effect.type === 'berserk'
    const luckyLocked = item.luckyClass && combat.pipsSpentThisTurn
    const tenacityLocked = isTenacity && !combat.pipsSpentThisTurn
    const berserkLocked = isBerserk && combat.berserkTurnsLeft > 0
    const locked = luckyLocked || tenacityLocked || berserkLocked || combat.itemUsedThisTurn
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = subBtnX(col)
    const y = startY + row * (SUBMENU_BTN_H + 8)
    const isHov = !locked && hovered === `item-${i}`

    ctx.globalAlpha = locked ? 0.38 : 1

    roundRect(ctx, x, y, SUBMENU_BTN_W, SUBMENU_BTN_H, 8)
    ctx.fillStyle = isHov ? colors.surfaceRaised : colors.surface
    ctx.fill()
    ctx.strokeStyle = locked ? colors.textMuted : colors.gold
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = '11px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, x + SUBMENU_BTN_W / 2, y + SUBMENU_BTN_H / 2 - 8)
    ctx.font = '9px monospace'
    ctx.fillStyle = locked ? colors.textMuted : colors.gold
    if (item.charges !== undefined) {
      ctx.fillText(`${item.charges}c`, x + SUBMENU_BTN_W / 2, y + SUBMENU_BTN_H / 2 + 8)
    } else {
      ctx.fillText(`×${item.quantity}`, x + SUBMENU_BTN_W / 2, y + SUBMENU_BTN_H / 2 + 8)
    }

    ctx.globalAlpha = 1
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
  const geom = computeCombatGeom(pool)

  if (inPlayerTurn) {
    // Pip buttons (colour categories)
    const colors4 = ['red', 'green', 'blue', 'yellow'] as const
    for (let i = 0; i < 4; i++) {
      const x = catBtnX(i)
      rects.push({ x, y: geom.pipBtnY, w: PIP_BTN_W, h: PIP_BTN_H, id: `cat-${colors4[i]}` })
    }

    // Submenu buttons
    if (openCategory === 'red') {
      rects.push({ x: subBtnX(0), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-strike' })
      rects.push({ x: subBtnX(1), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-heavy' })
    }

    if (openCategory === 'green') {
      const btnY = geom.submenuY + SUBMENU_NOTE_H + 4
      rects.push({ x: subBtnX(0), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-reserve' })
      rects.push({ x: subBtnX(1), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-clear' })
    }

    if (openCategory === 'blue') {
      rects.push({ x: subBtnX(0), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-analyse' })
      rects.push({ x: subBtnX(1), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-exploit' })
      const btnY = geom.submenuY + SUBMENU_BTN_H + 8
      rects.push({ x: subBtnX(0), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-resist' })
      rects.push({ x: subBtnX(1), y: btnY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-identify' })
    }

    if (openCategory === 'yellow') {
      rects.push({ x: subBtnX(0), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-convert' })
      rects.push({ x: subBtnX(1), y: geom.submenuY, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: 'sub-lucky-shot' })
    }

    if (openCategory === 'item') {
      const items = inventory.items.filter((i: Item) => i.usableInCombat)
      for (let i = 0; i < Math.min(items.length, 4); i++) {
        if (items[i]!.luckyClass && combat.pipsSpentThisTurn) continue
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = subBtnX(col)
        const y = geom.submenuY + row * (SUBMENU_BTN_H + 8)
        rects.push({ x, y, w: SUBMENU_BTN_W, h: SUBMENU_BTN_H, id: `item-${i}` })
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

function drawDeathPreventionNotification(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
): void {
  const preventionItem = inventory.items.find(i => i.deathPrevention === true)
  if (!preventionItem) return

  const notifW = 240
  const notifH = 120
  const notifX = (MAP_X + MAP_W / 2) - notifW / 2
  const notifY = (PANEL_TOP + (LOGICAL_H - PANEL_TOP) / 2) - notifH / 2

  roundRect(ctx, notifX, notifY, notifW, notifH, 6)
  ctx.fillStyle = colors.surface
  ctx.fill()
  ctx.strokeStyle = colors.gold
  ctx.lineWidth = 2
  ctx.stroke()

  let y = notifY + 10
  ctx.font = 'bold 16px monospace'
  ctx.fillStyle = colors.gold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(preventionItem.name, notifX + notifW / 2, y)

  y += 22
  ctx.font = '11px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const description = preventionItem.description
  const lines = description.split('\n')
  const lineHeight = 12
  for (const line of lines) {
    ctx.fillText(line, notifX + notifW / 2, y)
    y += lineHeight
  }

  y += 4
  ctx.font = 'bold 14px monospace'
  ctx.fillStyle = colors.gold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('Pip survives at 1 HP', notifX + notifW / 2, y)
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

// ── Legacy exports (for external callers, maps to dynamic values with default pool) ──

export const CAT_BTN_Y = PANEL_TOP + 14 + 68 + 22  // approximate with default 4-dice pool
export const PIP_BTN_Y = CAT_BTN_Y
export const SUBMENU_Y = PIP_BTN_Y + PIP_BTN_H + 22

export function dieCentres(diceCount: number): number[] {
  const size = 68  // default for 4 dice
  const gap = 12
  const totalW = diceCount * size + (diceCount - 1) * gap
  const startX = MAP_X + (MAP_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (size + gap))
}
