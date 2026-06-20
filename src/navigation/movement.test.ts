import { describe, expect, it } from 'vitest'
import { E, N, S, W } from '../map/types'
import type { FogState, TileCell } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { exitState, isBacktrackable, movePip } from './movement'

function makeState(pipCol: number, pipRow: number): DungeonState {
  const width = 13
  const height = 13
  const cells: Array<Array<TileCell | null>> = Array.from(
    { length: height }, () => Array(width).fill(null),
  )
  cells[pipRow][pipCol] = { roomType: 'start', exits: N | E | S | W }
  const fog: FogState[][] = Array.from(
    { length: height }, () => Array<FogState>(width).fill('hidden'),
  )
  fog[pipRow][pipCol] = 'live'
  return {
    grid: { cells, width, height },
    fog,
    pip: { col: pipCol, row: pipRow },
    camera: { col: pipCol, row: pipRow },
    startPos: { col: pipCol, row: pipRow },
    floorEntryPosition: { col: pipCol, row: pipRow },
    floor: 1,
    runSeed: 0,
    skeleton: { spine: [], spurRoots: [], spurCaps: [] },
    stepCount: 0,
    roomsEntered: 0,
    enemiesDefeated: 0,
    goldEarned: 0,
    killedBy: null,
    killedByFloor: null,
    healingItemsUsed: 0,
    rattledKillingBlow: false,
    weaponId: '',
    activeSkills: [],
  }
}

function stateWithCell(
  base: DungeonState,
  col: number,
  row: number,
  roomType: import('../map/types').RoomType,
  exits: number,
): DungeonState {
  const newCells = base.grid.cells.map(r => [...r])
  newCells[row][col] = { roomType, exits }
  return { ...base, grid: { ...base.grid, cells: newCells } }
}

function stateWithFog(base: DungeonState, col: number, row: number, fogState: FogState): DungeonState {
  const newFog = base.fog.map(r => [...r])
  newFog[row][col] = fogState
  return { ...base, fog: newFog }
}

describe('isBacktrackable', () => {
  it('returns true when neighbour is placed and has reciprocal exit', () => {
    const state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    expect(isBacktrackable(state, N)).toBe(true)
  })

  it('returns false when neighbour is null', () => {
    const state = makeState(6, 6)  // N of pip is null
    expect(isBacktrackable(state, N)).toBe(false)
  })

  it('returns false when neighbour exists but lacks reciprocal exit', () => {
    const state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', N)  // no S exit
    expect(isBacktrackable(state, N)).toBe(false)
  })

  it('returns false when pip tile has no exit in that direction', () => {
    let state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    const newCells = state.grid.cells.map(r => [...r])
    newCells[6][6] = { roomType: 'start', exits: E | S | W }  // no N
    state = { ...state, grid: { ...state.grid, cells: newCells } }
    expect(isBacktrackable(state, N)).toBe(false)
  })
})

describe('exitState', () => {
  it('returns none when pip tile has no exit in that direction', () => {
    const state = stateWithCell(makeState(6, 6), 6, 6, 'start', N | E)
    expect(exitState(state, S)).toBe('none')
    expect(exitState(state, W)).toBe('none')
  })

  it('returns none when neighbour is null', () => {
    const state = makeState(6, 6)  // all neighbours are null
    expect(exitState(state, N)).toBe('none')
  })

  it('returns none when neighbour exists but lacks reciprocal exit', () => {
    const state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', N)  // no S
    expect(exitState(state, N)).toBe('none')
  })

  it('returns none for an out-of-bounds direction', () => {
    const base = makeState(6, 6)
    const newCells = base.grid.cells.map(r => [...r])
    newCells[0][0] = { roomType: 'corridor', exits: N | W }
    const state = { ...base, grid: { ...base.grid, cells: newCells }, pip: { col: 0, row: 0 } }
    expect(exitState(state, N)).toBe('none')
    expect(exitState(state, W)).toBe('none')
  })

  it('returns fog when neighbour has reciprocal exit and fog is hidden', () => {
    const state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    // (6,5) fog is 'hidden' by default in makeState
    expect(exitState(state, N)).toBe('fog')
  })

  it('returns fog when neighbour fog is glimpsed', () => {
    let state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    state = stateWithFog(state, 6, 5, 'glimpsed')
    expect(exitState(state, N)).toBe('fog')
  })

  it('returns back when neighbour fog is live', () => {
    let state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    state = stateWithFog(state, 6, 5, 'live')
    expect(exitState(state, N)).toBe('back')
  })

  it('returns back when neighbour fog is remembered', () => {
    let state = stateWithCell(makeState(6, 6), 6, 5, 'corridor', S)
    state = stateWithFog(state, 6, 5, 'remembered')
    expect(exitState(state, N)).toBe('back')
  })
})

describe('movePip', () => {
  it('moves pip position in the correct direction', () => {
    const state = makeState(6, 6)
    const next = movePip(state, N)
    expect(next.pip).toEqual({ col: 6, row: 5 })
  })

  it('increments stepCount', () => {
    const state = makeState(6, 6)
    const next = movePip(state, S)
    expect(next.stepCount).toBe(1)
  })

  it('recomputes fog after move', () => {
    const state = makeState(6, 6)
    const next = movePip(state, N)
    expect(next.fog).not.toBe(state.fog)
  })

  it('does not mutate original state', () => {
    const state = makeState(6, 6)
    const origPip = { ...state.pip }
    movePip(state, S)
    expect(state.pip).toEqual(origPip)
    expect(state.stepCount).toBe(0)
  })

  it('camera stays when pip moves within dead zone (first step)', () => {
    const state = makeState(6, 6)
    // Move N → pip=(6,5). hz=1: 5 is NOT < 6-1=5, camera stays
    const next = movePip(state, N)
    expect(next.camera).toEqual({ col: 6, row: 6 })
  })

  it('camera follows when pip exits dead zone on second consecutive step', () => {
    const base = makeState(6, 6)
    // pip at (6,7) [1 south of camera (6,6)] — dead zone edge
    const state = { ...base, pip: { col: 6, row: 7 }, camera: { col: 6, row: 6 } }
    // Move S → pip=(6,8). 8 > 6+1=7 → camera.row = 8-1 = 7
    const next = movePip(state, S)
    expect(next.camera).toEqual({ col: 6, row: 7 })
  })

  it('camera does not update when pip backtracks within dead zone', () => {
    const base = makeState(6, 6)
    const state = { ...base, pip: { col: 6, row: 7 }, camera: { col: 6, row: 6 } }
    const next = movePip(state, N)
    expect(next.camera).toEqual({ col: 6, row: 6 })
  })

  it('camera updates on south axis when pip exits dead zone south', () => {
    const base = makeState(6, 6)
    const state = { ...base, pip: { col: 7, row: 7 }, camera: { col: 6, row: 6 } }
    const next = movePip(state, S)
    expect(next.camera).toEqual({ col: 6, row: 7 })
  })
})
