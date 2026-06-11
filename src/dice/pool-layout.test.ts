import { describe, it, expect } from 'vitest'
import { computePoolLayout, computeRowXPositions, colorGroupCenters } from './pool-layout'
import type { Die } from './pool'

function d(color: Die['color'], sides = 6): Die { return { color, sides } }

const W = 328  // standard container width (MAP_W - 2 * SIDE_MARGIN)

describe('computePoolLayout — sizing', () => {
  it('4 dice 1R 1G 1Y 1B → size 68, 1 row', () => {
    // 4*68 + 0*8 + 3*16 = 320 ≤ 328
    const { size, rows } = computePoolLayout([d('red'), d('green'), d('yellow'), d('blue')], W)
    expect(size).toBe(68)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveLength(4)
  })

  it('5 dice 2R 1G 1Y 1B → correct size for formula, 1 row', () => {
    // within_gaps=1, between_gaps=3
    // largest s: 5*s + 1*8 + 3*16 ≤ 328 → s ≤ 54.4 → s=54
    const { size, rows } = computePoolLayout(
      [d('red'), d('red'), d('green'), d('yellow'), d('blue')], W,
    )
    expect(size).toBe(54)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveLength(5)
  })

  it('6 dice 2R 2G 1Y 1B → size 44, 1 row', () => {
    // 6*44 + 2*8 + 3*16 = 264+16+48 = 328 ≤ 328
    const { size, rows } = computePoolLayout(
      [d('red'), d('red'), d('green'), d('green'), d('yellow'), d('blue')], W,
    )
    expect(size).toBe(44)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveLength(6)
  })

  it('7 dice 2R 2G 2Y 1B → size 44, 2 rows (R+G / Y+B)', () => {
    // 7*44 + 3*8 + 3*16 = 308+24+48 = 380 > 328 → wraps
    const pool = [d('red'), d('red'), d('green'), d('green'), d('yellow'), d('yellow'), d('blue')]
    const { size, rows } = computePoolLayout(pool, W)
    expect(size).toBe(44)
    expect(rows).toHaveLength(2)
    // row 1: R+G (4 dice), row 2: Y+B (3 dice)
    expect(rows[0]).toHaveLength(4)
    expect(rows[1]).toHaveLength(3)
    expect(rows[0]!.every(d => d.color === 'red' || d.color === 'green')).toBe(true)
    expect(rows[1]!.every(d => d.color === 'yellow' || d.color === 'blue')).toBe(true)
  })

  it('8 dice 3R 2G 2Y 1B → size 44, 2 rows (R+G / Y+B)', () => {
    const pool = [
      d('red'), d('red'), d('red'),
      d('green'), d('green'),
      d('yellow'), d('yellow'),
      d('blue'),
    ]
    const { size, rows } = computePoolLayout(pool, W)
    expect(size).toBe(44)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveLength(5)  // R(3) + G(2) = 5
    expect(rows[1]).toHaveLength(3)  // Y(2) + B(1) = 3
  })

  it('single-colour 3R → size 68 (no between-gaps)', () => {
    // 3*68 + 2*8 = 220 ≤ 328
    const { size, rows } = computePoolLayout([d('red'), d('red'), d('red')], W)
    expect(size).toBe(68)
    expect(rows).toHaveLength(1)
  })

  it('empty pool → max size, no rows', () => {
    const { size, rows } = computePoolLayout([], W)
    expect(size).toBe(68)
    expect(rows).toHaveLength(0)
  })
})

describe('computePoolLayout — colour ordering', () => {
  it('sorts dice into canonical order R G Y B regardless of input order', () => {
    const pool = [d('blue'), d('red'), d('yellow'), d('green')]
    const { rows } = computePoolLayout(pool, W)
    const colors = rows[0]!.map(die => die.color)
    expect(colors).toEqual(['red', 'green', 'yellow', 'blue'])
  })

  it('same-colour dice stay together', () => {
    const pool = [d('green'), d('red'), d('red'), d('blue')]
    const { rows } = computePoolLayout(pool, W)
    const colors = rows[0]!.map(die => die.color)
    expect(colors).toEqual(['red', 'red', 'green', 'blue'])
  })
})

describe('computeRowXPositions', () => {
  it('single die is centred in the container', () => {
    const row: Die[] = [d('red')]
    const xs = computeRowXPositions(row, 0, 328, 68)
    // width = 68, startX = (328 - 68) / 2 = 130
    expect(xs[0]).toBeCloseTo(130)
  })

  it('two same-colour dice use 8px gap', () => {
    const row: Die[] = [d('red'), d('red')]
    const xs = computeRowXPositions(row, 0, 328, 68)
    // total width = 68+8+68 = 144, startX = (328-144)/2 = 92
    expect(xs[0]).toBeCloseTo(92)
    expect(xs[1]).toBeCloseTo(92 + 68 + 8)
  })

  it('two different-colour dice use 16px gap', () => {
    const row: Die[] = [d('red'), d('blue')]
    const xs = computeRowXPositions(row, 0, 328, 68)
    // total width = 68+16+68 = 152, startX = (328-152)/2 = 88
    expect(xs[0]).toBeCloseTo(88)
    expect(xs[1]).toBeCloseTo(88 + 68 + 16)
  })
})

describe('colorGroupCenters', () => {
  it('single die: center is die-center', () => {
    const row: Die[] = [d('red')]
    const xs = [10]
    const centers = colorGroupCenters(row, xs, 68)
    expect(centers.get('red')).toBeCloseTo(10 + 34)  // x + size/2
  })

  it('two same-colour dice: center spans both', () => {
    const row: Die[] = [d('red'), d('red')]
    const xs = [10, 86]  // 10 + 68 + 8 = 86
    const centers = colorGroupCenters(row, xs, 68)
    // center = 10 + (86 - 10 + 68) / 2 = 10 + 72 = 82
    expect(centers.get('red')).toBeCloseTo(82)
  })
})
