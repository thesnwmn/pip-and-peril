import { describe, it, expect } from 'vitest'
import { acquireItem, applyItemEffect } from './items'
import type { Inventory, Item } from './types'
import { CHEESE_CRUMB, GOUDA_WEDGE, LUCKY_ACORN, SMOKE_PELLET, GLOWSTONE_DUST } from './catalog'
import { starterPool } from '../dice/pool'
import { initDungeon } from '../navigation/dungeon-state'

describe('acquireItem', () => {
  it('adds a new item when not in inventory', () => {
    const inventory: Inventory = { gold: 0, items: [] }
    const result = acquireItem(inventory, { ...CHEESE_CRUMB, quantity: 1 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('cheese-crumb')
    expect(result.items[0].quantity).toBe(1)
  })

  it('increments quantity when item already exists', () => {
    const inventory: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 2 }] }
    const result = acquireItem(inventory, { ...CHEESE_CRUMB, quantity: 3 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(5)
  })

  it('preserves existing items when adding a new one', () => {
    const inventory: Inventory = { gold: 0, items: [{ ...GOUDA_WEDGE, quantity: 1 }] }
    const result = acquireItem(inventory, { ...CHEESE_CRUMB, quantity: 1 })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('gouda-wedge')
    expect(result.items[1].id).toBe('cheese-crumb')
  })

  it('does not modify original inventory', () => {
    const inventory: Inventory = { gold: 0, items: [] }
    acquireItem(inventory, { ...CHEESE_CRUMB, quantity: 1 })
    expect(inventory.items).toHaveLength(0)
  })
})

describe('applyItemEffect', () => {
  const dungeonState = initDungeon()
  const pool = starterPool()

  describe('heal effect', () => {
    it('restores HP normally', () => {
      const result = applyItemEffect(
        {
          pipHp: 5,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 0,
          tileCol: 0,
        },
        { type: 'heal', amount: 2 },
      )
      expect(result.pipHpAfter).toBe(7)
    })

    it('caps HP at max', () => {
      const result = applyItemEffect(
        {
          pipHp: 9,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 0,
          tileCol: 0,
        },
        { type: 'heal', amount: 5 },
      )
      expect(result.pipHpAfter).toBe(10)
    })

    it('does not change HP when already at max', () => {
      const result = applyItemEffect(
        {
          pipHp: 10,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 0,
          tileCol: 0,
        },
        { type: 'heal', amount: 2 },
      )
      expect(result.pipHpAfter).toBe(10)
    })
  })

  describe('reroll-dice effect', () => {
    it('returns a new pool state', () => {
      const result = applyItemEffect(
        {
          pipHp: 10,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 0,
          tileCol: 0,
        },
        { type: 'reroll-dice' },
      )
      expect(result.poolAfter).toBeDefined()
      expect(result.poolAfter!.state).toBe('rolling')
    })
  })

  describe('flee-combat effect', () => {
    it('marks tile as fled', () => {
      // Use the starting room position (6, 6) which exists in the initial dungeon
      const result = applyItemEffect(
        {
          pipHp: 10,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 6,
          tileCol: 6,
        },
        { type: 'flee-combat' },
      )
      expect(result.dungeonStateAfter).toBeDefined()
      expect(result.dungeonStateAfter!.grid.cells[6][6]?.fled).toBe(true)
    })
  })

  describe('reveal-fog effect', () => {
    it('reveals tiles within radius', () => {
      const result = applyItemEffect(
        {
          pipHp: 10,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 5,
          tileCol: 5,
        },
        { type: 'reveal-fog', radius: 2 },
      )
      expect(result.dungeonStateAfter).toBeDefined()
      // Check tiles within radius are visible
      for (let r = 3; r <= 7; r++) {
        for (let c = 3; c <= 7; c++) {
          if (r >= 0 && r < dungeonState.fog.length && c >= 0 && c < dungeonState.fog[0].length) {
            expect(result.dungeonStateAfter!.fog[r][c]).toBe('visible')
          }
        }
      }
    })

    it('does not reveal tiles outside radius', () => {
      const result = applyItemEffect(
        {
          pipHp: 10,
          pipMaxHp: 10,
          pool,
          dungeonState,
          tileRow: 5,
          tileCol: 5,
        },
        { type: 'reveal-fog', radius: 2 },
      )
      const updatedFog = result.dungeonStateAfter!.fog
      // Check a tile definitely outside radius is not visible
      const fogValue = updatedFog[0][0]
      expect(fogValue).not.toBe('visible')
    })
  })
})
