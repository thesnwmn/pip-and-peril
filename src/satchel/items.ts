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

  return {}
}
