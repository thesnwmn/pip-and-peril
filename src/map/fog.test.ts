import { describe, expect, it } from 'vitest'
import { computeFog } from './fog'
import type { FogState, GameMap } from './types'
import { N, S } from './types'

function makeMap(width: number, height: number): GameMap {
  const cells = Array.from({ length: height }, () =>
    Array(width).fill(null),
  )
  return { cells, width, height }
}

function makeFog(width: number, height: number, state: FogState = 'hidden'): FogState[][] {
  return Array.from({ length: height }, () => Array<FogState>(width).fill(state))
}

describe('computeFog', () => {
  it('sets non-null cells within radius to visible', () => {
    const map = makeMap(7, 7)
    map.cells[3][3] = { roomType: 'start', exits: N | S }
    map.cells[2][3] = { roomType: 'corridor', exits: N | S }
    map.cells[4][3] = { roomType: 'corridor', exits: N | S }
    map.cells[3][2] = { roomType: 'corridor', exits: N | S }
    map.cells[3][4] = { roomType: 'corridor', exits: N | S }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 1)
    expect(result[3][3]).toBe('visible')
    expect(result[2][3]).toBe('visible')
    expect(result[4][3]).toBe('visible')
    expect(result[3][2]).toBe('visible')
    expect(result[3][4]).toBe('visible')
    // diagonal null cell within radius gets 'seen' not 'visible'
    expect(result[2][2]).toBe('seen')
  })

  it('leaves cells outside radius as hidden', () => {
    const map = makeMap(7, 7)
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 1)
    expect(result[0][0]).toBe('hidden')
    expect(result[6][6]).toBe('hidden')
  })

  it('promotes previously visible cells to seen', () => {
    const map = makeMap(7, 7)
    const fog = makeFog(7, 7)
    fog[1][1] = 'visible'
    const result = computeFog(fog, map, { col: 5, row: 5 }, 1)
    expect(result[1][1]).toBe('seen')
  })

  it('does not demote seen cells to hidden', () => {
    const map = makeMap(7, 7)
    const fog = makeFog(7, 7)
    fog[0][0] = 'seen'
    const result = computeFog(fog, map, { col: 5, row: 5 }, 1)
    expect(result[0][0]).toBe('seen')
  })

  it('uses Chebyshev (square) radius', () => {
    const map = makeMap(7, 7)
    map.cells[1][1] = { roomType: 'enemy', exits: S }
    map.cells[5][5] = { roomType: 'item', exits: N }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 2)
    // non-null corner at distance 2,2 should be visible
    expect(result[1][1]).toBe('visible')
    expect(result[5][5]).toBe('visible')
    // corner at distance 3,3 should not be revealed
    expect(result[0][0]).toBe('hidden')
    expect(result[6][6]).toBe('hidden')
  })

  it('sets null-cell positions within radius to seen (not visible)', () => {
    const map = makeMap(5, 5)
    // null cells — no tiles placed
    const fog = makeFog(5, 5)
    const result = computeFog(fog, map, { col: 2, row: 2 }, 1)
    expect(result[2][2]).toBe('seen')
    expect(result[1][1]).toBe('seen')
  })

  it('sets non-null cells within radius to visible', () => {
    const map = makeMap(5, 5)
    map.cells[2][2] = { roomType: 'start', exits: N | S }
    map.cells[2][3] = { roomType: 'corridor', exits: N | S }
    const fog = makeFog(5, 5)
    const result = computeFog(fog, map, { col: 2, row: 2 }, 1)
    expect(result[2][2]).toBe('visible')
    expect(result[2][3]).toBe('visible')
    // adjacent null cell gets seen
    expect(result[1][2]).toBe('seen')
  })

  it('does not mutate the input fog array', () => {
    const map = makeMap(5, 5)
    const fog = makeFog(5, 5)
    computeFog(fog, map, { col: 2, row: 2 }, 1)
    expect(fog[2][2]).toBe('hidden')
  })
})
