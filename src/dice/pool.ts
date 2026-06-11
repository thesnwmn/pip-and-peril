export type DieColor = 'red' | 'blue' | 'green' | 'yellow'
export type PipCost = Partial<Record<DieColor, number>>
export type PoolState = 'idle' | 'rolling' | 'rolled'

export interface Die {
  color: DieColor
  sides: number
  minFloor?: number  // when set, roll results are clamped: Math.max(raw, minFloor)
}

export interface RolledDie extends Die {
  value: number
}

export interface DicePool {
  dice: Die[]
  rolls: RolledDie[]
  totals: Record<DieColor, number>
  state: PoolState
}

const ZERO_TOTALS: Record<DieColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 }

export function starterPool(): DicePool {
  return {
    dice: [
      { color: 'red', sides: 6 },
      { color: 'green', sides: 6 },
      { color: 'blue', sides: 6 },
      { color: 'yellow', sides: 6 },
    ],
    rolls: [],
    totals: { ...ZERO_TOTALS },
    state: 'idle',
  }
}

export function rollPool(pool: DicePool): DicePool {
  const rolls: RolledDie[] = pool.dice.map(die => ({
    ...die,
    value: Math.max(Math.floor(Math.random() * die.sides) + 1, die.minFloor ?? 1),
  }))
  const totals: Record<DieColor, number> = { ...ZERO_TOTALS }
  for (const r of rolls) totals[r.color] += r.value
  return { ...pool, rolls, totals, state: 'rolling' }
}

export function canAfford(pool: DicePool, cost: PipCost): boolean {
  for (const color of Object.keys(cost) as DieColor[]) {
    if ((pool.totals[color] ?? 0) < (cost[color] ?? 0)) return false
  }
  return true
}

export function spendPips(pool: DicePool, cost: PipCost): { pool: DicePool; success: boolean } {
  if (!canAfford(pool, cost)) return { pool, success: false }
  const totals = { ...pool.totals }
  for (const color of Object.keys(cost) as DieColor[]) {
    totals[color] -= cost[color] ?? 0
  }
  return { pool: { ...pool, totals }, success: true }
}

export function resetPool(pool: DicePool): DicePool {
  return { ...pool, rolls: [], totals: { ...ZERO_TOTALS }, state: 'idle' }
}
