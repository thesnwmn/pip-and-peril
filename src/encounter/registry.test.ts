import { describe, it, expect, vi } from 'vitest'
import { createEncounterRegistry } from './registry'
import type { EncounterPanel } from './panel'
import type { TileCell } from '../map/types'
import { LOGICAL_H, PANEL_TOP, COMBAT_PANEL_TOP, TRANSITION_DURATION } from '../screens/game-layout'

function makeMockPanel(mapView?: { zoom: number; pipTargetX: number; pipTargetY: number }): EncounterPanel {
  return {
    draw: vi.fn(),
    handleClick: vi.fn(),
    handlePointerMove: vi.fn(),
    mapView,
  }
}

const ENEMY_CELL: TileCell = { roomType: 'enemy', exits: 0 }
const CORRIDOR_CELL: TileCell = { roomType: 'corridor', exits: 0 }
const PIP_X = 195
const PIP_Y = 230

// Build a registry with controlled time, trigger it, and return helpers.
function setupRegistry(mapView?: { zoom: number; pipTargetX: number; pipTargetY: number }) {
  let now = 0
  let capturedOnComplete: ((outcome: string) => void) | null = null
  const panel = makeMockPanel(mapView)
  const victoryHandler = vi.fn()
  const defeatHandler = vi.fn()
  const r = createEncounterRegistry(() => now)
  r.register({
    trigger: (cell) => cell.roomType === 'enemy',
    factory: (onComplete) => { capturedOnComplete = onComplete; return panel },
    handlers: { victory: victoryHandler, defeat: defeatHandler },
  })
  return {
    r, panel, victoryHandler, defeatHandler,
    getNow: () => now,
    setNow: (t: number) => { now = t },
    trigger: () => r.checkTrigger(ENEMY_CELL),
    signalComplete: (outcome: string) => capturedOnComplete!(outcome),
  }
}

describe('createEncounterRegistry', () => {
  describe('idle state', () => {
    it('starts idle', () => {
      const { r } = setupRegistry()
      expect(r.isActive()).toBe(false)
      expect(r.isTransitioning()).toBe(false)
    })

    it('shouldDrawNavPanel is true when idle', () => {
      const { r } = setupRegistry()
      r.computeMapState(0, PIP_X, PIP_Y)
      expect(r.shouldDrawNavPanel()).toBe(true)
    })

    it('computeMapState returns default view when idle', () => {
      const { r } = setupRegistry()
      const s = r.computeMapState(0, PIP_X, PIP_Y)
      expect(s.panelTop).toBe(LOGICAL_H)
      expect(s.zoom).toBe(1.0)
      expect(s.pipTargetX).toBe(PIP_X)
      expect(s.pipTargetY).toBe(PIP_Y)
    })

    it('checkTrigger does nothing when no trigger matches', () => {
      const { r } = setupRegistry()
      r.checkTrigger(CORRIDOR_CELL)
      expect(r.isActive()).toBe(false)
    })
  })

  describe('RISING phase', () => {
    it('checkTrigger starts RISING when trigger matches', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      expect(r.isActive()).toBe(true)
      expect(r.isTransitioning()).toBe(true)
    })

    it('ignores re-trigger while already active', () => {
      const { r, panel } = setupRegistry()
      r.register({
        trigger: () => true,
        factory: () => { throw new Error('should not be called twice') },
        handlers: {},
      })
      r.checkTrigger(ENEMY_CELL)
      // second check — should not throw
      expect(() => r.checkTrigger(ENEMY_CELL)).not.toThrow()
    })

    it('shouldDrawNavPanel is true at start of RISING (panel off-screen)', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      r.computeMapState(0, PIP_X, PIP_Y)  // t=0: panel at LOGICAL_H
      expect(r.shouldDrawNavPanel()).toBe(true)
    })

    it('panelTop starts near LOGICAL_H and moves toward COMBAT_PANEL_TOP', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      const s0 = r.computeMapState(0, PIP_X, PIP_Y)
      const sMid = r.computeMapState(TRANSITION_DURATION / 2, PIP_X, PIP_Y)
      expect(s0.panelTop).toBeGreaterThanOrEqual(LOGICAL_H - 10)
      expect(sMid.panelTop).toBeGreaterThan(COMBAT_PANEL_TOP)
      expect(sMid.panelTop).toBeLessThan(s0.panelTop)
    })

    it('zoom interpolates from 1.0 toward panel mapView zoom during RISING', () => {
      const mapView = { zoom: 2.3, pipTargetX: 200, pipTargetY: 250 }
      const { r, trigger } = setupRegistry(mapView)
      trigger()
      const s0 = r.computeMapState(0, PIP_X, PIP_Y)
      const sEnd = r.computeMapState(TRANSITION_DURATION - 1, PIP_X, PIP_Y)
      expect(s0.zoom).toBeCloseTo(1.0, 1)
      expect(sEnd.zoom).toBeGreaterThan(2.0)
    })

    it('does not pass click input during RISING', () => {
      const { r, panel, trigger } = setupRegistry()
      trigger()
      r.computeMapState(0, PIP_X, PIP_Y)
      expect(r.handleClick(100, 600)).toBe(false)
      expect(panel.handleClick).not.toHaveBeenCalled()
    })

    it('calls panel.draw during RISING', () => {
      const { r, panel, trigger } = setupRegistry()
      trigger()
      r.computeMapState(0, PIP_X, PIP_Y)
      const ctx = { save: vi.fn(), translate: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D
      r.draw(ctx, 50)
      expect(panel.draw).toHaveBeenCalled()
    })
  })

  describe('RISING → ACTIVE', () => {
    it('transitions to ACTIVE after TRANSITION_DURATION', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(r.isActive()).toBe(true)
      expect(r.isTransitioning()).toBe(false)
    })

    it('panelTop is COMBAT_PANEL_TOP during ACTIVE', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      const s = r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(s.panelTop).toBe(COMBAT_PANEL_TOP)
    })

    it('shouldDrawNavPanel is false during ACTIVE', () => {
      const { r, trigger } = setupRegistry()
      trigger()
      r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(r.shouldDrawNavPanel()).toBe(false)
    })

    it('passes click to panel during ACTIVE', () => {
      const { r, panel, trigger } = setupRegistry()
      trigger()
      r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(r.handleClick(100, 600)).toBe(true)
      expect(panel.handleClick).toHaveBeenCalledWith(100, 600)
    })

    it('passes pointerMove to panel during ACTIVE', () => {
      const { r, panel, trigger } = setupRegistry()
      trigger()
      r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(r.handlePointerMove(50, 700)).toBe(true)
      expect(panel.handlePointerMove).toHaveBeenCalledWith(50, 700)
    })

    it('uses panel mapView zoom during ACTIVE', () => {
      const mapView = { zoom: 2.3, pipTargetX: 195, pipTargetY: 240 }
      const { r, trigger } = setupRegistry(mapView)
      trigger()
      const s = r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(s.zoom).toBe(2.3)
      expect(s.pipTargetX).toBe(195)
      expect(s.pipTargetY).toBe(240)
    })

    it('uses default view when panel declares no mapView', () => {
      const { r, trigger } = setupRegistry()  // no mapView
      trigger()
      const s = r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      expect(s.zoom).toBe(1.0)
      expect(s.pipTargetX).toBe(PIP_X)
      expect(s.pipTargetY).toBe(PIP_Y)
    })
  })

  describe('ACTIVE → FALLING', () => {
    function setupActive(mapView?: { zoom: number; pipTargetX: number; pipTargetY: number }) {
      const setup = setupRegistry(mapView)
      setup.trigger()
      setup.r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      // Set now to match "current time" so FALLING startTime is correct
      setup.setNow(TRANSITION_DURATION + 1)
      return setup
    }

    it('isTransitioning becomes true after onComplete', () => {
      const { r, signalComplete } = setupActive()
      signalComplete('victory')
      expect(r.isTransitioning()).toBe(true)
    })

    it('shouldDrawNavPanel is true during FALLING on victory', () => {
      const { r, signalComplete } = setupActive()
      signalComplete('victory')
      const fallStart = TRANSITION_DURATION + 1
      r.computeMapState(fallStart + 10, PIP_X, PIP_Y)
      expect(r.shouldDrawNavPanel()).toBe(true)
    })

    it('shouldDrawNavPanel is false during FALLING on defeat', () => {
      const { r, signalComplete } = setupActive()
      signalComplete('defeat')
      const fallStart = TRANSITION_DURATION + 1
      r.computeMapState(fallStart + 10, PIP_X, PIP_Y)
      expect(r.shouldDrawNavPanel()).toBe(false)
    })

    it('panelTop rises from COMBAT_PANEL_TOP back toward LOGICAL_H during FALLING', () => {
      const { r, signalComplete } = setupActive()
      signalComplete('victory')
      const fallStart = TRANSITION_DURATION + 1
      const sEarly = r.computeMapState(fallStart + 1, PIP_X, PIP_Y)
      const sLater = r.computeMapState(fallStart + TRANSITION_DURATION / 2, PIP_X, PIP_Y)
      expect(sEarly.panelTop).toBeLessThanOrEqual(COMBAT_PANEL_TOP + 10)
      expect(sLater.panelTop).toBeGreaterThan(sEarly.panelTop)
    })

    it('input is blocked during FALLING', () => {
      const { r, signalComplete } = setupActive()
      signalComplete('victory')
      r.computeMapState(TRANSITION_DURATION + 2, PIP_X, PIP_Y)
      expect(r.handleClick(100, 500)).toBe(false)
      expect(r.handlePointerMove(100, 500)).toBe(false)
    })
  })

  describe('FALLING completion', () => {
    function setupFalling(outcome: string) {
      const setup = setupRegistry()
      setup.trigger()
      setup.r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      setup.setNow(TRANSITION_DURATION + 1)
      setup.signalComplete(outcome)
      // Advance past FALLING duration
      const endTime = (TRANSITION_DURATION + 1) + TRANSITION_DURATION + 1
      setup.r.computeMapState(endTime, PIP_X, PIP_Y)
      return { ...setup, endTime }
    }

    it('calls the victory handler when falling completes on victory', () => {
      const { victoryHandler, defeatHandler } = setupFalling('victory')
      expect(victoryHandler).toHaveBeenCalledTimes(1)
      expect(defeatHandler).not.toHaveBeenCalled()
    })

    it('calls the defeat handler when falling completes on defeat', () => {
      const { victoryHandler, defeatHandler } = setupFalling('defeat')
      expect(defeatHandler).toHaveBeenCalledTimes(1)
      expect(victoryHandler).not.toHaveBeenCalled()
    })

    it('returns to idle after FALLING completes', () => {
      const { r } = setupFalling('victory')
      expect(r.isActive()).toBe(false)
    })

    it('panelTop returns to LOGICAL_H after FALLING completes', () => {
      const { r, endTime } = setupFalling('victory')
      const s = r.computeMapState(endTime + 100, PIP_X, PIP_Y)
      expect(s.panelTop).toBe(LOGICAL_H)
    })

    it('logs an error for an unrecognised outcome', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      let capturedOnComplete: ((o: string) => void) | null = null
      let now = 0
      const r = createEncounterRegistry(() => now)
      r.register({
        trigger: () => true,
        factory: (onComplete) => { capturedOnComplete = onComplete; return makeMockPanel() },
        handlers: { victory: vi.fn() },
      })
      r.checkTrigger(ENEMY_CELL)
      r.computeMapState(TRANSITION_DURATION + 1, PIP_X, PIP_Y)
      now = TRANSITION_DURATION + 1
      capturedOnComplete!('unknown-outcome')
      r.computeMapState((TRANSITION_DURATION + 1) * 3, PIP_X, PIP_Y)
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('unknown-outcome'))
      spy.mockRestore()
    })
  })

  describe('multiple registrations', () => {
    it('activates the first matching trigger', () => {
      let now = 0
      const r = createEncounterRegistry(() => now)
      const factory1 = vi.fn(() => makeMockPanel())
      const factory2 = vi.fn(() => makeMockPanel())
      r.register({ trigger: (c) => c.roomType === 'enemy', factory: factory1, handlers: {} })
      r.register({ trigger: () => true, factory: factory2, handlers: {} })
      r.checkTrigger(ENEMY_CELL)
      expect(factory1).toHaveBeenCalledTimes(1)
      expect(factory2).not.toHaveBeenCalled()
    })

    it('falls through to second registration if first does not match', () => {
      let now = 0
      const r = createEncounterRegistry(() => now)
      const factory1 = vi.fn(() => makeMockPanel())
      const factory2 = vi.fn(() => makeMockPanel())
      r.register({ trigger: (c) => c.roomType === 'boss', factory: factory1, handlers: {} })
      r.register({ trigger: (c) => c.roomType === 'enemy', factory: factory2, handlers: {} })
      r.checkTrigger(ENEMY_CELL)
      expect(factory1).not.toHaveBeenCalled()
      expect(factory2).toHaveBeenCalledTimes(1)
    })
  })

  describe('draw does nothing when idle', () => {
    it('draw is a no-op when idle', () => {
      const r = createEncounterRegistry()
      r.computeMapState(0, PIP_X, PIP_Y)
      const ctx = { save: vi.fn(), translate: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D
      r.draw(ctx, 0)
      expect(ctx.save).not.toHaveBeenCalled()
    })
  })
})
