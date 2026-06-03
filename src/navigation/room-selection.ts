import { computeFog } from '../map/fog'
import type { ExitMask, GridPos, RoomType } from '../map/types'
import { E, N, S, W } from '../map/types'
import { chebyshev, DIR_DELTA, OPP, updateCamera } from './dungeon-state'
import type { DungeonState, RoomOffering } from './dungeon-state'
import { pickRandom, poolForDepth, CARD_TEASES } from './room-pool'

export { CARD_TEASES }

const ALL_EXIT_CONFIGS: ExitMask[] = [
  N, E, S, W,
  N | S, E | W,
  N | E, N | W, S | E, S | W,
  N | E | S, N | W | S, E | S | W, N | E | W,
  N | E | S | W,
]

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
  const depth = chebyshev(targetPos, state.startPos)
  const pool = poolForDepth(depth)

  const types: RoomType[] = []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  for (const t of shuffled) {
    if (!types.includes(t)) types.push(t)
    if (types.length === 3) break
  }
  while (types.length < 3) {
    types.push(pool[Math.floor(Math.random() * pool.length)])
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

export function placeRoom(
  state: DungeonState,
  offering: RoomOffering,
  targetPos: GridPos,
): DungeonState {
  const newCells = state.grid.cells.map(row => [...row])
  newCells[targetPos.row][targetPos.col] = { roomType: offering.roomType, exits: offering.exits }
  const newGrid = { ...state.grid, cells: newCells }

  const newPip = { ...targetPos }
  const newFog = computeFog(state.fog, newGrid, newPip, 3)
  const newCamera = updateCamera(state.camera, newPip, newGrid.width, newGrid.height)

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
  }
}
