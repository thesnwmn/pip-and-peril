import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { computeFog } from '../map/fog'
import { drawMap } from '../map/renderer'
import type { FogState, GameMap, RoomType, TileCell } from '../map/types'
import { E, N, S, W } from '../map/types'
import type { ScreenController } from './main-menu'

const LOGICAL_W = 390
const LOGICAL_H = 844

const BACK_LINK_X = 16
const BACK_LINK_Y = 16
const BACK_LINK_W = 150
const BACK_LINK_H = 32

const MAP_W = 13
const MAP_H = 13

function buildTestMap(): GameMap {
  const cells: (TileCell | null)[][] = Array.from(
    { length: MAP_H },
    () => Array(MAP_W).fill(null),
  )

  const place = (col: number, row: number, roomType: RoomType, exits: number) => {
    cells[row][col] = { roomType, exits }
  }

  place(6, 6, 'start', N | E | S | W)
  place(6, 5, 'corridor', N | S)
  place(6, 4, 'enemy', S | E)
  place(7, 4, 'shop', W | S)
  place(7, 5, 'npc', N | W)
  place(6, 7, 'corridor', N | S)
  place(6, 8, 'item', N | E)
  place(7, 8, 'chest', W | S)
  place(7, 9, 'boss', N)

  return { cells, width: MAP_W, height: MAP_H }
}

function buildInitialFog(): FogState[][] {
  return Array.from({ length: MAP_H }, () =>
    Array<FogState>(MAP_W).fill('hidden'),
  )
}

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let hoveredElement: string | null = null
  let isMouseDevice = false

  const testMap = buildTestMap()
  const viewCenter = { col: 6, row: 6 }
  const fog = computeFog(buildInitialFog(), testMap, viewCenter, 3)

  function isInBackLink(x: number, y: number): boolean {
    return (
      x >= BACK_LINK_X &&
      x <= BACK_LINK_X + BACK_LINK_W &&
      y >= BACK_LINK_Y &&
      y <= BACK_LINK_Y + BACK_LINK_H
    )
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    drawMap(ctx, testMap, fog, viewCenter, DUNGEON)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = isMouseDevice && hoveredElement === 'back' ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('← Quit Run', BACK_LINK_X, BACK_LINK_Y + BACK_LINK_H / 2)
  }

  function handleClick(x: number, y: number): void {
    if (isInBackLink(x, y)) {
      transitionTo('home')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true
    const newHovered = isInBackLink(x, y) ? 'back' : null
    if (newHovered !== hoveredElement) {
      hoveredElement = newHovered
    }
  }

  return { draw, handleClick, handlePointerMove }
}
