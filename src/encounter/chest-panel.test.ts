import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChestEncounterPanel, type ChestPanelContext } from './chest-panel'
import type { TileCell } from '../map/types'
import type { MapViewConfig } from './panel'
import type { Inventory } from '../satchel/types'
import { LUCKY_ACORN } from '../satchel/catalog'
import { starterPool } from '../dice/pool'
import { initDungeon } from '../navigation/dungeon-state'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(): CanvasRenderingContext2D {
  const methods = [
    'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill',
    'fillRect', 'strokeRect', 'arc', 'fillText', 'strokeText', 'clip',
    'scale', 'translate', 'rect',
  ]
  const ctx = Object.fromEntries(methods.map(m => [m, vi.fn()])) as unknown as CanvasRenderingContext2D
  const extra: Record<string, unknown> = {
    measureText: vi.fn(() => ({ width: 10 })),
    font: '', fillStyle: '', strokeStyle: '',
    lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1,
  }
  Object.assign(ctx, extra)
  return ctx
}

function makeTrappedCell(trapDifficulty: number): TileCell {
  return { roomType: 'chest', exits: 0, chestVariant: 'trapped', trapDifficulty, loot: { gold: 10 } }
}

function makeContext(startHp = 10, startInventory: Inventory = { gold: 0, items: [] }): {
  context: ChestPanelContext
  getPipHp: () => number
} {
  let hp = startHp
  let dungeonState = initDungeon()
  let inventory = startInventory
  return {
    context: {
      getPool: () => starterPool(),
      getPipHp: () => hp,
      setPipHp: (v) => { hp = v },
      getInventory: () => inventory,
      setInventory: (inv) => { inventory = inv },
      getDungeonState: () => dungeonState,
      setDungeonState: (s) => { dungeonState = s },
    },
    getPipHp: () => hp,
  }
}

// Layout constants mirrored from chest-panel.ts:
//   PANEL_TOP=430, DESC_CY=490, BTN_W=244, BTN_H=52
//   PRIMARY_BTN_X=(390-244)/2=73, PRIMARY_BTN_Y=490+36=526
const OPEN_BTN_CX = 73 + 244 / 2   // 195
const OPEN_BTN_CY = 526 + 52 / 2   // 552

const MOCK_MAP_VIEW: MapViewConfig = { zoom: 1.8, pipTargetX: 195, pipTargetY: 230 }

// ── trap-outcome dismissal ────────────────────────────────────────────────────

describe('createChestEncounterPanel – trap-outcome dismissal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Regression: trap-outcome was undismissable when the player held a luck item because
  // the click handler shared the lock-outcome luck-item guard (traps never show a luck prompt).
  it('dismisses trap-outcome on tap when player has a luck item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3 → fail
    const onComplete = vi.fn()
    const { context } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
    const ctx = makeCtx()
    const panel = createChestEncounterPanel(onComplete, makeTrappedCell(3), MOCK_MAP_VIEW, context)

    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)  // "Open Anyway"
    panel.draw(ctx, 0)    // sets trapRollStartTime = 0
    panel.draw(ctx, 600)  // elapsed ≥ 500ms → trap-outcome
    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)  // dismiss tap
    expect(onComplete).toHaveBeenCalledWith('left')
  })

  it('dismisses trap-outcome on tap when player has no luck item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onComplete = vi.fn()
    const { context } = makeContext(10)
    const ctx = makeCtx()
    const panel = createChestEncounterPanel(onComplete, makeTrappedCell(3), MOCK_MAP_VIEW, context)

    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    panel.draw(ctx, 0)
    panel.draw(ctx, 600)
    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    expect(onComplete).toHaveBeenCalledWith('left')
  })

  it('does not fire onComplete twice on multiple taps after trap-outcome', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onComplete = vi.fn()
    const { context } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
    const ctx = makeCtx()
    const panel = createChestEncounterPanel(onComplete, makeTrappedCell(3), MOCK_MAP_VIEW, context)

    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    panel.draw(ctx, 0)
    panel.draw(ctx, 600)
    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  // Regression: when HP drops to 0, a tap while the defeat timer is pending must not
  // preempt it with onComplete('left') — the defeat path is the only correct outcome.
  it('does not tap-dismiss when HP drops to 0; defeat timer fires onComplete("defeat") only once', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3 → fail; trapDamage=2 → 1-2=-1→0
    const onComplete = vi.fn()
    const { context } = makeContext(1)  // 1 HP, trapDamage=2 → HP=0
    const ctx = makeCtx()
    const panel = createChestEncounterPanel(onComplete, makeTrappedCell(3), MOCK_MAP_VIEW, context)

    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    panel.draw(ctx, 0)
    panel.draw(ctx, 600)   // HP drops to 0, defeat timer starts

    // Tap while the defeat timer is pending — must be blocked
    panel.handleClick(OPEN_BTN_CX, OPEN_BTN_CY)
    expect(onComplete).not.toHaveBeenCalled()

    // Defeat timer fires
    vi.runAllTimers()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('defeat')

    vi.useRealTimers()
  })
})
