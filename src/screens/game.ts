import { colors } from '../colors'
import { ScreenController } from './main-menu'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BACK_LINK_X = 16
const BACK_LINK_Y = 16
const BACK_LINK_W = 150
const BACK_LINK_H = 32

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let hoveredElement: string | null = null
  let isMouseDevice = false

  function isInBackLink(x: number, y: number): boolean {
    return (
      x >= BACK_LINK_X &&
      x <= BACK_LINK_X + BACK_LINK_W &&
      y >= BACK_LINK_Y &&
      y <= BACK_LINK_Y + BACK_LINK_H
    )
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    // Clear canvas using fillRect with explicit background color
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = isMouseDevice && hoveredElement === 'back' ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('← Quit Run', BACK_LINK_X, BACK_LINK_Y + BACK_LINK_H / 2)

    // Debug: show what screen is active
    ctx.font = '10px system-ui'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('[GAME]', 5, 5)
  }

  function handleClick(x: number, y: number): void {
    if (isInBackLink(x, y)) {
      transitionTo('home')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true
    const newHovered = isInBackLink(x, y) ? 'back' : null
    if (newHovered !== hoveredElement) {
      hoveredElement = newHovered
    }
  }

  return { draw, handleClick, handlePointerMove }
}
