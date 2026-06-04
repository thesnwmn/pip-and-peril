import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { Inventory } from '../satchel/types'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { acquireItem } from '../satchel/items'
import { iconGlyph } from '../satchel/icon'
import { ITEM_CONFIG } from './config'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H } from '../screens/game-layout'

export interface ItemPanelContext {
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}

// Layout constants (absolute y positions in logical canvas space)
const PANEL_W = LOGICAL_W

const HEADER_CY = PANEL_TOP + 30
const ICON_TOP = PANEL_TOP + 52
const ICON_SIZE = 64
const ICON_CX = PANEL_W / 2
export const ICON_CY = ICON_TOP + ICON_SIZE / 2
const NAME_CY = ICON_TOP + ICON_SIZE + 28
const DESC_CY = NAME_CY + 24

export const TAKE_BTN_W = 244
export const TAKE_BTN_H = 52
export const TAKE_BTN_X = (PANEL_W - TAKE_BTN_W) / 2
export const TAKE_BTN_Y = DESC_CY + 36

export const LEAVE_HIT_H = 44
export const LEAVE_CY = TAKE_BTN_Y + TAKE_BTN_H + 44
export const LEAVE_HIT_Y = LEAVE_CY - LEAVE_HIT_H / 2

function isInTakeButton(x: number, y: number): boolean {
  return x >= TAKE_BTN_X && x <= TAKE_BTN_X + TAKE_BTN_W
    && y >= TAKE_BTN_Y && y <= TAKE_BTN_Y + TAKE_BTN_H
}

function isInLeaveButton(x: number, y: number): boolean {
  return y >= LEAVE_HIT_Y && y <= LEAVE_HIT_Y + LEAVE_HIT_H
}

export function createItemEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: ItemPanelContext,
): EncounterPanel {
  const item = CATALOG_ITEMS.find(i => i.id === cell.itemId)
  let hoveredElement: 'take' | 'leave' | null = null
  let completed = false

  function signalComplete(outcome: string): void {
    if (completed) return
    completed = true
    onComplete(outcome)
  }

  function draw(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    ctx.save()
    ctx.globalAlpha = 1

    // Background
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, PANEL_W, LOGICAL_H - PANEL_TOP)

    // Green top border accent
    ctx.fillStyle = colors.roomItem
    ctx.fillRect(0, PANEL_TOP, PANEL_W, 2)

    if (!item) return

    // "Found!" header
    ctx.font = '11px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Found!', ICON_CX, HEADER_CY)

    // Item icon
    ctx.font = '32px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(iconGlyph(item.iconType), ICON_CX, ICON_CY)

    // Item name
    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, ICON_CX, NAME_CY)

    // Item description
    ctx.font = 'italic 12px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.description, ICON_CX, DESC_CY)

    // Take button
    const takeHovered = hoveredElement === 'take'
    ctx.fillStyle = takeHovered
      ? 'rgba(25,113,62,0.35)'
      : 'rgba(25,113,62,0.2)'
    ctx.strokeStyle = colors.roomItem
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.rect(TAKE_BTN_X, TAKE_BTN_Y, TAKE_BTN_W, TAKE_BTN_H)
    ctx.fill()
    ctx.stroke()

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Take', ICON_CX, TAKE_BTN_Y + TAKE_BTN_H / 2)

    // Leave text link
    ctx.font = '12px monospace'
    ctx.fillStyle = hoveredElement === 'leave' ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Leave', ICON_CX, LEAVE_CY)

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    if (!item || completed) return

    if (isInTakeButton(x, y)) {
      // Update inventory
      context.setInventory(acquireItem(context.getInventory(), item))

      // Mark tile cleared
      const dungeonState = context.getDungeonState()
      const newCells = dungeonState.grid.cells.map(row => [...row])
      const currentCell = newCells[dungeonState.pip.row][dungeonState.pip.col]
      if (currentCell) {
        newCells[dungeonState.pip.row][dungeonState.pip.col] = { ...currentCell, cleared: true }
      }
      context.setDungeonState({ ...dungeonState, grid: { ...dungeonState.grid, cells: newCells } })

      signalComplete('taken')
      return
    }

    if (isInLeaveButton(x, y)) {
      signalComplete('left')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (isInTakeButton(x, y)) {
      hoveredElement = 'take'
    } else if (isInLeaveButton(x, y)) {
      hoveredElement = 'leave'
    } else {
      hoveredElement = null
    }
  }

  return { draw, handleClick, handlePointerMove, mapView }
}
