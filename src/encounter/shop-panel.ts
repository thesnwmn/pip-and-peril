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

const HEADER_TOP = PANEL_TOP + 20
const MERCHANT_CY = HEADER_TOP
const FLAVOR_CY = HEADER_TOP + 18
const RULE_Y = HEADER_TOP + 32

const CARD_ICON_SIZE_COMPACT = 32
const CARD_ICON_SIZE_EXPANDED = 48

const ITEM_AREA_TOP = RULE_Y + 12
const CARD_PADDING = 6
const CARD_GAP = 6
const MAX_ITEMS = 3

const GOLD_DISPLAY_Y = LOGICAL_H - 24
const LEAVE_HIT_H = 44
const LEAVE_Y = GOLD_DISPLAY_Y

interface CardState {
  itemId: string
  expanded: boolean
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

  let cardStates: CardState[] = stock.map(itemId => ({ itemId, expanded: false }))
  let hoveredElement: string | null = null
  let completed = false
  let lastPurchaseConfirmation: PurchaseConfirmation | null = null
  let lastAffordanceError: AffordanceError | null = null

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

    const itemAreaHeight = LOGICAL_H - ITEM_AREA_TOP - (GOLD_DISPLAY_Y - LOGICAL_H + LEAVE_HIT_H) - 12
    const availableHeight = itemAreaHeight
    const itemHeight = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2

    let currentY = ITEM_AREA_TOP
    for (let i = 0; i < cardStates.length; i++) {
      const card = cardStates[i]
      const item = getItemById(card.itemId)
      if (!item) continue

      let cardHeight = itemHeight
      if (card.expanded) {
        cardHeight = CARD_ICON_SIZE_EXPANDED + CARD_PADDING * 2 + 60
      }

      if (y >= currentY && y < currentY + cardHeight && x >= 12 && x < PANEL_W - 12) {
        return i
      }

      currentY += cardHeight + CARD_GAP
    }
    return -1
  }

  function isInLeaveButton(y: number): boolean {
    return y >= LEAVE_Y - LEAVE_HIT_H / 2 && y <= LEAVE_Y + LEAVE_HIT_H / 2
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
    ctx.fillText(merchantName, 16, MERCHANT_CY)

    // Flavor line
    ctx.font = 'italic 12px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText(merchantEntry.flavor, 16, FLAVOR_CY)

    // Rule line
    ctx.strokeStyle = colors.shopBorder
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(12, RULE_Y)
    ctx.lineTo(PANEL_W - 12, RULE_Y)
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

        const cardLeft = 12
        const cardRight = PANEL_W - 12
        const cardWidth = cardRight - cardLeft

        if (card.expanded) {
          drawExpandedCard(ctx, item, i, cardLeft, currentY, cardWidth, timestamp)
          currentY += CARD_ICON_SIZE_EXPANDED + CARD_PADDING * 2 + 60 + CARD_GAP
        } else {
          drawCompactCard(ctx, item, cardLeft, currentY, cardWidth)
          currentY += CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2 + CARD_GAP
        }
      }

      // Purchase confirmation feedback
      if (lastPurchaseConfirmation) {
        const elapsed = timestamp - lastPurchaseConfirmation.timestamp
        if (elapsed < 2000) {
          const alpha = Math.max(0, 1 - (elapsed - 1800) / 200)
          ctx.globalAlpha = alpha
          ctx.font = '11px monospace'
          ctx.fillStyle = colors.textMuted
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(
            `Bought. ${lastPurchaseConfirmation.itemName} added to satchel.`,
            16,
            ITEM_AREA_TOP + 2
          )
          ctx.globalAlpha = 1
        } else {
          lastPurchaseConfirmation = null
        }
      }

      // Affordance error feedback
      if (lastAffordanceError) {
        const elapsed = timestamp - lastAffordanceError.timestamp
        if (elapsed < 1500) {
          const alpha = Math.max(0, 1 - (elapsed - 1200) / 300)
          ctx.globalAlpha = alpha
          ctx.font = '11px monospace'
          ctx.fillStyle = colors.shopUnaffordable
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'

          let currentY = ITEM_AREA_TOP
          for (let i = 0; i < cardStates.length; i++) {
            const cs = cardStates[i]
            if (cs.itemId === lastAffordanceError.itemId) {
              const item = getItemById(cs.itemId)
              if (item) {
                ctx.fillText(
                  'Not enough coin.',
                  PANEL_W / 2,
                  currentY - 8
                )
              }
              break
            }
            const item = getItemById(cs.itemId)
            if (item) {
              const cardHeight = cs.expanded
                ? CARD_ICON_SIZE_EXPANDED + CARD_PADDING * 2 + 60
                : CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
              currentY += cardHeight + CARD_GAP
            }
          }
          ctx.globalAlpha = 1
        } else {
          lastAffordanceError = null
        }
      }
    }

    // Gold display
    ctx.font = '12px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const inv = context.getInventory()
    ctx.fillText(`◈ ${inv.gold} gold`, 16, GOLD_DISPLAY_Y)

    // Leave button
    const leaveBgAlpha = hoveredElement === 'leave' ? 0.15 : 0
    ctx.fillStyle = `rgba(139, 107, 85, ${leaveBgAlpha})`
    ctx.fillRect(0, LEAVE_Y - LEAVE_HIT_H / 2, PANEL_W, LEAVE_HIT_H)

    ctx.font = '12px monospace'
    ctx.fillStyle = hoveredElement === 'leave' ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('Leave', PANEL_W - 16, LEAVE_Y)

    ctx.restore()
  }

  function drawCompactCard(
    ctx: CanvasRenderingContext2D,
    item: any,
    left: number,
    top: number,
    width: number
  ): void {
    const height = CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
    const inv = context.getInventory()
    const affordable = canAfford(item)

    // Card background with rounded corners
    const radius = 4
    ctx.fillStyle = colors.shopCardBg
    ctx.strokeStyle = colors.shopBorder
    ctx.lineWidth = 1
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

    // Icon
    ctx.font = `${CARD_ICON_SIZE_COMPACT}px monospace`
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      iconGlyph(item.iconType),
      left + 12 + CARD_ICON_SIZE_COMPACT / 2,
      top + height / 2
    )

    // Name and price on the right (vertically centered)
    const centerY = top + height / 2
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, left + 52, centerY)

    // Price badge (vertically centered)
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = affordable ? colors.gold : colors.shopUnaffordable
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `${item.shopPrice}◈`,
      left + width - 12,
      centerY
    )
  }

  function drawExpandedCard(
    ctx: CanvasRenderingContext2D,
    item: any,
    cardIndex: number,
    left: number,
    top: number,
    width: number,
    timestamp: DOMHighResTimeStamp
  ): void {
    const height = CARD_ICON_SIZE_EXPANDED + CARD_PADDING * 2 + 60
    const inv = context.getInventory()
    const affordable = canAfford(item)

    // Card background with rounded corners
    const radius = 4
    ctx.fillStyle = colors.shopCardBg
    ctx.strokeStyle = colors.shopBorder
    ctx.lineWidth = 1
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

    const contentLeft = left + 12
    const contentRight = left + width - 12

    // Icon
    ctx.font = `${CARD_ICON_SIZE_EXPANDED}px monospace`
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      iconGlyph(item.iconType),
      left + width / 2,
      top + CARD_PADDING + CARD_ICON_SIZE_EXPANDED / 2
    )

    // Name
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(item.name, contentLeft, top + CARD_ICON_SIZE_EXPANDED + 16)

    // Price
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = affordable ? colors.gold : colors.shopUnaffordable
    ctx.textAlign = 'right'
    ctx.fillText(
      `${item.shopPrice}◈`,
      contentRight,
      top + CARD_ICON_SIZE_EXPANDED + 16
    )

    // Description
    ctx.font = 'italic 11px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'left'
    ctx.fillText(item.description, contentLeft, top + CARD_ICON_SIZE_EXPANDED + 32)

    // Buy button
    const buyBtnTop = top + CARD_ICON_SIZE_EXPANDED + 48
    const buyBtnLeft = contentLeft
    const buyBtnWidth = (contentRight - contentLeft - 8) / 2
    const buyBtnHeight = 32

    const buyHovered = hoveredElement === `buy-${cardIndex}`
    ctx.fillStyle = buyHovered ? 'rgba(122, 90, 26, 0.35)' : 'rgba(122, 90, 26, 0.2)'
    ctx.strokeStyle = colors.roomShop
    ctx.lineWidth = 1
    const btnRadius = 3
    ctx.beginPath()
    ctx.moveTo(buyBtnLeft + btnRadius, buyBtnTop)
    ctx.lineTo(buyBtnLeft + buyBtnWidth - btnRadius, buyBtnTop)
    ctx.arcTo(buyBtnLeft + buyBtnWidth, buyBtnTop, buyBtnLeft + buyBtnWidth, buyBtnTop + btnRadius, btnRadius)
    ctx.lineTo(buyBtnLeft + buyBtnWidth, buyBtnTop + buyBtnHeight - btnRadius)
    ctx.arcTo(buyBtnLeft + buyBtnWidth, buyBtnTop + buyBtnHeight, buyBtnLeft + buyBtnWidth - btnRadius, buyBtnTop + buyBtnHeight, btnRadius)
    ctx.lineTo(buyBtnLeft + btnRadius, buyBtnTop + buyBtnHeight)
    ctx.arcTo(buyBtnLeft, buyBtnTop + buyBtnHeight, buyBtnLeft, buyBtnTop + buyBtnHeight - btnRadius, btnRadius)
    ctx.lineTo(buyBtnLeft, buyBtnTop + btnRadius)
    ctx.arcTo(buyBtnLeft, buyBtnTop, buyBtnLeft + btnRadius, buyBtnTop, btnRadius)
    ctx.fill()
    ctx.stroke()

    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `Buy (${item.shopPrice}◈)`,
      buyBtnLeft + buyBtnWidth / 2,
      buyBtnTop + buyBtnHeight / 2
    )

    // Close button (×)
    const closeBtnLeft = buyBtnLeft + buyBtnWidth + 8
    const closeBtnWidth = buyBtnWidth

    const closeHovered = hoveredElement === `close-${cardIndex}`
    ctx.fillStyle = closeHovered ? 'rgba(139, 107, 85, 0.15)' : 'transparent'
    ctx.fillRect(closeBtnLeft, buyBtnTop, closeBtnWidth, buyBtnHeight)

    ctx.font = '12px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('×', closeBtnLeft + closeBtnWidth / 2, buyBtnTop + buyBtnHeight / 2)
  }

  function handleClick(x: number, y: number): void {
    if (completed) return

    // Check Leave button
    if (isInLeaveButton(y)) {
      signalComplete('left')
      return
    }

    // Check card interaction
    const cardIdx = findCardAt(x, y)
    if (cardIdx >= 0) {
      const card = cardStates[cardIdx]
      const item = getItemById(card.itemId)
      if (!item) return

      if (card.expanded) {
        // Check for Buy or Close buttons
        const cardTop = getCardTop(cardIdx)
        const cardLeft = 12
        const cardWidth = PANEL_W - 24
        const contentLeft = cardLeft + 12
        const contentRight = cardLeft + cardWidth - 12

        const buyBtnTop = cardTop + CARD_ICON_SIZE_EXPANDED + 48
        const buyBtnLeft = contentLeft
        const buyBtnWidth = (contentRight - contentLeft - 8) / 2
        const buyBtnHeight = 32

        // Buy button
        if (
          x >= buyBtnLeft && x <= buyBtnLeft + buyBtnWidth &&
          y >= buyBtnTop && y <= buyBtnTop + buyBtnHeight
        ) {
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
          }
          return
        }

        // Close button
        const closeBtnLeft = buyBtnLeft + buyBtnWidth + 8
        if (
          x >= closeBtnLeft && x <= closeBtnLeft + buyBtnWidth &&
          y >= buyBtnTop && y <= buyBtnTop + buyBtnHeight
        ) {
          cardStates[cardIdx] = { ...card, expanded: false }
          return
        }
      } else {
        // Try to expand
        if (canAfford(item)) {
          // Collapse others
          cardStates = cardStates.map((cs, i) => ({
            ...cs,
            expanded: i === cardIdx,
          }))
        } else {
          lastAffordanceError = { itemId: item.id, timestamp: performance.now() }
        }
        return
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    const prevHovered = hoveredElement

    if (isInLeaveButton(y)) {
      hoveredElement = 'leave'
    } else {
      hoveredElement = null

      const cardIdx = findCardAt(x, y)
      if (cardIdx >= 0) {
        const card = cardStates[cardIdx]
        if (card.expanded) {
          const cardTop = getCardTop(cardIdx)
          const cardLeft = 12
          const cardWidth = PANEL_W - 24
          const contentLeft = cardLeft + 12
          const contentRight = cardLeft + cardWidth - 12

          const buyBtnTop = cardTop + CARD_ICON_SIZE_EXPANDED + 48
          const buyBtnLeft = contentLeft
          const buyBtnWidth = (contentRight - contentLeft - 8) / 2
          const buyBtnHeight = 32

          if (
            x >= buyBtnLeft && x <= buyBtnLeft + buyBtnWidth &&
            y >= buyBtnTop && y <= buyBtnTop + buyBtnHeight
          ) {
            hoveredElement = `buy-${cardIdx}`
          } else {
            const closeBtnLeft = buyBtnLeft + buyBtnWidth + 8
            if (
              x >= closeBtnLeft && x <= closeBtnLeft + buyBtnWidth &&
              y >= buyBtnTop && y <= buyBtnTop + buyBtnHeight
            ) {
              hoveredElement = `close-${cardIdx}`
            }
          }
        }
      }
    }
  }

  function getCardTop(cardIdx: number): number {
    let currentY = ITEM_AREA_TOP
    for (let i = 0; i < cardIdx; i++) {
      const card = cardStates[i]
      const item = getItemById(card.itemId)
      if (!item) continue

      const cardHeight = card.expanded
        ? CARD_ICON_SIZE_EXPANDED + CARD_PADDING * 2 + 60
        : CARD_ICON_SIZE_COMPACT + CARD_PADDING * 2 + 2
      currentY += cardHeight + CARD_GAP
    }
    return currentY
  }

  return {
    draw,
    handleClick,
    handlePointerMove,
    mapView,
  }
}
