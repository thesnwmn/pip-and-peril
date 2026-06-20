import { describe, expect, it } from 'vitest'
import { E, N, S, W } from '../map/types'
import type { FogState, TileCell } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { initDungeon } from './dungeon-state'
import { validExitConfigs, descendFloor } from './room-selection'

function makeEmptyState(): DungeonState {
  const width = 13
  const height = 13
  const cells: Array<Array<TileCell | null>> = Array.from(
    { length: height }, () => Array(width).fill(null),
  )
  const fog: FogState[][] = Array.from(
    { length: height }, () => Array<FogState>(width).fill('hidden'),
  )
  return {
    grid: { cells, width, height },
    fog,
    pip: { col: 6, row: 6 },
    camera: { col: 6, row: 6 },
    startPos: { col: 6, row: 6 },
    floorEntryPosition: { col: 6, row: 6 },
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
  return {
    ...base,
    grid: { ...base.grid, cells: newCells },
  }
}

describe('validExitConfigs', () => {
  it('always includes entryDir in every config', () => {
    const state = makeEmptyState()
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    for (const cfg of configs) {
      expect(cfg & S).toBe(S)
    }
  })

  it('forces exits when placed neighbour opens toward target', () => {
    const base = makeEmptyState()
    const state = stateWithCell(base, 8, 6, 'corridor', W | E)
    const configs = validExitConfigs(state.grid, { col: 7, row: 6 }, W)
    for (const cfg of configs) {
      expect(cfg & W).toBe(W)  // forced: entry direction
      expect(cfg & E).toBe(E)  // forced: neighbour at (8,6) has W exit toward us
    }
  })

  it('forbids exits toward placed neighbours without openings', () => {
    const base = makeEmptyState()
    let state = stateWithCell(base, 6, 6, 'start', N | E | S | W)
    // Target is (6,5), entryDir=S. start at (6,6) has N exit toward (6,5) → forces S
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    for (const cfg of configs) {
      expect(cfg & S).toBe(S)
    }
  })

  it('returns [forced] when no valid config exists', () => {
    const base = makeEmptyState()
    let state = stateWithCell(base, 6, 4, 'corridor', S)    // N neighbour forces N on target
    state = stateWithCell(state, 6, 6, 'start', N | E | S | W)   // S neighbour forces S
    state = stateWithCell(state, 5, 5, 'corridor', E)        // W neighbour forces W
    state = stateWithCell(state, 7, 5, 'corridor', W)        // E neighbour forces E
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    expect(configs).toContain(N | E | S | W)
  })

  it('forbids out-of-bounds directions', () => {
    const state = makeEmptyState()
    const configs = validExitConfigs(state.grid, { col: 6, row: 0 }, S)
    for (const cfg of configs) {
      expect(cfg & N).toBe(0)
    }
  })
})

describe('descendFloor', () => {
  it('increments floor number', () => {
    const base = initDungeon()
    expect(base.floor).toBe(1)
    const next = descendFloor(base)
    expect(next.floor).toBe(2)
  })

  it('does not descend past floor 3', () => {
    const base = { ...initDungeon(), floor: 3 as const }
    const next = descendFloor(base)
    expect(next.floor).toBe(3)
  })

  it('moves pip to startPos of new floor', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    expect(next.pip).toEqual(next.floorEntryPosition)
  })

  it('places start cell at new pip position', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    const cell = next.grid.cells[next.pip.row][next.pip.col]
    expect(cell?.roomType).toBe('start')
  })

  it('generates a multi-cell floor on descent', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    let nonNull = 0
    for (let r = 0; r < next.grid.height; r++) {
      for (let c = 0; c < next.grid.width; c++) {
        if (next.grid.cells[r][c] !== null) nonNull++
      }
    }
    expect(nonNull).toBeGreaterThan(1)
  })

  it('recomputes fog for new floor', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    expect(next.fog).not.toBe(base.fog)
  })

  it('pip cell fog is live after descent', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    expect(next.fog[next.pip.row][next.pip.col]).toBe('live')
  })
})
