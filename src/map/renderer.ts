import { colors } from '../colors'
import type { BiomePalette } from './biome'
import { ROOM_ACCENTS } from './biome'
import type { FogState, GameMap, GridPos, TileCell } from './types'
import { E, N, S, W } from './types'

export const TILE_SIZE = 74
const VIEWPORT_COLS = 5
const VIEWPORT_ROWS = 5
export const MAP_X = 10
export const MAP_Y = 50

const COURSE_HEIGHT = 6
const BRICK_JOINT_WIDTH = 1

function drawCorridorFlags(
  ctx: CanvasRenderingContext2D,
  rx: number, ry: number, rw: number, rh: number,
  cols: number, rows: number,
  mapCol: number, mapRow: number,
  seed: number,
  biome: BiomePalette,
): void {
  const cellW = Math.floor(rw / cols)
  const cellH = Math.floor(rh / rows)
  for (let fr = 0; fr < rows; fr++) {
    for (let fc = 0; fc < cols; fc++) {
      const fw = fc === cols - 1 ? rw - fc * cellW : cellW
      const fh = fr === rows - 1 ? rh - fr * cellH : cellH
      const idx = fc + fr * cols + mapCol * 7 + mapRow * 13 + seed
      ctx.fillStyle = idx % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
      ctx.fillRect(rx + fc * cellW, ry + fr * cellH, fw, fh)
      ctx.strokeRect(rx + fc * cellW + 0.3, ry + fr * cellH + 0.3, fw - 0.6, fh - 0.6)
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

  const wt = Math.round(s * 0.175)   // 13 px at TILE_SIZE 74 → fi=48 divisible by 4
  const cw = Math.round(s * 0.38)
  const co = Math.round((s - cw) / 2)
  const fi = s - wt * 2
  const fs = fi / 4                   // exact integer (48/4=12); all flagstones same size
  const jointSpacing = Math.round(s / 3)

  if (cell === null || fogState === 'hidden') {
    ctx.fillStyle = biome.voidFill
    ctx.fillRect(px, py, s, s)
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = biome.wallCourse
    for (let line = 0; line < 3; line++) {
      ctx.fillRect(px, py + Math.round(s * 0.25) + line * COURSE_HEIGHT, s, 1)
    }
    ctx.restore()
    return
  }

  // Step 1 — wall base
  ctx.fillStyle = biome.wallBase
  ctx.fillRect(px, py, s, s)

  // Step 2 — brick bond pattern
  let courseIndex = 0
  for (let r = 0; r < s; r += COURSE_HEIGHT, courseIndex++) {
    if (courseIndex === 0) {
      ctx.fillStyle = biome.wallHighlight
      ctx.fillRect(px, py + r, s, COURSE_HEIGHT)
    }
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
      const idx = fc + fr * 4 + mapCol * 7 + mapRow * 13
      const flagColor = idx % 2 === 0 ? biome.floorFlagHi : biome.floorFlagLo
      ctx.fillStyle = flagColor
      ctx.fillRect(px + wt + fc * fs, py + wt + fr * fs, fs, fs)
      ctx.strokeRect(px + wt + fc * fs + 0.3, py + wt + fr * fs + 0.3, fs - 0.6, fs - 0.6)
    }
  }

  // Step 5 — exit corridors with flagstone tiling (shift S/E start 1px inward for seam overlap)
  const exits = cell.exits
  ctx.fillStyle = biome.corridorFloor
  if (exits & N) ctx.fillRect(px + co, py, cw, wt + 1)
  if (exits & S) ctx.fillRect(px + co, py + s - wt - 1, cw, wt + 1)
  if (exits & E) ctx.fillRect(px + s - wt - 1, py + co, wt + 1, cw)
  if (exits & W) ctx.fillRect(px, py + co, wt + 1, cw)

  ctx.strokeStyle = biome.floorMortar
  ctx.lineWidth = 0.6
  if (exits & N) drawCorridorFlags(ctx, px + co, py, cw, wt + 1, 2, 1, mapCol, mapRow, 31, biome)
  if (exits & S) drawCorridorFlags(ctx, px + co, py + s - wt - 1, cw, wt + 1, 2, 1, mapCol, mapRow, 37, biome)
  if (exits & E) drawCorridorFlags(ctx, px + s - wt - 1, py + co, wt + 1, cw, 1, 2, mapCol, mapRow, 41, biome)
  if (exits & W) drawCorridorFlags(ctx, px, py + co, wt + 1, cw, 1, 2, mapCol, mapRow, 47, biome)

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
