import type { FogState, GameMap, GridPos } from './types'
import { E, N, S, W } from './types'

const DIR_INFO = [
  { dir: N, dc: 0, dr: -1 },
  { dir: S, dc: 0, dr: 1 },
  { dir: E, dc: 1, dr: 0 },
  { dir: W, dc: -1, dr: 0 },
]

export function computeFog(
  fog: FogState[][],
  map: GameMap,
  center: GridPos,
  radius: number,
): FogState[][] {
  // Copy prior state: live cells that Pip has left become remembered
  const result: FogState[][] = fog.map(row =>
    row.map(cell => (cell === 'live' ? 'remembered' : cell)),
  )

  // Mark all non-null cells within Chebyshev radius as live
  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) {
      const dr = Math.abs(r - center.row)
      const dc = Math.abs(c - center.col)
      if (dr <= radius && dc <= radius && map.cells[r][c] !== null) {
        result[r][c] = 'live'
      }
    }
  }

  // Glimpse open-exit neighbours of every live cell that haven't been revealed yet
  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) {
      if (result[r][c] !== 'live') continue
      const cell = map.cells[r][c]
      if (!cell) continue
      for (const { dir, dc, dr } of DIR_INFO) {
        if (!(cell.exits & dir)) continue
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nc >= map.width || nr < 0 || nr >= map.height) continue
        if (result[nr][nc] === 'hidden') result[nr][nc] = 'glimpsed'
      }
    }
  }

  return result
}
