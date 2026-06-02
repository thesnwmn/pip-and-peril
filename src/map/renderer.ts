import { colors } from '../colors'
import type { BiomePalette } from './biome'
import { ROOM_ACCENTS } from './biome'
import type { FogState, GameMap, GridPos, TileCell } from './types'
import { E, N, S, W } from './types'

export const TILE_SIZE = 72
const VIEWPORT_COLS = 5
const VIEWPORT_ROWS = 5
export const MAP_X = 10
export const MAP_Y = 50

const COURSE_HEIGHT = 6
const BRICK_JOINT_WIDTH = 1

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

  const wt = Math.round(s / 6)        // 12 px at TILE_SIZE 72; COURSE_HEIGHT 6 divides s exactly
  const fi = s - wt * 2              // 48 px
  const fs = fi / 4                  // 12 px — exact integer; all flagstones same size
  const cw = 2 * fs + 2              // 26 px — 2 flagstones wide + 1 px margin each side
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
    for (let x = offset; x < s; x += jointSpacing) {
      ctx.fillRect(px + x, py + r, BRICK_JOINT_WIDTH, COURSE_HEIGHT)
    }
  }

  // Step 3 — inner floor
  ctx.fillStyle = biome.floorBase
  ctx.fillRect(px + wt, py + wt, fi, fi)

  // Step 4 — 4×4 flagstone grid (fi=48 = 4×12 exactly, so all stones are equal size)
  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.6
  for (let fr = 0; fr < 4; fr++) {
    for (let fc = 0; fc < 4; fc++) {
      const flagColor = (fc + fr) % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
      ctx.fillStyle = flagColor
      ctx.fillRect(px + wt + fc * fs, py + wt + fr * fs, fs, fs)
      ctx.strokeRect(px + wt + fc * fs + 0.3, py + wt + fr * fs + 0.3, fs - 0.6, fs - 0.6)
    }
  }

  // Step 5 — exit corridors with flagstone tiling
  const exits = cell.exits
  ctx.fillStyle = biome.wallCourse
  if (exits & N) ctx.fillRect(px + co, py, cw, wt)
  if (exits & S) ctx.fillRect(px + co, py + s - wt, cw, wt)
  if (exits & E) ctx.fillRect(px + s - wt, py + co, wt, cw)
  if (exits & W) ctx.fillRect(px, py + co, wt, cw)

  if (exits & N) drawCorridorFlags(ctx, px + co, py, cw, wt, 0, fs, biome)
  if (exits & S) drawCorridorFlags(ctx, px + co, py + s - wt, cw, wt, 1, fs, biome, true)
  if (exits & E) drawCorridorFlags(ctx, px + s - wt, py + co, wt, cw, 1, fs, biome, false, true)
  if (exits & W) drawCorridorFlags(ctx, px, py + co, wt, cw, 0, fs, biome)

  // Step 6 — floor-edge marker (skip corridor and start)
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
    if (exits & N) {
      ctx.moveTo(x0, y0); ctx.lineTo(px + co, y0)
      ctx.moveTo(px + co + cw, y0); ctx.lineTo(x1, y0)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y0)
    }

    // South side
    if (exits & S) {
      ctx.moveTo(x0, y1); ctx.lineTo(px + co, y1)
      ctx.moveTo(px + co + cw, y1); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x0, y1); ctx.lineTo(x1, y1)
    }

    // West side
    if (exits & W) {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, py + co)
      ctx.moveTo(x0, py + co + cw); ctx.lineTo(x0, y1)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y1)
    }

    // East side
    if (exits & E) {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, py + co)
      ctx.moveTo(x1, py + co + cw); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x1, y0); ctx.lineTo(x1, y1)
    }

    ctx.stroke()
  }

  // Step 7 — fog overlay
  if (fogState === 'seen') {
    ctx.fillStyle = biome.fogOverlay
    ctx.fillRect(px, py, s, s)
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
): void {
  const s = size
  const wt = Math.round(s / 6)
  const fi = s - wt * 2
  const fs = fi / 4
  const cw = 2 * fs + 2
  const co = Math.round((s - cw) / 2)
  const jointSpacing = Math.round(s / 3)

  ctx.fillStyle = biome.wallBase
  ctx.fillRect(x, y, s, s)

  let courseIndex = 0
  for (let r = 0; r < s; r += COURSE_HEIGHT, courseIndex++) {
    ctx.fillStyle = biome.wallJoint
    ctx.fillRect(x, y + r, s, BRICK_JOINT_WIDTH)
    const offset = courseIndex % 2 === 0 ? 0 : Math.round(s / 6)
    for (let bx = offset; bx < s; bx += jointSpacing) {
      ctx.fillRect(x + bx, y + r, BRICK_JOINT_WIDTH, COURSE_HEIGHT)
    }
  }

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

  const exits = cell.exits
  ctx.fillStyle = biome.wallCourse
  if (exits & N) ctx.fillRect(x + co, y, cw, wt)
  if (exits & S) ctx.fillRect(x + co, y + s - wt, cw, wt)
  if (exits & E) ctx.fillRect(x + s - wt, y + co, wt, cw)
  if (exits & W) ctx.fillRect(x, y + co, wt, cw)

  if (exits & N) drawCorridorFlags(ctx, x + co, y, cw, wt, 0, fs, biome)
  if (exits & S) drawCorridorFlags(ctx, x + co, y + s - wt, cw, wt, 1, fs, biome, true)
  if (exits & E) drawCorridorFlags(ctx, x + s - wt, y + co, wt, cw, 1, fs, biome, false, true)
  if (exits & W) drawCorridorFlags(ctx, x, y + co, wt, cw, 0, fs, biome)

  const markerColor = ROOM_ACCENTS[cell.roomType]
  if (markerColor) {
    ctx.strokeStyle = markerColor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const x0 = x + wt
    const x1 = x + wt + fi
    const y0 = y + wt
    const y1 = y + wt + fi
    if (exits & N) {
      ctx.moveTo(x0, y0); ctx.lineTo(x + co, y0)
      ctx.moveTo(x + co + cw, y0); ctx.lineTo(x1, y0)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y0)
    }
    if (exits & S) {
      ctx.moveTo(x0, y1); ctx.lineTo(x + co, y1)
      ctx.moveTo(x + co + cw, y1); ctx.lineTo(x1, y1)
    } else {
      ctx.moveTo(x0, y1); ctx.lineTo(x1, y1)
    }
    if (exits & W) {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y + co)
      ctx.moveTo(x0, y + co + cw); ctx.lineTo(x0, y1)
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y1)
    }
    if (exits & E) {
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

  const centerFog = fog[viewCenter.row]?.[viewCenter.col]
  if (centerFog === 'visible') {
    const pipX = MAP_X + Math.floor(VIEWPORT_COLS / 2) * TILE_SIZE + TILE_SIZE / 2
    const pipY = MAP_Y + Math.floor(VIEWPORT_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2
    drawPip(ctx, pipX, pipY, TILE_SIZE)
  }
}
