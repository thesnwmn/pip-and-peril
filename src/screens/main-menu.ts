import { colors } from '../colors'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BUTTON_W = 280
const BUTTON_H = 55
const BUTTON_X = (LOGICAL_W - BUTTON_W) / 2
const BUTTON_Y = 550

export interface ScreenController {
  draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void
  handleClick(x: number, y: number): void
  handlePointerMove(x: number, y: number): void
}

export function createMainMenu(transitionTo: (screen: string) => void): ScreenController {
  let hoveredElement: string | null = null
  let isMouseDevice = false

  function isInNewGameButton(x: number, y: number): boolean {
    return (
      x >= BUTTON_X &&
      x <= BUTTON_X + BUTTON_W &&
      y >= BUTTON_Y &&
      y <= BUTTON_Y + BUTTON_H
    )
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    // Clear canvas using fillRect with explicit background color
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PIP & PERIL', LOGICAL_W / 2, 250)

    ctx.font = 'italic 14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Fortune Favors the Small', LOGICAL_W / 2, 290)

    const buttonFill = isMouseDevice && hoveredElement === 'new-game' ? colors.surfaceRaised : colors.surface
    ctx.fillStyle = buttonFill
    ctx.fillRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H)

    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 1
    const ctxAny = ctx as any
    if ('roundRect' in ctxAny) {
      ctxAny.roundRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H, 4)
      ctx.stroke()
    } else {
      ctx.strokeRect(BUTTON_X, BUTTON_Y, BUTTON_W, BUTTON_H)
    }

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('NEW GAME', LOGICAL_W / 2, BUTTON_Y + BUTTON_H / 2)
  }

  function handleClick(x: number, y: number): void {
    if (isInNewGameButton(x, y)) {
      transitionTo('home')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true
    const newHovered = isInNewGameButton(x, y) ? 'new-game' : null
    if (newHovered !== hoveredElement) {
      hoveredElement = newHovered
    }
  }

  return { draw, handleClick, handlePointerMove }
}
