import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { Inventory } from '../satchel/types'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { acquireItem } from '../satchel/items'
import { iconGlyph } from '../satchel/icon'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H } from '../screens/game-layout'

export interface ShopPanelContext {
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}

const PANEL_W = LOGICAL_W
const PANEL_H = LOGICAL_H - PANEL_TOP

const PANEL_MARGIN = 8
const CONTENT_LEFT = PANEL_MARGIN
const CONTENT_RIGHT = PANEL_W - PANEL_MARGIN
const CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT

const HEADER_TOP = PANEL_TOP + 20
const MERCHANT_CY = HEADER_TOP
const FLAVOR_CY = HEADER_TOP + 18
const RULE_Y = HEADER_TOP + 32

const CARD_ICON_SIZE_COMPACT = 32
const CARD_ICON_SIZE_EXPANDED = 48

const ITEM_AREA_TOP = RULE_Y + 12
const CARD_PADDING = 9
const CARD_GAP = 6
const BUY_BUTTON_HEIGHT = 26
const MAX_ITEMS = 3

const GOLD_DISPLAY_Y = LOGICAL_H - 24
const LEAVE_HIT_H = 44
const LEAVE_Y = GOLD_DISPLAY_Y

interface CardState {
  itemId: string
  selected: boolean
}

interface PurchaseConfirmation {
  itemName: string
  timestamp: number
}

interface AffordanceError {
  itemId: string
  timestamp: number
}

function getMerchantFlavor(name: string): { flavor: string } {
  const flavors: Record<string, string> = {
    'Morwhistle the Vole': "What'll it be?",
    'Old Nutkin': 'Coins only, mind you.',
    'Bramble Sewn': 'Fine goods, fair prices.',
  }
  return { flavor: flavors[name] ?? 'Welcome, friend.' }
}

export function createShopEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: ShopPanelContext,
): EncounterPanel {
  const stock = cell.shopStock ?? []
  const merchantName = cell.shopMerchant ?? 'Unknown Merchant'
  const merchantEntry = getMerchantFlavor(merchantName)

  let cardStates: CardState[] = stock.map(itemId => ({ itemId, selected: false }))
  let hoveredElement: string | null = null
  let completed = false
  let lastPurchaseConfirmation: PurchaseConfirmation | null = null
  let lastUnaffordableClick: { itemId: string; timestamp: number } | null = null

  function signalComplete(outcome: string): void {
    if (completed) return
    completed = true
    onComplete(outcome)
  }

  function getItemById(itemId: string) {
    return CATALOG_ITEMS.find(i => i.id === itemId)
  }

  function canAfford(item: any): boolean {
    const inv = context.getInventory()
    return inv.gold >= (item.shopPrice ?? 0)
  }

  function findCardAt(x: number, y: number): number {
    if (y < ITEM_AREA_TOP || cardStates.length === 0) return -1

    const cardHeight = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2

    let currentY = ITEM_AREA_TOP
    for (let i = 0; i < cardStates.length; i++) {
      const card = cardStates[i]
      const item = getItemById(card.itemId)
      if (!item) continue

      if (y >= currentY && y < currentY + cardHeight && x >= CONTENT_LEFT && x < CONTENT_RIGHT) {
        return i
      }

      currentY += cardHeight + CARD_GAP
    }
    return -1
  }

  function isInLeaveButton(x: number, y: number): boolean {
    // Check Y coordinate
    if (!(y >= LEAVE_Y - LEAVE_HIT_H / 2 && y <= LEAVE_Y + LEAVE_HIT_H / 2)) {
      return false
    }
    // Check X coordinate - button is on the right side
    // "Leave" text is roughly 40px wide, with padding
    const leaveButtonLeft = CONTENT_RIGHT - 50
    return x >= leaveButtonLeft && x <= CONTENT_RIGHT
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    ctx.save()
    ctx.globalAlpha = 1

    // Background
    ctx.fillStyle = colors.shopSurface
    ctx.fillRect(0, PANEL_TOP, PANEL_W, PANEL_H)

    // Top border accent (2px)
    ctx.fillStyle = colors.shopBorder
    ctx.fillRect(0, PANEL_TOP, PANEL_W, 2)

    // Merchant header
    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(merchantName, CONTENT_LEFT, MERCHANT_CY)

    // Flavor line
    ctx.font = 'italic 12px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText(merchantEntry.flavor, CONTENT_LEFT, FLAVOR_CY)

    // Rule line
    ctx.strokeStyle = colors.shopBorder
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CONTENT_LEFT, RULE_Y)
    ctx.lineTo(CONTENT_RIGHT, RULE_Y)
    ctx.stroke()

    // Item cards or sold-out message
    if (stock.length === 0) {
      ctx.font = 'italic 13px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const soldOutY = ITEM_AREA_TOP + 60
      ctx.fillText('Shelves are bare.', PANEL_W / 2, soldOutY)
    } else {
      let currentY = ITEM_AREA_TOP
      for (let i = 0; i < cardStates.length; i++) {
        const card = cardStates[i]
        const item = getItemById(card.itemId)
        if (!item) continue

        const cardLeft = CONTENT_LEFT
        const cardRight = CONTENT_RIGHT
        const cardWidth = CONTENT_W

        const isFlashing = lastUnaffordableClick && lastUnaffordableClick.itemId === card.itemId && (timestamp - lastUnaffordableClick.timestamp) < 400
        drawCompactCard(ctx, item, i, cardLeft, currentY, cardWidth, card.selected, isFlashing || false)
        currentY += CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2 + CARD_GAP
      }

      // Clear unaffordable flash after timeout
      if (lastUnaffordableClick && (timestamp - lastUnaffordableClick.timestamp) >= 400) {
        lastUnaffordableClick = null
      }

    }

    // Gold display
    ctx.font = '12px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const inv = context.getInventory()
    ctx.fillText(`◈ ${inv.gold} gold`, CONTENT_LEFT, GOLD_DISPLAY_Y)

    // Leave button
    const leaveBgAlpha = hoveredElement === 'leave' ? 0.15 : 0
    ctx.fillStyle = `rgba(139, 107, 85, ${leaveBgAlpha})`
    ctx.fillRect(0, LEAVE_Y - LEAVE_HIT_H / 2, PANEL_W, LEAVE_HIT_H)

    ctx.font = '12px monospace'
    ctx.fillStyle = hoveredElement === 'leave' ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('Leave', CONTENT_RIGHT, LEAVE_Y)

    ctx.restore()
  }

  function drawCompactCard(
    ctx: CanvasRenderingContext2D,
    item: any,
    cardIndex: number,
    left: number,
    top: number,
    width: number,
    isSelected: boolean,
    isFlashing: boolean = false
  ): void {
    const height = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
    const inv = context.getInventory()
    const affordable = canAfford(item)

    // Card background with rounded corners
    const radius = 4
    ctx.fillStyle = isFlashing ? '#4a2a2a' : colors.shopCardBg
    if (isFlashing) {
      ctx.strokeStyle = colors.shopUnaffordable
      ctx.lineWidth = 2
    } else {
      ctx.strokeStyle = colors.shopBorder
      ctx.globalAlpha = 0.4  // Reduce border contrast
      ctx.lineWidth = 1
    }
    ctx.beginPath()
    ctx.moveTo(left + 1 + radius, top + 1)
    ctx.lineTo(left + width - 1 - radius, top + 1)
    ctx.arcTo(left + width - 1, top + 1, left + width - 1, top + 1 + radius, radius)
    ctx.lineTo(left + width - 1, top + height - 1 - radius)
    ctx.arcTo(left + width - 1, top + height - 1, left + width - 1 - radius, top + height - 1, radius)
    ctx.lineTo(left + 1 + radius, top + height - 1)
    ctx.arcTo(left + 1, top + height - 1, left + 1, top + height - 1 - radius, radius)
    ctx.lineTo(left + 1, top + 1 + radius)
    ctx.arcTo(left + 1, top + 1, left + 1 + radius, top + 1, radius)
    ctx.fill()
    ctx.stroke()
    if (!isFlashing) {
      ctx.globalAlpha = 1  // Restore full opacity
    }

    // Icon (vertically centered)
    ctx.font = `${CARD_ICON_SIZE_COMPACT}px monospace`
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const centerY = top + height / 2
    ctx.fillText(
      iconGlyph(item.iconType),
      left + 12 + CARD_ICON_SIZE_COMPACT / 2,
      centerY
    )

    // Name and description (vertically centered in card)
    const textLeft = left + 52
    const textRight = left + width - 12
    const nameDescHeight = 13 + 10 + 2  // name height + desc height + gap
    const nameStartY = centerY - nameDescHeight / 2

    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(item.name, textLeft, nameStartY)

    // Description line (small italic text)
    ctx.font = 'italic 10px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textBaseline = 'top'
    const descY = nameStartY + 13 + 2
    ctx.fillText(item.description, textLeft, descY)

    // Price badge or Buy button (on the right side)
    if (isSelected) {
      // Show Buy button on the right with curved borders
      const btnWidth = 55
      const btnHeight = BUY_BUTTON_HEIGHT
      const btnLeft = textRight - btnWidth
      const btnTop = centerY - btnHeight / 2

      const buyHovered = hoveredElement === `buy-${cardIndex}`
      ctx.fillStyle = buyHovered ? 'rgba(122, 90, 26, 0.35)' : 'rgba(122, 90, 26, 0.2)'
      ctx.strokeStyle = colors.roomShop
      ctx.lineWidth = 1

      // Draw rounded rectangle for button
      const radius = 4
      ctx.beginPath()
      ctx.moveTo(btnLeft + radius, btnTop)
      ctx.lineTo(btnLeft + btnWidth - radius, btnTop)
      ctx.arcTo(btnLeft + btnWidth, btnTop, btnLeft + btnWidth, btnTop + radius, radius)
      ctx.lineTo(btnLeft + btnWidth, btnTop + btnHeight - radius)
      ctx.arcTo(btnLeft + btnWidth, btnTop + btnHeight, btnLeft + btnWidth - radius, btnTop + btnHeight, radius)
      ctx.lineTo(btnLeft + radius, btnTop + btnHeight)
      ctx.arcTo(btnLeft, btnTop + btnHeight, btnLeft, btnTop + btnHeight - radius, radius)
      ctx.lineTo(btnLeft, btnTop + radius)
      ctx.arcTo(btnLeft, btnTop, btnLeft + radius, btnTop, radius)
      ctx.fill()
      ctx.stroke()

      // "Buy" text and price inside button
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const priceText = `${item.shopPrice}◈`
      ctx.fillText(`Buy ${priceText}`, btnLeft + btnWidth / 2, btnTop + btnHeight / 2)
    } else {
      // Show price badge on the right (vertically centered), aligned with button position
      // Position it where it will appear inside the Buy button to avoid apparent movement
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = affordable ? colors.gold : colors.shopUnaffordable
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${item.shopPrice}◈`, textRight - 8, centerY)
    }
  }

  function handleClick(x: number, y: number): void {
    if (completed) return

    // Check Leave button
    if (isInLeaveButton(x, y)) {
      signalComplete('left')
      return
    }

    // Check card interaction
    const cardIdx = findCardAt(x, y)
    if (cardIdx >= 0) {
      const card = cardStates[cardIdx]
      const item = getItemById(card.itemId)
      if (!item) return

      if (card.selected) {
        // Card is selected - check if Buy button clicked
        const cardHeight = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
        const cardLeft = CONTENT_LEFT
        const cardWidth = CONTENT_W
        const textRight = cardLeft + cardWidth - 12
        const btnWidth = 55
        const btnHeight = BUY_BUTTON_HEIGHT
        const cardTop = ITEM_AREA_TOP + cardIdx * (cardHeight + CARD_GAP)
        const centerY = cardTop + cardHeight / 2
        const btnLeft = textRight - btnWidth
        const btnTop = centerY - btnHeight / 2

        if (x >= btnLeft && x <= textRight && y >= btnTop && y <= btnTop + btnHeight) {
          if (canAfford(item)) {
            // Purchase
            const inv = context.getInventory()
            context.setInventory({
              ...inv,
              gold: inv.gold - (item.shopPrice ?? 0),
              items: acquireItem(inv, { ...item, quantity: 1 }).items,
            })

            // Remove from stock
            const newStock = stock.filter(id => id !== item.id)
            const dungeonState = context.getDungeonState()
            const newCells = dungeonState.grid.cells.map(row => [...row])
            const currentCell = newCells[dungeonState.pip.row][dungeonState.pip.col]
            if (currentCell) {
              newCells[dungeonState.pip.row][dungeonState.pip.col] = {
                ...currentCell,
                shopStock: newStock,
              }
            }
            context.setDungeonState({ ...dungeonState, grid: { ...dungeonState.grid, cells: newCells } })

            // Update local state
            stock.splice(stock.indexOf(item.id), 1)
            cardStates.splice(cardIdx, 1)
            lastPurchaseConfirmation = { itemName: item.name, timestamp: performance.now() }

            if (stock.length === 0) {
              cardStates = []
            }
          } else {
            lastUnaffordableClick = { itemId: card.itemId, timestamp: performance.now() }
          }
          return
        }
      } else {
        // Card is not selected - check affordability before selecting
        if (canAfford(item)) {
          // Deselect all others and select this one
          cardStates = cardStates.map((cs, i) => ({
            ...cs,
            selected: i === cardIdx,
          }))
        } else {
          // Cannot afford - show red flash feedback
          lastUnaffordableClick = { itemId: card.itemId, timestamp: performance.now() }
        }
        return
      }
    } else {
      // Clicked off all cards - deselect any selected card
      if (cardStates.some(cs => cs.selected)) {
        cardStates = cardStates.map(cs => ({
          ...cs,
          selected: false,
        }))
        return
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (isInLeaveButton(x, y)) {
      hoveredElement = 'leave'
    } else {
      hoveredElement = null

      const cardIdx = findCardAt(x, y)
      if (cardIdx >= 0) {
        const card = cardStates[cardIdx]
        if (card.selected) {
          const cardHeight = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
          const cardLeft = CONTENT_LEFT
          const cardWidth = CONTENT_W
          const textRight = cardLeft + cardWidth - 12
          const btnWidth = 55
          const btnHeight = BUY_BUTTON_HEIGHT
          const cardTop = ITEM_AREA_TOP + cardIdx * (cardHeight + CARD_GAP)
          const centerY = cardTop + cardHeight / 2
          const btnLeft = textRight - btnWidth
          const btnTop = centerY - btnHeight / 2

          if (x >= btnLeft && x <= textRight && y >= btnTop && y <= btnTop + btnHeight) {
            hoveredElement = `buy-${cardIdx}`
          }
        }
      }
    }
  }

  return {
    draw,
    handleClick,
    handlePointerMove,
    mapView,
  }
}
