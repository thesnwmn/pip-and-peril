import { colors } from '../colors'
import { ScreenController } from './main-menu'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BUTTON_W = 280
const BUTTON_H = 55
const BUTTON_X = (LOGICAL_W - BUTTON_W) / 2
const BUTTON_Y = 680

export function createHome(transitionTo: (screen: string) => void): ScreenController {
  let hoveredElement: string | null = null
  let isMouseDevice = false

  const menuModal = createMenuModal('home', transitionTo)

  function isInStartRunButton(x: number, y: number): boolean {
    return (
      x >= BUTTON_X &&
      x <= BUTTON_X + BUTTON_W &&
      y >= BUTTON_Y &&
      y <= BUTTON_Y + BUTTON_H
    )
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    drawMenuButton(ctx, !menuModal.isOpen() && isMouseDevice && hoveredElement === 'menu-btn')

    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('HOME', LOGICAL_W / 2, 300)

    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.fillText('The dungeon awaits, Pip.', LOGICAL_W / 2, 380)
    ctx.fillText('Choose your moment.', LOGICAL_W / 2, 410)

    const buttonFill = isMouseDevice && hoveredElement === 'start-run' ? colors.surfaceRaised : colors.surface
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
    ctx.fillText('START RUN', LOGICAL_W / 2, BUTTON_Y + BUTTON_H / 2)

    menuModal.draw(ctx)
  }

  function handleClick(x: number, y: number): void {
    if (menuModal.handleClick(x, y)) return
    if (isInMenuButton(x, y)) {
      menuModal.open()
      return
    }
    if (isInStartRunButton(x, y)) {
      transitionTo('game')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true
    if (menuModal.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }
    if (isInMenuButton(x, y)) {
      hoveredElement = 'menu-btn'
    } else if (isInStartRunButton(x, y)) {
      hoveredElement = 'start-run'
    } else {
      hoveredElement = null
    }
  }

  return { draw, handleClick, handlePointerMove }
}
