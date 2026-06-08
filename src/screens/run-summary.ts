import { colors } from '../colors'
import type { RunSummary } from './types'
import type { ScreenController } from './main-menu'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BUTTON_W = 200
const BUTTON_H = 50
const BUTTON_X = (LOGICAL_W - BUTTON_W) / 2
const BUTTON_Y = 700

const HEADER_Y = 80
const CARD_TOP = 220
const CARD_WIDTH = 280
const CARD_X = (LOGICAL_W - CARD_WIDTH) / 2
const CARD_HEIGHT = 280
const CARD_PADDING = 18

const GOLD_SYMBOL = '◈'

export function createRunSummary(
  transitionTo: (screen: string) => void,
  summary: RunSummary,
): ScreenController {
  let hoveredElement: string | null = null
  let isMouseDevice = false
  let fadeInStartTime: DOMHighResTimeStamp | null = null
  let animationStartTime: DOMHighResTimeStamp | null = null

  const FADE_IN_DURATION = 600
  const STATS_ANIMATION_DURATION = 1000
  const BUTTON_FADE_DELAY = 500

  function isInBeginAgainButton(x: number, y: number): boolean {
    return (
      x >= BUTTON_X &&
      x <= BUTTON_X + BUTTON_W &&
      y >= BUTTON_Y &&
      y <= BUTTON_Y + BUTTON_H
    )
  }

  function getCardOpacity(timestamp: DOMHighResTimeStamp): number {
    if (fadeInStartTime === null) return 0
    const elapsed = timestamp - fadeInStartTime
    if (elapsed >= FADE_IN_DURATION) return 1
    return elapsed / FADE_IN_DURATION
  }

  function getAnimatedValue(
    startValue: number,
    endValue: number,
    timestamp: DOMHighResTimeStamp,
  ): number {
    if (animationStartTime === null) return startValue
    const elapsed = timestamp - animationStartTime
    if (elapsed >= STATS_ANIMATION_DURATION) return endValue

    // Easing function: ease-out cubic
    const t = Math.min(1, elapsed / STATS_ANIMATION_DURATION)
    const eased = 1 - Math.pow(1 - t, 3)
    return Math.round(startValue + (endValue - startValue) * eased)
  }

  function getButtonOpacity(timestamp: DOMHighResTimeStamp): number {
    if (fadeInStartTime === null) return 0
    const elapsed = timestamp - fadeInStartTime
    const fadeDelay = BUTTON_FADE_DELAY
    if (elapsed < fadeDelay) return 0
    const fadeStart = fadeDelay
    const fadeDuration = 500
    if (elapsed >= fadeStart + fadeDuration) return 1
    return (elapsed - fadeStart) / fadeDuration
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (fadeInStartTime === null) {
      fadeInStartTime = timestamp
      animationStartTime = timestamp + FADE_IN_DURATION
    }

    // Background
    ctx.fillStyle = colors.surfaceParchment
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // Calculate opacity for fade-in effect
    const cardOpacity = getCardOpacity(timestamp)
    ctx.globalAlpha = cardOpacity

    // Header
    const headerColor = summary.outcome === 'victory' ? colors.gold : colors.textPrimary
    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = headerColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const headerText = summary.outcome === 'victory' ? 'RUN COMPLETE' : 'THE RUN ENDS'
    ctx.fillText(headerText, LOGICAL_W / 2, HEADER_Y)

    // Header rule
    const ruleColor = summary.outcome === 'victory' ? colors.gold : colors.textMuted
    ctx.strokeStyle = ruleColor
    ctx.globalAlpha = cardOpacity * (summary.outcome === 'victory' ? 0.4 : 0.4)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(50, HEADER_Y + 35)
    ctx.lineTo(LOGICAL_W - 50, HEADER_Y + 35)
    ctx.stroke()
    ctx.globalAlpha = cardOpacity

    // Stats card background and border
    ctx.fillStyle = colors.surfaceParchment
    ctx.fillRect(CARD_X, CARD_TOP, CARD_WIDTH, CARD_HEIGHT)

    ctx.strokeStyle = colors.parchmentRule
    ctx.lineWidth = 1
    const ctxAny = ctx as any
    if ('roundRect' in ctxAny) {
      ctxAny.roundRect(CARD_X, CARD_TOP, CARD_WIDTH, CARD_HEIGHT, 4)
      ctx.stroke()
    } else {
      ctx.strokeRect(CARD_X, CARD_TOP, CARD_WIDTH, CARD_HEIGHT)
    }

    // Stats content
    const statY = CARD_TOP + CARD_PADDING

    // Helper to draw a stat row
    function drawStatRow(
      label: string,
      value: string | number,
      y: number,
      valueIsAnimated: boolean = false,
    ): void {
      // Label
      ctx.font = '10px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(label, CARD_X + CARD_PADDING, y)

      // Value
      ctx.font = '22px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      const valueText = typeof value === 'number' ? value.toString() : value
      ctx.fillText(valueText, CARD_X + CARD_WIDTH - CARD_PADDING, y)
    }

    // Stat rows
    const rowHeight = 50
    let currentY = statY

    drawStatRow('FLOOR REACHED', summary.floorReached, currentY)
    currentY += rowHeight

    // Separator line
    ctx.strokeStyle = colors.parchmentRule
    ctx.globalAlpha = cardOpacity * 0.3
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CARD_X + CARD_PADDING, currentY - 20)
    ctx.lineTo(CARD_X + CARD_WIDTH - CARD_PADDING, currentY - 20)
    ctx.stroke()
    ctx.globalAlpha = cardOpacity

    const animatedEnemies = getAnimatedValue(0, summary.enemiesDefeated, timestamp)
    drawStatRow('ENEMIES DEFEATED', animatedEnemies, currentY)
    currentY += rowHeight

    // Separator line
    ctx.strokeStyle = colors.parchmentRule
    ctx.globalAlpha = cardOpacity * 0.3
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CARD_X + CARD_PADDING, currentY - 20)
    ctx.lineTo(CARD_X + CARD_WIDTH - CARD_PADDING, currentY - 20)
    ctx.stroke()
    ctx.globalAlpha = cardOpacity

    const animatedGold = getAnimatedValue(0, summary.goldEarned, timestamp)
    // Draw gold with symbol
    ctx.font = '10px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('GOLD FOUND', CARD_X + CARD_PADDING, currentY)

    ctx.font = '22px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(`${GOLD_SYMBOL}  ${animatedGold}`, CARD_X + CARD_WIDTH - CARD_PADDING, currentY)
    currentY += rowHeight

    // Defeat-only row: FELLED BY
    if (summary.outcome === 'defeat') {
      // Separator line
      ctx.strokeStyle = colors.parchmentRule
      ctx.globalAlpha = cardOpacity * 0.3
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(CARD_X + CARD_PADDING, currentY - 20)
      ctx.lineTo(CARD_X + CARD_WIDTH - CARD_PADDING, currentY - 20)
      ctx.stroke()
      ctx.globalAlpha = cardOpacity

      ctx.font = '10px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('FELLED BY', CARD_X + CARD_PADDING, currentY)

      const felledByText = `${summary.killedBy} · Floor ${summary.killedByFloor}`
      ctx.font = 'italic 14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(felledByText, CARD_X + CARD_PADDING, currentY + 20)
    }

    // Button with delayed fade-in
    const buttonOpacity = getButtonOpacity(timestamp)
    ctx.globalAlpha = buttonOpacity

    const buttonFill = isMouseDevice && hoveredElement === 'begin-again'
      ? colors.surfaceRaised
      : colors.surfaceParchment
    ctx.fillStyle = buttonFill
    ctx.fillRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H)

    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 1
    if ('roundRect' in ctxAny) {
      ctxAny.roundRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H, 4)
      ctx.stroke()
    } else {
      ctx.strokeRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H)
    }

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Begin Again', BUTTON_X + BUTTON_W / 2, BUTTON_Y + BUTTON_H / 2)

    ctx.globalAlpha = 1.0
  }

  function handleClick(x: number, y: number): void {
    if (isInBeginAgainButton(x, y)) {
      transitionTo('home')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true
    hoveredElement = isInBeginAgainButton(x, y) ? 'begin-again' : null
  }

  return { draw, handleClick, handlePointerMove }
}
