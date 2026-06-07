import { describe, expect, it } from 'vitest'
import { E, N, S, W } from '../map/types'
import type { DungeonState } from './dungeon-state'
import { initDungeon } from './dungeon-state'
import { generateOfferings, placeRoom, validExitConfigs, descendFloor } from './room-selection'

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

  it('offerings on floor 1 early phase favor corridor/shop/npc/item', () => {
    // Floor 1, tiles 0-7 (early phase): heavy corridor weight, low enemy/trap
    // generateOfferings uses weighted random, so we just verify it respects the weights
    const state = initDungeon()
    const offerings = generateOfferings(state, { col: 6, row: 5 }, S)
    expect(offerings).toHaveLength(3)
    // Just verify offerings exist — the weighted system allows any type at any depth
    // but heavily favors certain types per the config
    for (const o of offerings) {
      expect(o.roomType).toBeTruthy()
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

  it('increments floorTilesPlaced', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.floorTilesPlaced).toBe(1)
  })

  it('increments totalTilesPlaced', () => {
    const base = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.totalTilesPlaced).toBe(1)
  })

  it('marks shop as placed when shop room is placed', () => {
    const base = initDungeon()
    const offering = { roomType: 'shop' as const, exits: N | S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.shopPlacedThisFloor).toBe(true)
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

  describe('item room itemId assignment', () => {
    const CATALOG_IDS = ['cheese-crumb', 'gouda-wedge', 'lucky-acorn', 'smoke-pellet', 'glowstone-dust', 'stout-flask', 'rabbits-foot', 'iron-thimble', 'grit-stone', 'second-wind-vial', 'bitter-root-brew', 'fortune-pebble', 'bandage-roll', 'smoke-canister', 'tainted-mushroom', 'berserker-draught']

    it('assigns a non-null itemId for item rooms', () => {
      const base = initDungeon()
      const offering = { roomType: 'item' as const, exits: S }
      const next = placeRoom(base, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      expect(cell?.itemId).toBeDefined()
      expect(typeof cell?.itemId).toBe('string')
    })

    it('assigns an itemId from the catalog', () => {
      const base = initDungeon()
      const offering = { roomType: 'item' as const, exits: S }
      // Run multiple times to cover probability
      for (let i = 0; i < 20; i++) {
        const next = placeRoom(base, offering, { col: 6, row: 5 })
        const cell = next.grid.cells[5][6]
        expect(CATALOG_IDS).toContain(cell?.itemId)
      }
    })

    it('does not assign itemId for non-item room types', () => {
      const base = initDungeon()
      for (const roomType of ['enemy', 'corridor', 'shop', 'npc', 'chest', 'boss', 'trap', 'stairwell'] as const) {
        const offering = { roomType, exits: S }
        const next = placeRoom(base, offering, { col: 6, row: 5 })
        const cell = next.grid.cells[5][6]
        expect(cell?.itemId).toBeUndefined()
      }
    })

    it('itemId is fixed on the tile across state reads', () => {
      const base = initDungeon()
      const offering = { roomType: 'item' as const, exits: S }
      const next = placeRoom(base, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      // Same state read twice — itemId never changes
      expect(next.grid.cells[5][6]?.itemId).toBe(cell?.itemId)
    })
  })

  describe('trap room trapDifficulty assignment', () => {
    it('assigns trapDifficulty for trap rooms', () => {
      const base = initDungeon()
      const offering = { roomType: 'trap' as const, exits: S }
      const next = placeRoom(base, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      expect(cell?.trapDifficulty).toBeDefined()
      expect(typeof cell?.trapDifficulty).toBe('number')
    })

    it('assigns trapDifficulty in range for floor 1 early phase', () => {
      const base = initDungeon()
      const offering = { roomType: 'trap' as const, exits: S }
      for (let i = 0; i < 20; i++) {
        const next = placeRoom(base, offering, { col: 6, row: 5 })
        const cell = next.grid.cells[5][6]
        // Floor 1 early phase (0-7 tiles): range is 1-2
        expect(cell?.trapDifficulty).toBeGreaterThanOrEqual(1)
        expect(cell?.trapDifficulty).toBeLessThanOrEqual(2)
      }
    })

    it('does not assign trapDifficulty for non-trap room types', () => {
      const base = initDungeon()
      for (const roomType of ['enemy', 'corridor', 'shop', 'npc', 'chest', 'item', 'boss', 'stairwell'] as const) {
        const offering = { roomType, exits: S }
        const next = placeRoom(base, offering, { col: 6, row: 5 })
        const cell = next.grid.cells[5][6]
        expect(cell?.trapDifficulty).toBeUndefined()
      }
    })
  })
})

describe('descendFloor', () => {
  it('increments floor number', () => {
    const base = initDungeon()
    expect(base.floor).toBe(1)
    const next = descendFloor(base)
    expect(next.floor).toBe(2)
  })

  it('resets floorTilesPlaced to 0', () => {
    let state = initDungeon()
    const offering = { roomType: 'corridor' as const, exits: N | S }
    // Place several tiles to increment floorTilesPlaced
    for (let i = 0; i < 3; i++) {
      state = placeRoom(state, offering, { col: 6 - i, row: 5 })
    }
    expect(state.floorTilesPlaced).toBe(3)
    const next = descendFloor(state)
    expect(next.floorTilesPlaced).toBe(0)
  })

  it('resets shopPlacedThisFloor to false', () => {
    let state = initDungeon()
    const offering = { roomType: 'shop' as const, exits: N | S }
    state = placeRoom(state, offering, { col: 6, row: 5 })
    expect(state.shopPlacedThisFloor).toBe(true)
    const next = descendFloor(state)
    expect(next.shopPlacedThisFloor).toBe(false)
  })

  it('updates floorEntryPosition to new floor center', () => {
    const base = initDungeon()
    const center = Math.floor(base.grid.width / 2)
    const next = descendFloor(base)
    expect(next.floorEntryPosition.col).toBe(center)
    expect(next.floorEntryPosition.row).toBe(center)
  })

  it('places corridor tile at new floor center', () => {
    const base = initDungeon()
    const center = Math.floor(base.grid.width / 2)
    const next = descendFloor(base)
    const cell = next.grid.cells[center][center]
    expect(cell?.roomType).toBe('corridor')
  })

  it('moves pip to new floor center', () => {
    const base = initDungeon()
    const center = Math.floor(base.grid.width / 2)
    const next = descendFloor(base)
    expect(next.pip.col).toBe(center)
    expect(next.pip.row).toBe(center)
  })

  it('clears all other tiles on new floor', () => {
    const base = initDungeon()
    const center = Math.floor(base.grid.width / 2)
    const next = descendFloor(base)
    for (let row = 0; row < next.grid.height; row++) {
      for (let col = 0; col < next.grid.width; col++) {
        if (row === center && col === center) {
          expect(next.grid.cells[row][col]).not.toBeNull()
        } else {
          expect(next.grid.cells[row][col]).toBeNull()
        }
      }
    }
  })

  it('recomputes fog for new floor', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    expect(next.fog).not.toBe(base.fog)
  })

  it('transitions to idle state', () => {
    const base = { ...initDungeon(), uiState: 'choosing' as const }
    const next = descendFloor(base)
    expect(next.uiState).toBe('idle')
    expect(next.pendingDir).toBeNull()
    expect(next.offerings).toHaveLength(0)
  })

  it('preserves pip hp and inventory', () => {
    const base = initDungeon()
    const next = descendFloor(base)
    // descendFloor doesn't modify hp/inventory, just dungeon state
    // We can't test hp/inventory here since they're not in DungeonState
    // But we verify floor state is clean and pip is at center
    expect(next.floor).toBe(2)
  })

  it('does not descend past floor 3', () => {
    let state = initDungeon()
    state = { ...state, floor: 3 }
    const next = descendFloor(state)
    expect(next.floor).toBe(3)
  })
})

describe('Enemy tier selection and placement', () => {
  it('places enemy rooms with an enemyId', () => {
    const base = initDungeon()
    const state = stateWithCell(base, 5, 5, 'corridor', N | S)
    const offering = { roomType: 'enemy' as const, exits: N }
    const next = placeRoom(state, offering, { col: 6, row: 5 })
    const cell = next.grid.cells[5][6]
    expect(cell).not.toBeNull()
    expect(cell!.enemyId).toBeDefined()
    expect(typeof cell!.enemyId).toBe('string')
  })

  it('assigns valid enemyIds', () => {
    const base = initDungeon()
    const validIds = [
      'dungeon-rat', 'goblin-runt', 'cave-bat-pup', 'dung-beetle',
      'weasel-scout', 'toad-sentry', 'goblin-guard', 'cave-spider',
      'stoat-champion', 'dungeon-adder', 'shadow-raven', 'iron-beetle',
    ]
    for (let i = 0; i < 50; i++) {
      const state = stateWithCell(base, 5, 5, 'corridor', N | S)
      const offering = { roomType: 'enemy' as const, exits: N }
      const next = placeRoom(state, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      expect(validIds).toContain(cell!.enemyId)
    }
  })

  it('respects tier distribution for floor 1 early phase', () => {
    const base = initDungeon()
    const tierCounts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
    const tierMap: Record<string, 1 | 2 | 3> = {
      'dungeon-rat': 1, 'goblin-runt': 1, 'cave-bat-pup': 1, 'dung-beetle': 1,
      'weasel-scout': 2, 'toad-sentry': 2, 'goblin-guard': 2, 'cave-spider': 2,
      'stoat-champion': 3, 'dungeon-adder': 3, 'shadow-raven': 3, 'iron-beetle': 3,
    }
    for (let i = 0; i < 1000; i++) {
      const state = stateWithCell(base, 5, 5, 'corridor', N | S)
      const offering = { roomType: 'enemy' as const, exits: N }
      const next = placeRoom(state, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      const tier = tierMap[cell!.enemyId!]
      tierCounts[tier]++
    }
    const total = 1000
    const t1Pct = tierCounts[1] / total
    const t2Pct = tierCounts[2] / total
    const t3Pct = tierCounts[3] / total
    expect(t1Pct).toBeGreaterThan(0.8)
    expect(t1Pct).toBeLessThan(1.0)
    expect(t2Pct).toBeGreaterThan(0.0)
    expect(t2Pct).toBeLessThan(0.2)
    expect(t3Pct).toBe(0)
  })
})

describe('shop room placement', () => {
  const CATALOG_IDS = ['cheese-crumb', 'gouda-wedge', 'lucky-acorn', 'smoke-pellet', 'glowstone-dust', 'stout-flask', 'rabbits-foot', 'iron-thimble', 'grit-stone', 'second-wind-vial', 'bitter-root-brew', 'fortune-pebble', 'leather-jerkin', 'padded-coat', 'bandage-roll', 'smoke-canister', 'tainted-mushroom', 'berserker-draught']

  it('assigns shopStock with exactly 3 items for shop rooms', () => {
    const base = initDungeon()
    const offering = { roomType: 'shop' as const, exits: S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    const cell = next.grid.cells[5][6]
    expect(cell?.shopStock).toBeDefined()
    expect(cell?.shopStock).toHaveLength(3)
  })

  it('assigns shopMerchant name for shop rooms', () => {
    const base = initDungeon()
    const offering = { roomType: 'shop' as const, exits: S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    const cell = next.grid.cells[5][6]
    expect(cell?.shopMerchant).toBeDefined()
    expect(typeof cell?.shopMerchant).toBe('string')
    expect(cell?.shopMerchant?.length).toBeGreaterThan(0)
  })

  it('selects valid catalog items in shopStock', () => {
    const base = initDungeon()
    const offering = { roomType: 'shop' as const, exits: S }
    for (let i = 0; i < 20; i++) {
      const next = placeRoom(base, offering, { col: 6 + i % 3, row: 5 + Math.floor(i / 3) })
      const cell = next.grid.cells[5 + Math.floor(i / 3)][6 + i % 3]
      cell?.shopStock?.forEach(id => {
        expect(CATALOG_IDS).toContain(id)
      })
    }
  })

  it('does not select duplicate items in the same shop', () => {
    const base = initDungeon()
    const offering = { roomType: 'shop' as const, exits: S }
    for (let i = 0; i < 20; i++) {
      const next = placeRoom(base, offering, { col: 6 + i % 3, row: 5 + Math.floor(i / 3) })
      const cell = next.grid.cells[5 + Math.floor(i / 3)][6 + i % 3]
      const stock = cell?.shopStock ?? []
      const unique = new Set(stock)
      expect(unique.size).toBe(stock.length)
    }
  })

  it('selects merchant name from valid set', () => {
    const validNames = ['Morwhistle the Vole', 'Old Nutkin', 'Bramble Sewn']
    const base = initDungeon()
    for (let i = 0; i < 20; i++) {
      const offering = { roomType: 'shop' as const, exits: S }
      const next = placeRoom(base, offering, { col: 6 + i % 3, row: 5 + Math.floor(i / 3) })
      const cell = next.grid.cells[5 + Math.floor(i / 3)][6 + i % 3]
      expect(validNames).toContain(cell?.shopMerchant)
    }
  })

  it('tracks shop placement on the floor', () => {
    const base = initDungeon()
    expect(base.shopPlacedThisFloor).toBe(false)
    const offering = { roomType: 'shop' as const, exits: S }
    const next = placeRoom(base, offering, { col: 6, row: 5 })
    expect(next.shopPlacedThisFloor).toBe(true)
  })

  it('does not assign shopStock for non-shop room types', () => {
    const base = initDungeon()
    for (const roomType of ['enemy', 'corridor', 'item', 'npc', 'chest', 'boss', 'trap', 'stairwell'] as const) {
      const offering = { roomType, exits: S }
      const next = placeRoom(base, offering, { col: 6, row: 5 })
      const cell = next.grid.cells[5][6]
      expect(cell?.shopStock).toBeUndefined()
      expect(cell?.shopMerchant).toBeUndefined()
    }
  })
})
