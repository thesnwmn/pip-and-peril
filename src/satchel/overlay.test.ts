import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSatchelOverlay,
  drawSatchelButton,
  isInSatchelButton,
  SATCHEL_BTN_X,
  SATCHEL_BTN_Y,
  SATCHEL_BTN_SIZE,
  OVERLAY_TOP,
} from './overlay'
import type { Inventory } from './types'
import type { DungeonState } from '../navigation/dungeon-state'
import { initDungeon } from '../navigation/dungeon-state'

// Minimal canvas mock
function makeCtx(): CanvasRenderingContext2D {
  const methods = [
    'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill',
    'fillRect', 'strokeRect', 'arc', 'fillText', 'strokeText', 'clip',
    'scale', 'translate', 'rect',
  ]
  const ctx = Object.fromEntries(methods.map(m => [m, vi.fn()])) as unknown as CanvasRenderingContext2D
  ;(ctx as unknown as Record<string, unknown>).measureText = vi.fn(() => ({ width: 10 }))
  ;(ctx as unknown as Record<string, unknown>).font = ''
  ;(ctx as unknown as Record<string, unknown>).fillStyle = ''
  ;(ctx as unknown as Record<string, unknown>).strokeStyle = ''
  ;(ctx as unknown as Record<string, unknown>).lineWidth = 1
  ;(ctx as unknown as Record<string, unknown>).textAlign = 'left'
  ;(ctx as unknown as Record<string, unknown>).textBaseline = 'alphabetic'
  ;(ctx as unknown as Record<string, unknown>).globalAlpha = 1
  ;(ctx as unknown as Record<string, unknown>).lineCap = 'butt'
  return ctx
}

const emptyInventory: Inventory = { gold: 0, items: [] }

function makeState(overrides: Partial<DungeonState> = {}): DungeonState {
  return { ...initDungeon(), ...overrides }
}

// ─── isInSatchelButton ────────────────────────────────────────────────────────

describe('isInSatchelButton', () => {
  it('returns true for point at button centre', () => {
    const cx = SATCHEL_BTN_X + SATCHEL_BTN_SIZE / 2
    const cy = SATCHEL_BTN_Y + SATCHEL_BTN_SIZE / 2
    expect(isInSatchelButton(cx, cy)).toBe(true)
  })

  it('returns true for top-left corner of button', () => {
    expect(isInSatchelButton(SATCHEL_BTN_X, SATCHEL_BTN_Y)).toBe(true)
  })

  it('returns true for bottom-right corner of button', () => {
    expect(isInSatchelButton(
      SATCHEL_BTN_X + SATCHEL_BTN_SIZE,
      SATCHEL_BTN_Y + SATCHEL_BTN_SIZE,
    )).toBe(true)
  })

  it('returns false for point clearly above the button', () => {
    expect(isInSatchelButton(SATCHEL_BTN_X + 10, SATCHEL_BTN_Y - 10)).toBe(false)
  })

  it('returns false for point clearly to the left of the button', () => {
    expect(isInSatchelButton(SATCHEL_BTN_X - 10, SATCHEL_BTN_Y + 10)).toBe(false)
  })

  it('returns false for map area (top of screen)', () => {
    expect(isInSatchelButton(100, 100)).toBe(false)
  })
})

// ─── drawSatchelButton — smoke test ──────────────────────────────────────────

describe('drawSatchelButton', () => {
  it('draws without throwing (normal state)', () => {
    const ctx = makeCtx()
    expect(() => drawSatchelButton(ctx, false, false)).not.toThrow()
  })

  it('draws without throwing (combat state)', () => {
    const ctx = makeCtx()
    expect(() => drawSatchelButton(ctx, true, false)).not.toThrow()
  })
})

// ─── createSatchelOverlay — initial state ────────────────────────────────────

describe('createSatchelOverlay — initial state', () => {
  it('starts closed', () => {
    const overlay = createSatchelOverlay()
    expect(overlay.isOpen()).toBe(false)
  })

  it('handleClick returns false when closed', () => {
    const overlay = createSatchelOverlay()
    expect(overlay.handleClick(200, 400)).toBe(false)
  })

  it('handlePointerMove returns false when closed', () => {
    const overlay = createSatchelOverlay()
    expect(overlay.handlePointerMove(200, 400)).toBe(false)
  })
})

// ─── createSatchelOverlay — open / close ─────────────────────────────────────

describe('createSatchelOverlay — open / close', () => {
  it('opens on open()', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    expect(overlay.isOpen()).toBe(true)
  })

  it('defaults to pouch tab on open (AC 7)', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    expect(overlay._getTab()).toBe('pouch')
  })

  it('resets to pouch tab when re-opened after switching tabs', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    const ctx = makeCtx()
    // Advance past animation
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    overlay.handleClick(300, 820)  // map tab area
    expect(overlay._getTab()).toBe('map')
    overlay.close()
    overlay.open()
    expect(overlay._getTab()).toBe('pouch')
  })

  it('closes on close()', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    overlay.close()
    expect(overlay.isOpen()).toBe(false)
  })

  it('handleClick consumes clicks when open (AC 4)', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    const ctx = makeCtx()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    expect(overlay.handleClick(200, 400)).toBe(true)
  })

  it('handlePointerMove consumes moves when open', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    expect(overlay.handlePointerMove(200, 400)).toBe(true)
  })
})

// ─── createSatchelOverlay — animation (AC 3) ─────────────────────────────────

describe('createSatchelOverlay — animation', () => {
  it('consumes clicks during animation without closing', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    const ctx = makeCtx()
    overlay.draw(ctx, 1000, emptyInventory, makeState())  // animation starts at t=1000
    // At t=1100 animation is still in progress (elapsed=100 < 300)
    overlay.draw(ctx, 1100, emptyInventory, makeState())
    const consumed = overlay.handleClick(200, 400)
    expect(consumed).toBe(true)
    expect(overlay.isOpen()).toBe(true)
  })

  it('tapping during animation skips to fully open', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    const ctx = makeCtx()
    overlay.draw(ctx, 1000, emptyInventory, makeState())
    overlay.draw(ctx, 1100, emptyInventory, makeState())
    overlay.handleClick(100, 100)  // skip animation
    // After skip, a second click at the close button should close
    overlay.draw(ctx, 1200, emptyInventory, makeState())  // update lastTimestamp
    overlay.handleClick(389, OVERLAY_TOP + 22)  // close button area
    expect(overlay.isOpen()).toBe(false)
  })

  it('draws without throwing during animation', () => {
    const overlay = createSatchelOverlay()
    overlay.open()
    const ctx = makeCtx()
    expect(() => overlay.draw(ctx, 1000, emptyInventory, makeState())).not.toThrow()
    expect(() => overlay.draw(ctx, 1100, emptyInventory, makeState())).not.toThrow()
  })
})

// ─── createSatchelOverlay — tab switching (AC 6, 7, 8) ───────────────────────

describe('createSatchelOverlay — tab switching', () => {
  function openAndAnimate(overlay: ReturnType<typeof createSatchelOverlay>): void {
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())  // past 300 ms
  }

  it('tapping journal tab area switches to journal (AC 8)', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    // JRNL is second tab: x ≈ [97.5, 195)
    overlay.handleClick(140, 820)
    expect(overlay._getTab()).toBe('journal')
  })

  it('tapping tally tab area switches to tally', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    // TALLY: x ≈ [195, 292.5)
    overlay.handleClick(240, 820)
    expect(overlay._getTab()).toBe('tally')
  })

  it('tapping map tab area switches to map', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    // MAP: x ≈ [292.5, 390)
    overlay.handleClick(340, 820)
    expect(overlay._getTab()).toBe('map')
  })

  it('tapping pouch tab area returns to pouch', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    overlay.handleClick(340, 820)  // switch to map
    overlay.handleClick(40, 820)   // back to pouch
    expect(overlay._getTab()).toBe('pouch')
  })

  it('tab switch does not close the overlay', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    overlay.handleClick(240, 820)
    expect(overlay.isOpen()).toBe(true)
  })
})

// ─── createSatchelOverlay — close button (AC 5, 13) ──────────────────────────

describe('createSatchelOverlay — close button', () => {
  function openAndAnimate(overlay: ReturnType<typeof createSatchelOverlay>): void {
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
  }

  it('tapping × closes the overlay (AC 13)', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    overlay.handleClick(389, OVERLAY_TOP + 22)  // top-right of overlay header
    expect(overlay.isOpen()).toBe(false)
  })

  it('tapping content area does not close', () => {
    const overlay = createSatchelOverlay()
    openAndAnimate(overlay)
    overlay.handleClick(195, 400)
    expect(overlay.isOpen()).toBe(true)
  })
})

// ─── createSatchelOverlay — draw smoke tests ──────────────────────────────────

describe('createSatchelOverlay — draw tabs', () => {
  function openAndAnimate(overlay: ReturnType<typeof createSatchelOverlay>): CanvasRenderingContext2D {
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    return ctx
  }

  it('draws pouch tab without throwing (AC 9)', () => {
    const overlay = createSatchelOverlay()
    expect(() => openAndAnimate(overlay)).not.toThrow()
  })

  it('draws journal tab without throwing (AC 10)', () => {
    const overlay = createSatchelOverlay()
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    overlay.handleClick(140, 820)  // switch to journal
    expect(() => overlay.draw(ctx, 450, emptyInventory, makeState())).not.toThrow()
  })

  it('draws tally tab without throwing (AC 11)', () => {
    const overlay = createSatchelOverlay()
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    overlay.handleClick(240, 820)  // switch to tally
    const state = makeState({ roomsEntered: 7, enemiesDefeated: 2 })
    expect(() => overlay.draw(ctx, 450, emptyInventory, state)).not.toThrow()
  })

  it('draws map tab without throwing (AC 12)', () => {
    const overlay = createSatchelOverlay()
    const ctx = makeCtx()
    overlay.open()
    overlay.draw(ctx, 0, emptyInventory, makeState())
    overlay.draw(ctx, 400, emptyInventory, makeState())
    overlay.handleClick(340, 820)  // switch to map
    expect(() => overlay.draw(ctx, 450, emptyInventory, makeState())).not.toThrow()
  })

  it('draws pouch with items without throwing', () => {
    const overlay = createSatchelOverlay()
    const ctx = makeCtx()
    const inventory: Inventory = {
      gold: 5,
      items: [
        { id: 'cheese-1', name: 'Cheese', iconType: 'cheese', quantity: 1, description: 'Restores 2 HP.', kind: 'consumable', usableInNav: true, usableInCombat: true, effect: { type: 'heal', amount: 2 } },
        { id: 'charm-1',  name: 'Charm',  iconType: 'charm',  quantity: 3, description: 'One free reroll.', kind: 'consumable', usableInNav: false, usableInCombat: true, effect: { type: 'reroll-dice' } },
      ],
    }
    overlay.open()
    overlay.draw(ctx, 0, inventory, makeState())
    expect(() => overlay.draw(ctx, 400, inventory, makeState())).not.toThrow()
  })
})

// ─── Dungeon state counters ───────────────────────────────────────────────────

describe('DungeonState counters — initial values', () => {
  it('roomsEntered starts at 0', () => {
    expect(initDungeon().roomsEntered).toBe(0)
  })

  it('enemiesDefeated starts at 0', () => {
    expect(initDungeon().enemiesDefeated).toBe(0)
  })
})
