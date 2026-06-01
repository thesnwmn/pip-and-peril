import type { FogState, GameMap, GridPos } from './types'

export function computeFog(
  fog: FogState[][],
  map: GameMap,
  center: GridPos,
  radius: number,
): FogState[][] {
  const result: FogState[][] = fog.map(row =>
    row.map(cell => (cell === 'visible' ? 'seen' : cell)),
  )

  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) {
      const dr = Math.abs(r - center.row)
      const dc = Math.abs(c - center.col)
      if (dr <= radius && dc <= radius) {
        result[r][c] = map.cells[r][c] !== null ? 'visible' : 'seen'
      }
    }
  }

  return result
}
