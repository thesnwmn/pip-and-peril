import { computeFog } from '../map/fog'
import { generateFloor } from '../dungeon/floor-generator'
import type { Archetype, ExitMask, FogState, GridPos, RoomType } from '../map/types'
import { E, N, S, W } from '../map/types'
import { DIR_DELTA, OPP, updateCamera } from './dungeon-state'
import type { DungeonState } from './dungeon-state'
import { getDepthPhase } from './room-pool'
import { DUNGEON_TUNING } from '../dungeon/tuning'
import type { DepthPhase } from '../dungeon/tuning'

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

export function pickArchetype(roomType: RoomType, floor: 1 | 2 | 3, floorTilesPlaced: number): Archetype {
  const phase: DepthPhase = getDepthPhase(floor, floorTilesPlaced)
  const typeWeights = DUNGEON_TUNING.archetypeWeights[roomType]
  if (!typeWeights) return 'chamber'
  const phaseWeights = typeWeights[phase]
  const entries = Object.entries(phaseWeights) as [Archetype, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  if (total <= 0) return 'chamber'
  let rand = Math.random() * total
  for (const [arch, weight] of entries) {
    rand -= weight
    if (rand <= 0) return arch
  }
  return entries[0]?.[0] ?? 'chamber'
}

export function descendFloor(state: DungeonState): DungeonState {
  const nextFloor = (state.floor + 1) as 1 | 2 | 3
  if (nextFloor > 3) return state

  const generated = generateFloor(state.runSeed, nextFloor)
  const { map, startPos, skeleton } = generated

  const rawFog: FogState[][] = Array.from({ length: map.height }, () =>
    Array<FogState>(map.width).fill('hidden'),
  )
  const newFog = computeFog(rawFog, map, startPos, 3)
  const newCamera = updateCamera(state.camera, startPos, map.width, map.height)

  return {
    ...state,
    grid: map,
    fog: newFog,
    pip: { ...startPos },
    camera: newCamera,
    floorEntryPosition: { ...startPos },
    floor: nextFloor,
    skeleton,
  }
}
