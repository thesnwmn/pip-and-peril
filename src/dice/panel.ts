import { colors } from '../colors'
import type { DicePool, DieColor, PipCost } from './pool'
import { canAfford, rollPool, spendPips } from './pool'

// ── Layout constants ─────────────────────────────────────────────────────────

const LOGICAL_W = 390
const LOGICAL_H = 844

// PANEL_TOP must match game.ts (LOG_BOTTOM + 6 ≈ 472)
export const PANEL_TOP = 472
const PANEL_CORNER = 8
const SIDE_MARGIN = 16

// Die faces
const DIE_SIZE = 68
const DIE_GAP = 10
const DIE_RADIUS = 12
const DIE_ROW_Y = PANEL_TOP + 36         // top of die faces
const PIP_DOT_R = 4.5                    // pip circle radius

// Colour label row
const LABEL_Y = DIE_ROW_Y + DIE_SIZE + 8

// Badge row
const BADGE_Y = LABEL_Y + 18
const BADGE_H = 26
const BADGE_PAD_X = 8

// ROLL button
const ROLL_BTN_Y = BADGE_Y + BADGE_H + 12
const ROLL_BTN_H = 44
const ROLL_BTN_X = SIDE_MARGIN
const ROLL_BTN_W = LOGICAL_W - SIDE_MARGIN * 2

// Action buttons (2-column grid)
const ACTION_Y = ROLL_BTN_Y + ROLL_BTN_H + 12
const ACTION_BTN_H = 46
const ACTION_BTN_W = (LOGICAL_W - SIDE_MARGIN * 2 - 10) / 2
const ACTION_BTN_RADIUS = 8

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
  const startX = (LOGICAL_W - totalW) / 2
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
  ctx.fillText('ROLL DICE', LOGICAL_W / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)
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

  ctx.font = '14px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(action.label, x + 10, y + 16)

  drawCostPill(ctx, action.cost, x + ACTION_BTN_W / 2, y + ACTION_BTN_H - 22)
  ctx.globalAlpha = 1
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

export interface DicePanelCallbacks {
  onStateChange: (pool: DicePool) => void
  addLog: (message: string) => void
  onAction?: (actionId: string) => void
  onBeforeRoll?: () => boolean
}

export function createDicePanel(
  getPool: () => DicePool,
  getPanelTop: () => number,
  callbacks: DicePanelCallbacks,
): {
  draw: (ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp) => void
  handleClick: (x: number, y: number) => void
  handlePointerMove: (x: number, y: number) => void
} {
  let hoveredElement: string | null = null
  let flashingAction: string | null = null
  let flashEndTime: number | null = null
  const anim: AnimState = { startTime: null, lastTickTime: 0, scramble: [] }

  function yOffset(): number { return getPanelTop() - PANEL_TOP }

  function actionButtonPos(i: number): { x: number; y: number } {
    const col = i % 2
    const row = Math.floor(i / 2)
    return {
      x: SIDE_MARGIN + col * (ACTION_BTN_W + 10),
      y: ACTION_Y + row * (ACTION_BTN_H + 8),
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
    roundRect(ctx, 0, PANEL_TOP, LOGICAL_W, panelH, PANEL_CORNER)
    ctx.fillStyle = colors.surface
    ctx.fill()
    ctx.strokeStyle = colors.logNormal
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, PANEL_TOP)
    ctx.lineTo(LOGICAL_W, PANEL_TOP)
    ctx.stroke()

    // "DICE" label
    ctx.font = '12px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('DICE', LOGICAL_W / 2, PANEL_TOP + 18)

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
      for (let i = 0; i < ACTIONS.length; i++) {
        const action = ACTIONS[i]
        const { x, y } = actionButtonPos(i)
        const affordable = canAfford(pool, action.cost)
        const hovered = hoveredElement === `action-${action.id}`
        const flashing = flashingAction === action.id
        drawActionButton(ctx, action, x, y, affordable, hovered, flashing)
      }
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    const pool = getPool()
    const hit = hitTest(x, y, pool)
    if (!hit) return

    if (hit === 'roll') {
      if (callbacks.onBeforeRoll && !callbacks.onBeforeRoll()) return
      const rolled = rollPool(pool)
      anim.startTime = performance.now()
      anim.lastTickTime = 0
      anim.scramble = []
      callbacks.onStateChange(rolled)
      return
    }

    if (hit.startsWith('action-')) {
      const actionId = hit.slice(7)
      const action = ACTIONS.find(a => a.id === actionId)
      if (!action) return

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
    hoveredElement = hitTest(x, y, pool)
  }

  return { draw, handleClick, handlePointerMove }
}
