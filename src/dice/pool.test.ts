import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  starterPool,
  rollPool,
  canAfford,
  spendPips,
  resetPool,
  type DicePool,
} from './pool'

describe('starterPool', () => {
  it('returns 4 dice with the correct colours', () => {
    const pool = starterPool()
    expect(pool.dice).toHaveLength(4)
    const colors = pool.dice.map(d => d.color)
    expect(colors).toContain('red')
    expect(colors).toContain('blue')
    expect(colors).toContain('green')
    expect(colors).toContain('yellow')
  })

  it('starts in idle state with empty rolls and zero totals', () => {
    const pool = starterPool()
    expect(pool.state).toBe('idle')
    expect(pool.rolls).toHaveLength(0)
    expect(pool.totals).toEqual({ red: 0, blue: 0, green: 0, yellow: 0 })
  })

  it('each die has 6 sides', () => {
    const pool = starterPool()
    for (const die of pool.dice) expect(die.sides).toBe(6)
  })
})

describe('rollPool', () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5) })
  afterEach(() => { vi.restoreAllMocks() })

  it('transitions state to rolling', () => {
    const pool = rollPool(starterPool())
    expect(pool.state).toBe('rolling')
  })

  it('produces one RolledDie per Die', () => {
    const pool = rollPool(starterPool())
    expect(pool.rolls).toHaveLength(4)
  })

  it('roll values are within [1..sides]', () => {
    vi.restoreAllMocks()
    for (let i = 0; i < 50; i++) {
      const pool = rollPool(starterPool())
      for (const r of pool.rolls) {
        expect(r.value).toBeGreaterThanOrEqual(1)
        expect(r.value).toBeLessThanOrEqual(r.sides)
      }
    }
  })

  it('totals reflect the sum of rolled values per colour', () => {
    // Math.random() = 0.5 → Math.floor(0.5 * 6) + 1 = 4
    const pool = rollPool(starterPool())
    expect(pool.totals.red).toBe(4)
    expect(pool.totals.blue).toBe(4)
    expect(pool.totals.green).toBe(4)
    expect(pool.totals.yellow).toBe(4)
  })

  it('does not mutate the original pool', () => {
    const original = starterPool()
    rollPool(original)
    expect(original.state).toBe('idle')
    expect(original.rolls).toHaveLength(0)
  })

  it('handles a d1 die by always producing value 1', () => {
    const pool: DicePool = {
      dice: [{ color: 'red', sides: 1 }],
      rolls: [],
      totals: { red: 0, blue: 0, green: 0, yellow: 0 },
      state: 'idle',
    }
    vi.restoreAllMocks()
    for (let i = 0; i < 20; i++) {
      const rolled = rollPool(pool)
      expect(rolled.rolls[0].value).toBe(1)
    }
  })
})

describe('canAfford', () => {
  it('returns true when all colours are affordable', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 3, blue: 2, green: 1, yellow: 4 },
      state: 'rolled',
    }
    expect(canAfford(pool, { red: 2, blue: 2 })).toBe(true)
  })

  it('returns false when one colour is unaffordable', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 1, blue: 2, green: 1, yellow: 4 },
      state: 'rolled',
    }
    expect(canAfford(pool, { red: 2 })).toBe(false)
  })

  it('returns true for an empty cost', () => {
    expect(canAfford(starterPool(), {})).toBe(true)
  })

  it('does not mutate the pool', () => {
    const pool: DicePool = { ...starterPool(), totals: { red: 3, blue: 0, green: 0, yellow: 0 }, state: 'rolled' }
    canAfford(pool, { red: 3 })
    expect(pool.totals.red).toBe(3)
  })
})

describe('spendPips', () => {
  it('deducts pips and returns success: true when affordable', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 3, blue: 2, green: 1, yellow: 4 },
      state: 'rolled',
    }
    const result = spendPips(pool, { red: 2, blue: 1 })
    expect(result.success).toBe(true)
    expect(result.pool.totals.red).toBe(1)
    expect(result.pool.totals.blue).toBe(1)
  })

  it('returns original pool and success: false when unaffordable', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 1, blue: 0, green: 0, yellow: 0 },
      state: 'rolled',
    }
    const result = spendPips(pool, { red: 2 })
    expect(result.success).toBe(false)
    expect(result.pool).toBe(pool)
  })

  it('never partially deducts on failure', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 3, blue: 1, green: 0, yellow: 0 },
      state: 'rolled',
    }
    const result = spendPips(pool, { red: 2, blue: 2 })
    expect(result.success).toBe(false)
    expect(result.pool.totals.red).toBe(3)
    expect(result.pool.totals.blue).toBe(1)
  })

  it('does not mutate the original pool on success', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 3, blue: 0, green: 0, yellow: 0 },
      state: 'rolled',
    }
    spendPips(pool, { red: 2 })
    expect(pool.totals.red).toBe(3)
  })
})

describe('resetPool', () => {
  it('transitions to idle', () => {
    const pool: DicePool = { ...starterPool(), state: 'rolled' }
    expect(resetPool(pool).state).toBe('idle')
  })

  it('clears rolls', () => {
    const pool: DicePool = {
      ...starterPool(),
      rolls: [{ color: 'red', sides: 6, value: 3 }],
      state: 'rolled',
    }
    expect(resetPool(pool).rolls).toHaveLength(0)
  })

  it('zeros all totals', () => {
    const pool: DicePool = {
      ...starterPool(),
      totals: { red: 3, blue: 2, green: 1, yellow: 4 },
      state: 'rolled',
    }
    const reset = resetPool(pool)
    expect(reset.totals).toEqual({ red: 0, blue: 0, green: 0, yellow: 0 })
  })

  it('preserves the original dice', () => {
    const pool = starterPool()
    const reset = resetPool(pool)
    expect(reset.dice).toEqual(pool.dice)
  })
})
