import { describe, expect, it } from 'vitest'
import { CARD_TEASES, LOG_MESSAGES, logStyleForRoom, poolForDepth } from './room-pool'

describe('poolForDepth', () => {
  it('returns shallow pool for depth ≤2', () => {
    const pool = poolForDepth(1)
    expect(pool).toContain('corridor')
    expect(pool).not.toContain('enemy')
    expect(pool).not.toContain('boss')
  })

  it('returns mid pool for depth 3–4', () => {
    const pool = poolForDepth(3)
    expect(pool).toContain('enemy')
    expect(pool).not.toContain('boss')
  })

  it('returns deep pool for depth ≥5', () => {
    const pool = poolForDepth(5)
    expect(pool).toContain('boss')
    expect(pool).toContain('enemy')
  })

  it('depth 2 uses shallow pool (boundary)', () => {
    const pool = poolForDepth(2)
    expect(pool).toContain('corridor')
    expect(pool).not.toContain('enemy')
  })

  it('depth 4 uses mid pool (boundary)', () => {
    const pool = poolForDepth(4)
    expect(pool).toContain('enemy')
    expect(pool).not.toContain('boss')
  })
})

describe('logStyleForRoom', () => {
  it('maps combat rooms to their log style', () => {
    expect(logStyleForRoom('enemy')).toBe('enemy')
    expect(logStyleForRoom('boss')).toBe('boss')
    expect(logStyleForRoom('shop')).toBe('shop')
    expect(logStyleForRoom('npc')).toBe('npc')
    expect(logStyleForRoom('item')).toBe('item')
    expect(logStyleForRoom('chest')).toBe('chest')
  })

  it('returns normal for corridor and start', () => {
    expect(logStyleForRoom('corridor')).toBe('normal')
    expect(logStyleForRoom('start')).toBe('normal')
  })
})

describe('LOG_MESSAGES', () => {
  it('has messages for all loggable room types', () => {
    for (const type of ['enemy', 'boss', 'shop', 'npc', 'item', 'chest'] as const) {
      expect(LOG_MESSAGES[type]).toBeDefined()
      expect(LOG_MESSAGES[type]!.length).toBeGreaterThan(0)
    }
  })
})

describe('CARD_TEASES', () => {
  it('has teases for all room types including corridor', () => {
    for (const type of ['enemy', 'boss', 'shop', 'npc', 'item', 'chest', 'corridor'] as const) {
      expect(CARD_TEASES[type]).toBeDefined()
      expect(CARD_TEASES[type]!.length).toBeGreaterThan(0)
    }
  })
})
