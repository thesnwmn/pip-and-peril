import { computeFog } from '../map/fog'
import type { ExitMask, GridPos, RoomType, TileCell } from '../map/types'
import { E, N, S, W } from '../map/types'
import { chebyshev, DIR_DELTA, OPP, updateCamera } from './dungeon-state'
import type { DungeonState, RoomOffering } from './dungeon-state'
import { pickRandom, CARD_TEASES, getRoomWeights, getDepthPhase } from './room-pool'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { DUNGEON_TUNING } from '../dungeon/tuning'
import { ENEMY_ROSTER } from '../combat/roster'

export { CARD_TEASES }

const ALL_EXIT_CONFIGS: ExitMask[] = [
  N, E, S, W,
  N | S, E | W,
  N | E, N | W, S | E, S | W,
  N | E | S, N | W | S, E | S | W, N | E | W,
  N | E | S | W,
]

function randomIntRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function validExitConfigs(
  grid: DungeonState['grid'],
  targetPos: GridPos,
  entryDir: ExitMask,
): ExitMask[] {
  let forced: ExitMask = entryDir
  let forbidden: ExitMask = 0

  for (const dir of [N, E, S, W]) {
    const { dc, dr } = DIR_DELTA[dir]
    const nc = targetPos.col + dc
    const nr = targetPos.row + dr

    if (nc < 0 || nc >= grid.width || nr < 0 || nr >= grid.height) {
      forbidden |= dir
      continue
    }

    const neighbour = grid.cells[nr][nc]
    if (neighbour === null) continue

    if (neighbour.exits & OPP[dir]) {
      forced |= dir
    } else {
      forbidden |= dir
    }
  }

  const valid = ALL_EXIT_CONFIGS.filter(
    cfg => (cfg & forced) === forced && (cfg & forbidden) === 0,
  )
  return valid.length > 0 ? valid : [forced]
}

export function generateOfferings(
  state: DungeonState,
  targetPos: GridPos,
  entryDir: ExitMask,
): RoomOffering[] {
  const types: RoomType[] = []
  const directions = [N, E, S, W]

  for (let i = 0; i < 3; i++) {
    const { dc, dr } = DIR_DELTA[directions[i]]
    const candidatePos: GridPos = {
      col: targetPos.col + dc,
      row: targetPos.row + dr,
    }

    const weights = getRoomWeights({
      floor: state.floor,
      floorTilesPlaced: state.floorTilesPlaced,
      floorEntryPosition: state.floorEntryPosition,
      candidatePos,
      shopPlacedThisFloor: state.shopPlacedThisFloor,
    })

    // Normalize and pick
    const roomTypes: RoomType[] = ['corridor', 'enemy', 'shop', 'npc', 'item', 'chest', 'trap', 'stairwell', 'boss']
    const totalWeight = roomTypes.reduce((sum, rt) => sum + (weights[rt] || 0), 0)
    let rand = Math.random() * totalWeight
    let selectedType: RoomType = 'corridor'

    for (const rt of roomTypes) {
      const w = weights[rt] || 0
      if (rand < w) {
        selectedType = rt
        break
      }
      rand -= w
    }

    types.push(selectedType)
  }

  const configs = validExitConfigs(state.grid, targetPos, entryDir)
  const shuffledConfigs = [...configs].sort(() => Math.random() - 0.5)
  const pickedConfigs: ExitMask[] = []
  for (let i = 0; i < 3; i++) {
    const remaining = shuffledConfigs.filter(c => !pickedConfigs.includes(c))
    pickedConfigs.push(remaining.length > 0 ? remaining[0] : configs[0])
  }

  return types.map((roomType, i) => ({ roomType, exits: pickedConfigs[i] }))
}

function getTrapDifficulty(floor: 1 | 2 | 3, floorTilesPlaced: number): number {
  const depthPhase = getDepthPhase(floor, floorTilesPlaced)
  const range = DUNGEON_TUNING.trapDifficultyRange[floor][depthPhase]
  return randomIntRange(range.min, range.max)
}

function selectEnemyTier(floor: 1 | 2 | 3, floorTilesPlaced: number): 1 | 2 | 3 {
  const depthPhase = getDepthPhase(floor, floorTilesPlaced)
  const weights = DUNGEON_TUNING.enemyTierWeights[floor][depthPhase]
  const total = weights.t1 + weights.t2 + weights.t3
  let rand = Math.random() * total
  if (rand < weights.t1) return 1
  rand -= weights.t1
  if (rand < weights.t2) return 2
  return 3
}

function selectEnemyOfTier(tier: 1 | 2 | 3): string {
  const candidates = ENEMY_ROSTER.filter(e => e.tier === tier)
  return candidates[Math.floor(Math.random() * candidates.length)].id
}

const MERCHANT_NAMES = [
  { name: 'Morwhistle the Vole', flavor: "What'll it be?" },
  { name: 'Old Nutkin', flavor: 'Coins only, mind you.' },
  { name: 'Bramble Sewn', flavor: 'Fine goods, fair prices.' },
]

function selectShopMerchant(): { name: string; flavor: string } {
  return MERCHANT_NAMES[Math.floor(Math.random() * MERCHANT_NAMES.length)]
}

function selectShopStock(): string[] {
  // Exclude items that don't appear in shops
  const shopItems = CATALOG_ITEMS.filter(item => !['saints-acorn', 'nine-lives-token', 'stolen-idol'].includes(item.id))
  const shuffled = [...shopItems].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(item => item.id)
}

export function placeRoom(
  state: DungeonState,
  offering: RoomOffering,
  targetPos: GridPos,
): DungeonState {
  const newCells = state.grid.cells.map(row => [...row])
  const cell: TileCell = { roomType: offering.roomType, exits: offering.exits }

  if (offering.roomType === 'item') {
    cell.itemId = CATALOG_ITEMS[Math.floor(Math.random() * CATALOG_ITEMS.length)].id
  }

  if (offering.roomType === 'trap') {
    cell.trapDifficulty = getTrapDifficulty(state.floor, state.floorTilesPlaced)
  }

  if (offering.roomType === 'enemy') {
    const tier = selectEnemyTier(state.floor, state.floorTilesPlaced)
    cell.enemyId = selectEnemyOfTier(tier)
  }

  if (offering.roomType === 'boss') {
    cell.enemyId = 'rat-king'
  }

  if (offering.roomType === 'shop') {
    const merchant = selectShopMerchant()
    cell.shopMerchant = merchant.name
    cell.shopStock = selectShopStock()
  }

  if (offering.roomType === 'chest') {
    // Generate chest variant
    const variantWeights = DUNGEON_TUNING.chestVariantWeights
    const variantRand = Math.random()
    const variantTotal = variantWeights.basic + variantWeights.locked + variantWeights.trapped
    let variantCumulative = 0
    let variant: 'basic' | 'locked' | 'trapped' = 'basic'

    variantCumulative += variantWeights.basic
    if (variantRand * variantTotal < variantCumulative) variant = 'basic'
    else {
      variantCumulative += variantWeights.locked
      if (variantRand * variantTotal < variantCumulative) variant = 'locked'
      else variant = 'trapped'
    }

    cell.chestVariant = variant
    cell.chestState = 'closed'

    // Generate difficulty for locked/trapped variants
    if (variant === 'locked') {
      cell.lockDifficulty = DUNGEON_TUNING.lockDifficultyThresholds.easy
    }
    if (variant === 'trapped') {
      cell.trapDifficulty = getTrapDifficulty(state.floor, state.floorTilesPlaced)
    }

    // Generate loot: gold + maybe item
    const goldRand = Math.random()
    const goldRange = DUNGEON_TUNING.chestGoldRange[state.floor as 1 | 2 | 3]
    const goldMin = goldRange.min
    const goldMax = goldRange.max
    const gold = goldMin + Math.floor(goldRand * (goldMax - goldMin + 1))

    const itemRand = Math.random()
    let loot: { gold: number; item?: string } = { gold }
    if (itemRand < DUNGEON_TUNING.chestHasItemChance) {
      const lootWeights = DUNGEON_TUNING.chestLootWeights
      const weightedItems = Object.entries(lootWeights)
      const totalWeight = Object.values(lootWeights).reduce((a, b) => a + b, 0)
      let itemRand2 = Math.random() * totalWeight
      for (const [itemId, weight] of weightedItems) {
        itemRand2 -= weight
        if (itemRand2 <= 0) {
          loot.item = itemId
          break
        }
      }
    }
    cell.loot = loot
  }

  newCells[targetPos.row][targetPos.col] = cell
  const newGrid = { ...state.grid, cells: newCells }

  const newPip = { ...targetPos }
  const newFog = computeFog(state.fog, newGrid, newPip, 3)
  const newCamera = updateCamera(state.camera, newPip, newGrid.width, newGrid.height)

  // Track shop placement
  const shopPlacedThisFloor = state.shopPlacedThisFloor || offering.roomType === 'shop'

  return {
    ...state,
    grid: newGrid,
    fog: newFog,
    pip: newPip,
    camera: newCamera,
    uiState: 'idle',
    pendingDir: null,
    offerings: [],
    stepCount: state.stepCount + 1,
    floorTilesPlaced: state.floorTilesPlaced + 1,
    totalTilesPlaced: state.totalTilesPlaced + 1,
    shopPlacedThisFloor,
  }
}

export function descendFloor(state: DungeonState): DungeonState {
  const nextFloor = (state.floor + 1) as 1 | 2 | 3
  if (nextFloor > 3) return state

  const GRID_W = state.grid.width
  const GRID_H = state.grid.height
  const centerCol = Math.floor(GRID_W / 2)
  const centerRow = Math.floor(GRID_H / 2)

  const cells: (TileCell | null)[][] = Array.from(
    { length: GRID_H },
    () => Array(GRID_W).fill(null),
  )
  cells[centerRow][centerCol] = { roomType: 'corridor', exits: N | E | S | W }

  const newGrid = { ...state.grid, cells }
  const floorEntryPosition: GridPos = { col: centerCol, row: centerRow }

  const rawFog: (typeof state.fog) = Array.from({ length: GRID_H }, () =>
    Array<'hidden'>(GRID_W).fill('hidden'),
  )
  const newFog = computeFog(rawFog, newGrid, floorEntryPosition, 3)
  const newCamera = updateCamera(state.camera, floorEntryPosition, GRID_W, GRID_H)

  return {
    ...state,
    grid: newGrid,
    fog: newFog,
    pip: { ...floorEntryPosition },
    camera: newCamera,
    floorEntryPosition,
    floor: nextFloor,
    floorTilesPlaced: 0,
    shopPlacedThisFloor: false,
    uiState: 'idle',
    pendingDir: null,
    offerings: [],
  }
}
