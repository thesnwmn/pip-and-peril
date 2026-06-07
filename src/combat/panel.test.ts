import { describe, it, expect } from 'vitest'
import { getCombatUsableItems } from './panel'
import type { Inventory } from '../satchel/types'
import { CHEESE_CRUMB, LUCKY_ACORN, SMOKE_PELLET } from '../satchel/catalog'

function makeInventory(items: typeof CHEESE_CRUMB[]): Inventory {
  return { gold: 0, items }
}

describe('getCombatUsableItems', () => {
  it('returns all usable-in-combat items when pipsSpentThisTurn is false', () => {
    const inv = makeInventory([
      { ...CHEESE_CRUMB, quantity: 1 },
      { ...LUCKY_ACORN, quantity: 1 },
      { ...SMOKE_PELLET, quantity: 1 },
    ])
    const result = getCombatUsableItems(inv, false)
    // CHEESE_CRUMB, LUCKY_ACORN, SMOKE_PELLET all have usableInCombat: true
    expect(result).toHaveLength(3)
  })

  it('excludes Luck items when pipsSpentThisTurn is true', () => {
    const inv = makeInventory([
      { ...CHEESE_CRUMB, quantity: 1 },
      { ...LUCKY_ACORN, quantity: 1 },
    ])
    const result = getCombatUsableItems(inv, true)
    // Lucky Acorn is Luck-class and should be excluded
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('cheese-crumb')
  })

  it('returns empty list when all combat items are Luck-class and pips are spent', () => {
    const inv = makeInventory([{ ...LUCKY_ACORN, quantity: 1 }])
    const result = getCombatUsableItems(inv, true)
    expect(result).toHaveLength(0)
  })

  it('includes Luck items when pipsSpentThisTurn is false even with other items', () => {
    const inv = makeInventory([
      { ...LUCKY_ACORN, quantity: 1 },
      { ...CHEESE_CRUMB, quantity: 1 },
    ])
    const result = getCombatUsableItems(inv, false)
    expect(result).toHaveLength(2)
  })

  it('excludes nav-only items regardless of pipsSpentThisTurn', () => {
    const inv = makeInventory([
      { ...CHEESE_CRUMB, quantity: 1 },
    ])
    // GLOWSTONE_DUST is usableInNav: true, usableInCombat: false — not in this inventory anyway
    // Confirm cheese (usableInCombat: true) is included
    expect(getCombatUsableItems(inv, false)).toHaveLength(1)
    expect(getCombatUsableItems(inv, true)).toHaveLength(1)
  })
})
