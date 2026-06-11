import type { Die, DieColor } from './pool'

export const COLOR_ORDER: Record<DieColor, number> = { red: 0, green: 1, yellow: 2, blue: 3 }

export const WITHIN_GAP = 8    // px between same-colour adjacent dice
export const BETWEEN_GAP = 16  // px between different-colour groups
export const ROW_VERTICAL_GAP = 8  // px between rows when wrapping

const SIZE_MIN = 44
const SIZE_MAX = 68

export interface PoolLayout {
  size: number
  rows: Die[][]
}

function sortByColor(dice: Die[]): Die[] {
  return [...dice].sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color])
}

function withinGaps(sorted: Die[]): number {
  let count = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i]!.color === sorted[i + 1]!.color) count++
  }
  return count
}

function betweenGaps(sorted: Die[]): number {
  return Math.max(0, new Set(sorted.map(d => d.color)).size - 1)
}

function rowTotalWidth(row: Die[], size: number): number {
  let w = row.length * size
  for (let i = 0; i < row.length - 1; i++) {
    w += row[i]!.color === row[i + 1]!.color ? WITHIN_GAP : BETWEEN_GAP
  }
  return w
}

// Accept a list of dice and available container width; return computed die size
// and dice sorted and grouped into one or two display rows.
export function computePoolLayout(dice: Die[], containerWidth: number): PoolLayout {
  if (dice.length === 0) return { size: SIZE_MAX, rows: [] }

  const sorted = sortByColor(dice)
  const wg = withinGaps(sorted)
  const bg = betweenGaps(sorted)

  // Largest integer size in [44, 68] where all dice fit in one row
  for (let size = SIZE_MAX; size >= SIZE_MIN; size--) {
    if (sorted.length * size + wg * WITHIN_GAP + bg * BETWEEN_GAP <= containerWidth) {
      return { size, rows: [sorted] }
    }
  }

  // No single-row fit at 44 px — wrap to two rows at 44 px.
  // Pass 0: colour-group boundaries with row1 ≥ ceil(n/2), both rows fit.
  // Pass 1: any position with row1 ≥ ceil(n/2), both rows fit (handles single-colour pools).
  // Pass 2: any position, both rows fit (last resort for extreme compositions).
  const n = sorted.length

  const colorBoundaries = new Set<number>()
  for (let i = 1; i < n; i++) {
    if (sorted[i - 1]!.color !== sorted[i]!.color) colorBoundaries.add(i)
  }

  let bestSplit = -1
  for (let pass = 0; pass < 3 && bestSplit === -1; pass++) {
    let bestDist = Infinity
    for (let b = 1; b < n; b++) {
      if (pass < 2 && b * 2 < n) continue             // prefer row1 ≥ ceil(n/2)
      if (pass === 0 && !colorBoundaries.has(b)) continue  // first pass: boundaries only
      const row1 = sorted.slice(0, b)
      const row2 = sorted.slice(b)
      if (rowTotalWidth(row1, SIZE_MIN) <= containerWidth && rowTotalWidth(row2, SIZE_MIN) <= containerWidth) {
        const dist = Math.abs(b - n / 2)
        if (dist < bestDist) { bestDist = dist; bestSplit = b }
      }
    }
  }

  if (bestSplit === -1) bestSplit = n  // fallback: single row (overflows only beyond demo cap)
  const row1 = sorted.slice(0, bestSplit)
  const row2 = sorted.slice(bestSplit)
  return { size: SIZE_MIN, rows: row2.length > 0 ? [row1, row2] : [row1] }
}

// Compute x-positions for each die in a row, centred within
// [containerX, containerX + containerWidth].
export function computeRowXPositions(
  row: Die[],
  containerX: number,
  containerWidth: number,
  size: number,
): number[] {
  if (row.length === 0) return []
  const w = rowTotalWidth(row, size)
  let x = containerX + (containerWidth - w) / 2
  const xs: number[] = []
  for (let i = 0; i < row.length; i++) {
    xs.push(x)
    if (i < row.length - 1) {
      x += size + (row[i]!.color === row[i + 1]!.color ? WITHIN_GAP : BETWEEN_GAP)
    }
  }
  return xs
}

// Compute the center x of each colour group in a rendered row.
export function colorGroupCenters(
  row: Die[],
  xs: number[],
  size: number,
): Map<DieColor, number> {
  const groups = new Map<DieColor, { first: number; last: number }>()
  for (let i = 0; i < row.length; i++) {
    const color = row[i]!.color
    if (!groups.has(color)) groups.set(color, { first: xs[i]!, last: xs[i]! })
    else groups.get(color)!.last = xs[i]!
  }
  const centers = new Map<DieColor, number>()
  for (const [color, { first, last }] of groups) {
    centers.set(color, first + (last - first + size) / 2)
  }
  return centers
}
