import { colors } from '../colors'
import type { CombatState } from './types'
import { MAP_X, MAP_W, MAP_Y, TILE_SIZE, VIEWPORT_ROWS } from '../screens/game-layout'

const OVERLAY_SCRIM = 'rgba(13,13,26,0.55)'
const GUARD_STEEL = '#5a6b82'
const ENEMY_RED = colors.logEnemy
const BAR_H = 8
const BAR_EMPTY = '#2a2a3a'

const MAP_BOTTOM = MAP_Y + VIEWPORT_ROWS * TILE_SIZE  // 410
const MAP_MID_Y = MAP_Y + (VIEWPORT_ROWS * TILE_SIZE) / 2

// HP bar geometry — anchored to the bottom of the visible map zone.
const HP_LABEL_Y = MAP_BOTTOM - 38
const HP_BAR_Y = MAP_BOTTOM - 24
const HP_BAR_W = 146

const PIP_COL_X = MAP_X + 12
const ENEMY_COL_X = MAP_X + MAP_W / 2 + 4

// Small intent pill — visible during player-turn in the upper-right.
const INTENT_CX = MAP_X + Math.round(MAP_W * 0.73)
const INTENT_CY = MAP_Y + 54

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath()
  const ctxAny = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.fill()
}

// Draws HP bars for Pip and the enemy, plus the intent display, over the map zone.
// During 'awaiting-roll' the intent is rendered as a large centred panel to prompt acknowledgement.
// During 'player-turn' it shrinks to a small pill in the upper-right.
export function drawCombatOverlay(
  ctx: CanvasRenderingContext2D,
  combat: CombatState,
  pipHp: number,
  pipMaxHp: number,
): void {
  ctx.save()

  // Clip to the visible map zone so nothing bleeds into the panel gap.
  ctx.beginPath()
  ctx.rect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
  ctx.clip()

  // ── Scrim gradient behind HP bars ─────────────────────────────────────────
  const scrumH = 52
  const grad = ctx.createLinearGradient(0, MAP_BOTTOM - scrumH, 0, MAP_BOTTOM)
  grad.addColorStop(0, 'rgba(13,13,26,0)')
  grad.addColorStop(1, 'rgba(13,13,26,0.72)')
  ctx.fillStyle = grad
  ctx.fillRect(MAP_X, MAP_BOTTOM - scrumH, MAP_W, scrumH)

  // ── Pip HP bar (left column) ───────────────────────────────────────────────
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('PIP', PIP_COL_X, HP_LABEL_Y)

  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  ctx.fillText(`${pipHp}/${pipMaxHp}`, PIP_COL_X + HP_BAR_W, HP_LABEL_Y)

  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(PIP_COL_X, HP_BAR_Y, HP_BAR_W, BAR_H)
  ctx.fillStyle = colors.gold
  ctx.fillRect(PIP_COL_X, HP_BAR_Y, Math.max(0, pipHp / pipMaxHp) * HP_BAR_W, BAR_H)

  // ── Enemy HP bar (right column) ────────────────────────────────────────────
  const enemyName = combat.enemy.name.toUpperCase()
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = ENEMY_RED
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(enemyName, ENEMY_COL_X, HP_LABEL_Y)

  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  ctx.fillText(`${combat.enemy.hp}/${combat.enemy.maxHp}`, ENEMY_COL_X + HP_BAR_W, HP_LABEL_Y)

  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(ENEMY_COL_X, HP_BAR_Y, HP_BAR_W, BAR_H)
  ctx.fillStyle = ENEMY_RED
  ctx.fillRect(
    ENEMY_COL_X, HP_BAR_Y,
    Math.max(0, combat.enemy.hp / combat.enemy.maxHp) * HP_BAR_W,
    BAR_H,
  )

  // Guard block indicator next to enemy HP text.
  if (combat.enemy.block > 0) {
    ctx.font = 'bold 10px monospace'
    ctx.fillStyle = GUARD_STEEL
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`\u{1F6E1}${combat.enemy.block}`, ENEMY_COL_X + HP_BAR_W + 4, HP_LABEL_Y)
  }

  // ── Intent display ────────────────────────────────────────────────────────
  const intentIcon = combat.intent.kind === 'attack' ? '⚔️' : '\u{1F6E1}️'
  const intentColor = combat.intent.kind === 'attack' ? ENEMY_RED : GUARD_STEEL

  if (combat.phase === 'awaiting-roll') {
    // Large centred panel — player must tap ROLL DICE to acknowledge.
    const panelW = MAP_W - 32
    const panelH = 88
    const panelX = MAP_X + 16
    const panelY = MAP_MID_Y - panelH / 2 - 16

    ctx.fillStyle = 'rgba(10,10,20,0.82)'
    fillRoundRect(ctx, panelX, panelY, panelW, panelH, 10)

    ctx.strokeStyle = intentColor
    ctx.lineWidth = 2
    ctx.beginPath()
    const ctxAny = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
    if (ctxAny.roundRect) { ctxAny.roundRect(panelX, panelY, panelW, panelH, 10) } else { ctx.rect(panelX, panelY, panelW, panelH) }
    ctx.stroke()

    const cx = MAP_X + MAP_W / 2
    const labelY = panelY + 20

    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = intentColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${combat.enemy.name.toUpperCase()} TELEGRAPHS`, cx, labelY)

    ctx.font = 'bold 26px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.fillText(`${intentIcon}  ${combat.intent.value}`, cx, panelY + panelH / 2 + 8)

    const actionLabel = combat.intent.kind === 'attack' ? 'ATTACK' : 'GUARD'
    ctx.font = '11px monospace'
    ctx.fillStyle = intentColor
    ctx.fillText(actionLabel, cx, panelY + panelH - 14)
  } else {
    // Small pill in upper-right during player-turn.
    const intentVal = String(combat.intent.value)
    ctx.font = 'bold 14px monospace'
    const iconW = ctx.measureText(intentIcon).width
    const valW = ctx.measureText(intentVal).width
    const pillPad = 10
    const pillW = iconW + 6 + valW + pillPad * 2
    const pillH = 28
    const pillX = INTENT_CX - pillW / 2
    const pillY = INTENT_CY - pillH / 2

    ctx.fillStyle = OVERLAY_SCRIM
    fillRoundRect(ctx, pillX, pillY, pillW, pillH, 6)

    const textMidY = INTENT_CY
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colors.textPrimary
    ctx.fillText(intentIcon, pillX + pillPad, textMidY)
    ctx.fillStyle = intentColor
    ctx.fillText(intentVal, pillX + pillPad + iconW + 6, textMidY)
  }

  ctx.restore()
}
