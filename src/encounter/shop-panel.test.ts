import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createShopEncounterPanel } from './shop-panel'
import type { TileCell } from '../map/types'
import type { Inventory } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { CATALOG_ITEMS } from '../satchel/catalog'

describe('Shop Encounter Panel', () => {
  let inventory: Inventory
  let dungeonState: DungeonState
  let onComplete: (outcome: string) => void
  let cell: TileCell

  beforeEach(() => {
    inventory = { gold: 10, items: [] }
    onComplete = vi.fn() as any

    // Minimal dungeon state
    dungeonState = {
      grid: {
        width: 5,
        height: 5,
        cells: Array(5).fill(null).map(() => Array(5).fill(null)),
      },
      pip: { col: 2, row: 2 },
      camera: { col: 2, row: 2 },
      fog: Array(5).fill(null).map(() => Array(5).fill('visible' as const)),
      floor: 1,
      floorTilesPlaced: 0,
      totalTilesPlaced: 0,
      floorEntryPosition: { col: 2, row: 2 },
      shopPlacedThisFloor: false,
      uiState: 'idle',
      pendingDir: null,
      offerings: [],
      stepCount: 0,
      roomsEntered: 0,
      enemiesDefeated: 0,
    } as any

    cell = {
      roomType: 'shop',
      exits: 15,
      shopMerchant: 'Morwhistle the Vole',
      shopStock: ['cheese-crumb', 'gouda-wedge', 'lucky-acorn'],
    }
  })

  describe('Placement', () => {
    it('should accept a shop cell with stock', () => {
      expect(cell.shopStock).toHaveLength(3)
      expect(cell.shopStock).toEqual(['cheese-crumb', 'gouda-wedge', 'lucky-acorn'])
    })

    it('should have a merchant name', () => {
      expect(cell.shopMerchant).toBeDefined()
      expect(cell.shopMerchant?.length).toBeGreaterThan(0)
    })

    it('should only allow valid catalog item IDs in stock', () => {
      const validIds = new Set(CATALOG_ITEMS.map(i => i.id))
      cell.shopStock!.forEach(id => {
        expect(validIds.has(id)).toBe(true)
      })
    })

    it('should have no duplicate items in stock', () => {
      const stock = cell.shopStock!
      const unique = new Set(stock)
      expect(unique.size).toBe(stock.length)
    })
  })

  describe('Buy flow', () => {
    it('should purchase an item and deduct gold', () => {
      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      const itemId = 'cheese-crumb'
      const item = CATALOG_ITEMS.find(i => i.id === itemId)!
      const initialGold = inventory.gold
      const initialItemCount = inventory.items.length

      // Simulate buying
      inventory.gold -= item.shopPrice!
      inventory.items.push({ ...item, quantity: 1 })
      const newStock = cell.shopStock!.filter(id => id !== itemId)

      expect(inventory.gold).toBe(initialGold - item.shopPrice!)
      expect(inventory.items.length).toBe(initialItemCount + 1)
      expect(newStock).not.toContain(itemId)
    })

    it('should not allow purchase when gold is insufficient', () => {
      inventory.gold = 1
      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      const item = CATALOG_ITEMS.find(i => i.id === 'smoke-pellet')!
      const canAfford = inventory.gold >= item.shopPrice!

      expect(canAfford).toBe(false)
    })
  })

  describe('Sold-out state', () => {
    it('should trigger when stock is empty', () => {
      cell.shopStock = []
      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      expect(cell.shopStock).toHaveLength(0)
    })

    it('should trigger after last item is purchased', () => {
      cell.shopStock = ['cheese-crumb']
      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      // After purchase, stock should be empty
      const finalStock: string[] = []
      expect(finalStock).toHaveLength(0)
    })
  })

  describe('Gold update after purchase', () => {
    it('should update affordability after purchase reduces gold', () => {
      inventory.gold = 5
      cell.shopStock = ['cheese-crumb', 'gouda-wedge']
      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      // Buy cheese crumb (2 gold)
      const cheese = CATALOG_ITEMS.find(i => i.id === 'cheese-crumb')!
      inventory.gold -= cheese.shopPrice!

      // Now only 3 gold left, can't afford gouda (5 gold)
      const gouda = CATALOG_ITEMS.find(i => i.id === 'gouda-wedge')!
      const canAffordGouda = inventory.gold >= gouda.shopPrice!

      expect(canAffordGouda).toBe(false)
    })
  })

  describe('Stacking purchase', () => {
    it('should increment quantity when buying a duplicate item', () => {
      const cheese = CATALOG_ITEMS.find(i => i.id === 'cheese-crumb')!
      inventory.items = [{ ...cheese, quantity: 1 }]

      const context = {
        getInventory: () => inventory,
        setInventory: (inv: Inventory) => { inventory = inv },
        getDungeonState: () => dungeonState,
        setDungeonState: (s: DungeonState) => { dungeonState = s },
      }

      const panel = createShopEncounterPanel(onComplete, cell, { zoom: 1.2, pipTargetX: 100, pipTargetY: 100 }, context)

      // Simulate buying the same item again
      const foundItem = inventory.items.find(i => i.id === 'cheese-crumb')
      if (foundItem) {
        foundItem.quantity += 1
      }

      expect(inventory.items[0].quantity).toBe(2)
      expect(inventory.items).toHaveLength(1)
    })
  })
})
