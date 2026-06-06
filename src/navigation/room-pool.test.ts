import { describe, expect, it } from 'vitest'
import { CARD_TEASES, LOG_MESSAGES, logStyleForRoom, getDepthPhase, getRoomWeights } from './room-pool'

describe('getDepthPhase', () => {
  it('returns early phase for tiles < mid threshold', () => {
    expect(getDepthPhase(1, 5)).toBe('early')
    expect(getDepthPhase(2, 7)).toBe('early')
    expect(getDepthPhase(3, 9)).toBe('early')
  })

  it('returns mid phase for tiles in mid-late range', () => {
    expect(getDepthPhase(1, 8)).toBe('mid')
    expect(getDepthPhase(1, 14)).toBe('mid')
    expect(getDepthPhase(2, 8)).toBe('mid')
  })

  it('returns late phase for tiles >= late threshold', () => {
    expect(getDepthPhase(1, 15)).toBe('late')
    expect(getDepthPhase(1, 30)).toBe('late')
    expect(getDepthPhase(3, 20)).toBe('late')
  })
})

describe('getRoomWeights', () => {
  it('has positive weight for corridor in early phase', () => {
    const weights = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 2,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(weights.corridor).toBeGreaterThan(0)
  })

  it('has zero weight for stairwell on floor 3', () => {
    const weights = getRoomWeights({
      floor: 3,
      floorTilesPlaced: 15,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(weights.stairwell).toBe(0)
  })

  it('has zero weight for stairwell before threshold on floor 1', () => {
    const weights = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 5,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(weights.stairwell).toBe(0)
  })

  it('has positive weight for stairwell after threshold on floor 1', () => {
    const weights = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 8,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(weights.stairwell).toBeGreaterThan(0)
  })

  it('zeroes shop weight if already placed', () => {
    const weights = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 5,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: true,
    })
    expect(weights.shop).toBe(0)
  })

  it('spikes shop weight at debt threshold', () => {
    const weights = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 14,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(weights.shop).toBeGreaterThan(50)
  })

  it('has zero boss weight on floors 1 and 2', () => {
    const weights1 = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 20,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 13, row: 13 },
      shopPlacedThisFloor: false,
    })
    expect(weights1.boss).toBe(0)

    const weights2 = getRoomWeights({
      floor: 2,
      floorTilesPlaced: 20,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 13, row: 13 },
      shopPlacedThisFloor: false,
    })
    expect(weights2.boss).toBe(0)
  })

  it('has zero boss weight on floor 3 before exploration threshold', () => {
    const weights = getRoomWeights({
      floor: 3,
      floorTilesPlaced: 10,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 13, row: 13 },
      shopPlacedThisFloor: false,
    })
    expect(weights.boss).toBe(0)
  })

  it('has positive boss weight on floor 3 after exploration threshold and sufficient distance', () => {
    const weights = getRoomWeights({
      floor: 3,
      floorTilesPlaced: 15,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 13, row: 13 },
      shopPlacedThisFloor: false,
    })
    expect(weights.boss).toBeGreaterThan(0)
  })

  it('scales enemy weight higher on deeper floors', () => {
    const w1 = getRoomWeights({
      floor: 1,
      floorTilesPlaced: 20,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    const w3 = getRoomWeights({
      floor: 3,
      floorTilesPlaced: 20,
      floorEntryPosition: { col: 6, row: 6 },
      candidatePos: { col: 7, row: 6 },
      shopPlacedThisFloor: false,
    })
    expect(w3.enemy).toBeGreaterThan(w1.enemy)
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
    for (const type of ['enemy', 'boss', 'shop', 'npc', 'item', 'chest', 'corridor', 'stairwell', 'trap'] as const) {
      expect(CARD_TEASES[type]).toBeDefined()
      expect(CARD_TEASES[type]!.length).toBeGreaterThan(0)
    }
  })
})
