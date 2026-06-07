import type { Inventory, Item, ItemEffect } from './types'
import type { DicePool } from '../dice/pool'
import { rollPool } from '../dice/pool'
import type { DungeonState } from '../navigation/dungeon-state'
import { chebyshev } from '../navigation/dungeon-state'

export function acquireItem(inventory: Inventory, item: Item): Inventory {
  const existingIndex = inventory.items.findIndex(i => i.id === item.id)
  if (existingIndex >= 0) {
    const updated = [...inventory.items]
    updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + item.quantity }
    return { ...inventory, items: updated }
  }
  return { ...inventory, items: [...inventory.items, { ...item }] }
}

// Consume one use of an item: depletes charges (if the item has them) or quantity otherwise.
// Removes the item from inventory when depleted to zero.
export function consumeItem(inventory: Inventory, itemId: string): Inventory {
  const idx = inventory.items.findIndex(i => i.id === itemId)
  if (idx < 0) return inventory
  const item = inventory.items[idx]
  const updated = [...inventory.items]

  if (item.charges !== undefined) {
    const remaining = item.charges - 1
    if (remaining <= 0) {
      updated.splice(idx, 1)
    } else {
      updated[idx] = { ...item, charges: remaining }
    }
  } else {
    const remaining = item.quantity - 1
    if (remaining <= 0) {
      updated.splice(idx, 1)
    } else {
      updated[idx] = { ...item, quantity: remaining }
    }
  }

  return { ...inventory, items: updated }
}

// Reduces incoming damage by the sum of all passiveArmour values in the satchel (floor 0).
export function applyPassiveArmour(incomingDamage: number, inventory: Inventory): number {
  const total = inventory.items.reduce((sum, item) => sum + (item.passiveArmour ?? 0), 0)
  return Math.max(0, incomingDamage - total)
}

// Checks for death prevention at the moment pipHp would drop to ≤ 0.
// If a death-prevention item is present: sets HP to 1 and consumes the item.
// Returns unchanged HP and inventory when HP is already above 0 or no item exists.
export function applyDeathPrevention(
  pipHp: number,
  inventory: Inventory,
): { pipHp: number; inventory: Inventory } {
  if (pipHp > 0) return { pipHp, inventory }
  const item = inventory.items.find(i => i.deathPrevention === true)
  if (!item) return { pipHp, inventory }
  return { pipHp: 1, inventory: consumeItem(inventory, item.id) }
}

export interface ItemEffectContext {
  pipHp: number
  pipMaxHp: number
  pool: DicePool
  dungeonState: DungeonState
  tileRow: number
  tileCol: number
}

export interface ItemEffectResult {
  pipHpAfter?: number
  poolAfter?: DicePool
  dungeonStateAfter?: DungeonState
}

export function applyItemEffect(context: ItemEffectContext, effect: ItemEffect): ItemEffectResult {
  if (effect.type === 'heal') {
    return {
      pipHpAfter: Math.min(context.pipMaxHp, context.pipHp + effect.amount),
    }
  }

  if (effect.type === 'heal-full') {
    return {
      pipHpAfter: context.pipMaxHp,
    }
  }

  if (effect.type === 'reroll-dice') {
    return {
      poolAfter: rollPool(context.pool),
    }
  }

  if (effect.type === 'flee-combat') {
    const newCells = context.dungeonState.grid.cells.map(row => [...row])
    const cell = newCells[context.tileRow][context.tileCol]
    if (cell) {
      newCells[context.tileRow][context.tileCol] = { ...cell, fled: true }
    }
    return {
      dungeonStateAfter: { ...context.dungeonState, grid: { ...context.dungeonState.grid, cells: newCells } },
    }
  }

  if (effect.type === 'reveal-fog') {
    const fog = context.dungeonState.fog.map(row => [...row])
    for (let r = 0; r < fog.length; r++) {
      for (let c = 0; c < fog[0].length; c++) {
        const dist = chebyshev({ row: context.tileRow, col: context.tileCol }, { row: r, col: c })
        if (dist <= effect.radius) {
          fog[r][c] = 'visible'
        }
      }
    }
    return {
      dungeonStateAfter: { ...context.dungeonState, fog },
    }
  }

  if (effect.type === 'armor-buff') {
    // Armor buff is handled at combat time, not here
    return {}
  }

  if (effect.type === 'bonus-pips') {
    // Bonus pips handled in combat panel, self-damage applies to pipHp
    return {
      pipHpAfter: Math.max(0, context.pipHp - effect.selfDamage),
    }
  }

  if (effect.type === 'berserk') {
    // Berserk status handled in combat state
    return {}
  }

  return {}
}
