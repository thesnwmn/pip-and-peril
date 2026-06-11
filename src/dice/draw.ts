import { colors } from '../colors'
import { PIP_SLOTS } from './pip-slots'
import type { DieColor } from './pool'

export const DIE_FACE_BG: Record<DieColor, string> = {
  red: colors.dieFaceRed,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
  blue: colors.dieFaceBlue,
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
  ctx.beginPath()
  if (ctxAny.roundRect) ctxAny.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

// Draw one die face at (x, y) at the given size.
// value absent → shows face count as idle-state label.
// engraved → renders notch marker at bottom of face (feature 088).
export function drawDie(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colour: DieColor,
  faces: number,
  value?: number,
  engraved?: boolean,
): void {
  const radius = Math.round(size * 0.176)
  roundRect(ctx, x, y, size, size, radius)
  ctx.fillStyle = DIE_FACE_BG[colour]
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  const displayNum = value ?? faces
  ctx.fillStyle = 'rgba(255,255,255,0.88)'

  if (faces === 6 && size >= 52) {
    const slots = PIP_SLOTS[displayNum] ?? []
    const cellW = size / 3
    const r = size * 0.066
    for (const slot of slots) {
      const col = slot % 3
      const row = Math.floor(slot / 3)
      ctx.beginPath()
      ctx.arc(x + col * cellW + cellW / 2, y + row * cellW + cellW / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    const fontSize = Math.round(size * 0.32)
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(displayNum), x + size / 2, y + size / 2)
  }

  if (engraved) {
    const markerH = Math.max(4, Math.round(size / 10))
    ctx.globalAlpha = 0.6
    ctx.fillStyle = DIE_FACE_BG[colour]
    ctx.fillRect(x + 2, y + size - markerH - 1, size - 4, markerH)
    ctx.globalAlpha = 1
  }
}

// Fixed 28 px compact glyph — non-interactive, always shows face count as numeral.
// Used for weapon card pip-cost annotations and status strips.
export const COMPACT_SIZE = 28
const COMPACT_WITHIN_GAP = 4
const COMPACT_BETWEEN_GAP = 8

export function drawCompactDie(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colour: DieColor,
  faces: number,
): void {
  roundRect(ctx, x, y, COMPACT_SIZE, COMPACT_SIZE, 4)
  ctx.fillStyle = DIE_FACE_BG[colour]
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  const fontSize = Math.round(COMPACT_SIZE * 0.32)
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font = `bold ${fontSize}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(faces), x + COMPACT_SIZE / 2, y + COMPACT_SIZE / 2)
}

// Draw a row of compact glyph dice starting at (x, y) in canonical colour order.
// Returns the total pixel width used.
export function drawCompactDiceRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dice: Array<{ colour: DieColor; faces: number }>,
): number {
  if (dice.length === 0) return 0
  const COLOR_IDX: Record<DieColor, number> = { red: 0, green: 1, yellow: 2, blue: 3 }
  const sorted = [...dice].sort((a, b) => COLOR_IDX[a.colour] - COLOR_IDX[b.colour])
  let cx = x
  for (let i = 0; i < sorted.length; i++) {
    drawCompactDie(ctx, cx, y, sorted[i]!.colour, sorted[i]!.faces)
    if (i < sorted.length - 1) {
      const gap = sorted[i]!.colour === sorted[i + 1]!.colour ? COMPACT_WITHIN_GAP : COMPACT_BETWEEN_GAP
      cx += COMPACT_SIZE + gap
    }
  }
  return cx + COMPACT_SIZE - x
}
