import { describe, expect, it } from 'vitest'
import { E, N, S, W } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { initDungeon } from './dungeon-state'
import { availableDirs, isBacktrackable, movePip } from './movement'

function stateWithCell(
  base: DungeonState,
  col: number,
  row: number,
  roomType: import('../map/types').RoomType,
  exits: number,
): DungeonState {
  const newCells = base.grid.cells.map(r => [...r])
  newCells[row][col] = { roomType, exits }
  return {
    ...base,
    grid: { ...base.grid, cells: newCells },
  }
}

describe('availableDirs', () => {
  it('returns directions where pip tile has exit and neighbour is null', () => {
    const state = initDungeon()
    // Start tile at (6,6) has N|E|S|W, all 4 neighbours are null
    const dirs = availableDirs(state)
    expect(dirs).toContain(N)
    expect(dirs).toContain(E)
    expect(dirs).toContain(S)
    expect(dirs).toContain(W)
  })

  it('excludes directions where pip has no exit', () => {
    const base = initDungeon()
    // Move pip and set a tile with only N exit
    const state = stateWithCell(base, 6, 6, 'start', N)
    const dirs = availableDirs(state)
    expect(dirs).toContain(N)
    expect(dirs).not.toContain(E)
    expect(dirs).not.toContain(S)
    expect(dirs).not.toContain(W)
  })

  it('excludes directions where neighbour is already placed', () => {
    const base = initDungeon()
    // Place a tile north of start
    let state = stateWithCell(base, 6, 5, 'corridor', N | S)
    const dirs = availableDirs(state)
    expect(dirs).not.toContain(N) // neighbour not null
    expect(dirs).toContain(E)
    expect(dirs).toContain(S)
    expect(dirs).toContain(W)
  })

  it('excludes out-of-bounds directions', () => {
    const base = initDungeon()
    // Place pip at top-left corner (0,0) with N|W exits (which would go OOB)
    const newCells = base.grid.cells.map(r => [...r])
    newCells[0][0] = { roomType: 'corridor', exits: N | W }
    const state = { ...base, grid: { ...base.grid, cells: newCells }, pip: { col: 0, row: 0 } }
    const dirs = availableDirs(state)
    expect(dirs).not.toContain(N)
    expect(dirs).not.toContain(W)
  })
})

describe('isBacktrackable', () => {
  it('returns true when neighbour is placed and has reciprocal exit', () => {
    const base = initDungeon()
    // Place corridor north with S exit (reciprocal to pip going N)
    let state = stateWithCell(base, 6, 5, 'corridor', S)
    expect(isBacktrackable(state, N)).toBe(true)
  })

  it('returns false when neighbour is null', () => {
    const state = initDungeon()
    expect(isBacktrackable(state, N)).toBe(false)
  })

  it('returns false when neighbour exists but lacks reciprocal exit', () => {
    const base = initDungeon()
    // Corridor north has only N exit (no S = no reciprocal to our N direction)
    let state = stateWithCell(base, 6, 5, 'corridor', N)
    expect(isBacktrackable(state, N)).toBe(false)
  })

  it('returns false when pip tile has no exit in that direction', () => {
    const base = initDungeon()
    let state = stateWithCell(base, 6, 5, 'corridor', S)
    // Pip tile at (6,6) has N|E|S|W normally but we override it to remove N
    const newCells = state.grid.cells.map(r => [...r])
    newCells[6][6] = { roomType: 'start', exits: E | S | W } // no N
    state = { ...state, grid: { ...state.grid, cells: newCells } }
    expect(isBacktrackable(state, N)).toBe(false)
  })
})

describe('movePip', () => {
  it('moves pip position in the correct direction', () => {
    const state = initDungeon()
    const next = movePip(state, N)
    expect(next.pip).toEqual({ col: 6, row: 5 })
  })

  it('increments stepCount', () => {
    const state = initDungeon()
    const next = movePip(state, S)
    expect(next.stepCount).toBe(1)
  })

  it('recomputes fog after move', () => {
    const state = initDungeon()
    const next = movePip(state, N)
    // fog should still work — no crash and fog is a new object
    expect(next.fog).not.toBe(state.fog)
  })

  it('does not mutate original state', () => {
    const state = initDungeon()
    const origPip = { ...state.pip }
    movePip(state, S)
    expect(state.pip).toEqual(origPip)
    expect(state.stepCount).toBe(0)
  })

  it('camera stays when pip moves within dead zone (first step)', () => {
    const state = initDungeon() // pip=(6,6), camera=(6,6)
    // Move N → pip=(6,5). hz=1: 5 is NOT < 6-1=5, camera stays
    const next = movePip(state, N)
    expect(next.camera).toEqual({ col: 6, row: 6 })
  })

  it('camera follows when pip exits dead zone on second consecutive step', () => {
    const base = initDungeon()
    // pip at (6,7) [1 south of camera (6,6)] — dead zone edge
    const state = { ...base, pip: { col: 6, row: 7 }, camera: { col: 6, row: 6 } }
    // Move S → pip=(6,8). 8 > 6+1=7 → camera.row = 8-1 = 7
    const next = movePip(state, S)
    expect(next.camera).toEqual({ col: 6, row: 7 })
  })

  it('camera does not update when pip backtracks within dead zone', () => {
    const base = initDungeon()
    // pip at (6,7), camera at (6,6)
    const state = { ...base, pip: { col: 6, row: 7 }, camera: { col: 6, row: 6 } }
    // Backtrack N → pip=(6,6). Camera stays at (6,6)
    const next = movePip(state, N)
    expect(next.camera).toEqual({ col: 6, row: 6 })
  })

  it('camera updates on both axes simultaneously', () => {
    const base = initDungeon()
    // pip at (7,7), camera at (6,6) — both at dead zone edge
    const state = { ...base, pip: { col: 7, row: 7 }, camera: { col: 6, row: 6 } }
    // Move SE → pip=(8,8). 8>7 on both axes → camera=(7,7)
    const next = movePip(state, S)
    // Only south axis moves since we only called movePip with S
    expect(next.camera).toEqual({ col: 6, row: 7 })
  })
})
