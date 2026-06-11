import { describe, it, expect } from 'vitest'
import {
  getNextFaces,
  getSwapCost,
  getEngraveValues,
  makeNewDieId,
  ADD_COST,
  ENGRAVE_COST,
} from './workbench'
import type { PermanentDie } from '../meta/state'

describe('getNextFaces', () => {
  it('returns next face count in the upgrade path', () => {
    expect(getNextFaces(4)).toBe(6)
    expect(getNextFaces(6)).toBe(8)
    expect(getNextFaces(8)).toBe(10)
    expect(getNextFaces(10)).toBe(12)
  })

  it('returns null for d12 (already at max)', () => {
    expect(getNextFaces(12)).toBeNull()
  })
})

describe('getSwapCost', () => {
  it('returns the correct cost for each upgrade step', () => {
    expect(getSwapCost(4)).toBe(20)
    expect(getSwapCost(6)).toBe(30)
    expect(getSwapCost(8)).toBe(45)
    expect(getSwapCost(10)).toBe(60)
  })

  it('returns null for d12 (no upgrade available)', () => {
    expect(getSwapCost(12)).toBeNull()
  })
})

describe('getEngraveValues', () => {
  it('d4 has only value 2', () => {
    expect(getEngraveValues(4)).toEqual([2])
  })

  it('d6 has values 2 and 3', () => {
    expect(getEngraveValues(6)).toEqual([2, 3])
  })

  it('d8 has values 2, 3, 4', () => {
    expect(getEngraveValues(8)).toEqual([2, 3, 4])
  })

  it('d10 has values 2 through 5', () => {
    expect(getEngraveValues(10)).toEqual([2, 3, 4, 5])
  })

  it('d12 has values 2 through 6', () => {
    expect(getEngraveValues(12)).toEqual([2, 3, 4, 5, 6])
  })

  it('max engrave value equals floor(faces/2) for all face counts', () => {
    for (const faces of [4, 6, 8, 10, 12] as const) {
      const vals = getEngraveValues(faces)
      expect(vals[vals.length - 1]).toBe(Math.floor(faces / 2))
    }
  })

  it('minimum engrave value is always 2', () => {
    for (const faces of [4, 6, 8, 10, 12] as const) {
      const vals = getEngraveValues(faces)
      expect(vals[0]).toBe(2)
    }
  })
})

describe('makeNewDieId', () => {
  it('generates r1 for the first red die in an empty pool', () => {
    expect(makeNewDieId([], 'red')).toBe('r1')
  })

  it('generates r2 when r1 already exists', () => {
    const pool: PermanentDie[] = [{ id: 'r1', colour: 'red', faces: 6 }]
    expect(makeNewDieId(pool, 'red')).toBe('r2')
  })

  it('uses the correct prefix per colour', () => {
    expect(makeNewDieId([], 'green')).toBe('g1')
    expect(makeNewDieId([], 'blue')).toBe('b1')
    expect(makeNewDieId([], 'yellow')).toBe('y1')
  })

  it('counts only dice of the matching colour', () => {
    const pool: PermanentDie[] = [
      { id: 'r1', colour: 'red', faces: 6 },
      { id: 'g1', colour: 'green', faces: 6 },
      { id: 'r2', colour: 'red', faces: 8 },
    ]
    expect(makeNewDieId(pool, 'red')).toBe('r3')
    expect(makeNewDieId(pool, 'green')).toBe('g2')
    expect(makeNewDieId(pool, 'yellow')).toBe('y1')
  })
})

describe('cost constants', () => {
  it('ADD_COST is 50 scraps', () => {
    expect(ADD_COST).toBe(50)
  })

  it('ENGRAVE_COST is 15 scraps', () => {
    expect(ENGRAVE_COST).toBe(15)
  })
})
