import { describe, it, expect } from 'vitest'
import { acquireItem, applyItemEffect, consumeItem, applyPassiveArmour, applyDeathPrevention } from './items'
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

describe('consumeItem', () => {
  it('decrements quantity by 1', () => {
    const inv: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 3 }] }
    const result = consumeItem(inv, 'cheese-crumb')
    expect(result.items[0]!.quantity).toBe(2)
  })

  it('removes item when quantity reaches 0', () => {
    const inv: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 1 }] }
    const result = consumeItem(inv, 'cheese-crumb')
    expect(result.items).toHaveLength(0)
  })

  it('decrements charges instead of quantity when charges field is present', () => {
    const chargedItem: Item = { ...CHEESE_CRUMB, id: 'charged-item', charges: 3, quantity: 1 }
    const inv: Inventory = { gold: 0, items: [chargedItem] }
    const result = consumeItem(inv, 'charged-item')
    expect(result.items[0]!.charges).toBe(2)
    expect(result.items[0]!.quantity).toBe(1)  // quantity unchanged
  })

  it('removes item when charges reaches 0', () => {
    const chargedItem: Item = { ...CHEESE_CRUMB, id: 'charged-item', charges: 1, quantity: 1 }
    const inv: Inventory = { gold: 0, items: [chargedItem] }
    const result = consumeItem(inv, 'charged-item')
    expect(result.items).toHaveLength(0)
  })

  it('is a no-op for an unknown item id', () => {
    const inv: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 1 }] }
    const result = consumeItem(inv, 'no-such-item')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.quantity).toBe(1)
  })

  it('does not modify the original inventory', () => {
    const inv: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 2 }] }
    consumeItem(inv, 'cheese-crumb')
    expect(inv.items[0]!.quantity).toBe(2)
  })
})

describe('applyPassiveArmour', () => {
  it('returns full damage when no passive armour items present', () => {
    const inv: Inventory = { gold: 0, items: [] }
    expect(applyPassiveArmour(5, inv)).toBe(5)
  })

  it('reduces damage by passiveArmour value', () => {
    const armourItem: Item = { ...CHEESE_CRUMB, id: 'jerkin', passiveArmour: 1 }
    const inv: Inventory = { gold: 0, items: [armourItem] }
    expect(applyPassiveArmour(4, inv)).toBe(3)
  })

  it('stacks multiple passive armour items', () => {
    const jerkin: Item = { ...CHEESE_CRUMB, id: 'jerkin', passiveArmour: 1 }
    const coat: Item = { ...CHEESE_CRUMB, id: 'coat', passiveArmour: 2 }
    const inv: Inventory = { gold: 0, items: [jerkin, coat] }
    expect(applyPassiveArmour(5, inv)).toBe(2)
  })

  it('clamps result to 0 when armour exceeds damage', () => {
    const armourItem: Item = { ...CHEESE_CRUMB, id: 'jerkin', passiveArmour: 10 }
    const inv: Inventory = { gold: 0, items: [armourItem] }
    expect(applyPassiveArmour(3, inv)).toBe(0)
  })
})

describe('applyDeathPrevention', () => {
  it('does nothing when HP is already above 0', () => {
    const preventItem: Item = { ...CHEESE_CRUMB, id: 'talisman', deathPrevention: true }
    const inv: Inventory = { gold: 0, items: [preventItem] }
    const result = applyDeathPrevention(3, inv)
    expect(result.pipHp).toBe(3)
    expect(result.inventory.items).toHaveLength(1)  // item not consumed
  })

  it('does nothing when HP ≤ 0 but no death-prevention item', () => {
    const inv: Inventory = { gold: 0, items: [{ ...CHEESE_CRUMB, quantity: 1 }] }
    const result = applyDeathPrevention(0, inv)
    expect(result.pipHp).toBe(0)
    expect(result.inventory.items).toHaveLength(1)
  })

  it('sets HP to 1 and consumes the item when HP reaches 0', () => {
    const preventItem: Item = { ...CHEESE_CRUMB, id: 'talisman', deathPrevention: true, quantity: 1 }
    const inv: Inventory = { gold: 0, items: [preventItem] }
    const result = applyDeathPrevention(0, inv)
    expect(result.pipHp).toBe(1)
    expect(result.inventory.items).toHaveLength(0)
  })

  it('also fires when HP is negative', () => {
    const preventItem: Item = { ...CHEESE_CRUMB, id: 'talisman', deathPrevention: true, quantity: 1 }
    const inv: Inventory = { gold: 0, items: [preventItem] }
    const result = applyDeathPrevention(-2, inv)
    expect(result.pipHp).toBe(1)
    expect(result.inventory.items).toHaveLength(0)
  })
})
