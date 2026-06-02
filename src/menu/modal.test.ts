import { describe, it, expect, vi } from 'vitest'
import {
  createMenuModal,
  isInMenuButton,
  MENU_BTN_X,
  MENU_BTN_Y,
  MENU_BTN_W,
  MENU_BTN_H,
  MODAL_CARD_X,
  MODAL_CARD_Y,
  MODAL_CARD_W,
  MODAL_CLOSE_ROW_H,
  MODAL_ROW_H,
  MODAL_SEP,
  MODAL_CONF_HEADING_H,
  MODAL_CONF_SUBTEXT_H,
  MODAL_CONF_BTN_ROW_H,
  MODAL_BTN_W,
  MODAL_BTN_GAP,
  MODAL_BTN_MARGIN,
} from './modal'

// Computed click coordinates for each modal element
const SCRIM = { x: 10, y: 50 }  // clearly outside card
const CLOSE_BTN = {
  x: MODAL_CARD_X + MODAL_CARD_W - 22,
  y: MODAL_CARD_Y + 22,
}
const SETTINGS_ROW = {
  x: MODAL_CARD_X + 80,
  y: MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_ROW_H / 2,
}
const SECOND_ROW = {
  x: MODAL_CARD_X + 80,
  y: MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_SEP + MODAL_ROW_H + MODAL_SEP + MODAL_ROW_H / 2,
}
const BACK_AFFORDANCE = {
  x: MODAL_CARD_X + 40,
  y: MODAL_CARD_Y + MODAL_CLOSE_ROW_H / 2,
}
const confBtnRowY = MODAL_CARD_Y + MODAL_CLOSE_ROW_H + MODAL_CONF_HEADING_H + MODAL_CONF_SUBTEXT_H + MODAL_SEP
const CANCEL_BTN = {
  x: MODAL_CARD_X + MODAL_BTN_MARGIN + MODAL_BTN_W / 2,
  y: confBtnRowY + MODAL_CONF_BTN_ROW_H / 2,
}
const CONFIRM_BTN = {
  x: MODAL_CARD_X + MODAL_BTN_MARGIN + MODAL_BTN_W + MODAL_BTN_GAP + MODAL_BTN_W / 2,
  y: confBtnRowY + MODAL_CONF_BTN_ROW_H / 2,
}

describe('isInMenuButton', () => {
  it('returns true for point inside button', () => {
    expect(isInMenuButton(MENU_BTN_X + MENU_BTN_W / 2, MENU_BTN_Y + MENU_BTN_H / 2)).toBe(true)
  })

  it('returns false for point clearly outside button', () => {
    expect(isInMenuButton(300, 400)).toBe(false)
  })

  it('accepts touch on the thumb-safe expanded hit area (44 px tall)', () => {
    // Button visual is 32 px but hit area expands to 44 px
    expect(isInMenuButton(MENU_BTN_X + 5, 3)).toBe(true)   // near top of hit area
    expect(isInMenuButton(MENU_BTN_X + 5, 46)).toBe(true)  // near bottom of hit area
  })
})

describe('createMenuModal — initial state', () => {
  it('starts closed', () => {
    const modal = createMenuModal('home', vi.fn())
    expect(modal.isOpen()).toBe(false)
  })

  it('opens on open()', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    expect(modal.isOpen()).toBe(true)
  })

  it('resets to list view when re-opened after close', () => {
    const modal = createMenuModal('game', vi.fn())
    modal.open()
    modal.handleClick(SETTINGS_ROW.x, SETTINGS_ROW.y)
    expect(modal._getView()).toBe('settings')
    modal.close()
    modal.open()
    expect(modal._getView()).toBe('list')
  })
})

describe('createMenuModal — event consumption', () => {
  it('does not consume clicks when closed', () => {
    const modal = createMenuModal('home', vi.fn())
    expect(modal.handleClick(100, 100)).toBe(false)
  })

  it('consumes clicks when open', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    expect(modal.handleClick(100, 100)).toBe(true)
  })

  it('does not consume pointer moves when closed', () => {
    const modal = createMenuModal('home', vi.fn())
    expect(modal.handlePointerMove(100, 100)).toBe(false)
  })

  it('consumes pointer moves when open', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    expect(modal.handlePointerMove(100, 100)).toBe(true)
  })
})

describe('createMenuModal — scrim and × dismiss (AC 6, 7, 8)', () => {
  it('scrim tap closes modal without calling transitionTo', () => {
    const transition = vi.fn()
    const modal = createMenuModal('home', transition)
    modal.open()
    modal.handleClick(SCRIM.x, SCRIM.y)
    expect(modal.isOpen()).toBe(false)
    expect(transition).not.toHaveBeenCalled()
  })

  it('× tap closes modal without calling transitionTo', () => {
    const transition = vi.fn()
    const modal = createMenuModal('home', transition)
    modal.open()
    modal.handleClick(CLOSE_BTN.x, CLOSE_BTN.y)
    expect(modal.isOpen()).toBe(false)
    expect(transition).not.toHaveBeenCalled()
  })

  it('scrim tap in settings view closes whole modal (not just sub-view)', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    modal.handleClick(SETTINGS_ROW.x, SETTINGS_ROW.y)
    expect(modal._getView()).toBe('settings')
    modal.handleClick(SCRIM.x, SCRIM.y)
    expect(modal.isOpen()).toBe(false)
  })
})

describe('createMenuModal — home screen (AC 9, 10)', () => {
  it('shows list view initially', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    expect(modal._getView()).toBe('list')
  })

  it('tapping Settings enters settings sub-view', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    modal.handleClick(SETTINGS_ROW.x, SETTINGS_ROW.y)
    expect(modal._getView()).toBe('settings')
    expect(modal.isOpen()).toBe(true)
  })

  it('tapping Back to Menu closes modal and transitions to main-menu (AC 10)', () => {
    const transition = vi.fn()
    const modal = createMenuModal('home', transition)
    modal.open()
    modal.handleClick(SECOND_ROW.x, SECOND_ROW.y)
    expect(modal.isOpen()).toBe(false)
    expect(transition).toHaveBeenCalledWith('main-menu')
  })
})

describe('createMenuModal — settings sub-view (AC 16, 17)', () => {
  it('back affordance returns to list view', () => {
    const modal = createMenuModal('home', vi.fn())
    modal.open()
    modal.handleClick(SETTINGS_ROW.x, SETTINGS_ROW.y)
    modal.handleClick(BACK_AFFORDANCE.x, BACK_AFFORDANCE.y)
    expect(modal._getView()).toBe('list')
    expect(modal.isOpen()).toBe(true)
  })

  it('back affordance does not call transitionTo', () => {
    const transition = vi.fn()
    const modal = createMenuModal('home', transition)
    modal.open()
    modal.handleClick(SETTINGS_ROW.x, SETTINGS_ROW.y)
    modal.handleClick(BACK_AFFORDANCE.x, BACK_AFFORDANCE.y)
    expect(transition).not.toHaveBeenCalled()
  })
})

describe('createMenuModal — game screen end run flow (AC 11–15)', () => {
  it('tapping End Run shows confirmation view (AC 13)', () => {
    const modal = createMenuModal('game', vi.fn())
    modal.open()
    modal.handleClick(SECOND_ROW.x, SECOND_ROW.y)
    expect(modal._getView()).toBe('confirm-end')
    expect(modal.isOpen()).toBe(true)
  })

  it('× in confirmation view closes modal without transitioning (AC 6)', () => {
    const transition = vi.fn()
    const modal = createMenuModal('game', transition)
    modal.open()
    modal.handleClick(SECOND_ROW.x, SECOND_ROW.y)
    modal.handleClick(CLOSE_BTN.x, CLOSE_BTN.y)
    expect(modal.isOpen()).toBe(false)
    expect(transition).not.toHaveBeenCalled()
  })

  it('Cancel returns to list view without closing (AC 14)', () => {
    const modal = createMenuModal('game', vi.fn())
    modal.open()
    modal.handleClick(SECOND_ROW.x, SECOND_ROW.y)
    modal.handleClick(CANCEL_BTN.x, CANCEL_BTN.y)
    expect(modal._getView()).toBe('list')
    expect(modal.isOpen()).toBe(true)
  })

  it('Confirm closes modal and transitions to home (AC 15)', () => {
    const transition = vi.fn()
    const modal = createMenuModal('game', transition)
    modal.open()
    modal.handleClick(SECOND_ROW.x, SECOND_ROW.y)
    modal.handleClick(CONFIRM_BTN.x, CONFIRM_BTN.y)
    expect(modal.isOpen()).toBe(false)
    expect(transition).toHaveBeenCalledWith('home')
  })
})
