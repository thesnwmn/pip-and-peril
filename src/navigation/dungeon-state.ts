import { computeFog } from '../map/fog'
import type { ExitMask, FogState, GameMap, GridPos } from '../map/types'
import { E, N, S, W } from '../map/types'

export type LogStyle = 'system' | 'enemy' | 'boss' | 'shop' | 'npc' | 'item' | 'chest' | 'normal'

export interface LogEntry {
  message: string
  style: LogStyle
}

export interface RoomOffering {
  roomType: import('../map/types').RoomType
  exits: ExitMask
}

export const DEAD_ZONE = 3

export interface DungeonState {
  grid: GameMap
  fog: FogState[][]
  pip: GridPos
  camera: GridPos
  startPos: GridPos
  uiState: 'idle' | 'choosing' | 'whisper'
  pendingDir: ExitMask | null
  offerings: RoomOffering[]
  stepCount: number
  roomsEntered: number
  enemiesDefeated: number
}

const GRID_W = 13
const GRID_H = 13
const START_COL = 6
const START_ROW = 6

export function initDungeon(): DungeonState {
  const cells: (import('../map/types').TileCell | null)[][] = Array.from(
    { length: GRID_H },
    () => Array(GRID_W).fill(null),
  )
  cells[START_ROW][START_COL] = { roomType: 'start', exits: N | E | S | W }

  const grid: GameMap = { cells, width: GRID_W, height: GRID_H }
  const startPos: GridPos = { col: START_COL, row: START_ROW }

  const rawFog: FogState[][] = Array.from({ length: GRID_H }, () =>
    Array<FogState>(GRID_W).fill('hidden'),
  )
  const fog = computeFog(rawFog, grid, startPos, 3)

  return {
    grid,
    fog,
    pip: { col: START_COL, row: START_ROW },
    camera: { col: START_COL, row: START_ROW },
    startPos,
    uiState: 'idle',
    pendingDir: null,
    offerings: [],
    stepCount: 0,
    roomsEntered: 0,
    enemiesDefeated: 0,
  }
}

export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
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
  // Camera clamp range: keep the viewport fully inside the grid so the dungeon
  // edge is flush with the screen edge (not floating in the middle of the viewport).
  // vpHalf = floor(5/2) = 2, matching VIEWPORT_COLS/ROWS = 5 in renderer.ts.
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
