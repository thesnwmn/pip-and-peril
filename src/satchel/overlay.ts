import { colors } from '../colors'
import type { Inventory, Item } from './types'
import type { DungeonState } from '../navigation/dungeon-state'
import { chebyshev } from '../navigation/dungeon-state'
import { PANEL_TOP } from '../screens/game-layout'
import { iconGlyph } from './icon'

// Overlay occupies the map tile zone: MAP_X (10) to MAP_X + MAP_W (370), width 360 px.
// Must match MAP_X and MAP_W in src/map/renderer.ts.
const MAP_X = 10
const MAP_W = 360
const LOGICAL_H = 844
const ANIM_DURATION = 300

// Satchel button (bottom-right of the panel zone, 44 × 44 tap target, 8 px margin)
export const SATCHEL_BTN_SIZE = 44
export const SATCHEL_BTN_X = MAP_X + MAP_W - 8 - SATCHEL_BTN_SIZE  // 318
export const SATCHEL_BTN_Y = LOGICAL_H - 8 - SATCHEL_BTN_SIZE       // 792

// Overlay starts at the nav panel top so it covers it completely
export const OVERLAY_TOP = PANEL_TOP

const HEADER_H = 44
const TAB_H = 40
const TAB_TOP = LOGICAL_H - TAB_H                            // 804
const CONTENT_Y = OVERLAY_TOP + HEADER_H                     // 482
const CONTENT_H = LOGICAL_H - OVERLAY_TOP - HEADER_H - TAB_H // 322

// Content inner padding
const PAD = 16

// Close button — top-right of the overlay header, 44 × 44 tap area
const CLOSE_HIT = 44

// Tab geometry
const TAB_W = MAP_W / 4  // 90

// Item grid
const ITEM_CELL = 64
const ITEM_GAP = 8
const ITEM_COLS = 3

export type SatchelTab = 'pouch' | 'journal' | 'tally' | 'map'
const TABS: SatchelTab[] = ['pouch', 'journal', 'tally', 'map']
const TAB_LABELS: Record<SatchelTab, string> = {
  pouch: 'POUCH',
  journal: 'JRNL',
  tally: 'TALLY',
  map: 'MAP',
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function drawRR(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const c = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
  ctx.beginPath()
  if (c.roundRect) c.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

// ─── Satchel button ─────────────────────────────────────────────────────────

export function drawSatchelButton(
  ctx: CanvasRenderingContext2D,
  inCombat: boolean,
  isHovered: boolean,
): void {
  ctx.save()
  ctx.globalAlpha = inCombat ? 0.4 : 1

  // Background
  drawRR(ctx, SATCHEL_BTN_X, SATCHEL_BTN_Y, SATCHEL_BTN_SIZE, SATCHEL_BTN_SIZE, 8)
  ctx.fillStyle = isHovered ? colors.satchelStitch : colors.satchelLeather
  ctx.fill()
  ctx.strokeStyle = colors.satchelBrass
  ctx.lineWidth = 1.5
  ctx.stroke()

  const cx = SATCHEL_BTN_X + SATCHEL_BTN_SIZE / 2
  const cy = SATCHEL_BTN_Y + SATCHEL_BTN_SIZE / 2

  // Bag body
  const bx = cx - 11
  const by = cy - 2
  drawRR(ctx, bx, by, 22, 16, 3)
  ctx.fillStyle = colors.satchelCanvas
  ctx.fill()
  ctx.strokeStyle = colors.satchelBrass
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Flap
  const fx = cx - 9
  const fy = by - 7
  drawRR(ctx, fx, fy, 18, 10, 3)
  ctx.fillStyle = colors.satchelLeather
  ctx.fill()
  ctx.strokeStyle = colors.satchelBrass
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Clasp dot
  ctx.fillStyle = colors.satchelBrass
  ctx.beginPath()
  ctx.arc(cx, by + 1, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Handle arc
  ctx.strokeStyle = colors.satchelCanvas
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, fy - 1, 5, Math.PI, 0)
  ctx.stroke()

  ctx.restore()
}

export function isInSatchelButton(x: number, y: number): boolean {
  return (
    x >= SATCHEL_BTN_X && x <= SATCHEL_BTN_X + SATCHEL_BTN_SIZE &&
    y >= SATCHEL_BTN_Y && y <= SATCHEL_BTN_Y + SATCHEL_BTN_SIZE
  )
}

// ─── Overlay drawing helpers ─────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, hovered: string | null): void {
  const midY = OVERLAY_TOP + HEADER_H / 2

  ctx.fillStyle = colors.satchelLeather
  ctx.fillRect(MAP_X, OVERLAY_TOP, MAP_W, HEADER_H)

  // Stitched borders — top seam and bottom separator
  ctx.strokeStyle = colors.satchelBrass
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(MAP_X, OVERLAY_TOP)
  ctx.lineTo(MAP_X + MAP_W, OVERLAY_TOP)
  ctx.stroke()

  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, OVERLAY_TOP + HEADER_H)
  ctx.lineTo(MAP_X + MAP_W, OVERLAY_TOP + HEADER_H)
  ctx.stroke()

  // Title
  ctx.font = 'bold 14px monospace'
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText("Pip's Satchel", MAP_X + PAD, midY)

  // Close button ×
  const cx = MAP_X + MAP_W - CLOSE_HIT / 2
  ctx.font = 'bold 18px monospace'
  ctx.fillStyle = hovered === 'close' ? colors.textPrimary : colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('×', cx, midY)
}

function drawTabStrip(ctx: CanvasRenderingContext2D, active: SatchelTab): void {
  ctx.fillStyle = colors.satchelStitch
  ctx.fillRect(MAP_X, TAB_TOP, MAP_W, TAB_H)

  // Top border
  ctx.strokeStyle = colors.satchelBrass
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X, TAB_TOP)
  ctx.lineTo(MAP_X + MAP_W, TAB_TOP)
  ctx.stroke()

  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i]
    const tx = MAP_X + i * TAB_W
    const isActive = tab === active
    const midX = tx + TAB_W / 2
    const midY = TAB_TOP + TAB_H / 2 - (isActive ? 1 : 0)

    if (isActive) {
      ctx.fillStyle = 'rgba(160,120,40,0.15)'
      ctx.fillRect(tx, TAB_TOP, TAB_W, TAB_H)
    }

    ctx.font = '11px monospace'
    ctx.fillStyle = isActive ? colors.satchelBrass : colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(TAB_LABELS[tab], midX, midY)

    if (isActive) {
      // Underline indicator
      ctx.strokeStyle = colors.satchelBrass
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(tx + 8, TAB_TOP + TAB_H - 6)
      ctx.lineTo(tx + TAB_W - 8, TAB_TOP + TAB_H - 6)
      ctx.stroke()
    }

    // Vertical separator between tabs
    if (i < TABS.length - 1) {
      ctx.strokeStyle = colors.satchelBrass
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tx + TAB_W, TAB_TOP + 8)
      ctx.lineTo(tx + TAB_W, TAB_TOP + TAB_H - 8)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}

function drawContentArea(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = colors.satchelCanvas
  ctx.fillRect(MAP_X, CONTENT_Y, MAP_W, CONTENT_H)
}

// ─── Pouch tab ───────────────────────────────────────────────────────────────

function drawItemCell(
  ctx: CanvasRenderingContext2D,
  item: Item,
  x: number,
  y: number,
  isHovered: boolean = false,
): void {
  const isCombatOnly = item.usableInCombat && !item.usableInNav

  drawRR(ctx, x, y, ITEM_CELL, ITEM_CELL, 4)
  ctx.globalAlpha = isCombatOnly ? 0.4 : 1
  ctx.fillStyle = isHovered && !isCombatOnly ? '#c9a070' : '#b89060'
  ctx.fill()
  ctx.strokeStyle = isHovered && !isCombatOnly ? colors.gold : colors.satchelBrass
  ctx.lineWidth = isHovered && !isCombatOnly ? 2 : 1.5
  ctx.stroke()

  // Draw a simple icon based on iconType
  const cx = x + ITEM_CELL / 2
  const cy = y + ITEM_CELL / 2
  ctx.font = '24px monospace'
  ctx.fillStyle = colors.satchelInk
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(iconGlyph(item.iconType), cx, cy)

  // Quantity badge (only if > 1)
  if (item.quantity > 1) {
    const bx = x + ITEM_CELL - 14
    const by = y + ITEM_CELL - 14
    ctx.fillStyle = colors.satchelLeather
    ctx.beginPath()
    ctx.arc(bx + 7, by + 7, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = 'bold 10px monospace'
    ctx.fillStyle = colors.satchelBrass
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(item.quantity), bx + 7, by + 7)
  }

  // Combat-only label
  if (isCombatOnly) {
    ctx.globalAlpha = 0.8
    ctx.font = '9px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('combat only', cx, y + ITEM_CELL + 10)
  }

  ctx.globalAlpha = 1
}


function drawPouchTab(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
  itemHitRects: Array<{ x: number; y: number; w: number; h: number; item: Item }>,
  hovered: string | null,
): void {
  let y = CONTENT_Y + PAD

  // Gold row
  const goldLabelX = MAP_X + PAD
  const goldValueX = MAP_X + PAD + 38

  ctx.font = '12px monospace'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Gold', goldLabelX, y + 10)

  ctx.font = 'bold 16px monospace'
  ctx.fillStyle = colors.gold
  ctx.textAlign = 'left'
  ctx.fillText(`◈ ${inventory.gold}`, goldValueX, y + 10)

  y += 28

  // Divider
  ctx.strokeStyle = colors.satchelBrass
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MAP_X + PAD, y)
  ctx.lineTo(MAP_X + MAP_W - PAD, y)
  ctx.stroke()
  ctx.globalAlpha = 1

  y += 16

  // Items
  if (inventory.items.length === 0) {
    // Empty state
    ctx.font = 'italic 12px monospace'
    ctx.fillStyle = colors.satchelInk
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const emptyMsg = '"Nothing in here yet. Just crumbs and old string."'
    const maxW = MAP_W - PAD * 2
    const words = emptyMsg.split(' ')
    let line = ''
    let lineY = y
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width <= maxW) {
        line = test
      } else {
        ctx.fillText(line, MAP_X + PAD, lineY)
        lineY += 16
        line = word
      }
    }
    if (line) ctx.fillText(line, MAP_X + PAD, lineY)
  } else {
    // Item grid — 3 columns (also build hit rects)
    itemHitRects = []
    const gridX = MAP_X + PAD
    for (let i = 0; i < inventory.items.length; i++) {
      const col = i % ITEM_COLS
      const row = Math.floor(i / ITEM_COLS)
      const cx = gridX + col * (ITEM_CELL + ITEM_GAP)
      const cy = y + row * (ITEM_CELL + ITEM_GAP)
      if (cy + ITEM_CELL > TAB_TOP - 4) break  // clip to content area
      const item = inventory.items[i]
      const isHovered = hovered === `item-${item.id}`
      drawItemCell(ctx, item, cx, cy, isHovered)
      if (item.usableInNav) {
        itemHitRects.push({ x: cx, y: cy, w: ITEM_CELL, h: ITEM_CELL, item })
      }
    }
  }
}

// ─── Journal tab ─────────────────────────────────────────────────────────────

function drawJournalTab(ctx: CanvasRenderingContext2D): void {
  ctx.font = 'italic 12px monospace'
  ctx.fillStyle = colors.satchelInk
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const lines = [
    '"Pip flips through the pages. Blank.',
    'She taps her pencil against her chin."',
  ]
  const y = CONTENT_Y + PAD
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], MAP_X + PAD, y + i * 18)
  }
}

// ─── Tally tab ───────────────────────────────────────────────────────────────

function drawTallyMark(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  midY: number,
): void {
  if (value > 20) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(value), x, midY)
    return
  }
  if (value === 0) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('0', x, midY)
    return
  }

  const MARK_W = 6
  const MARK_H = 14
  const MARK_GAP = 3
  const GROUP_GAP = 8

  ctx.save()
  ctx.strokeStyle = colors.satchelInk
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'

  const top = midY - MARK_H / 2
  const bottom = midY + MARK_H / 2
  let drawX = x
  let count = 0

  while (count < value) {
    const groupStart = count
    const groupEnd = Math.min(count + 5, value)
    const groupCount = groupEnd - groupStart

    for (let i = 0; i < Math.min(groupCount, 4); i++) {
      ctx.beginPath()
      ctx.moveTo(drawX + i * (MARK_W + MARK_GAP), top)
      ctx.lineTo(drawX + i * (MARK_W + MARK_GAP), bottom)
      ctx.stroke()
    }

    if (groupCount === 5) {
      // Diagonal cross-bar
      ctx.beginPath()
      ctx.moveTo(drawX - 2, bottom + 2)
      ctx.lineTo(drawX + 3 * (MARK_W + MARK_GAP) + MARK_W + 2, top - 2)
      ctx.stroke()
      drawX += 4 * (MARK_W + MARK_GAP) + GROUP_GAP
    } else {
      drawX += (groupCount - 1) * (MARK_W + MARK_GAP) + MARK_W + GROUP_GAP
    }

    count = groupEnd
  }

  ctx.restore()
}

function drawTallyTab(
  ctx: CanvasRenderingContext2D,
  dungeonState: DungeonState,
): void {
  const depth = chebyshev(dungeonState.pip, dungeonState.startPos)
  const rows: Array<{ label: string; value: number }> = [
    { label: 'Depth',          value: depth },
    { label: 'Rooms entered',  value: dungeonState.roomsEntered },
    { label: 'Enemies felled', value: dungeonState.enemiesDefeated },
  ]

  const LABEL_COL_W = 110
  const rowH = 34
  let y = CONTENT_Y + PAD + 8

  ctx.font = '12px monospace'
  ctx.fillStyle = colors.satchelInk

  for (const row of rows) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(row.label, MAP_X + PAD, y + rowH / 2)

    const valueX = MAP_X + PAD + LABEL_COL_W
    drawTallyMark(ctx, row.value, valueX, y + rowH / 2)

    // Light row divider
    ctx.strokeStyle = colors.satchelBrass
    ctx.globalAlpha = 0.2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MAP_X + PAD, y + rowH)
    ctx.lineTo(MAP_X + MAP_W - PAD, y + rowH)
    ctx.stroke()
    ctx.globalAlpha = 1

    y += rowH + 4
  }
}

// ─── Map tab ─────────────────────────────────────────────────────────────────

function drawMapTab(ctx: CanvasRenderingContext2D): void {
  ctx.font = 'italic 12px monospace'
  ctx.fillStyle = colors.satchelInk
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const lines = [
    '"The map pocket is empty.',
    'Pip makes a mental note to start sketching."',
  ]
  const y = CONTENT_Y + PAD
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], MAP_X + PAD, y + i * 18)
  }
}

// ─── Public overlay controller ───────────────────────────────────────────────

export interface SatchelOverlay {
  isOpen(): boolean
  open(): void
  close(): void
  draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp, inventory: Inventory, dungeonState: DungeonState): void
  handleClick(x: number, y: number): boolean
  handlePointerMove(x: number, y: number): boolean
  _getTab(): SatchelTab
}

export interface SatchelOverlayCallbacks {
  onItemUse?: (item: Item) => void
}

export function createSatchelOverlay(callbacks?: SatchelOverlayCallbacks): SatchelOverlay {
  let opened = false
  let animStartTime: number | null = null
  let lastTimestamp: DOMHighResTimeStamp = 0
  let activeTab: SatchelTab = 'pouch'
  let hovered: string | null = null
  let itemHitRects: Array<{ x: number; y: number; w: number; h: number; item: Item }> = []

  function open(): void {
    opened = true
    animStartTime = null  // set on first draw
    activeTab = 'pouch'
    hovered = null
    itemHitRects = []
  }

  function close(): void {
    opened = false
    animStartTime = null
    hovered = null
  }

  function isAnimating(): boolean {
    return animStartTime !== null && (lastTimestamp - animStartTime) < ANIM_DURATION
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    timestamp: DOMHighResTimeStamp,
    inventory: Inventory,
    dungeonState: DungeonState,
  ): void {
    lastTimestamp = timestamp
    if (!opened) return

    if (animStartTime === null) animStartTime = timestamp

    const elapsed = timestamp - animStartTime
    const rawT = Math.min(1, elapsed / ANIM_DURATION)
    const scale = easeOutCubic(rawT)

    // Scale the overlay from the satchel button centre, clipped to the overlay zone
    // so the animation never draws over the visible map above OVERLAY_TOP
    const originX = SATCHEL_BTN_X + SATCHEL_BTN_SIZE / 2
    const originY = SATCHEL_BTN_Y + SATCHEL_BTN_SIZE / 2

    ctx.save()
    ctx.beginPath()
    ctx.rect(MAP_X, OVERLAY_TOP, MAP_W, LOGICAL_H - OVERLAY_TOP)
    ctx.clip()
    ctx.translate(originX, originY)
    ctx.scale(scale, scale)
    ctx.translate(-originX, -originY)

    drawContentArea(ctx)
    drawHeader(ctx, scale >= 1 ? hovered : null)
    drawTabStrip(ctx, activeTab)

    // Draw active tab content
    if (scale >= 1) {
      if (activeTab === 'pouch') {
        itemHitRects = []
        drawPouchTab(ctx, inventory, itemHitRects, hovered)
      } else {
        itemHitRects = []
        switch (activeTab) {
          case 'journal': drawJournalTab(ctx); break
          case 'tally':   drawTallyTab(ctx, dungeonState); break
          case 'map':     drawMapTab(ctx); break
        }
      }
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): boolean {
    if (!opened) return false

    // During animation: skip to fully open, consume click
    if (isAnimating()) {
      animStartTime = lastTimestamp - ANIM_DURATION
      return true
    }

    // Close button — top-right of the overlay header
    if (x >= MAP_X + MAP_W - CLOSE_HIT && y >= OVERLAY_TOP && y <= OVERLAY_TOP + CLOSE_HIT) {
      close()
      return true
    }

    // Item clicks (pouch tab)
    if (activeTab === 'pouch') {
      for (const rect of itemHitRects) {
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          if (callbacks?.onItemUse) {
            callbacks.onItemUse(rect.item)
          }
          return true
        }
      }
    }

    // Tab strip
    if (y >= TAB_TOP && y <= LOGICAL_H) {
      const idx = Math.floor((x - MAP_X) / TAB_W)
      if (idx >= 0 && idx < TABS.length) {
        activeTab = TABS[idx]
      }
      return true
    }

    // Everything else inside the overlay is consumed
    return true
  }

  function handlePointerMove(x: number, y: number): boolean {
    if (!opened) return false

    let next: string | null = null

    if (!isAnimating()) {
      if (x >= MAP_X + MAP_W - CLOSE_HIT && y >= OVERLAY_TOP && y <= OVERLAY_TOP + CLOSE_HIT) {
        next = 'close'
      } else if (activeTab === 'pouch') {
        // Check for item hover
        for (const rect of itemHitRects) {
          if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
            next = `item-${rect.item.id}`
            break
          }
        }
      }

      if (!next && y >= TAB_TOP) {
        const idx = Math.floor((x - MAP_X) / TAB_W)
        if (idx >= 0 && idx < TABS.length) next = `tab-${TABS[idx]}`
      }
    }

    hovered = next
    return true
  }

  return {
    isOpen: () => opened,
    open,
    close,
    draw,
    handleClick,
    handlePointerMove,
    _getTab: () => activeTab,
  }
}
