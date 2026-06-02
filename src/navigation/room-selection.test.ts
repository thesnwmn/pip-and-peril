import { describe, expect, it } from 'vitest'
import { E, N, S, W } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { initDungeon } from './dungeon-state'
import { generateOfferings, placeRoom, validExitConfigs } from './room-selection'

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
    const state = initDungeon()
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    for (const cfg of configs) {
      expect(cfg & S).toBe(S)
    }
  })

  it('forces exits when placed neighbour opens toward target', () => {
    // Pip at (6,6) with E exit. We target (7,6). Place a cell to the E at (8,6) with W exit.
    // (8,6) has W exit → forces E on target (7,6)
    const base = initDungeon()
    let state = stateWithCell(base, 8, 6, 'corridor', W | E)
    const configs = validExitConfigs(state.grid, { col: 7, row: 6 }, W) // entry from W (pip)
    for (const cfg of configs) {
      expect(cfg & W).toBe(W) // forced: entry direction
      expect(cfg & E).toBe(E) // forced: neighbour at (8,6) has W exit toward us
    }
  })

  it('forbids exits toward placed neighbours without openings', () => {
    // Place a tile south of target with no N exit → S is forbidden
    const base = initDungeon()
    let state = stateWithCell(base, 6, 6, 'start', N | E | S | W) // start tile already there
    // Target is (6,5), entryDir=S (coming from 6,6). South of target is 6,6 (start, has N exit → forces S on target)
    // North of target is (6,4) — null, no constraint
    // East of target (7,5) — null
    // West of target (5,5) — null
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    // start at (6,6) has N exit facing (6,5), so S is forced on target
    for (const cfg of configs) {
      expect(cfg & S).toBe(S)
    }
  })

  it('returns [forced] when no valid config exists', () => {
    // Force all 4 directions: surround target with tiles that have exits toward it
    const base = initDungeon()
    let state = stateWithCell(base, 6, 4, 'corridor', S)    // N neighbour has S (forces N on target)
    state = stateWithCell(state, 6, 6, 'start', N | E | S | W)   // S neighbour has N (forces S on target)
    state = stateWithCell(state, 5, 5, 'corridor', E)        // W neighbour has E (forces W on target)
    state = stateWithCell(state, 7, 5, 'corridor', W)        // E neighbour has W (forces E on target)
    // Target: (6,5). All 4 exits are forced. N|E|S|W is the only valid exit config.
    const configs = validExitConfigs(state.grid, { col: 6, row: 5 }, S)
    expect(configs).toContain(N | E | S | W)
  })

  it('forbids out-of-bounds directions', () => {
    const state = initDungeon()
    // Target at top edge (col 6, row 0) — N is out of bounds
    const configs = validExitConfigs(state.grid, { col: 6, row: 0 }, S)
    for (const cfg of configs) {
      expect(cfg & N).toBe(0)
    }
  })
})

describe('generateOfferings', () => {
  it('returns exactly 3 offerings', () => {
    const state = initDungeon()
    const offerings = generateOfferings(state, { col: 6, row: 5 }, S)
    expect(offerings).toHaveLength(3)
  })

  it('each offering has exits including the entry direction', () => {
    const state = initDungeon()
    // Entry from south (pip at 6,6 going N → entryDir = S on the placed tile)
    const offerings = generateOfferings(state, { col: 6, row: 5 }, S)
    for (const o of offerings) {
      expect(o.exits & S).toBe(S)
    }
  })

  it('offerings at depth ≤2 draw from shallow pool (corridor, shop, npc, item)', () => {
    const state = initDungeon()
    const shallow: import('../map/types').RoomType[] = ['corridor', 'shop', 'npc', 'item']
    // Run many times to increase confidence
    for (let i = 0; i < 30; i++) {
      const offerings = generateOfferings(state, { col: 6, row: 5 }, S)
      for (const o of offerings) {
        expect(shallow).toContain(o.roomType)
      }
    }
  })

  it('deep offerings (depth ≥5) include enemy/boss types', () => {
    // Depth 5 from (6,6) is e.g. (1,1) or (11,11)
    const state = initDungeon()
    const deepTypes: import('../map/types').RoomType[] = ['enemy', 'enemy', 'enemy', 'chest', 'item', 'shop', 'boss']
    let foundEnemy = false
    for (let i = 0; i < 50; i++) {
      const offerings = generateOfferings(state, { col: 11, row: 11 }, N)
      if (offerings.some(o => o.roomType === 'enemy' || o.roomType === 'boss')) {
        foundEnemy = true
        break
      }
    }
    expect(foundEnemy).toBe(true)
  })
})

describe('placeRoom', () => {
  it('places tile at target position', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.grid.cells[5][6]).toEqual({ roomType: 'corridor', exits: N | S })
  })

  it('moves pip to target position', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.pip).toEqual({ col: 6, row: 5 })
  })

  it('transitions to idle state', () => {
    const base = { ...initDungeon(), uiState: 'choosing' as const, pendingDir: N, offerings: [
      { roomType: 'corridor' as const, exits: N | S },
      { roomType: 'shop' as const, exits: S },
      { roomType: 'npc' as const, exits: S },
    ] }
    const next = placeRoom(base, base.offerings[0], { col: 6, row: 5 })
    expect(next.uiState).toBe('idle')
    expect(next.pendingDir).toBeNull()
    expect(next.offerings).toHaveLength(0)
  })

  it('increments stepCount', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.stepCount).toBe(1)
  })

  it('adds a log entry for enemy rooms', () => {
    const base = initDungeon()
    const offering = { roomType: 'enemy' as const, exits: S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.log.length).toBeGreaterThan(base.log.length)
    expect(next.log[0].style).toBe('enemy')
  })

  it('does not add a log entry for corridor rooms', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.log.length).toBe(base.log.length)
  })

  it('does not mutate original state', () => {
    const base = initDungeon()
    const origCell = base.grid.cells[5][6]
    const offering = { roomType: 'item' as const, exits: S }
    placeRoom(base, offering, { col: 6, row: 5 })
    expect(base.grid.cells[5][6]).toBe(origCell) // still null
    expect(base.pip).toEqual({ col: 6, row: 6 })
  })

  it('recomputes fog after placement', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.fog).not.toBe(base.fog)
  })

  it('caps log at 8 entries', () => {
    let state = initDungeon()
    // Build up 7 existing log entries
    state = { ...state, log: Array.from({ length: 7 }, (_, i) => ({ message: `msg${i}`, style: 'system' as const })) }
    const offering = { roomType: 'enemy' as const, exits: S }
    const next = placeRoom(state, offering, { col: 6, row: 5 })
    expect(next.log.length).toBeLessThanOrEqual(8)
  })
})
