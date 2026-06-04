import { describe, it, expect, vi } from 'vitest'
import { createItemEncounterPanel, TAKE_BTN_X, TAKE_BTN_W, TAKE_BTN_Y, TAKE_BTN_H, LEAVE_CY } from './item-panel'
import type { ItemPanelContext } from './item-panel'
import type { TileCell } from '../map/types'
import type { Inventory } from '../satchel/types'
import type { MapViewConfig } from './panel'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { initDungeon } from '../navigation/dungeon-state'

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
  return ctx
}

const MOCK_MAP_VIEW: MapViewConfig = { zoom: 1.2, pipTargetX: 195, pipTargetY: 230 }

function makeContext(inventory: Inventory = { gold: 0, items: [] }): {
  context: ItemPanelContext
  getLatestInventory: () => Inventory
  getLatestDungeonState: () => import('../navigation/dungeon-state').DungeonState
} {
  let inv = inventory
  let dungeonState = initDungeon()
  return {
    context: {
      getInventory: () => inv,
      setInventory: (i) => { inv = i },
      getDungeonState: () => dungeonState,
      setDungeonState: (s) => { dungeonState = s },
    },
    getLatestInventory: () => inv,
    getLatestDungeonState: () => dungeonState,
  }
}

function makeItemCell(itemId: string = 'cheese-crumb'): TileCell {
  return { roomType: 'item', exits: 0, itemId }
}

// Click center of Take button
const TAKE_CX = TAKE_BTN_X + TAKE_BTN_W / 2
const TAKE_CY = TAKE_BTN_Y + TAKE_BTN_H / 2

// Click center of Leave hit area
const LEAVE_CX = 195
const LEAVE_CY_CENTER = LEAVE_CY

describe('createItemEncounterPanel', () => {
  describe('Take outcome', () => {
    it('adds the item to inventory when Take is clicked', () => {
      const { context, getLatestInventory } = makeContext()
      const cell = makeItemCell('cheese-crumb')
      const panel = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, context)
      panel.handleClick(TAKE_CX, TAKE_CY)
      const inv = getLatestInventory()
      expect(inv.items).toHaveLength(1)
      expect(inv.items[0].id).toBe('cheese-crumb')
    })

    it('sets tile.cleared = true when Take is clicked', () => {
      const { context, getLatestDungeonState } = makeContext()
      const cell = makeItemCell('cheese-crumb')
      const panel = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, context)

      // Place the pip on the tile
      const ds = context.getDungeonState()
      const { row, col } = ds.pip
      const newCells = ds.grid.cells.map(r => [...r])
      newCells[row][col] = { roomType: 'item', exits: 0, itemId: 'cheese-crumb' }
      context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })

      panel.handleClick(TAKE_CX, TAKE_CY)
      const updatedCell = getLatestDungeonState().grid.cells[row][col]
      expect(updatedCell?.cleared).toBe(true)
    })

    it('signals the "taken" outcome when Take is clicked', () => {
      const onComplete = vi.fn()
      const cell = makeItemCell('cheese-crumb')
      const { context } = makeContext()
      const panel = createItemEncounterPanel(onComplete, cell, MOCK_MAP_VIEW, context)
      panel.handleClick(TAKE_CX, TAKE_CY)
      expect(onComplete).toHaveBeenCalledOnce()
      expect(onComplete).toHaveBeenCalledWith('taken')
    })

    it('does not call onComplete twice if clicked again after Take', () => {
      const onComplete = vi.fn()
      const cell = makeItemCell('cheese-crumb')
      const { context } = makeContext()
      const panel = createItemEncounterPanel(onComplete, cell, MOCK_MAP_VIEW, context)
      panel.handleClick(TAKE_CX, TAKE_CY)
      panel.handleClick(TAKE_CX, TAKE_CY)
      expect(onComplete).toHaveBeenCalledOnce()
    })
  })

  describe('Leave outcome', () => {
    it('does not add item to inventory when Leave is clicked', () => {
      const { context, getLatestInventory } = makeContext()
      const cell = makeItemCell('lucky-acorn')
      const panel = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, context)
      panel.handleClick(LEAVE_CX, LEAVE_CY_CENTER)
      expect(getLatestInventory().items).toHaveLength(0)
    })

    it('does not set cleared on the tile when Leave is clicked', () => {
      const { context, getLatestDungeonState } = makeContext()
      const cell = makeItemCell('lucky-acorn')
      const ds = context.getDungeonState()
      const { row, col } = ds.pip
      const newCells = ds.grid.cells.map(r => [...r])
      newCells[row][col] = { roomType: 'item', exits: 0, itemId: 'lucky-acorn' }
      context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })

      const panel = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, context)
      panel.handleClick(LEAVE_CX, LEAVE_CY_CENTER)
      const updatedCell = getLatestDungeonState().grid.cells[row][col]
      expect(updatedCell?.cleared).toBeUndefined()
    })

    it('signals the "left" outcome when Leave is clicked', () => {
      const onComplete = vi.fn()
      const cell = makeItemCell('lucky-acorn')
      const { context } = makeContext()
      const panel = createItemEncounterPanel(onComplete, cell, MOCK_MAP_VIEW, context)
      panel.handleClick(LEAVE_CX, LEAVE_CY_CENTER)
      expect(onComplete).toHaveBeenCalledOnce()
      expect(onComplete).toHaveBeenCalledWith('left')
    })
  })

  describe('re-entry after Leave', () => {
    it('presents the same item on re-entry when the tile was not cleared', () => {
      const cell = makeItemCell('smoke-pellet')
      // itemId is fixed on the cell at placement time; both encounters see the same id
      const { context: ctx1 } = makeContext()
      const panel1 = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, ctx1)

      const { context: ctx2 } = makeContext()
      const panel2 = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, ctx2)

      // Both panels resolve the item from the same cell.itemId
      // Verify they would both show the same item by simulating Take on both
      const onComplete1 = vi.fn()
      const onComplete2 = vi.fn()
      const pA = createItemEncounterPanel(onComplete1, cell, MOCK_MAP_VIEW, makeContext().context)
      const pB = createItemEncounterPanel(onComplete2, cell, MOCK_MAP_VIEW, makeContext().context)

      const inv1Ctx = makeContext()
      const pC = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, inv1Ctx.context)
      pC.handleClick(TAKE_CX, TAKE_CY)
      expect(inv1Ctx.getLatestInventory().items[0]?.id).toBe('smoke-pellet')

      // Re-create panel with same uncleared cell — same item presented
      const inv2Ctx = makeContext()
      const pD = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, inv2Ctx.context)
      pD.handleClick(TAKE_CX, TAKE_CY)
      expect(inv2Ctx.getLatestInventory().items[0]?.id).toBe('smoke-pellet')
    })
  })

  describe('map view', () => {
    it('exposes the mapView passed at creation', () => {
      const cell = makeItemCell('gouda-wedge')
      const { context } = makeContext()
      const view: MapViewConfig = { zoom: 1.2, pipTargetX: 100, pipTargetY: 200 }
      const panel = createItemEncounterPanel(vi.fn(), cell, view, context)
      expect(panel.mapView).toEqual(view)
    })
  })

  describe('draw', () => {
    it('draws without throwing when given a mock canvas', () => {
      const cell = makeItemCell('glowstone-dust')
      const { context } = makeContext()
      const panel = createItemEncounterPanel(vi.fn(), cell, MOCK_MAP_VIEW, context)
      const ctx = makeCtx()
      expect(() => panel.draw(ctx, 0)).not.toThrow()
    })
  })
})
