import { colors } from '../colors'
import type { CombatState } from './types'
import { MAP_X, MAP_W, MAP_Y, TILE_SIZE, VIEWPORT_ROWS } from '../screens/game-layout'

const GUARD_STEEL = '#5a6b82'
const ENEMY_RED = colors.logEnemy
const BAR_H = 8
const BAR_EMPTY = '#2a2a3a'

const MAP_BOTTOM = MAP_Y + VIEWPORT_ROWS * TILE_SIZE  // 410

// Three-row layout anchored to the bottom of the map zone:
//   Row A  intent telegraph (enemy side only, right-aligned)
//   Row B  HP bars
//   Row C  name plates + HP totals (below the bars)
const INTENT_ROW_Y = MAP_BOTTOM - 44
const HP_BAR_Y     = MAP_BOTTOM - 32
const HP_LABEL_Y   = MAP_BOTTOM - 14
const HP_BAR_W     = 146
const SCRIM_H      = 70

const PIP_COL_X   = MAP_X + 12
const ENEMY_COL_X = MAP_X + MAP_W / 2 + 4

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

// Draws HP bars and intent telegraph over the map zone.
// Intent sits just above the enemy bar, right-aligned; names/totals sit below the bars.
export function drawCombatOverlay(
  ctx: CanvasRenderingContext2D,
  combat: CombatState,
  pipHp: number,
  pipMaxHp: number,
): void {
  ctx.save()

  ctx.beginPath()
  ctx.rect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
  ctx.clip()

  // Scrim gradient behind the three-row HUD.
  const grad = ctx.createLinearGradient(0, MAP_BOTTOM - SCRIM_H, 0, MAP_BOTTOM)
  grad.addColorStop(0, 'rgba(13,13,26,0)')
  grad.addColorStop(1, 'rgba(13,13,26,0.78)')
  ctx.fillStyle = grad
  ctx.fillRect(MAP_X, MAP_BOTTOM - SCRIM_H, MAP_W, SCRIM_H)

  // ── Row A: intent telegraph (enemy side, right-aligned) ───────────────────
  const intentIcon = combat.intent.kind === 'attack' ? '⚔️' : '🛡'
  const intentKind = combat.intent.kind === 'attack' ? 'Attack' : 'Guard'
  const intentColor = combat.intent.kind === 'attack' ? ENEMY_RED : GUARD_STEEL
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = intentColor
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${intentIcon} ${intentKind} ${combat.intent.value}`, ENEMY_COL_X + HP_BAR_W, INTENT_ROW_Y)

  // ── Row B: HP bars ────────────────────────────────────────────────────────
  // Pip
  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(PIP_COL_X, HP_BAR_Y, HP_BAR_W, BAR_H)
  ctx.fillStyle = colors.gold
  ctx.fillRect(PIP_COL_X, HP_BAR_Y, Math.max(0, pipHp / pipMaxHp) * HP_BAR_W, BAR_H)

  // Enemy
  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(ENEMY_COL_X, HP_BAR_Y, HP_BAR_W, BAR_H)
  ctx.fillStyle = ENEMY_RED
  ctx.fillRect(
    ENEMY_COL_X, HP_BAR_Y,
    Math.max(0, combat.enemy.hp / combat.enemy.maxHp) * HP_BAR_W,
    BAR_H,
  )

  // ── Row C: name plates + HP totals (below bars) ───────────────────────────
  ctx.font = 'bold 10px monospace'
  ctx.textBaseline = 'middle'

  // Pip — name left, total right
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.fillText('PIP', PIP_COL_X, HP_LABEL_Y)
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  ctx.fillText(`${pipHp}/${pipMaxHp}`, PIP_COL_X + HP_BAR_W, HP_LABEL_Y)

  // Enemy — name left (enemy colour), total right; append block count if any
  ctx.fillStyle = ENEMY_RED
  ctx.textAlign = 'left'
  ctx.fillText(combat.enemy.name.toUpperCase(), ENEMY_COL_X, HP_LABEL_Y)
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'right'
  const hpText = `${combat.enemy.hp}/${combat.enemy.maxHp}${combat.enemy.block > 0 ? `  🛡${combat.enemy.block}` : ''}`
  ctx.fillText(hpText, ENEMY_COL_X + HP_BAR_W, HP_LABEL_Y)

  ctx.restore()
}
