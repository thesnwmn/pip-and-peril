import { colors } from '../colors'
import type { BiomePalette } from './biome'
import { ROOM_ACCENTS } from './biome'
import type { Archetype, FogState, GameMap, GridPos, TileCell } from './types'
import { E, N, S, W } from './types'

export const TILE_SIZE = 72
const VIEWPORT_COLS = 5
const VIEWPORT_ROWS = 5
export const MAP_X = 10
export const MAP_Y = 50
export const MAP_W = VIEWPORT_COLS * TILE_SIZE  // 360 — width of the 5-tile viewport

const COURSE_HEIGHT = 6
const BRICK_JOINT_WIDTH = 1

export const ARCHETYPE_VARIANT_COUNTS: Record<Archetype, number> = {
  chamber: 3,
  passage: 2,
  cavern: 3,
  pillared: 2,
  rubble: 2,
  bridge: 1,
  well: 1,
  pool: 1,
  squeeze: 1,
}

export function variantFor(archetype: Archetype, col: number, row: number): number {
  const count = ARCHETYPE_VARIANT_COUNTS[archetype]
  if (count <= 1) return 0
  const hash = ((col * 2654435761 + row * 1013904223) >>> 0)
  return hash % count
}

function makeTileRng(col: number, row: number, variant: number) {
  let state = (((col * 73856093) ^ (row * 19349663) ^ (variant * 83492791)) >>> 0) | 1
  return (): number => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state = state >>> 0
    return state / 4294967296
  }
}

function drawCorridorFlags(
  ctx: CanvasRenderingContext2D,
  rx: number, ry: number, rw: number, rh: number,
  seed: number,
  fs: number,
  biome: BiomePalette,
  flushBottom = false,
  flushRight = false,
): void {
  const cols = Math.floor(rw / fs)
  const rows = Math.floor(rh / fs)
  if (cols === 0 || rows === 0) return
  const offsetX = flushRight ? rw - cols * fs : Math.floor((rw - cols * fs) / 2)
  const offsetY = flushBottom ? rh - rows * fs : Math.floor((rh - rows * fs) / 2)
  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.6
  for (let fr = 0; fr < rows; fr++) {
    for (let fc = 0; fc < cols; fc++) {
      const idx = fc + fr + seed
      ctx.fillStyle = idx % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
      ctx.fillRect(rx + offsetX + fc * fs, ry + offsetY + fr * fs, fs, fs)
      ctx.strokeRect(rx + offsetX + fc * fs + 0.3, ry + offsetY + fr * fs + 0.3, fs - 0.6, fs - 0.6)
    }
  }
}

function drawCorridorStrips(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  cx: number, cy: number,
  exits: number,
  width: number,
  color: string,
): void {
  ctx.fillStyle = color
  const hw = width / 2
  ctx.fillRect(cx - hw, cy - hw, width, width)
  if (exits & N) ctx.fillRect(cx - hw, y, width, cy - hw - y)
  if (exits & S) ctx.fillRect(cx - hw, cy + hw, width, y + s - (cy + hw))
  if (exits & E) ctx.fillRect(cx + hw, cy - hw, x + s - (cx + hw), width)
  if (exits & W) ctx.fillRect(x, cy - hw, cx - hw - x, width)
}

function drawStairwellSpiral(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
): void {
  const cx = px + s / 2
  const cy = py + s / 2
  const maxRadius = s / 4.5

  ctx.strokeStyle = color
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  const spiralSteps = 4
  for (let i = 0; i <= spiralSteps * Math.PI * 2; i += 0.12) {
    const r = (i / (spiralSteps * Math.PI * 2)) * maxRadius
    const sx = cx + Math.cos(i) * r
    const sy = cy + Math.sin(i) * r
    if (i === 0) ctx.moveTo(sx, sy)
    else ctx.lineTo(sx, sy)
  }
  ctx.stroke()

  const arrowSize = s * 0.1
  const arrowY = cy + maxRadius * 0.6
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, arrowY - arrowSize)
  ctx.lineTo(cx, arrowY + arrowSize)
  ctx.moveTo(cx - arrowSize * 0.7, arrowY + arrowSize * 0.5)
  ctx.lineTo(cx, arrowY + arrowSize)
  ctx.lineTo(cx + arrowSize * 0.7, arrowY + arrowSize * 0.5)
  ctx.stroke()
}

// ── Archetype interior renderers ──────────────────────────────────────────────

function drawChamber(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number,
  cx: number, cy: number,
  variant: number,
  biome: BiomePalette,
): void {
  ctx.fillStyle = biome.floorBase
  ctx.fillRect(x + wt, y + wt, fi, fi)

  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.6
  for (let fr = 0; fr < 4; fr++) {
    for (let fc = 0; fc < 4; fc++) {
      const flagColor = (fc + fr) % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
      ctx.fillStyle = flagColor
      ctx.fillRect(x + wt + fc * fs, y + wt + fr * fs, fs, fs)
      ctx.strokeRect(x + wt + fc * fs + 0.3, y + wt + fr * fs + 0.3, fs - 0.6, fs - 0.6)
    }
  }

  if (variant === 1) {
    ctx.save()
    ctx.strokeStyle = biome.wallJoint
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(cx - fi * 0.3, cy - fi * 0.08)
    ctx.lineTo(cx + fi * 0.05, cy + fi * 0.05)
    ctx.lineTo(cx + fi * 0.28, cy - fi * 0.1)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - fi * 0.12, cy + fi * 0.18)
    ctx.lineTo(cx + fi * 0.08, cy + fi * 0.33)
    ctx.stroke()
    ctx.restore()
  } else if (variant === 2) {
    const dw = Math.round(fi * 0.5)
    const dh = Math.round(fi * 0.5)
    const dx = Math.round(cx - dw / 2)
    const dy = Math.round(cy - dh / 2)
    const df = Math.round(dw / 2)
    ctx.strokeStyle = biome.floorMortar
    ctx.lineWidth = 0.6
    for (let fr = 0; fr < 2; fr++) {
      for (let fc = 0; fc < 2; fc++) {
        const flagColor = (fc + fr) % 2 === 0 ? biome.floorFlagLo : biome.floorFlagHi
        ctx.fillStyle = flagColor
        ctx.fillRect(dx + fc * df, dy + fr * df, df, df)
        ctx.strokeRect(dx + fc * df + 0.3, dy + fr * df + 0.3, df - 0.6, df - 0.6)
      }
    }
    ctx.strokeStyle = biome.wallJoint
    ctx.lineWidth = 1.5
    ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1)
  }
}

function drawPassage(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number, cw: number,
  cx: number, cy: number,
  exits: number,
  variant: number,
  biome: BiomePalette,
): void {
  const hw = cw / 2

  // Fill corridor strips within the floor interior
  ctx.fillStyle = biome.floorBase
  const floorLeft = x + wt
  const floorTop = y + wt
  const floorRight = x + s - wt
  const floorBottom = y + s - wt

  ctx.fillRect(cx - hw, cy - hw, cw, cw)
  if (exits & N) ctx.fillRect(cx - hw, floorTop, cw, Math.max(0, cy - hw - floorTop))
  if (exits & S) ctx.fillRect(cx - hw, cy + hw, cw, Math.max(0, floorBottom - (cy + hw)))
  if (exits & E) ctx.fillRect(cx + hw, cy - hw, Math.max(0, floorRight - (cx + hw)), cw)
  if (exits & W) ctx.fillRect(floorLeft, cy - hw, Math.max(0, cx - hw - floorLeft), cw)

  // Flagstones on the corridor strips
  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.6

  // Helper to draw flagstones in a horizontal or vertical strip
  const flagH = (rx: number, ry: number, rw: number, rh: number) => {
    const cols = Math.floor(rw / fs)
    const rows = Math.floor(rh / fs)
    const ox = Math.floor((rw - cols * fs) / 2)
    const oy = Math.floor((rh - rows * fs) / 2)
    for (let fr = 0; fr < rows; fr++) {
      for (let fc = 0; fc < cols; fc++) {
        ctx.fillStyle = (fc + fr) % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
        ctx.fillRect(rx + ox + fc * fs, ry + oy + fr * fs, fs, fs)
        ctx.strokeRect(rx + ox + fc * fs + 0.3, ry + oy + fr * fs + 0.3, fs - 0.6, fs - 0.6)
      }
    }
  }

  const nodeY = cy - hw, nodeH = cw
  flagH(cx - hw, nodeY, cw, nodeH)
  if (exits & N) { const rh = cy - hw - floorTop; if (rh >= fs) flagH(cx - hw, floorTop, cw, rh) }
  if (exits & S) { const rh = floorBottom - (cy + hw); if (rh >= fs) flagH(cx - hw, cy + hw, cw, rh) }
  if (exits & E) { const rw = floorRight - (cx + hw); if (rw >= fs) flagH(cx + hw, cy - hw, rw, cw) }
  if (exits & W) { const rw = cx - hw - floorLeft; if (rw >= fs) flagH(floorLeft, cy - hw, rw, cw) }

  if (variant === 1) {
    ctx.save()
    ctx.strokeStyle = biome.wallJoint
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 0.8
    if (exits & (N | S)) {
      ctx.beginPath()
      ctx.moveTo(cx - hw * 0.3, floorTop + fi * 0.1)
      ctx.lineTo(cx + hw * 0.2, cy)
      ctx.lineTo(cx - hw * 0.15, floorBottom - fi * 0.1)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(floorLeft + fi * 0.1, cy - hw * 0.3)
      ctx.lineTo(cx, cy + hw * 0.2)
      ctx.lineTo(floorRight - fi * 0.1, cy - hw * 0.15)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawCavern(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number, cw: number,
  cx: number, cy: number,
  exits: number,
  variant: number,
  biome: BiomePalette,
  col: number, row: number,
): void {
  const rng = makeTileRng(col, row, variant)
  const narrowFactor = variant === 1 ? 0.80 : 0.92

  // Connect exits with rough stubs
  drawCorridorStrips(ctx, x, y, s, cx, cy, exits, Math.round(cw * narrowFactor), biome.floorBase)

  // Irregular rock floor blob
  const R = fi * 0.44
  const pts = variant === 2 ? 10 : 12

  ctx.fillStyle = biome.floorBase
  ctx.beginPath()
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const blobR = variant === 1 ? R * (0.60 + rng() * 0.22) : R * (0.78 + rng() * 0.24)
    const px = cx + Math.cos(a) * blobR
    const py = cy + Math.sin(a) * blobR
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()

  // Rubble speckle
  for (let i = 0; i < 28; i++) {
    const a = rng() * Math.PI * 2
    const rr = rng() * R * 0.9
    ctx.fillStyle = rng() < 0.5 ? biome.wallCourse : biome.wallJoint
    const sx = cx + Math.cos(a) * rr
    const sy = cy + Math.sin(a) * rr
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }

  if (variant === 2) {
    // Stalagmite-studded: add small rock columns
    const stalagmiteR = fi * 0.055
    const positions = [
      [-0.3, -0.3], [0.3, 0.28], [-0.28, 0.32], [0.25, -0.28],
    ]
    for (const [dx, dy] of positions) {
      const sx = cx + dx * fi
      const sy = cy + dy * fi
      const within = Math.sqrt(dx * dx + dy * dy) * fi < R * 0.75
      if (!within) continue
      ctx.save()
      ctx.fillStyle = biome.wallBase
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.ellipse(sx, sy + stalagmiteR * 0.5, stalagmiteR * 1.1, stalagmiteR * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = biome.wallCourse
      ctx.beginPath()
      ctx.arc(sx, sy, stalagmiteR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = biome.wallJoint
      ctx.lineWidth = 0.5
      ctx.stroke()
      ctx.restore()
    }
  }
}

function drawPillar(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, r: number,
  biome: BiomePalette,
): void {
  ctx.save()
  ctx.fillStyle = biome.wallBase
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  ctx.ellipse(px, py + r * 0.5, r * 1.1, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = biome.wallCourse
  ctx.beginPath()
  ctx.arc(px, py, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = biome.wallJoint
  ctx.lineWidth = 0.8
  ctx.globalAlpha = 0.6
  ctx.stroke()
  ctx.restore()
}

function drawPillared(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number,
  cx: number, cy: number,
  variant: number,
  biome: BiomePalette,
): void {
  // Draw chamber base first
  drawChamber(ctx, x, y, s, wt, fi, fs, cx, cy, 0, biome)

  const r = fi * 0.12
  const off = fi * 0.30

  if (variant === 0) {
    // Four columns in quadrants
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      drawPillar(ctx, cx + dx * off, cy + dy * off, r, biome)
    }
  } else {
    // Two columns + central aisle: pillars on west and east sides
    drawPillar(ctx, cx - off, cy, r, biome)
    drawPillar(ctx, cx + off, cy, r, biome)
    // Aisle hint: slightly different flagstones in center column
    ctx.fillStyle = biome.floorFlagLo
    ctx.fillRect(cx - fi * 0.08, cy - fi * 0.45, fi * 0.16, fi * 0.9)
  }
}

function drawRubblePile(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, r: number,
  biome: BiomePalette,
  rng: () => number,
): void {
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2
    const d = rng() * r
    const rr = r * (0.3 + rng() * 0.35)
    ctx.fillStyle = i % 2 ? biome.wallBase : biome.wallCourse
    ctx.beginPath()
    ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, rr, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.strokeStyle = biome.chasmRim
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  }
}

function drawRubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number,
  cx: number, cy: number,
  variant: number,
  biome: BiomePalette,
  col: number, row: number,
): void {
  const rng = makeTileRng(col, row, variant)

  // Chamber base
  drawChamber(ctx, x, y, s, wt, fi, fs, cx, cy, 0, biome)

  if (variant === 0) {
    // Scattered piles + cracks
    ctx.save()
    ctx.strokeStyle = biome.chasmRim
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(cx - fi * 0.3, cy - fi * 0.08)
    ctx.lineTo(cx, cy + fi * 0.05)
    ctx.lineTo(cx + fi * 0.28, cy - fi * 0.1)
    ctx.stroke()
    ctx.restore()
    drawRubblePile(ctx, cx - fi * 0.28, cy + fi * 0.26, fi * 0.14, biome, rng)
    drawRubblePile(ctx, cx + fi * 0.26, cy - fi * 0.24, fi * 0.12, biome, rng)
  } else {
    // Partial cave-in: larger rubble mass in one corner (NE), path clear
    const cornerX = x + wt + fi * 0.58
    const cornerY = y + wt
    const blockW = fi * 0.42
    const blockH = fi * 0.42
    ctx.fillStyle = biome.wallBase
    ctx.fillRect(cornerX, cornerY, blockW, blockH)
    // Rubble chunks on the edge
    for (let i = 0; i < 8; i++) {
      const bx = cornerX - fi * 0.06 + rng() * (blockW + fi * 0.06)
      const by = cornerY + rng() * (blockH + fi * 0.06)
      const br = fi * 0.04 + rng() * fi * 0.06
      ctx.fillStyle = rng() < 0.5 ? biome.wallBase : biome.wallCourse
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
    }
    // Crack line across the floor
    ctx.save()
    ctx.strokeStyle = biome.chasmRim
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(cornerX - fi * 0.1, cornerY + blockH)
    ctx.lineTo(cornerX + blockW * 0.4, cornerY + blockH + fi * 0.12)
    ctx.lineTo(cornerX - fi * 0.05, cornerY + blockH + fi * 0.25)
    ctx.stroke()
    ctx.restore()
  }
}

function drawBridge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number, cw: number,
  cx: number, cy: number,
  exits: number,
  _variant: number,
  biome: BiomePalette,
): void {
  // Chasm: dark pit with depth gradient
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, fi * 0.7)
  grad.addColorStop(0, biome.voidDrop)
  grad.addColorStop(1, biome.voidFill)
  ctx.fillStyle = grad
  ctx.fillRect(x + wt, y + wt, fi, fi)

  // Jagged chasm rim
  ctx.strokeStyle = biome.chasmRim
  ctx.lineWidth = 1
  ctx.strokeRect(x + wt + 0.5, y + wt + 0.5, fi - 1, fi - 1)

  // Bridge planks connecting doorways
  const bw = Math.round(cw * 0.9)
  drawCorridorStrips(ctx, x, y, s, cx, cy, exits, bw, biome.floorBase)

  // Plank board lines
  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.8
  const hw = bw / 2
  if (exits & (N | S)) {
    for (let py = y + 6; py < y + s; py += 7) {
      ctx.beginPath()
      ctx.moveTo(cx - hw, py)
      ctx.lineTo(cx + hw, py)
      ctx.stroke()
    }
  }
  if (exits & (E | W)) {
    for (let px = x + 6; px < x + s; px += 7) {
      ctx.beginPath()
      ctx.moveTo(px, cy - hw)
      ctx.lineTo(px, cy + hw)
      ctx.stroke()
    }
  }
}

function drawWell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number,
  cx: number, cy: number,
  biome: BiomePalette,
): void {
  drawChamber(ctx, x, y, s, wt, fi, fs, cx, cy, 0, biome)

  const R = fi * 0.26

  // Stone rim
  ctx.fillStyle = biome.featureStone
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  // Inner ring (rough stone edge)
  ctx.fillStyle = biome.wallBase
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2)
  ctx.fill()

  // Dark water
  const wg = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.55)
  wg.addColorStop(0, biome.wellWater)
  wg.addColorStop(1, '#05080c')
  ctx.fillStyle = wg
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2)
  ctx.fill()

  // Shimmer ring
  ctx.strokeStyle = 'rgba(120,160,200,0.4)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.30, 0, Math.PI * 2)
  ctx.stroke()
}

function drawPool(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, fs: number,
  cx: number, cy: number,
  biome: BiomePalette,
): void {
  drawChamber(ctx, x, y, s, wt, fi, fs, cx, cy, 0, biome)

  const R = fi * 0.28

  // Arcane glow
  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 1.5)
  glow.addColorStop(0, biome.magicGlow)
  glow.addColorStop(0.5, 'rgba(80,60,180,0.25)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Pool surface
  const pg = ctx.createRadialGradient(cx, cy, 1, cx, cy, R)
  pg.addColorStop(0, '#c8a0ff')
  pg.addColorStop(0.6, '#6a3fb0')
  pg.addColorStop(1, '#2a1850')
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  // Shimmer rings
  ctx.strokeStyle = 'rgba(220,200,255,0.5)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2)
  ctx.stroke()
}

function drawSqueeze(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  wt: number, fi: number, cw: number,
  cx: number, cy: number,
  exits: number,
  _variant: number,
  biome: BiomePalette,
): void {
  // Very narrow corridor — only Pip fits
  const crackW = Math.max(5, Math.round(cw * 0.40))
  drawCorridorStrips(ctx, x, y, s, cx, cy, exits, crackW, biome.floorBase)

  // Jagged rock edges hugging the crack
  const hw = crackW / 2
  ctx.fillStyle = biome.wallCourse
  for (let i = 0; i < 3; i++) {
    const t = hw + 2 + i * 3
    if (exits & (N | S)) {
      ctx.fillRect(cx - t - 2, cy - 2 + i, 2, 4)
      ctx.fillRect(cx + t, cy - 4 - i, 2, 4)
    } else {
      ctx.fillRect(cx - 2 + i, cy - t - 2, 4, 2)
      ctx.fillRect(cx - 4 - i, cy + t, 4, 2)
    }
  }

  // Mouse-hole arch at centre
  ctx.fillStyle = biome.voidDrop
  ctx.beginPath()
  ctx.arc(cx, cy + hw * 0.2, hw * 0.7, Math.PI, 0)
  ctx.fill()
}

function drawInteriorArchetype(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  exits: number,
  archetype: Archetype,
  variant: number,
  biome: BiomePalette,
  col = 0, row = 0,
): void {
  const wt = Math.round(s / 6)
  const fi = s - wt * 2
  const fs = fi / 4
  const cw = 2 * fs + 2
  const cx = x + s / 2
  const cy = y + s / 2

  switch (archetype) {
    case 'chamber':
      drawChamber(ctx, x, y, s, wt, fi, fs, cx, cy, variant, biome)
      break
    case 'passage':
      drawPassage(ctx, x, y, s, wt, fi, fs, cw, cx, cy, exits, variant, biome)
      break
    case 'cavern':
      drawCavern(ctx, x, y, s, wt, fi, fs, cw, cx, cy, exits, variant, biome, col, row)
      break
    case 'pillared':
      drawPillared(ctx, x, y, s, wt, fi, fs, cx, cy, variant, biome)
      break
    case 'rubble':
      drawRubble(ctx, x, y, s, wt, fi, fs, cx, cy, variant, biome, col, row)
      break
    case 'bridge':
      drawBridge(ctx, x, y, s, wt, fi, fs, cw, cx, cy, exits, variant, biome)
      break
    case 'well':
      drawWell(ctx, x, y, s, wt, fi, fs, cx, cy, biome)
      break
    case 'pool':
      drawPool(ctx, x, y, s, wt, fi, fs, cx, cy, biome)
      break
    case 'squeeze':
      drawSqueeze(ctx, x, y, s, wt, fi, cw, cx, cy, exits, variant, biome)
      break
  }
}

// ── Main drawCell ──────────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: TileCell | null,
  fogState: FogState,
  vpCol: number,
  vpRow: number,
  mapCol: number,
  mapRow: number,
  biome: BiomePalette,
): void {
  const s = TILE_SIZE
  const px = MAP_X + vpCol * s
  const py = MAP_Y + vpRow * s

  const wt = Math.round(s / 6)
  const fi = s - wt * 2
  const fs = fi / 4
  const cw = 2 * fs + 2
  const co = Math.round((s - cw) / 2)
  const jointSpacing = Math.round(s / 3)

  if (cell === null || fogState === 'hidden') {
    ctx.fillStyle = biome.voidFill
    ctx.fillRect(px, py, s, s)
    return
  }

  // Step 1 — wall base
  ctx.fillStyle = biome.wallBase
  ctx.fillRect(px, py, s, s)

  // Step 2 — brick bond pattern
  let courseIndex = 0
  for (let r = 0; r < s; r += COURSE_HEIGHT, courseIndex++) {
    ctx.fillStyle = biome.wallJoint
    ctx.fillRect(px, py + r, s, BRICK_JOINT_WIDTH)

    const offset = courseIndex % 2 === 0 ? 0 : Math.round(s / 6)
    for (let bx = offset; bx < s; bx += jointSpacing) {
      ctx.fillRect(px + bx, py + r, BRICK_JOINT_WIDTH, COURSE_HEIGHT)
    }
  }

  // Step 3 — interior archetype (replaces plain floor + flagstones)
  const archetype: Archetype = cell.archetype ?? 'chamber'
  const variant = variantFor(archetype, mapCol, mapRow)
  drawInteriorArchetype(ctx, px, py, s, cell.exits, archetype, variant, biome, mapCol, mapRow)

  // Step 4 — exit corridor punch-through (ensures exits are always clear)
  ctx.fillStyle = biome.wallCourse
  if (cell.exits & N) ctx.fillRect(px + co, py, cw, wt)
  if (cell.exits & S) ctx.fillRect(px + co, py + s - wt, cw, wt)
  if (cell.exits & E) ctx.fillRect(px + s - wt, py + co, wt, cw)
  if (cell.exits & W) ctx.fillRect(px, py + co, wt, cw)

  if (cell.exits & N) drawCorridorFlags(ctx, px + co, py, cw, wt, 0, fs, biome)
  if (cell.exits & S) drawCorridorFlags(ctx, px + co, py + s - wt, cw, wt, 1, fs, biome, true)
  if (cell.exits & E) drawCorridorFlags(ctx, px + s - wt, py + co, wt, cw, 1, fs, biome, false, true)
  if (cell.exits & W) drawCorridorFlags(ctx, px, py + co, wt, cw, 0, fs, biome)

  // Step 4.5 — special room graphics (stairwell spiral)
  if (cell.roomType === 'stairwell') {
    drawStairwellSpiral(ctx, px, py, s, colors.roomStairwell)
  }

  // Step 5 — floor-edge marker (skip corridor and start)
  const markerColor = ROOM_ACCENTS[cell.roomType]
  if (markerColor) {
    ctx.strokeStyle = markerColor
    ctx.lineWidth = 1.5
    ctx.beginPath()

    const x0 = px + wt
    const x1 = px + wt + fi
    const y0 = py + wt
    const y1 = py + wt + fi

    // North side
    if (cell.exits & N) {
      ctx.moveTo(x0, y0); ctx.lineTo(px + co, y0)
      ctx.moveTo(px + co + cw, y0); ctx.lineTo(x1, y0)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y0)
    }

    // South side
    if (cell.exits & S) {
      ctx.moveTo(x0, y1); ctx.lineTo(px + co, y1)
      ctx.moveTo(px + co + cw, y1); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x0, y1); ctx.lineTo(x1, y1)
    }

    // West side
    if (cell.exits & W) {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, py + co)
      ctx.moveTo(x0, py + co + cw); ctx.lineTo(x0, y1)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y1)
    }

    // East side
    if (cell.exits & E) {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, py + co)
      ctx.moveTo(x1, py + co + cw); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, y1)
    }

    ctx.stroke()
  }

  // Step 6 — fog overlay
  if (fogState === 'seen') {
    ctx.fillStyle = biome.fogOverlay
    ctx.fillRect(px, py, s, s)
  }

  // Step 6.5 — spent trap overlay
  if (cell.roomType === 'trap' && cell.trapFired) {
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = colors.trapSpent
    ctx.fillRect(px + wt, py + wt, fi, fi)
    ctx.restore()
  }

  // Step 7 — fled marker for enemy rooms
  if (cell.roomType === 'enemy' && cell.fled) {
    const markerSize = Math.round(s / 6)
    const mx = px + s - markerSize - 2
    const my = py + 2
    ctx.fillStyle = '#c43030'
    ctx.beginPath()
    ctx.arc(mx + markerSize / 2, my + markerSize / 2, markerSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = `bold ${Math.round(markerSize * 0.7)}px monospace`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', mx + markerSize / 2, my + markerSize / 2)
  }
}

export function drawPip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tileSize: number,
): void {
  const r = tileSize * 0.18
  const earR = r * 0.42

  // Body
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.2, r, 0, Math.PI * 2)
  ctx.fillStyle = colors.pipBody
  ctx.fill()

  // Ears
  const earOffsets = [
    { dx: -r * 0.55, dy: -r * 0.85 },
    { dx: r * 0.55, dy: -r * 0.85 },
  ]
  for (const { dx, dy } of earOffsets) {
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy + r * 0.2, earR, 0, Math.PI * 2)
    ctx.fillStyle = colors.pipEar
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy + r * 0.2, earR * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = colors.pipEarInner
    ctx.fill()
  }

  // Eyes (left and right)
  for (const ex of [-r * 0.2, r * 0.2]) {
    ctx.beginPath()
    ctx.arc(cx + ex, cy - r * 0.1 + r * 0.2, r * 0.1, 0, Math.PI * 2)
    ctx.fillStyle = colors.pipEye
    ctx.fill()
  }

  // Nose
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.55 + r * 0.2, r * 0.08, 0, Math.PI * 2)
  ctx.fillStyle = colors.pipNose
  ctx.fill()
}

export function drawSingleTile(
  ctx: CanvasRenderingContext2D,
  cell: TileCell,
  x: number,
  y: number,
  size: number,
  biome: BiomePalette,
  variant = 0,
  col = 0,
  row = 0,
): void {
  const s = size
  const wt = Math.round(s / 6)
  const fi = s - wt * 2
  const fs = fi / 4
  const cw = 2 * fs + 2
  const co = Math.round((s - cw) / 2)
  const jointSpacing = Math.round(s / 3)

  // Wall base
  ctx.fillStyle = biome.wallBase
  ctx.fillRect(x, y, s, s)

  // Brick bond
  let courseIndex = 0
  for (let r = 0; r < s; r += COURSE_HEIGHT, courseIndex++) {
    ctx.fillStyle = biome.wallJoint
    ctx.fillRect(x, y + r, s, BRICK_JOINT_WIDTH)
    const offset = courseIndex % 2 === 0 ? 0 : Math.round(s / 6)
    for (let bx = offset; bx < s; bx += jointSpacing) {
      ctx.fillRect(x + bx, y + r, BRICK_JOINT_WIDTH, COURSE_HEIGHT)
    }
  }

  // Interior archetype
  const archetype: Archetype = cell.archetype ?? 'chamber'
  drawInteriorArchetype(ctx, x, y, s, cell.exits, archetype, variant, biome, col, row)

  // Exit corridor punch-through
  ctx.fillStyle = biome.wallCourse
  if (cell.exits & N) ctx.fillRect(x + co, y, cw, wt)
  if (cell.exits & S) ctx.fillRect(x + co, y + s - wt, cw, wt)
  if (cell.exits & E) ctx.fillRect(x + s - wt, y + co, wt, cw)
  if (cell.exits & W) ctx.fillRect(x, y + co, wt, cw)

  if (cell.exits & N) drawCorridorFlags(ctx, x + co, y, cw, wt, 0, fs, biome)
  if (cell.exits & S) drawCorridorFlags(ctx, x + co, y + s - wt, cw, wt, 1, fs, biome, true)
  if (cell.exits & E) drawCorridorFlags(ctx, x + s - wt, y + co, wt, cw, 1, fs, biome, false, true)
  if (cell.exits & W) drawCorridorFlags(ctx, x, y + co, wt, cw, 0, fs, biome)

  // Stairwell spiral
  if (cell.roomType === 'stairwell') {
    drawStairwellSpiral(ctx, x, y, s, colors.roomStairwell)
  }

  // Floor-edge marker
  const markerColor = ROOM_ACCENTS[cell.roomType]
  if (markerColor) {
    ctx.strokeStyle = markerColor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const x0 = x + wt
    const x1 = x + wt + fi
    const y0 = y + wt
    const y1 = y + wt + fi
    if (cell.exits & N) {
      ctx.moveTo(x0, y0); ctx.lineTo(x + co, y0)
      ctx.moveTo(x + co + cw, y0); ctx.lineTo(x1, y0)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y0)
    }
    if (cell.exits & S) {
      ctx.moveTo(x0, y1); ctx.lineTo(x + co, y1)
      ctx.moveTo(x + co + cw, y1); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x0, y1); ctx.lineTo(x1, y1)
    }
    if (cell.exits & W) {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y + co)
      ctx.moveTo(x0, y + co + cw); ctx.lineTo(x0, y1)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y1)
    }
    if (cell.exits & E) {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, y + co)
      ctx.moveTo(x1, y + co + cw); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, y1)
    }
    ctx.stroke()
  }
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  fog: FogState[][],
  viewCenter: GridPos,
  pip: GridPos,
  biome: BiomePalette,
): void {
  const startCol = viewCenter.col - Math.floor(VIEWPORT_COLS / 2)
  const startRow = viewCenter.row - Math.floor(VIEWPORT_ROWS / 2)

  for (let vr = 0; vr < VIEWPORT_ROWS; vr++) {
    for (let vc = 0; vc < VIEWPORT_COLS; vc++) {
      const mapCol = startCol + vc
      const mapRow = startRow + vr

      const inBounds =
        mapCol >= 0 && mapCol < map.width && mapRow >= 0 && mapRow < map.height
      const cell = inBounds ? map.cells[mapRow][mapCol] : null
      const fogState: FogState = inBounds ? fog[mapRow][mapCol] : 'hidden'

      drawCell(ctx, cell, fogState, vc, vr, mapCol, mapRow, biome)
    }
  }

  const pipFog = fog[pip.row]?.[pip.col]
  if (pipFog === 'visible') {
    const vpCol = Math.floor(VIEWPORT_COLS / 2) + (pip.col - viewCenter.col)
    const vpRow = Math.floor(VIEWPORT_ROWS / 2) + (pip.row - viewCenter.row)
    const pipX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
    const pipY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2
    drawPip(ctx, pipX, pipY, TILE_SIZE)
  }

  // Dungeon boundary: dashed gold border around the full grid
  ctx.save()
  ctx.strokeStyle = 'rgba(200, 148, 30, 0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 4])
  ctx.strokeRect(
    MAP_X + (0 - startCol) * TILE_SIZE,
    MAP_Y + (0 - startRow) * TILE_SIZE,
    map.width * TILE_SIZE,
    map.height * TILE_SIZE,
  )
  ctx.setLineDash([])
  ctx.restore()
}
