import { computeFog } from '../map/fog'
import type { ExitMask } from '../map/types'
import { E, N, S, W } from '../map/types'
import { DIR_DELTA, OPP, updateCamera } from './dungeon-state'
import type { DungeonState } from './dungeon-state'

export function exitState(state: DungeonState, dir: ExitMask): 'none' | 'fog' | 'back' {
  const cell = state.grid.cells[state.pip.row][state.pip.col]
  if (!cell || !(cell.exits & dir)) return 'none'
  const { dc, dr } = DIR_DELTA[dir]
  const nc = state.pip.col + dc
  const nr = state.pip.row + dr
  if (nc < 0 || nc >= state.grid.width || nr < 0 || nr >= state.grid.height) return 'none'
  const neighbour = state.grid.cells[nr][nc]
  if (neighbour === null) return 'fog'
  return isBacktrackable(state, dir) ? 'back' : 'none'
}

export const ALL_DIRS: ExitMask[] = [N, E, S, W]

export function availableDirs(state: DungeonState): ExitMask[] {
  const cell = state.grid.cells[state.pip.row][state.pip.col]
  if (!cell) return []

  return ALL_DIRS.filter(dir => {
    if (!(cell.exits & dir)) return false
    const { dc, dr } = DIR_DELTA[dir]
    const nc = state.pip.col + dc
    const nr = state.pip.row + dr
    if (nc < 0 || nc >= state.grid.width || nr < 0 || nr >= state.grid.height) return false
    return state.grid.cells[nr][nc] === null
  })
}

export function isBacktrackable(state: DungeonState, dir: ExitMask): boolean {
  const cell = state.grid.cells[state.pip.row][state.pip.col]
  if (!cell || !(cell.exits & dir)) return false
  const { dc, dr } = DIR_DELTA[dir]
  const nc = state.pip.col + dc
  const nr = state.pip.row + dr
  if (nc < 0 || nc >= state.grid.width || nr < 0 || nr >= state.grid.height) return false
  const neighbour = state.grid.cells[nr][nc]
  if (!neighbour) return false
  return !!(neighbour.exits & OPP[dir])
}

export function dirFromPipToNeighbour(state: DungeonState, nc: number, nr: number): ExitMask | null {
  for (const dir of ALL_DIRS) {
    const { dc, dr } = DIR_DELTA[dir]
    if (state.pip.col + dc === nc && state.pip.row + dr === nr) return dir
  }
  return null
}

export function movePip(state: DungeonState, dir: ExitMask): DungeonState {
  const { dc, dr } = DIR_DELTA[dir]
  const newPip = { col: state.pip.col + dc, row: state.pip.row + dr }
  const newFog = computeFog(state.fog, state.grid, newPip, 3)
  const newCamera = updateCamera(state.camera, newPip, state.grid.width, state.grid.height)
  return {
    ...state,
    pip: newPip,
    camera: newCamera,
    fog: newFog,
    stepCount: state.stepCount + 1,
  }
}
