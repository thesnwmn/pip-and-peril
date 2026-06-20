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
  it('sets non-null cells within radius to live', () => {
    const map = makeMap(7, 7)
    map.cells[3][3] = { roomType: 'start', exits: N | S }
    map.cells[2][3] = { roomType: 'corridor', exits: N | S }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 1)
    expect(result[3][3]).toBe('live')
    expect(result[2][3]).toBe('live')
  })

  it('leaves null cells within radius as hidden', () => {
    const map = makeMap(7, 7)
    map.cells[3][3] = { roomType: 'start', exits: N | S }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 1)
    expect(result[3][2]).toBe('hidden')
    expect(result[2][2]).toBe('hidden')
  })

  it('leaves cells outside radius unchanged', () => {
    const map = makeMap(7, 7)
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 1)
    expect(result[0][0]).toBe('hidden')
    expect(result[6][6]).toBe('hidden')
  })

  it('promotes previously live cells to remembered when outside radius', () => {
    const map = makeMap(7, 7)
    map.cells[1][1] = { roomType: 'corridor', exits: S }
    const fog = makeFog(7, 7)
    fog[1][1] = 'live'
    const result = computeFog(fog, map, { col: 5, row: 5 }, 1)
    expect(result[1][1]).toBe('remembered')
  })

  it('does not demote remembered cells', () => {
    const map = makeMap(7, 7)
    const fog = makeFog(7, 7)
    fog[0][0] = 'remembered'
    const result = computeFog(fog, map, { col: 5, row: 5 }, 1)
    expect(result[0][0]).toBe('remembered')
  })

  it('uses Chebyshev (square) radius', () => {
    const map = makeMap(7, 7)
    map.cells[1][1] = { roomType: 'enemy', exits: S }
    map.cells[5][5] = { roomType: 'item', exits: N }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 2)
    expect(result[1][1]).toBe('live')
    expect(result[5][5]).toBe('live')
    expect(result[0][0]).toBe('hidden')
    expect(result[6][6]).toBe('hidden')
  })

  it('glimpses open-exit neighbours of live cells', () => {
    const map = makeMap(7, 7)
    map.cells[3][3] = { roomType: 'corridor', exits: N }
    const fog = makeFog(7, 7)
    const result = computeFog(fog, map, { col: 3, row: 3 }, 0)
    expect(result[3][3]).toBe('live')
    expect(result[2][3]).toBe('glimpsed')
  })

  it('does not downgrade already-revealed cells to glimpsed', () => {
    const map = makeMap(7, 7)
    map.cells[3][3] = { roomType: 'corridor', exits: N }
    const fog = makeFog(7, 7)
    fog[2][3] = 'remembered'
    const result = computeFog(fog, map, { col: 3, row: 3 }, 0)
    expect(result[2][3]).toBe('remembered')
  })

  it('does not mutate the input fog array', () => {
    const map = makeMap(5, 5)
    map.cells[2][2] = { roomType: 'start', exits: N | S }
    const fog = makeFog(5, 5)
    computeFog(fog, map, { col: 2, row: 2 }, 1)
    expect(fog[2][2]).toBe('hidden')
  })
})
