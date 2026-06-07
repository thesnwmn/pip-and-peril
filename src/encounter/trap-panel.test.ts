import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTrapEncounterPanel,
  computeTrapDamage,
  TRAP_FLAVOURS,
  ROLL_BTN_X, ROLL_BTN_Y, ROLL_BTN_W, ROLL_BTN_H,
  LUCK_BTN_X, LUCK_BTN_W,
  LUCK_USE_BTN_Y, LUCK_USE_BTN_H,
  LUCK_PASS_BTN_Y, LUCK_PASS_BTN_H,
  type TrapPanelContext,
} from './trap-panel'
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

function makeTrapCell(trapDifficulty: number, flavourIdx = 0): TileCell {
  return { roomType: 'trap', exits: 0, trapDifficulty, trapFlavour: flavourIdx }
}

function makeContext(startHp = 10, startInventory: Inventory = { gold: 0, items: [] }): {
  context: TrapPanelContext
  getPipHp: () => number
  getLatestDungeonState: () => ReturnType<typeof initDungeon>
  getLatestInventory: () => Inventory
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
    getLatestDungeonState: () => dungeonState,
    getLatestInventory: () => inventory,
  }
}

const MOCK_MAP_VIEW: MapViewConfig = { zoom: 1.8, pipTargetX: 195, pipTargetY: 230 }
const ROLL_CX = ROLL_BTN_X + ROLL_BTN_W / 2
const ROLL_CY = ROLL_BTN_Y + ROLL_BTN_H / 2

// Simulate click Roll → first draw (sets rollStartTime) → draw past 500ms → tap to continue
function simulateFullRoll(
  panel: ReturnType<typeof createTrapEncounterPanel>,
  ctx: CanvasRenderingContext2D,
): void {
  panel.handleClick(ROLL_CX, ROLL_CY)
  panel.draw(ctx, 0)    // sets rollStartTime = 0
  panel.draw(ctx, 600)  // elapsed 600ms >= 500ms → rollComplete; panelState = 'outcome'
  panel.handleClick(ROLL_CX, ROLL_CY) // tap to continue → onComplete
}

// ── computeTrapDamage ─────────────────────────────────────────────────────────

describe('computeTrapDamage', () => {
  it('returns ceil(difficulty / 2)', () => {
    expect(computeTrapDamage(2)).toBe(1)
    expect(computeTrapDamage(3)).toBe(2)
    expect(computeTrapDamage(4)).toBe(2)
    expect(computeTrapDamage(5)).toBe(3)
    expect(computeTrapDamage(6)).toBe(3)
  })

  it('minimum 1 even when difficulty is 0', () => {
    expect(computeTrapDamage(0)).toBe(1)
  })

  it('minimum 1 for difficulty 1', () => {
    expect(computeTrapDamage(1)).toBe(1)
  })
})

// ── createTrapEncounterPanel ──────────────────────────────────────────────────

describe('createTrapEncounterPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('panel interface', () => {
    it('declares snapCamera: true', () => {
      const { context } = makeContext()
      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(2), MOCK_MAP_VIEW, context)
      expect(panel.snapCamera).toBe(true)
    })

    it('passes through the mapView', () => {
      const { context } = makeContext()
      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(2), MOCK_MAP_VIEW, context)
      expect(panel.mapView).toBe(MOCK_MAP_VIEW)
    })
  })

  describe('Roll button interaction', () => {
    it('does nothing when clicking outside the Roll button', () => {
      const onComplete = vi.fn()
      const { context } = makeContext()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      const ctx = makeCtx()
      // Click far outside the button
      panel.handleClick(5, 500)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)
      panel.draw(ctx, 2200)
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('second click on Roll is ignored (input locked)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999) // high green total → pass
      const { context } = makeContext()
      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(2), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      // Second click should be ignored — no second rollPool call
      const rollPoolSpy = vi.spyOn({ rollPool: () => {} }, 'rollPool')
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(rollPoolSpy).not.toHaveBeenCalled()
    })
  })

  describe('pass outcome (greenTotal >= difficulty)', () => {
    it('does not reduce HP on pass', () => {
      // All dice roll max → green = 6 ≥ difficulty 2
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(getPipHp()).toBe(10)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('calls onComplete("resolved") on tap after pass', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const onComplete = vi.fn()
      const { context } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('does not call onComplete before tap in outcome state', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const onComplete = vi.fn()
      const { context } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)   // rollComplete; panelState = 'outcome'
      panel.draw(ctx, 5000)  // many draws, no tap
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('fail outcome (greenTotal < difficulty)', () => {
    it('reduces HP by trapDamage on fail', () => {
      // All dice roll min (value=1) → green=1 < difficulty=3
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      // difficulty=3, trapDamage=ceil(1.5)=2
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)
      expect(getPipHp()).toBe(8)  // 10 - 2 = 8
    })

    it('calls onComplete("resolved") when HP remains above 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const onComplete = vi.fn()
      const { context } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('calls onComplete("defeat") when HP drops to 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // green=1 < difficulty=3
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(1) // 1 HP; trapDamage=2 → 0
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(getPipHp()).toBe(0)
      expect(onComplete).toHaveBeenCalledWith('defeat')
    })

    it('clamps HP at 0, not negative', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=6
      const { context, getPipHp } = makeContext(1)  // 1 HP; trapDamage=3
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(6), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)
      expect(getPipHp()).toBeGreaterThanOrEqual(0)
      expect(getPipHp()).toBe(0)
    })
  })

  describe('trapDifficulty = 0 edge case', () => {
    it('always passes when difficulty is 0, even if green total is low', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1, but difficulty=0 → pass
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(0), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(getPipHp()).toBe(10)  // no damage
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })
  })

  describe('tile state after resolution', () => {
    it('marks trapFired = true on the pip tile', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const { context, getLatestDungeonState } = makeContext(10)
      const ctx = makeCtx()

      // Place a trap cell at Pip's position in the dungeon state
      const ds = context.getDungeonState()
      const { row, col } = ds.pip
      const newCells = ds.grid.cells.map(r => [...r])
      newCells[row][col] = makeTrapCell(2)
      context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })

      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(2), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)

      const cell = getLatestDungeonState().grid.cells[row][col]
      expect(cell?.trapFired).toBe(true)
    })

    it('stores trapFlavour on the tile', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const { context, getLatestDungeonState } = makeContext(10)
      const ctx = makeCtx()

      const ds = context.getDungeonState()
      const { row, col } = ds.pip
      const newCells = ds.grid.cells.map(r => [...r])
      newCells[row][col] = makeTrapCell(2)
      context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })

      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(2, 0), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)

      const cell = getLatestDungeonState().grid.cells[row][col]
      expect(typeof cell?.trapFlavour).toBe('number')
    })
  })

  describe('onComplete called only once', () => {
    it('does not call onComplete twice even with multiple taps in outcome state', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const onComplete = vi.fn()
      const { context } = makeContext(10)
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      panel.handleClick(ROLL_CX, ROLL_CY) // second tap — should not fire again
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('TRAP_FLAVOURS table', () => {
    it('has 4 variants', () => {
      expect(TRAP_FLAVOURS).toHaveLength(4)
    })

    it('each variant has label, pass, and fail strings', () => {
      for (const f of TRAP_FLAVOURS) {
        expect(typeof f.label).toBe('string')
        expect(typeof f.pass).toBe('string')
        expect(typeof f.fail).toBe('string')
      }
    })
  })

  // ── Luck interrupt prompt ─────────────────────────────────────────────────

  describe('Luck interrupt prompt', () => {
    const LUCK_USE_CX = LUCK_BTN_X + LUCK_BTN_W / 2
    const LUCK_USE_CY = LUCK_USE_BTN_Y + LUCK_USE_BTN_H / 2
    const LUCK_PASS_CX = LUCK_BTN_X + LUCK_BTN_W / 2
    const LUCK_PASS_CY = LUCK_PASS_BTN_Y + LUCK_PASS_BTN_H / 2

    it('no Luck prompt when roll passes (no damage, onComplete resolves)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)  // high green → pass
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(2), MOCK_MAP_VIEW, context)
      simulateFullRoll(panel, ctx)
      expect(getPipHp()).toBe(10)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('no Luck prompt when roll fails but satchel has no Luck items', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10, { gold: 0, items: [] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      // Roll and advance to outcome directly (no luck prompt)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // rollComplete → outcome
      expect(getPipHp()).toBe(8)  // 10 - ceil(3/2)=2
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('Luck prompt fires (no onComplete yet) when roll fails with Luck item in satchel', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // rollComplete → luck-prompt (not outcome)
      // No damage yet — waiting for player to decide
      expect(getPipHp()).toBe(10)
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('[Pass] on Luck prompt applies original failure and advances to outcome', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // luck-prompt

      panel.handleClick(LUCK_PASS_CX, LUCK_PASS_CY)
      expect(getPipHp()).toBe(8)  // damage applied on Pass
      panel.handleClick(ROLL_CX, ROLL_CY)  // tap to continue
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('auto-dismiss at 3 s applies failure and advances to outcome', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // green=1 < difficulty=3
      const onComplete = vi.fn()
      const { context, getPipHp } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)    // luck-prompt (luckPromptStartTime = 600)
      panel.draw(ctx, 3601)   // 3001 ms elapsed → auto-dismiss → outcome
      expect(getPipHp()).toBe(8)  // damage applied after auto-dismiss
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('[Use] when reroll passes: no damage, outcome resolved', () => {
      // First roll fails (value=1), reroll passes (value=6)
      const randomValues = [0, 0, 0, 0, 0.999, 0.999, 0.999, 0.999]
      let callIdx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callIdx++ % randomValues.length] ?? 0)

      const onComplete = vi.fn()
      const { context, getPipHp, getLatestInventory } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // luck-prompt

      panel.handleClick(LUCK_USE_CX, LUCK_USE_CY)
      expect(getPipHp()).toBe(10)   // no damage
      expect(getLatestInventory().items).toHaveLength(0)  // item consumed
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('[Use] when reroll also fails: damage applied, no re-prompt', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // all rolls = 1 → fail every time
      const onComplete = vi.fn()
      const { context, getPipHp, getLatestInventory } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(onComplete, makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // luck-prompt

      panel.handleClick(LUCK_USE_CX, LUCK_USE_CY)  // [Use]
      expect(getPipHp()).toBe(8)   // damage from reroll failure
      expect(getLatestInventory().items).toHaveLength(0)  // item still consumed
      panel.handleClick(ROLL_CX, ROLL_CY)
      expect(onComplete).toHaveBeenCalledWith('resolved')
    })

    it('item is consumed after [Use], not before', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const { context, getLatestInventory } = makeContext(10, { gold: 0, items: [{ ...LUCKY_ACORN, quantity: 1 }] })
      const ctx = makeCtx()
      const panel = createTrapEncounterPanel(vi.fn(), makeTrapCell(3), MOCK_MAP_VIEW, context)
      panel.handleClick(ROLL_CX, ROLL_CY)
      panel.draw(ctx, 0)
      panel.draw(ctx, 600)  // luck-prompt — item still present
      expect(getLatestInventory().items).toHaveLength(1)

      panel.handleClick(LUCK_USE_CX, LUCK_USE_CY)  // [Use] — item consumed
      expect(getLatestInventory().items).toHaveLength(0)
    })
  })
})
