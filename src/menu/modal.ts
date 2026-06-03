import { colors } from '../colors'

const LOGICAL_W = 390
const LOGICAL_H = 844
const STATUS_BAR_H = 50

// MENU button — exported so screens can draw and hit-test it
export const MENU_BTN_X = 12
export const MENU_BTN_Y = (STATUS_BAR_H - 32) / 2  // 9 — centres 32 px button in 50 px bar
export const MENU_BTN_W = 68
export const MENU_BTN_H = 32
const MENU_BTN_RADIUS = 4

// Expand hit area to meet 44 × 44 thumb-safe minimum
const MENU_HIT_Y = (STATUS_BAR_H - 44) / 2  // 3

// Modal card layout — exported for tests
export const MODAL_CARD_X = (LOGICAL_W - 260) / 2  // 65
export const MODAL_CARD_Y = 210
export const MODAL_CARD_W = 260
export const MODAL_CLOSE_ROW_H = 44
export const MODAL_ROW_H = 44
export const MODAL_SEP = 1
export const MODAL_CONF_HEADING_H = 36
export const MODAL_CONF_SUBTEXT_H = 28
export const MODAL_CONF_BTN_ROW_H = 52
export const MODAL_BTN_W = 100
export const MODAL_BTN_GAP = 8
export const MODAL_BTN_MARGIN = (MODAL_CARD_W - MODAL_BTN_W * 2 - MODAL_BTN_GAP) / 2  // 26
export const MODAL_SETTINGS_BODY_H = 72
export const MODAL_CARD_BOTTOM_PAD = 8

const CLOSE_HIT = 44  // × button hit area (square)
const CARD_RADIUS = 4

type ModalView = 'list' | 'settings' | 'confirm-end'
export type ScreenType = 'home' | 'game'

export interface MenuModal {
  isOpen(): boolean
  open(): void
  close(): void
  draw(ctx: CanvasRenderingContext2D): void
  handleClick(x: number, y: number): boolean
  handlePointerMove(x: number, y: number): boolean
  _getView(): ModalView
}

function cardHeight(view: ModalView): number {
  if (view === 'list') {
    return MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_ROW_H + MODAL_SEP + MODAL_ROW_H + MODAL_CARD_BOTTOM_PAD
  }
  if (view === 'settings') {
    return MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_SETTINGS_BODY_H + MODAL_CARD_BOTTOM_PAD
  }
  return MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H + MODAL_CONF_SUBTEXT_H + MODAL_SEP + MODAL_CONF_BTN_ROW_H + MODAL_CARD_BOTTOM_PAD
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const c = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
  ctx.beginPath()
  if (c.roundRect) {
    c.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

export function drawMenuButton(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = isHovered ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('≡ MENU', MENU_BTN_X, MENU_BTN_Y + MENU_BTN_H / 2)
}

export function isInMenuButton(x: number, y: number): boolean {
  return (
    x >= MENU_BTN_X && x <= MENU_BTN_X + MENU_BTN_W &&
    y >= MENU_HIT_Y && y <= MENU_HIT_Y + 44
  )
}

// Hit-test helpers — all positions relative to card

function isInCard(x: number, y: number, view: ModalView): boolean {
  const h = cardHeight(view)
  return (
    x >= MODAL_CARD_X && x <= MODAL_CARD_X + MODAL_CARD_W &&
    y >= MODAL_CARD_Y && y <= MODAL_CARD_Y + h
  )
}

function isInClose(x: number, y: number): boolean {
  const btnX = MODAL_CARD_X + MODAL_CARD_W - CLOSE_HIT
  return x >= btnX && x <= btnX + CLOSE_HIT &&
         y >= MODAL_CARD_Y && y <= MODAL_CARD_Y + CLOSE_HIT
}

function isInSettingsRow(x: number, y: number): boolean {
  const rowY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_SEP
  return x >= MODAL_CARD_X && x <= MODAL_CARD_X + MODAL_CARD_W &&
         y >= rowY && y <= rowY + MODAL_ROW_H
}

function isInSecondRow(x: number, y: number): boolean {
  const rowY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_ROW_H + MODAL_SEP
  return x >= MODAL_CARD_X && x <= MODAL_CARD_X + MODAL_CARD_W &&
         y >= rowY && y <= rowY + MODAL_ROW_H
}

function isInBackAffordance(x: number, y: number): boolean {
  return x >= MODAL_CARD_X && x <= MODAL_CARD_X + 120 &&
         y >= MODAL_CARD_Y && y <= MODAL_CARD_Y + MODAL_CLOSE_ROW_H
}

function confBtnRowY(): number {
  return MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H + MODAL_CONF_SUBTEXT_H + MODAL_SEP
}

function isInCancelBtn(x: number, y: number): boolean {
  const btnX = MODAL_CARD_X + MODAL_BTN_MARGIN
  const rowY = confBtnRowY()
  return x >= btnX && x <= btnX + MODAL_BTN_W &&
         y >= rowY && y <= rowY + MODAL_CONF_BTN_ROW_H
}

function isInConfirmBtn(x: number, y: number): boolean {
  const btnX = MODAL_CARD_X + MODAL_BTN_MARGIN + MODAL_BTN_W + MODAL_BTN_GAP
  const rowY = confBtnRowY()
  return x >= btnX && x <= btnX + MODAL_BTN_W &&
         y >= rowY && y <= rowY + MODAL_CONF_BTN_ROW_H
}

// Draw helpers

function drawSep(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.strokeStyle = colors.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MODAL_CARD_X, y)
  ctx.lineTo(MODAL_CARD_X + MODAL_CARD_W, y)
  ctx.stroke()
}

function drawCloseBtn(ctx: CanvasRenderingContext2D, isHovered: boolean): void {
  const cx = MODAL_CARD_X + MODAL_CARD_W - CLOSE_HIT / 2
  const cy = MODAL_CARD_Y + CLOSE_HIT / 2
  ctx.font = '16px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = isHovered ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('×', cx, cy)
}

function drawListView(
  ctx: CanvasRenderingContext2D,
  screenType: ScreenType,
  hovered: string | null,
): void {
  drawCloseBtn(ctx, hovered === 'close')

  const sep1Y = MODAL_CARD_Y + MODAL_CLOSE_ROW_H
  drawSep(ctx, sep1Y)

  const row1Y = sep1Y + MODAL_SEP
  if (hovered === 'settings') {
    ctx.fillStyle = colors.surfaceRaised
    ctx.fillRect(MODAL_CARD_X, row1Y, MODAL_CARD_W, MODAL_ROW_H)
  }
  ctx.font = '14px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Settings', MODAL_CARD_X + 16, row1Y + MODAL_ROW_H / 2)

  const sep2Y = row1Y + MODAL_ROW_H
  drawSep(ctx, sep2Y)

  const row2Y = sep2Y + MODAL_SEP
  if (hovered === 'second-row') {
    ctx.fillStyle = colors.surfaceRaised
    ctx.fillRect(MODAL_CARD_X, row2Y, MODAL_CARD_W, MODAL_ROW_H)
  }
  ctx.font = '14px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = screenType === 'game' ? colors.danger : colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(screenType === 'home' ? 'Quit Game' : 'End Run', MODAL_CARD_X + 16, row2Y + MODAL_ROW_H / 2)
}

function drawSettingsView(
  ctx: CanvasRenderingContext2D,
  hovered: string | null,
): void {
  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = hovered === 'back-affordance' ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('← Settings', MODAL_CARD_X + 16, MODAL_CARD_Y + MODAL_CLOSE_ROW_H / 2)

  drawSep(ctx, MODAL_CARD_Y + MODAL_CLOSE_ROW_H)

  const bodyMidY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_SETTINGS_BODY_H / 2
  ctx.font = '13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('No settings yet —', MODAL_CARD_X + MODAL_CARD_W / 2, bodyMidY - 10)
  ctx.fillText('more coming soon.', MODAL_CARD_X + MODAL_CARD_W / 2, bodyMidY + 10)
}

function drawConfirmView(
  ctx: CanvasRenderingContext2D,
  hovered: string | null,
): void {
  drawCloseBtn(ctx, hovered === 'close')

  const headingY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H / 2
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('End this run?', MODAL_CARD_X + MODAL_CARD_W / 2, headingY)

  const subtextY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H + MODAL_CONF_SUBTEXT_H / 2
  ctx.font = '13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Your progress will be lost.', MODAL_CARD_X + MODAL_CARD_W / 2, subtextY)

  const sepY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H + MODAL_CONF_SUBTEXT_H
  drawSep(ctx, sepY)

  const rowY = sepY + MODAL_SEP
  const BTN_H = 36
  const btnY = rowY + (MODAL_CONF_BTN_ROW_H - BTN_H) / 2

  const cancelX = MODAL_CARD_X + MODAL_BTN_MARGIN
  drawRoundRect(ctx, cancelX, btnY, MODAL_BTN_W, BTN_H, CARD_RADIUS)
  ctx.fillStyle = hovered === 'cancel' ? colors.surfaceRaised : colors.surface
  ctx.fill()
  ctx.strokeStyle = colors.gold
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.gold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Cancel', cancelX + MODAL_BTN_W / 2, btnY + BTN_H / 2)

  const confirmX = MODAL_CARD_X + MODAL_BTN_MARGIN + MODAL_BTN_W + MODAL_BTN_GAP
  drawRoundRect(ctx, confirmX, btnY, MODAL_BTN_W, BTN_H, CARD_RADIUS)
  ctx.fillStyle = hovered === 'confirm' ? colors.surfaceRaised : colors.surface
  ctx.fill()
  ctx.strokeStyle = colors.danger
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = colors.danger
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Confirm', confirmX + MODAL_BTN_W / 2, btnY + BTN_H / 2)
}

export function createMenuModal(
  screenType: ScreenType,
  transitionTo: (screen: string) => void,
): MenuModal {
  let opened = false
  let view: ModalView = 'list'
  let hovered: string | null = null

  function open(): void {
    opened = true
    view = 'list'
    hovered = null
  }

  function close(): void {
    opened = false
    view = 'list'
    hovered = null
  }

  function draw(ctx: CanvasRenderingContext2D): void {
    if (!opened) return

    // Scrim
    ctx.fillStyle = colors.menuScrim
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // Card background (clipped)
    const h = cardHeight(view)
    ctx.save()
    drawRoundRect(ctx, MODAL_CARD_X, MODAL_CARD_Y, MODAL_CARD_W, h, CARD_RADIUS)
    ctx.fillStyle = colors.surface
    ctx.fill()
    ctx.clip()

    if (view === 'list') drawListView(ctx, screenType, hovered)
    else if (view === 'settings') drawSettingsView(ctx, hovered)
    else drawConfirmView(ctx, hovered)

    ctx.restore()

    // Card border (drawn after restore so it isn't clipped)
    drawRoundRect(ctx, MODAL_CARD_X, MODAL_CARD_Y, MODAL_CARD_W, h, CARD_RADIUS)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function handleClick(x: number, y: number): boolean {
    if (!opened) return false

    // Scrim tap dismisses the whole modal
    if (!isInCard(x, y, view)) {
      close()
      return true
    }

    if (view === 'list') {
      if (isInClose(x, y)) {
        close()
      } else if (isInSettingsRow(x, y)) {
        view = 'settings'
        hovered = null
      } else if (isInSecondRow(x, y)) {
        if (screenType === 'home') {
          close()
          transitionTo('main-menu')
        } else {
          view = 'confirm-end'
          hovered = null
        }
      }
    } else if (view === 'settings') {
      if (isInBackAffordance(x, y)) {
        view = 'list'
        hovered = null
      }
    } else {
      // confirm-end
      if (isInClose(x, y)) {
        close()
      } else if (isInCancelBtn(x, y)) {
        view = 'list'
        hovered = null
      } else if (isInConfirmBtn(x, y)) {
        close()
        transitionTo('home')
      }
    }

    return true
  }

  function handlePointerMove(x: number, y: number): boolean {
    if (!opened) return false

    if (!isInCard(x, y, view)) {
      hovered = null
      return true
    }

    let next: string | null = null
    if (view === 'list') {
      if (isInClose(x, y)) next = 'close'
      else if (isInSettingsRow(x, y)) next = 'settings'
      else if (isInSecondRow(x, y)) next = 'second-row'
    } else if (view === 'settings') {
      if (isInBackAffordance(x, y)) next = 'back-affordance'
    } else {
      if (isInClose(x, y)) next = 'close'
      else if (isInCancelBtn(x, y)) next = 'cancel'
      else if (isInConfirmBtn(x, y)) next = 'confirm'
    }
    hovered = next
    return true
  }

  return {
    isOpen: () => opened,
    open,
    close,
    draw,
    handleClick,
    handlePointerMove,
    _getView: () => view,
  }
}
