import { describe, it, expect } from 'vitest'
import { ENEMY_ROSTER, spawnEnemy, getEnemySpec } from './roster'

describe('ENEMY_ROSTER', () => {
  it('contains exactly 13 enemies (12 normal + 1 boss)', () => {
    expect(ENEMY_ROSTER).toHaveLength(13)
  })

  it('has 4 tier-1 enemies', () => {
    const tier1 = ENEMY_ROSTER.filter(e => e.tier === 1)
    expect(tier1).toHaveLength(4)
  })

  it('has 4 tier-2 enemies', () => {
    const tier2 = ENEMY_ROSTER.filter(e => e.tier === 2)
    expect(tier2).toHaveLength(4)
  })

  it('has 5 tier-3 entries (4 normal + 1 boss)', () => {
    const tier3 = ENEMY_ROSTER.filter(e => e.tier === 3)
    expect(tier3).toHaveLength(5)
  })

  it('all enemies have unique ids', () => {
    const ids = ENEMY_ROSTER.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(13)
  })

  it('all non-boss enemies have at least one intent', () => {
    for (const enemy of ENEMY_ROSTER.filter(e => !e.isBoss)) {
      expect(enemy.intents.length).toBeGreaterThan(0)
    }
  })

  it('boss enemies use intentCycle instead of intents', () => {
    for (const enemy of ENEMY_ROSTER.filter(e => e.isBoss)) {
      expect(enemy.intentCycle).toBeDefined()
      expect(enemy.intentCycle!.length).toBeGreaterThan(0)
    }
  })
})

describe('spawnEnemy', () => {
  it('creates an enemy with hp === maxHp', () => {
    const spec = ENEMY_ROSTER[0]
    const enemy = spawnEnemy(spec)
    expect(enemy.hp).toBe(spec.maxHp)
    expect(enemy.hp).toBe(enemy.maxHp)
  })

  it('creates an enemy with block === 0', () => {
    const spec = ENEMY_ROSTER[0]
    const enemy = spawnEnemy(spec)
    expect(enemy.block).toBe(0)
  })

  it('creates an enemy with empowered === false', () => {
    const spec = ENEMY_ROSTER[0]
    const enemy = spawnEnemy(spec)
    expect(enemy.empowered).toBe(false)
  })

  it('creates an enemy with disengaged === false', () => {
    const spec = ENEMY_ROSTER[0]
    const enemy = spawnEnemy(spec)
    expect(enemy.disengaged).toBe(false)
  })

  it('copies spec fields to enemy', () => {
    const spec = ENEMY_ROSTER[5]
    const enemy = spawnEnemy(spec)
    expect(enemy.id).toBe(spec.id)
    expect(enemy.name).toBe(spec.name)
    expect(enemy.attack).toBe(spec.attack)
    expect(enemy.goldMin).toBe(spec.goldMin)
    expect(enemy.goldMax).toBe(spec.goldMax)
    expect(enemy.intents).toBe(spec.intents)
  })
})

describe('getEnemySpec', () => {
  it('retrieves a spec by id', () => {
    const spec = ENEMY_ROSTER[0]
    const retrieved = getEnemySpec(spec.id)
    expect(retrieved).toBe(spec)
  })

  it('retrieves all 12 specs by their ids', () => {
    for (const spec of ENEMY_ROSTER) {
      const retrieved = getEnemySpec(spec.id)
      expect(retrieved).toBe(spec)
    }
  })

  it('throws for unknown ids', () => {
    expect(() => getEnemySpec('nonexistent-enemy')).toThrow('Unknown enemy ID: nonexistent-enemy')
  })
})
