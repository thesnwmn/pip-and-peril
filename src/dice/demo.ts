import type { Die, DieColor } from './pool'
import { drawDie, drawCompactDiceRow, COMPACT_SIZE } from './draw'

// ── Compact row width (no draw side-effect) ───────────────────────────────────

const COMPACT_COLOR_IDX: Record<string, number> = { red: 0, green: 1, yellow: 2, blue: 3 }
const COMPACT_WITHIN = 4
const COMPACT_BETWEEN = 8

function compactRowWidth(dice: Array<{ colour: string }>): number {
  if (dice.length === 0) return 0
  const sorted = [...dice].sort((a, b) => COMPACT_COLOR_IDX[a.colour]! - COMPACT_COLOR_IDX[b.colour]!)
  let w = COMPACT_SIZE * sorted.length
  for (let i = 0; i < sorted.length - 1; i++) {
    w += sorted[i]!.colour === sorted[i + 1]!.colour ? COMPACT_WITHIN : COMPACT_BETWEEN
  }
  return w
}
import {
  computePoolLayout, computeRowXPositions,
  WITHIN_GAP, BETWEEN_GAP, ROW_VERTICAL_GAP,
} from './pool-layout'

// ── Canvas setup ──────────────────────────────────────────────────────────────

const CANVAS_W = 390
const CANVAS_H = 600
const CONTAINER_W = 328
const CONTAINER_X = 31  // (390 - 328) / 2
const BG = '#12121e'
const SURFACE = '#1e1e32'
const GOLD = '#c8941e'
const TEXT = '#e8d5b0'
const MUTED = '#7a7a9a'

// ── State ─────────────────────────────────────────────────────────────────────

const COLOR_ORDER: DieColor[] = ['red', 'green', 'yellow', 'blue']
const FACE_SIDES = [4, 6, 8, 10, 12]

let pool: Die[] = [
  { color: 'red', sides: 6 },
  { color: 'green', sides: 6 },
  { color: 'yellow', sides: 6 },
  { color: 'blue', sides: 6 },
]

let rolledValues: Map<number, number> = new Map()  // sorted-index → value
let isRolled = false

// ── Roll simulation ───────────────────────────────────────────────────────────

function roll(): void {
  rolledValues = new Map()
  const layout = computePoolLayout(pool, CONTAINER_W)
  const sorted = layout.rows.flat()
  sorted.forEach((die, i) => {
    rolledValues.set(i, Math.floor(Math.random() * die.sides) + 1)
  })
  isRolled = true
}

function reset(): void {
  rolledValues = new Map()
  isRolled = false
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const COLOR_LABEL: Record<DieColor, string> = {
  red: 'Power', green: 'Agility', yellow: 'Fortune', blue: 'Focus',
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Container outline
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.strokeRect(CONTAINER_X, 0, CONTAINER_W, CANVAS_H)
}

function drawPoolSection(ctx: CanvasRenderingContext2D): number {
  const layout = computePoolLayout(pool, CONTAINER_W)
  const DIE_Y_START = 30

  if (pool.length === 0) {
    ctx.fillStyle = MUTED
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('(empty pool — add dice below)', CANVAS_W / 2, DIE_Y_START + 40)
    return DIE_Y_START + 80
  }

  let sectionBottom = DIE_Y_START

  // Draw each row
  layout.rows.forEach((row, ri) => {
    const rowY = DIE_Y_START + ri * (layout.size + ROW_VERTICAL_GAP)
    const xs = computeRowXPositions(row, CONTAINER_X, CONTAINER_W, layout.size)

    for (let i = 0; i < row.length; i++) {
      const die = row[i]!
      const sortedIdx = layout.rows.slice(0, ri).reduce((s, r) => s + r.length, 0) + i
      const value = isRolled ? rolledValues.get(sortedIdx) : undefined
      drawDie(ctx, xs[i]!, rowY, layout.size, die.color, die.sides, value)
    }

    // Draw gap indicators between groups
    for (let i = 0; i < row.length - 1; i++) {
      const thisColor = row[i]!.color
      const nextColor = row[i + 1]!.color
      if (thisColor !== nextColor) {
        const gapMidX = xs[i]! + layout.size + BETWEEN_GAP / 2
        ctx.fillStyle = 'rgba(200,180,150,0.2)'
        ctx.fillRect(gapMidX - 1, rowY, 2, layout.size)
      }
    }

    sectionBottom = Math.max(sectionBottom, rowY + layout.size + 4)
  })

  // Layout info line
  ctx.font = '10px monospace'
  ctx.fillStyle = MUTED
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const infoY = sectionBottom
  const rowsText = layout.rows.length === 1 ? '1 row' : `${layout.rows.length} rows`
  ctx.fillText(`${pool.length} dice · size ${layout.size}px · ${rowsText} · within ${WITHIN_GAP}px / between ${BETWEEN_GAP}px`, CANVAS_W / 2, infoY)
  sectionBottom = infoY + 14

  // Roll totals (if rolled)
  if (isRolled && layout.rows.length > 0) {
    const totals: Partial<Record<DieColor, number>> = {}
    let sortedIdx = 0
    for (const row of layout.rows) {
      for (const die of row) {
        const v = rolledValues.get(sortedIdx++) ?? 0
        totals[die.color] = (totals[die.color] ?? 0) + v
      }
    }
    const parts = (Object.entries(totals) as [DieColor, number][])
      .sort(([a], [b]) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
      .map(([c, n]) => `${COLOR_LABEL[c][0]}:${n}`)
      .join('  ')

    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = GOLD
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`Totals: ${parts}`, CANVAS_W / 2, sectionBottom + 2)
    sectionBottom += 16
  }

  return sectionBottom + 8
}

function drawCompactSection(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(0, y, CANVAS_W, 1)

  ctx.font = '10px monospace'
  ctx.fillStyle = MUTED
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('COMPACT GLYPH (28px)', CONTAINER_X, y + 10)

  if (pool.length === 0) {
    ctx.fillStyle = MUTED
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('(no dice)', CANVAS_W / 2, y + 30)
    return
  }

  const compact = pool.map(d => ({ colour: d.color, faces: d.sides }))
  const sorted = [...compact].sort((a, b) => COMPACT_COLOR_IDX[a.colour]! - COMPACT_COLOR_IDX[b.colour]!)
  const totalW = compactRowWidth(compact)

  if (totalW <= CANVAS_W) {
    drawCompactDiceRow(ctx, (CANVAS_W - totalW) / 2, y + 26, compact)
  } else {
    // Find the split closest to midpoint where both rows fit within the canvas.
    const n = sorted.length
    let splitIdx = -1
    let bestDist = Infinity
    for (let b = 1; b < n; b++) {
      const w1 = compactRowWidth(sorted.slice(0, b))
      const w2 = compactRowWidth(sorted.slice(b))
      if (w1 <= CANVAS_W && w2 <= CANVAS_W) {
        const dist = Math.abs(b - n / 2)
        if (dist < bestDist) { bestDist = dist; splitIdx = b }
      }
    }
    if (splitIdx === -1) splitIdx = Math.ceil(n / 2)
    const r1 = sorted.slice(0, splitIdx)
    const r2 = sorted.slice(splitIdx)
    drawCompactDiceRow(ctx, (CANVAS_W - compactRowWidth(r1)) / 2, y + 26, r1)
    drawCompactDiceRow(ctx, (CANVAS_W - compactRowWidth(r2)) / 2, y + 26 + COMPACT_SIZE + 4, r2)
  }
}

function render(ctx: CanvasRenderingContext2D): void {
  drawBackground(ctx)
  const compactY = drawPoolSection(ctx)
  if (compactY < CANVAS_H - 80) {
    drawCompactSection(ctx, compactY + 10)
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────

function addDie(color: DieColor, sides: number): void {
  pool.push({ color, sides })
  reset()
}

function removeDie(color: DieColor): void {
  const idx = [...pool].reverse().findIndex(d => d.color === color)
  if (idx >= 0) {
    pool.splice(pool.length - 1 - idx, 1)
  }
  reset()
}

function removeAll(color: DieColor): void {
  pool = pool.filter(d => d.color !== color)
  reset()
}

function setPreset(name: string): void {
  reset()
  switch (name) {
    case 'starter':
      pool = [
        { color: 'red', sides: 6 },
        { color: 'green', sides: 6 },
        { color: 'yellow', sides: 6 },
        { color: 'blue', sides: 6 },
      ]
      break
    case '5-mixed':
      pool = [
        { color: 'red', sides: 6 },
        { color: 'red', sides: 6 },
        { color: 'green', sides: 8 },
        { color: 'yellow', sides: 6 },
        { color: 'blue', sides: 6 },
      ]
      break
    case '6-wrap':
      pool = [
        { color: 'red', sides: 6 },
        { color: 'red', sides: 6 },
        { color: 'green', sides: 6 },
        { color: 'green', sides: 6 },
        { color: 'yellow', sides: 6 },
        { color: 'blue', sides: 6 },
      ]
      break
    case '7-wrap':
      pool = [
        { color: 'red', sides: 6 },
        { color: 'red', sides: 6 },
        { color: 'green', sides: 6 },
        { color: 'green', sides: 8 },
        { color: 'yellow', sides: 6 },
        { color: 'yellow', sides: 6 },
        { color: 'blue', sides: 6 },
      ]
      break
    case '8-big':
      pool = [
        { color: 'red', sides: 8 },
        { color: 'red', sides: 8 },
        { color: 'red', sides: 8 },
        { color: 'green', sides: 6 },
        { color: 'green', sides: 6 },
        { color: 'yellow', sides: 6 },
        { color: 'yellow', sides: 6 },
        { color: 'blue', sides: 12 },
      ]
      break
    case 'empty':
      pool = []
      break
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function initDemo(): void {
  const canvas = document.getElementById('demo-canvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H

  function repaint() { render(ctx) }

  // Roll button
  document.getElementById('btn-roll')?.addEventListener('click', () => {
    if (pool.length > 0) { roll(); repaint() }
  })

  // Reset button
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    reset(); repaint()
  })

  // Preset buttons
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => { setPreset(btn.dataset.preset!); repaint() })
  })

  // Add die buttons
  document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(btn => {
    const [color, sides] = btn.dataset.add!.split('-')
    btn.addEventListener('click', () => {
      if (pool.length < 12) {
        addDie(color as DieColor, parseInt(sides!))
        repaint()
      }
    })
  })

  // Remove die buttons
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => { removeDie(btn.dataset.remove as DieColor); repaint() })
  })

  // Remove all buttons
  document.querySelectorAll<HTMLButtonElement>('[data-remove-all]').forEach(btn => {
    btn.addEventListener('click', () => { removeAll(btn.dataset.removeAll as DieColor); repaint() })
  })

  repaint()
}
