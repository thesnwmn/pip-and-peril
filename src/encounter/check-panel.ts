import type { DicePool, Die } from '../dice/pool'
import { rollPool } from '../dice/pool'
import type { ApproachColour, CheckSpec } from './npc-scripts'
import { colors } from '../colors'
import { LOGICAL_W, LOGICAL_H, PANEL_TOP, MAP_X, MAP_W } from '../screens/game-layout'
import { PIP_SLOTS } from '../dice/pip-slots'

export type CheckBand = 'critical' | 'success' | 'cost' | 'failure'

export interface CheckPanelState {
  phase: 'stakes' | 'roll' | 'rolling' | 'outcome'
  chosenApproach: ApproachColour | null
  resultBand: CheckBand | null
  resultPips: number | null
}

interface CheckPanelContext {
  getPool: () => DicePool
  onResult: (band: CheckBand) => void
  allowBack?: boolean
}

// ── Layout — match trap/combat proportions ────────────────────────────────────

const SIDE_MARGIN = 16
const CONTENT_W = MAP_W - SIDE_MARGIN * 2    // 328
const CONTENT_LEFT = MAP_X + SIDE_MARGIN     // 26

// Content starts below the portrait (portrait straddles PANEL_TOP with r=26)
const CONTENT_TOP = PANEL_TOP + 34

// Stakes phase
const STAKE_LINE_H = 22
const APPROACH_LABEL_OFFSET = STAKE_LINE_H * 3 + 10
const APPROACH_BTN_H = 50
const APPROACH_BTN_GAP = 8

// Roll / rolling / outcome phases
const CHECK_TITLE_Y = CONTENT_TOP
const DIE_ROW_TOP = CONTENT_TOP + 32
const DIE_SIZE = 62
const DIE_RADIUS = 10
const DIE_GAP = 8
const PIP_DOT_R = 3.8

const ROLL_BTN_Y = DIE_ROW_TOP + DIE_SIZE + 16
const ROLL_BTN_H = 50
const NEEDS_LABEL_Y = ROLL_BTN_Y + ROLL_BTN_H + 12

// Animation
const ROLL_ANIM_MS = 600
const SCRAMBLE_INTERVAL = 55
const OUTCOME_HOLD_MS = 1500

// ── Colour lookups ────────────────────────────────────────────────────────────

const DIE_FACE_BG: Record<string, string> = {
  red: colors.dieFaceRed,
  blue: colors.dieFaceBlue,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
}

const COLOUR_GLYPH: Record<ApproachColour, string> = {
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡',
}

const COLOUR_LABEL: Record<ApproachColour, string> = {
  red: 'Demand', blue: 'Reason', green: 'Calm', yellow: 'Charm',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
  ctx.beginPath()
  if (ctxAny.roundRect) ctxAny.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

function dieCentresX(diceCount: number): number[] {
  const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
  const startX = MAP_X + (MAP_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
}

function drawDieFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  die: Die,
  value: number | null,
  chosen: boolean,
): void {
  ctx.save()
  if (!chosen) ctx.globalAlpha = 0.28

  roundRect(ctx, x, DIE_ROW_TOP, DIE_SIZE, DIE_SIZE, DIE_RADIUS)
  ctx.fillStyle = DIE_FACE_BG[die.color] ?? colors.dieFaceGreen
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (value !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    if (die.sides > 6) {
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(value), x + DIE_SIZE / 2, DIE_ROW_TOP + DIE_SIZE / 2)
    } else {
      const slots = PIP_SLOTS[value] ?? []
      const cellW = DIE_SIZE / 3
      for (const slot of slots) {
        const col = slot % 3
        const row = Math.floor(slot / 3)
        ctx.beginPath()
        ctx.arc(x + col * cellW + cellW / 2, DIE_ROW_TOP + row * cellW + cellW / 2, PIP_DOT_R, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.restore()
}

function approachBtnW(count: number): number {
  return Math.floor((CONTENT_W - (count - 1) * APPROACH_BTN_GAP) / count)
}

function drawApproachButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  approach: ApproachColour,
  hasPool: boolean,
  hovered: boolean,
): void {
  ctx.save()
  if (!hasPool) ctx.globalAlpha = 0.35

  roundRect(ctx, x, y, w, APPROACH_BTN_H, 6)
  ctx.fillStyle = hasPool && hovered ? 'rgba(200,180,150,0.2)' : 'rgba(200,180,150,0.08)'
  ctx.fill()
  ctx.strokeStyle = DIE_FACE_BG[approach]
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = 'bold 15px monospace'
  ctx.fillStyle = hasPool ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${COLOUR_GLYPH[approach]} ${COLOUR_LABEL[approach]}`, x + w / 2, y + APPROACH_BTN_H / 2)
  ctx.restore()
}

function evaluateCheck(pips: number, difficulty: number): CheckBand {
  if (pips >= difficulty + 2) return 'critical'
  if (pips >= difficulty) return 'success'
  const costThreshold = Math.max(1, Math.floor(difficulty / 2))
  if (pips >= costThreshold) return 'cost'
  return 'failure'
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word }
    else current = test
  }
  if (current) lines.push(current)
  return lines
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCheckPanel(
  check: CheckSpec,
  context: CheckPanelContext,
): {
  draw: (ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp) => void
  handleClick: (x: number, y: number) => void
  handlePointerMove: (x: number, y: number) => void
  getState: () => CheckPanelState
} {
  // Internal state
  type Phase = 'stakes' | 'roll' | 'rolling' | 'outcome'
  let phase: Phase = 'stakes'
  let chosenApproach: ApproachColour | null = null
  let rolledPool: DicePool | null = null
  let resultBand: CheckBand | null = null
  let resultPips: number | null = null
  let rollStartTime: DOMHighResTimeStamp | null = null
  let outcomeStartTime: DOMHighResTimeStamp | null = null
  let scrambleValues: number[] = []
  let lastScrambleTick = 0
  let resultFired = false
  let outcomeHeld = false

  let hoveredApproach: ApproachColour | null = null

  const btnW = approachBtnW(check.approaches.length)
  const APPROACH_BTN_TOP = CONTENT_TOP + 32

  // Hit zone helpers
  function approachZoneX(idx: number): number {
    return CONTENT_LEFT + idx * (btnW + APPROACH_BTN_GAP)
  }

  function inApproachBtn(x: number, y: number, idx: number): boolean {
    const bx = approachZoneX(idx)
    return x >= bx && x <= bx + btnW && y >= APPROACH_BTN_TOP && y <= APPROACH_BTN_TOP + APPROACH_BTN_H
  }

  function inRollBtn(x: number, y: number): boolean {
    return x >= CONTENT_LEFT && x <= CONTENT_LEFT + CONTENT_W
      && y >= ROLL_BTN_Y && y <= ROLL_BTN_Y + ROLL_BTN_H
  }

  function getPoolDiceForApproach(approach: ApproachColour): Die[] {
    return context.getPool().dice.filter(d => d.color === approach)
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Advance animation states
    if (phase === 'rolling' && rollStartTime !== null) {
      const elapsed = timestamp - rollStartTime
      if (elapsed >= ROLL_ANIM_MS) {
        phase = 'outcome'
        outcomeStartTime = timestamp
      } else if (timestamp - lastScrambleTick > SCRAMBLE_INTERVAL) {
        const pool = context.getPool()
        scrambleValues = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
        lastScrambleTick = timestamp
      }
    }
    if (phase === 'outcome' && outcomeStartTime !== null && !outcomeHeld) {
      if (timestamp - outcomeStartTime >= OUTCOME_HOLD_MS) {
        outcomeHeld = true
      }
    }

    ctx.save()
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    if (phase === 'stakes') {
      // Check title (bold and large like trap label)
      ctx.font = 'bold 19px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(check.title, MAP_X + MAP_W / 2, CONTENT_TOP)

      // Approach buttons (below title)
      check.approaches.forEach((approach, idx) => {
        const hasPool = getPoolDiceForApproach(approach).length > 0
        drawApproachButton(ctx, approachZoneX(idx), APPROACH_BTN_TOP, btnW, approach, hasPool, hoveredApproach === approach)
      })

      // Stakes text below buttons (wrapped with indentation for continuation lines)
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      let stakeY = APPROACH_BTN_TOP + APPROACH_BTN_H + 12

      // Helper to render a stake line with icon, handling wrapping with indentation
      const renderStakeLine = (icon: string, text: string) => {
        const lines = wrapText(ctx, text, CONTENT_W - 16)  // Leave room for indent
        lines.forEach((line, lineIdx) => {
          if (lineIdx === 0) {
            // First line: include the icon
            ctx.fillText(`${icon}  ${line}`, CONTENT_LEFT, stakeY)
          } else {
            // Continuation lines: indent to align with text
            ctx.fillText(`  ${line}`, CONTENT_LEFT, stakeY)
          }
          stakeY += STAKE_LINE_H
        })
      }

      renderStakeLine('✓', check.stakeSuccess)
      renderStakeLine('◑', check.stakeCost)
      renderStakeLine('✗', check.stakeFail)
    } else if (phase === 'roll' || phase === 'rolling' || phase === 'outcome') {
      // Check title (bold and large like stake phase)
      ctx.font = 'bold 19px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(check.title, MAP_X + MAP_W / 2, CHECK_TITLE_Y)

      // Dice row
      const pool = context.getPool()
      const centres = dieCentresX(pool.dice.length)

      pool.dice.forEach((die, i) => {
        const chosen = die.color === chosenApproach
        let value: number | null = null
        if (phase === 'rolling') {
          value = scrambleValues[i] ?? null
        } else if (phase === 'outcome' && rolledPool) {
          value = rolledPool.rolls[i]?.value ?? null
        }
        drawDieFace(ctx, centres[i], die, value, chosen)
      })

      if (phase === 'roll') {
        // Roll button
        roundRect(ctx, CONTENT_LEFT, ROLL_BTN_Y, CONTENT_W, ROLL_BTN_H, 6)
        ctx.fillStyle = 'rgba(200,180,150,0.12)'
        ctx.fill()
        ctx.strokeStyle = colors.textMuted
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.font = 'bold 18px monospace'
        ctx.fillStyle = colors.textPrimary
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Roll', MAP_X + MAP_W / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)

        // Needs label (below roll button)
        ctx.font = '13px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`Needs ${COLOUR_GLYPH[chosenApproach!]} ${check.difficulty}`, MAP_X + MAP_W / 2, NEEDS_LABEL_Y)
      } else if (phase === 'rolling') {
        // Roll button — pulsing/greyed while animating
        roundRect(ctx, CONTENT_LEFT, ROLL_BTN_Y, CONTENT_W, ROLL_BTN_H, 6)
        ctx.fillStyle = 'rgba(200,180,150,0.06)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(139,115,85,0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.font = 'bold 18px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Rolling…', MAP_X + MAP_W / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)

        // Needs label (below roll button)
        ctx.font = '13px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`Needs ${COLOUR_GLYPH[chosenApproach!]} ${check.difficulty}`, MAP_X + MAP_W / 2, NEEDS_LABEL_Y)
      } else {
        // Outcome — show result in place of roll button
        const bandLabel =
          resultBand === 'critical' ? 'Critical' :
          resultBand === 'success'  ? 'Success'  :
          resultBand === 'cost'     ? 'Partial'  : 'Fail'

        const resultText = `${COLOUR_GLYPH[chosenApproach!]} ${resultPips} vs. ${check.difficulty} — ${bandLabel}`

        ctx.font = 'bold 16px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(resultText, MAP_X + MAP_W / 2, ROLL_BTN_Y + 6)

        // Outcome line (NPC reaction from spec)
        const outcomeLine =
          resultBand === 'critical' ? (check.critLine ?? check.successLine) :
          resultBand === 'success'  ? check.successLine :
          resultBand === 'cost'     ? check.costLine    : check.failLine

        ctx.font = 'italic 14px monospace'
        ctx.fillStyle = colors.textMuted
        const lines = wrapText(ctx, outcomeLine, CONTENT_W)
        let outcomeY = ROLL_BTN_Y + 28
        lines.forEach((line, i) => {
          ctx.fillText(line, MAP_X + MAP_W / 2, outcomeY + i * 20)
        })
        outcomeY += lines.length * 20 + 12

        // Continue prompt (if held long enough)
        if (outcomeHeld) {
          ctx.font = 'italic 13px monospace'
          ctx.fillStyle = colors.textMuted
          ctx.fillText('(tap to continue)', MAP_X + MAP_W / 2, outcomeY)
        }
      }
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    if (phase === 'stakes') {
      check.approaches.forEach((approach, idx) => {
        if (inApproachBtn(x, y, idx)) {
          if (getPoolDiceForApproach(approach).length > 0) {
            chosenApproach = approach
            phase = 'roll'
          }
        }
      })
    } else if (phase === 'roll') {
      if (inRollBtn(x, y)) {
        const pool = context.getPool()
        rolledPool = rollPool(pool)
        const pips = rolledPool.rolls
          .filter(d => d.color === chosenApproach)
          .reduce((s, d) => s + d.value, 0)
        resultPips = pips
        resultBand = evaluateCheck(pips, check.difficulty)
        scrambleValues = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
        lastScrambleTick = performance.now()
        rollStartTime = performance.now()
        phase = 'rolling'
      }
    } else if (phase === 'outcome' && outcomeHeld && !resultFired) {
      resultFired = true
      context.onResult(resultBand!)
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (phase === 'stakes') {
      hoveredApproach = null
      check.approaches.forEach((approach, idx) => {
        if (inApproachBtn(x, y, idx)) hoveredApproach = approach
      })
    }
  }

  return {
    draw,
    handleClick,
    handlePointerMove,
    getState: () => ({ phase, chosenApproach, resultBand, resultPips }),
  }
}
