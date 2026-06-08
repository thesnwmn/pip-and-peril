import type { DicePool, Die } from '../dice/pool'
import { rollPool } from '../dice/pool'
import type { ApproachColour, CheckSpec } from './npc-scripts'
import { colors } from '../colors'
import { LOGICAL_W, LOGICAL_H, PANEL_TOP } from '../screens/game-layout'

export type CheckBand = 'critical' | 'success' | 'cost' | 'failure'

export interface CheckPanelState {
  phase: 'stakes' | 'roll' | 'outcome'
  chosenApproach: ApproachColour | null
  rolledPool: DicePool | null
  resultBand: CheckBand | null
  resultPips: number | null
}

interface CheckPanelContext {
  getPool: () => DicePool
  onResult: (band: CheckBand) => void
  allowBack?: boolean
}

const SIDE_MARGIN = 16
const CONTENT_W = LOGICAL_W - SIDE_MARGIN * 2

const STAKE_TOP = PANEL_TOP + 16
const APPROACH_LABEL_Y = STAKE_TOP + 72
const APPROACH_BTN_TOP = APPROACH_LABEL_Y + 20
const APPROACH_BTN_W = 100
const APPROACH_BTN_H = 44
const APPROACH_BTN_GAP = 8

const DIE_SIZE = 48
const DIE_RADIUS = 6
const DIE_ROW_TOP = PANEL_TOP + 90
const DIE_GAP = 6

const DIE_FACE_BG: Record<string, string> = {
  red: colors.dieFaceRed,
  blue: colors.dieFaceBlue,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
}

const COLOUR_TO_GLYPH: Record<ApproachColour, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
}

function computeHitZones(approaches: ApproachColour[], allowBack: boolean) {
  const zones: Record<string, { x: number; y: number; w: number; h: number }> = {}

  const totalW = approaches.length * APPROACH_BTN_W + (approaches.length - 1) * APPROACH_BTN_GAP
  const startX = SIDE_MARGIN + (CONTENT_W - totalW) / 2

  approaches.forEach((approach, idx) => {
    zones[approach] = {
      x: startX + idx * (APPROACH_BTN_W + APPROACH_BTN_GAP),
      y: APPROACH_BTN_TOP,
      w: APPROACH_BTN_W,
      h: APPROACH_BTN_H,
    }
  })

  if (allowBack) {
    zones['back'] = {
      x: SIDE_MARGIN,
      y: LOGICAL_H - 60,
      w: 100,
      h: 40,
    }
  }

  zones['roll'] = {
    x: SIDE_MARGIN,
    y: LOGICAL_H - 60,
    w: CONTENT_W,
    h: 50,
  }

  return zones
}

function drawApproachButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  approach: ApproachColour,
  hasPool: boolean,
  hovered: boolean,
): void {
  const alpha = hasPool ? 1 : 0.35

  ctx.save()
  if (!hasPool) ctx.globalAlpha = alpha

  ctx.beginPath()
  ctx.rect(x, y, APPROACH_BTN_W, APPROACH_BTN_H)
  ctx.fillStyle = hasPool
    ? (hovered ? 'rgba(200, 180, 150, 0.2)' : 'rgba(200, 180, 150, 0.1)')
    : 'rgba(200, 180, 150, 0.05)'
  ctx.fill()

  ctx.strokeStyle = DIE_FACE_BG[approach]
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = 'bold 14px monospace'
  ctx.fillStyle = hasPool ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = `${COLOUR_TO_GLYPH[approach]} ${approach.charAt(0).toUpperCase() + approach.slice(1)}`
  ctx.fillText(label, x + APPROACH_BTN_W / 2, y + APPROACH_BTN_H / 2)

  ctx.restore()
}

function drawDieFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  die: { color: string; sides: number },
  value: number | null,
  chosen: boolean,
): void {
  ctx.save()
  if (!chosen) ctx.globalAlpha = 0.3

  ctx.beginPath()
  const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, DIE_ROW_TOP, DIE_SIZE, DIE_SIZE, DIE_RADIUS)
  } else {
    ctx.rect(x, DIE_ROW_TOP, DIE_SIZE, DIE_SIZE)
  }
  ctx.fillStyle = DIE_FACE_BG[die.color] ?? colors.dieFaceGreen
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (value !== null && value > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    if (die.sides === 6) {
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(value), x + DIE_SIZE / 2, DIE_ROW_TOP + DIE_SIZE / 2)
    } else {
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(value), x + DIE_SIZE / 2, DIE_ROW_TOP + DIE_SIZE / 2)
    }
  }

  ctx.restore()
}

function dieCentresX(diceCount: number): number[] {
  const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
  const startX = SIDE_MARGIN + (CONTENT_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
}

function evaluateCheck(pips: number, difficulty: number): CheckBand {
  if (pips >= difficulty + 2) return 'critical'
  if (pips >= difficulty) return 'success'
  const costThreshold = Math.max(1, Math.floor(difficulty / 2))
  if (pips >= costThreshold) return 'cost'
  return 'failure'
}

export function createCheckPanel(
  check: CheckSpec,
  context: CheckPanelContext,
): {
  draw: (ctx: CanvasRenderingContext2D) => void
  handleClick: (x: number, y: number) => void
  handlePointerMove: (x: number, y: number) => void
  getState: () => CheckPanelState
} {
  let state: CheckPanelState = {
    phase: 'stakes',
    chosenApproach: null,
    rolledPool: null,
    resultBand: null,
    resultPips: null,
  }

  let hoveredApproach: ApproachColour | null = null
  const hitZones = computeHitZones(check.approaches, context.allowBack ?? false)

  function getPoolForApproach(approach: ApproachColour): Die[] {
    const pool = context.getPool()
    return pool.dice.filter(d => d.color === approach)
  }

  function draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = 1

    // Background
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, LOGICAL_H - PANEL_TOP)

    // Top border stripe
    ctx.fillStyle = colors.roomNpc
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, 3)

    if (state.phase === 'stakes') {
      // Stakes summary
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`✓ ${check.stakeSuccess}`, SIDE_MARGIN, STAKE_TOP)
      ctx.fillText(`◑ ${check.stakeCost}`, SIDE_MARGIN, STAKE_TOP + 20)
      ctx.fillText(`✗ ${check.stakeFail}`, SIDE_MARGIN, STAKE_TOP + 40)

      // Approach label
      ctx.font = '13px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.fillText('Choose approach:', SIDE_MARGIN, APPROACH_LABEL_Y)

      // Approach buttons
      check.approaches.forEach((approach) => {
        const pool = getPoolForApproach(approach)
        const hasPool = pool.length > 0
        drawApproachButton(
          ctx,
          hitZones[approach].x,
          hitZones[approach].y,
          approach,
          hasPool,
          hoveredApproach === approach,
        )
      })
    } else if (state.phase === 'roll') {
      // Condensed stakes
      ctx.font = '12px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const stakeText = `✓ ${check.stakeSuccess.substring(0, 15)}… ◑ ${check.stakeCost.substring(0, 15)}… ✗ ${check.stakeFail.substring(0, 15)}…`
      ctx.fillText(stakeText, SIDE_MARGIN, STAKE_TOP)

      // Needs label
      const needsText = `Needs ${COLOUR_TO_GLYPH[state.chosenApproach!]} ${check.difficulty}`
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.fillText(needsText, SIDE_MARGIN, APPROACH_LABEL_Y)

      // Draw dice pool
      const pool = context.getPool()
      const centres = dieCentresX(pool.dice.length)
      pool.dice.forEach((die, i) => {
        const chosen = die.color === state.chosenApproach
        const value = state.rolledPool ? state.rolledPool.rolls[i]?.value ?? null : null
        drawDieFace(ctx, centres[i], die, value, chosen)
      })

      // Roll button background
      ctx.fillStyle = 'rgba(200, 180, 150, 0.2)'
      ctx.fillRect(hitZones.roll.x, hitZones.roll.y, hitZones.roll.w, hitZones.roll.h)

      // Roll button text
      ctx.font = '18px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('[       Roll       ]', LOGICAL_W / 2, hitZones.roll.y + hitZones.roll.h / 2)
    } else if (state.phase === 'outcome') {
      // Outcome line
      const outcomeLine =
        state.resultBand === 'critical' ? (check.critLine ?? check.successLine) :
        state.resultBand === 'success' ? check.successLine :
        state.resultBand === 'cost' ? check.costLine :
        check.failLine

      ctx.font = '16px italic monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const maxW = CONTENT_W
      const wrappedLines = wrapText(ctx, outcomeLine, maxW)
      wrappedLines.forEach((line, idx) => {
        ctx.fillText(line, SIDE_MARGIN, STAKE_TOP + idx * 20)
      })

      // Result summary
      const bandLabel =
        state.resultBand === 'critical' ? 'Critical' :
        state.resultBand === 'success' ? 'Success' :
        state.resultBand === 'cost' ? 'Partial' :
        'Fail'

      const resultText = `${COLOUR_TO_GLYPH[state.chosenApproach!]} ${state.resultPips} vs. ${check.difficulty} — ${bandLabel}`
      ctx.font = '14px italic monospace'
      ctx.fillStyle = colors.textMuted
      ctx.fillText(resultText, SIDE_MARGIN, STAKE_TOP + (wrappedLines.length + 1) * 20)
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    if (state.phase === 'stakes') {
      for (const approach of check.approaches) {
        const zone = hitZones[approach]
        if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
          const pool = getPoolForApproach(approach)
          if (pool.length > 0) {
            state = {
              phase: 'roll',
              chosenApproach: approach,
              rolledPool: null,
              resultBand: null,
              resultPips: null,
            }
          }
          return
        }
      }

      if (context.allowBack && hitZones.back) {
        const zone = hitZones.back
        if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
          // Caller handles back action
        }
      }
    } else if (state.phase === 'roll') {
      const zone = hitZones.roll
      if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
        // Roll the pool
        const pool = context.getPool()
        state.rolledPool = rollPool(pool)

        // Calculate pips of chosen colour
        const chosenPips = state.rolledPool!.rolls
          .filter(d => d.color === state.chosenApproach)
          .reduce((sum, d) => sum + d.value, 0)

        state.resultPips = chosenPips
        state.resultBand = evaluateCheck(chosenPips, check.difficulty)
        state.phase = 'outcome'

        // Auto-advance after 1.5s
        setTimeout(() => {
          context.onResult(state.resultBand!)
        }, 1500)
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (state.phase === 'stakes') {
      hoveredApproach = null
      for (const approach of check.approaches) {
        const zone = hitZones[approach]
        if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
          hoveredApproach = approach
          break
        }
      }
    }
  }

  return {
    draw,
    handleClick,
    handlePointerMove,
    getState: () => state,
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word
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
