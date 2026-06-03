import { colors } from '../colors'
import type { CombatState } from './types'
import { PANEL_TOP } from '../dice/panel'

const LOGICAL_W = 390
const LOGICAL_H = 844

const STATUS_MID_Y = 25
const BAR_H = 8
const BAR_EMPTY = '#2a2a3a'
const ENEMY_RED = '#7a1a1a'

export function drawCombatStatusBar(
  ctx: CanvasRenderingContext2D,
  pipHp: number,
  pipMaxHp: number,
  combat: CombatState,
): void {
  const midY = STATUS_MID_Y
  const barY = midY - BAR_H / 2

  // PIP label
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const pipLabelX = 110
  ctx.fillText('PIP', pipLabelX, midY)
  const pipLabelW = ctx.measureText('PIP').width

  // PIP bar
  const pipBarX = pipLabelX + pipLabelW + 6
  const pipBarW = 80
  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(pipBarX, barY, pipBarW, BAR_H)
  const pipFill = Math.max(0, pipHp / pipMaxHp) * pipBarW
  ctx.fillStyle = colors.gold
  ctx.fillRect(pipBarX, barY, pipFill, BAR_H)

  // PIP HP text
  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${pipHp}/${pipMaxHp}`, pipBarX + pipBarW + 4, midY)

  // Enemy label
  const enemyLabelX = 260
  const enemyName = combat.enemy.name.toUpperCase()
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = ENEMY_RED
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(enemyName, enemyLabelX, midY)
  const enemyLabelW = ctx.measureText(enemyName).width

  // Enemy bar
  const enemyBarX = enemyLabelX + enemyLabelW + 6
  const enemyBarW = 60
  ctx.fillStyle = BAR_EMPTY
  ctx.fillRect(enemyBarX, barY, enemyBarW, BAR_H)
  const enemyFill = Math.max(0, combat.enemy.hp / combat.enemy.maxHp) * enemyBarW
  ctx.fillStyle = ENEMY_RED
  ctx.fillRect(enemyBarX, barY, enemyFill, BAR_H)

  // Enemy HP text
  ctx.font = '10px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${combat.enemy.hp}/${combat.enemy.maxHp}`, enemyBarX + enemyBarW + 4, midY)
}

export function drawCombatBanner(
  ctx: CanvasRenderingContext2D,
  timestamp: DOMHighResTimeStamp,
  combat: CombatState,
  bannerStartTime: number,
  panelTopOverride: number,
): void {
  const off = panelTopOverride - PANEL_TOP
  ctx.save()
  ctx.translate(0, off)

  const extraH = Math.max(0, -off)
  const panelH = LOGICAL_H - PANEL_TOP + extraH
  const isVictory = combat.phase === 'victory'

  const bgColor = isVictory ? colors.surface : colors.bg
  const borderColor = isVictory ? colors.gold : ENEMY_RED
  const titleColor = isVictory ? colors.gold : ENEMY_RED
  const titleText = isVictory ? '── VICTORY ──' : '── DEFEATED ──'
  const subtitleText = isVictory ? `${combat.enemy.name} defeated!` : 'Pip has fallen…'

  // Background
  ctx.fillStyle = bgColor
  ctx.beginPath()
  const ctxAny = ctx as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number[]) => void
  }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(0, PANEL_TOP, LOGICAL_W, panelH, [8, 8, 0, 0])
  } else {
    ctx.rect(0, PANEL_TOP, LOGICAL_W, panelH)
  }
  ctx.fill()

  // Top border line
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, PANEL_TOP)
  ctx.lineTo(LOGICAL_W, PANEL_TOP)
  ctx.stroke()

  const cx = LOGICAL_W / 2
  const midY = PANEL_TOP + (LOGICAL_H - PANEL_TOP) / 2

  // Title
  ctx.font = 'bold 22px monospace'
  ctx.fillStyle = titleColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(titleText, cx, midY - 30)

  // Subtitle
  ctx.font = isVictory
    ? '14px system-ui, -apple-system, sans-serif'
    : 'italic 14px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = isVictory ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(subtitleText, cx, midY)

  // Gold reward line (victory only)
  if (isVictory) {
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`+ ${combat.goldAwarded} gold  ◈`, cx, midY + 26)
  }

  // "Tap to continue" fades in after 0.5 s
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
