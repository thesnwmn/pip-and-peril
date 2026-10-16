import { computeFog } from '../map/fog'
import { generateFloor } from '../dungeon/floor-generator'
import type { FloorSkeleton } from '../dungeon/floor-generator'
import type { ExitMask, FogState, GameMap, GridPos } from '../map/types'
import { E, N, S, W } from '../map/types'

export type LogStyle = 'system' | 'enemy' | 'boss' | 'shop' | 'npc' | 'item' | 'chest' | 'normal'

export interface LogEntry {
  message: string
  style: LogStyle
}

export const DEAD_ZONE = 3

export interface DungeonState {
  grid: GameMap
  fog: FogState[][]
  pip: GridPos
  camera: GridPos
  startPos: GridPos
  floorEntryPosition: GridPos
  floor: 1 | 2 | 3
  runSeed: number
  skeleton: FloorSkeleton
  stepCount: number
  roomsEntered: number
  enemiesDefeated: number
  goldEarned: number
  killedBy: string | null
  killedByFloor: number | null
  healingItemsUsed: number
  rattledKillingBlow: boolean
  weaponId: string
  activeSkills: string[]
}

export function initDungeon(): DungeonState {
  const runSeed = Math.floor(Math.random() * 1_000_000)
  const generated = generateFloor(runSeed, 1)
  const { map, startPos, skeleton } = generated

  const rawFog: FogState[][] = Array.from({ length: map.height }, () =>
    Array<FogState>(map.width).fill('hidden'),
  )
  const fog = computeFog(rawFog, map, startPos, 3)

  return {
    grid: map,
    fog,
    pip: { ...startPos },
    camera: { ...startPos },
    floorEntryPosition: { ...startPos },
    startPos: { ...startPos },
    floor: 1,
    runSeed,
    skeleton,
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

export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
}

export const OPP: Record<number, ExitMask> = {
  [N]: S,
  [S]: N,
  [E]: W,
  [W]: E,
}

export const DIR_DELTA: Record<number, { dc: number; dr: number }> = {
  [N]: { dc: 0, dr: -1 },
  [S]: { dc: 0, dr: 1 },
  [E]: { dc: 1, dr: 0 },
  [W]: { dc: -1, dr: 0 },
}

export function updateCamera(
  camera: GridPos,
  pip: GridPos,
  gridWidth: number,
  gridHeight: number,
): GridPos {
  const hz = Math.floor(DEAD_ZONE / 2)
  const vpHalf = 2
  let col = camera.col
  let row = camera.row

  if (pip.col > col + hz) col = pip.col - hz
  if (pip.col < col - hz) col = pip.col + hz
  if (pip.row > row + hz) row = pip.row - hz
  if (pip.row < row - hz) row = pip.row + hz

  col = Math.max(vpHalf, Math.min(col, gridWidth - 1 - vpHalf))
  row = Math.max(vpHalf, Math.min(row, gridHeight - 1 - vpHalf))

  return { col, row }
}
