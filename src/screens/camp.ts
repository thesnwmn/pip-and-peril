import { colors } from '../colors'
import type { ScreenController } from './main-menu'
import type { MetaState } from '../meta/state'
import { loadMetaState, saveMetaState } from '../meta/state'
import { WEAPON_SPECS } from '../meta/weapons'
import type { Die } from '../dice/pool'
import { generateNotices } from '../camp/notices'
import type { NoticeState } from '../camp/notices'
import { easeOut } from '../animation/easing'

const LOGICAL_W = 390
const LOGICAL_H = 844

// ── Shared geometry ─────────────────────────────────────────────────────────
// Each camp object has ONE region used by both its draw and its hit-test, so
// the visual and the touch target can never drift apart.

interface Rect { x: number; y: number; w: number; h: number }

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

// Camp scene regions
const SCRAPS_POS = { x: 20, y: 14 }
const DESCENT_RECORD: Rect = { x: LOGICAL_W - 96, y: 8, w: 88, h: 30 }
const SCROLL_WALL: Rect = { x: 0, y: 52, w: LOGICAL_W, h: 84 }
const WORKBENCH: Rect = { x: 20, y: 200, w: 170, h: 130 }
const WEAPON_RACK: Rect = { x: 210, y: 200, w: 160, h: 150 }
const STOOL_POS = { x: LOGICAL_W / 2, y: 430 }
const ARCH: Rect = { x: LOGICAL_W / 2 - 70, y: 500, w: 140, h: 120 }
const NOTICE_BOARD: Rect = { x: 20, y: 640, w: 88, h: 70 }

// ── Notice panel ─────────────────────────────────────────────────────────────
const NOTICE_PANEL_H = 244
const NOTICE_PANEL_RISE_MS = 400
const NOTICE_PANEL_SINK_MS = 300
const NOTICE_CARD_W = LOGICAL_W - 32
const NOTICE_CARD_H = 82
const NOTICE_CARD_PADDING = 12
const NOTICE_CARD_GAP = 10
const NOTICE_BG = '#f5e8c4'
const NOTICE_TEXT = '#1a0f05'

// Descend CTA (camp scene)
const DESCEND_BTN: Rect = {
  x: (LOGICAL_W - 280) / 2,
  y: LOGICAL_H - 80,
  w: 280,
  h: 56,
}

// ── Weapon-selection panel ────────────────────────────────────────────────────
// Browser mode (from weapon rack): centered, no descend button
const PANEL_BROWSER_HEIGHT = 420
const PANEL_BROWSER_Y = (LOGICAL_H - PANEL_BROWSER_HEIGHT) / 2

// Selection mode (from descend button): full height with descend button
const PANEL_SELECTION_HEIGHT = 560
const PANEL_SELECTION_Y = LOGICAL_H - PANEL_SELECTION_HEIGHT

const PANEL_W = LOGICAL_W

// Close button in top-right corner (for both browser and selection modes)
const CLOSE_BTN: Rect = { x: LOGICAL_W - 50, y: 10, w: 40, h: 40 }

const WEAPON_CARD_W = 150
const WEAPON_CARD_H = 150
const WEAPON_CARD_GAP = 14
const WEAPON_GRID_COLS = 2
// Centre the 2-wide grid horizontally.
const WEAPON_GRID_X = (LOGICAL_W - (WEAPON_CARD_W * WEAPON_GRID_COLS + WEAPON_CARD_GAP)) / 2
// Weapon grid starts at same Y for both modes (header + padding)
const WEAPON_GRID_Y_OFFSET = 56

const DIE_SIZE = 28
// Pool preview in selection mode (only shown there)
const POOL_PREVIEW_Y_OFFSET = 36

// Descend CTA (panel, only in selection mode)
const PANEL_DESCEND_BTN: Rect = {
  x: (LOGICAL_W - 280) / 2,
  y: LOGICAL_H - 70,
  w: 280,
  h: 54,
}

const DIE_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

const STUB_MESSAGES: Record<string, { title: string; msg: string }> = {
  workbench: { title: 'Workbench', msg: 'Pip tinkers with his dice. Upgrades coming soon.' },
  scrollWall: { title: 'Sealed Scrolls', msg: 'Sealed scrolls. Nothing readable yet.' },
  descentRecord: { title: 'Marks of Descent', msg: "Pip's marks of descent. Nothing recorded yet." },
}

interface CampState {
  metaState: MetaState
  panelOpen: boolean
  panelMode: 'browser' | 'selection' // Weapon rack = browser, Descend button = selection
  selectedWeaponId: string
  hoveredElement: string | null
  isMouseDevice: boolean
  stubPanelOpen: string | null
  noticeState: NoticeState
  noticePanelOpen: boolean
  noticePanelProgress: number  // 0=closed 1=fully open
  noticePanelAnimStart: number // performance.now() when current animation started
  noticeDismissVisible: boolean
  noticeDismissAlpha: number
  noticeDismissStart: number   // timestamp from draw when label first appeared
}

export function createCamp(
  transitionTo: (screen: string) => void,
  onStartRun: (metaState: MetaState) => void,
): ScreenController {
  const meta = loadMetaState()
  const state: CampState = {
    metaState: meta,
    panelOpen: false,
    panelMode: 'selection',
    selectedWeaponId: meta.activeWeaponId,
    hoveredElement: null,
    isMouseDevice: false,
    stubPanelOpen: null,
    noticeState: generateNotices(meta),
    noticePanelOpen: false,
    noticePanelProgress: 0,
    noticePanelAnimStart: 0,
    noticeDismissVisible: false,
    noticeDismissAlpha: 0,
    noticeDismissStart: 0,
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getWeaponCardRect(index: number): Rect {
    const panelY = state.panelMode === 'selection' ? PANEL_SELECTION_Y : PANEL_BROWSER_Y
    const weaponGridY = panelY + WEAPON_GRID_Y_OFFSET
    const col = index % WEAPON_GRID_COLS
    const row = Math.floor(index / WEAPON_GRID_COLS)
    return {
      x: WEAPON_GRID_X + col * (WEAPON_CARD_W + WEAPON_CARD_GAP),
      y: weaponGridY + row * (WEAPON_CARD_H + WEAPON_CARD_GAP),
      w: WEAPON_CARD_W,
      h: WEAPON_CARD_H,
    }
  }

  function weaponAt(x: number, y: number): string | null {
    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      if (inRect(getWeaponCardRect(i), x, y)) return ids[i]
    }
    return null
  }

  function getRunPoolDice(): Die[] {
    const permanent: Die[] = state.metaState.permanentPool.map((p) => ({
      color: p.colour as Die['color'],
      sides: p.faces,
    }))
    const weapon = WEAPON_SPECS[state.selectedWeaponId]
    return weapon ? [...permanent, ...weapon.addedDice] : permanent
  }

  // Helper to get stub panel geometry
  function getStubPanelRect(): Rect {
    const panelW = 320
    const panelH = 150
    const panelX = (LOGICAL_W - panelW) / 2
    const panelY = (LOGICAL_H - panelH) / 2
    return { x: panelX, y: panelY, w: panelW, h: panelH }
  }

  function getStubCloseButtonRect(): Rect {
    const panel = getStubPanelRect()
    const closeX = panel.x + panel.w - 24
    const closeY = panel.y + 20
    return { x: closeX - 14, y: closeY - 14, w: 28, h: 28 }
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  function strokeRoundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number): void {
    const ctxAny = ctx as any
    if ('roundRect' in ctxAny) {
      ctx.beginPath()
      ctxAny.roundRect(r.x, r.y, r.w, r.h, radius)
      ctx.stroke()
    } else {
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    }
  }

  function drawDie(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    sides: number,
    color: string,
    size: number,
  ): void {
    ctx.fillStyle = DIE_COLOR_MAP[color] || '#999'
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, size, size)

    ctx.font = `bold ${Math.floor(size / 2)}px monospace`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sides.toString(), x + size / 2, y + size / 2)
  }

  // ── Camp scene drawing ────────────────────────────────────────────────────────

  function drawCampScene(ctx: CanvasRenderingContext2D): void {
    // Full-canvas warm background — fills the ENTIRE screen so nothing lingers
    // from a previously-drawn panel.
    ctx.fillStyle = '#1a1208'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    drawScrapCounter(ctx)
    drawDescentRecord(ctx)
    drawScrollWall(ctx)
    drawWorkbench(ctx)
    drawWeaponRack(ctx)
    drawStool(ctx)
    drawArch(ctx)
    drawNoticeBoard(ctx)
    drawDescendButton(ctx)
  }

  function drawScrapCounter(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`◈ ${state.metaState.scraps} scraps`, SCRAPS_POS.x, SCRAPS_POS.y)
  }

  function drawDescentRecord(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(DESCENT_RECORD.x, DESCENT_RECORD.y, DESCENT_RECORD.w, DESCENT_RECORD.h)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.strokeRect(DESCENT_RECORD.x, DESCENT_RECORD.y, DESCENT_RECORD.w, DESCENT_RECORD.h)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Marks', DESCENT_RECORD.x + DESCENT_RECORD.w / 2, DESCENT_RECORD.y + DESCENT_RECORD.h / 2)
  }

  function drawScrollWall(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(SCROLL_WALL.x, SCROLL_WALL.y, SCROLL_WALL.w, SCROLL_WALL.h)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.strokeRect(SCROLL_WALL.x, SCROLL_WALL.y, SCROLL_WALL.w, SCROLL_WALL.h)

    // Rolled parchment cylinders
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 82
      ctx.fillStyle = '#2e1d0d'
      ctx.fillRect(x, SCROLL_WALL.y + 12, 56, 60)
      ctx.strokeStyle = '#5a3d1a'
      ctx.lineWidth = 1
      ctx.strokeRect(x, SCROLL_WALL.y + 12, 56, 60)
    }
  }

  function drawWorkbench(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(WORKBENCH.x, WORKBENCH.y, WORKBENCH.w, WORKBENCH.h)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 2
    ctx.strokeRect(WORKBENCH.x, WORKBENCH.y, WORKBENCH.w, WORKBENCH.h)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Workbench', WORKBENCH.x + WORKBENCH.w / 2, WORKBENCH.y + 8)

    // Pip's permanent dice laid out on the bench
    const dieSize = 24
    const gap = 10
    const dice = state.metaState.permanentPool
    const totalW = dice.length * dieSize + (dice.length - 1) * gap
    let dieX = WORKBENCH.x + (WORKBENCH.w - totalW) / 2
    const dieY = WORKBENCH.y + 56
    for (const die of dice) {
      drawDie(ctx, dieX, dieY, die.faces, die.colour, dieSize)
      dieX += dieSize + gap
    }
  }

  function drawWeaponRack(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#241608'
    ctx.fillRect(WEAPON_RACK.x, WEAPON_RACK.y, WEAPON_RACK.w, WEAPON_RACK.h)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 2
    ctx.strokeRect(WEAPON_RACK.x, WEAPON_RACK.y, WEAPON_RACK.w, WEAPON_RACK.h)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Weapon Rack', WEAPON_RACK.x + WEAPON_RACK.w / 2, WEAPON_RACK.y + 8)

    const symbols = ['🗡', '🗡', '⚔', '🪄']
    for (let i = 0; i < 4; i++) {
      const x = WEAPON_RACK.x + 44 + (i % 2) * 72
      const y = WEAPON_RACK.y + 58 + Math.floor(i / 2) * 52
      ctx.font = '28px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbols[i], x, y)
    }
  }

  function drawStool(ctx: CanvasRenderingContext2D): void {
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('[ empty stool ]', STOOL_POS.x, STOOL_POS.y)
  }

  function drawArch(ctx: CanvasRenderingContext2D): void {
    // Dark stone arch suggesting the dungeon beyond — purely atmospheric.
    ctx.fillStyle = colors.bg
    ctx.fillRect(ARCH.x, ARCH.y, ARCH.w, ARCH.h)
    ctx.strokeStyle = '#3a2818'
    ctx.lineWidth = 3
    ctx.strokeRect(ARCH.x, ARCH.y, ARCH.w, ARCH.h)

    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#4a4a6a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('· · ·', ARCH.x + ARCH.w / 2, ARCH.y + ARCH.h / 2)
  }

  function drawNoticeBoard(ctx: CanvasRenderingContext2D): void {
    const r = NOTICE_BOARD
    const isHovered = state.isMouseDevice && state.hoveredElement === 'notice-board'

    // Dark wood surface
    ctx.fillStyle = isHovered ? '#3a2c1a' : '#2a1c0a'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 2
    ctx.strokeRect(r.x, r.y, r.w, r.h)

    // Two cream paper rectangles
    const paperX = r.x + 10
    const paperW = r.w - 20
    const paperH = Math.floor((r.h - 24) / 2)
    const paper1Y = r.y + 8
    const paper2Y = paper1Y + paperH + 6

    for (const paperY of [paper1Y, paper2Y]) {
      ctx.fillStyle = NOTICE_BG
      ctx.fillRect(paperX, paperY, paperW, paperH)
      // Gold pin dot in top-right corner of each paper
      ctx.fillStyle = colors.gold
      ctx.beginPath()
      ctx.arc(paperX + paperW - 5, paperY + 5, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawNoticeCard(ctx: CanvasRenderingContext2D, cardY: number, text: string): void {
    const cardX = 16

    // Subtle drop shadow
    ctx.globalAlpha = 0.25
    ctx.fillStyle = '#000'
    ctx.fillRect(cardX + 2, cardY + 2, NOTICE_CARD_W, NOTICE_CARD_H)
    ctx.globalAlpha = 1

    // Card background (warm parchment)
    ctx.fillStyle = NOTICE_BG
    ctx.fillRect(cardX, cardY, NOTICE_CARD_W, NOTICE_CARD_H)

    // Subtle border
    ctx.strokeStyle = 'rgba(26, 15, 5, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(cardX, cardY, NOTICE_CARD_W, NOTICE_CARD_H)

    // Italic hand-inked text
    ctx.font = 'italic 13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = NOTICE_TEXT
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const lines = wrapText(ctx, text, NOTICE_CARD_W - NOTICE_CARD_PADDING * 2)
    let textY = cardY + NOTICE_CARD_PADDING
    for (const line of lines) {
      ctx.fillText(line, cardX + NOTICE_CARD_PADDING, textY)
      textY += 20
    }
  }

  function drawNoticePanel(ctx: CanvasRenderingContext2D): void {
    const easedProgress = easeOut(state.noticePanelProgress)
    const panelY = LOGICAL_H - Math.round(NOTICE_PANEL_H * easedProgress)

    // Dim camp behind panel
    ctx.globalAlpha = 0.5 * easedProgress
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.globalAlpha = 1

    // Panel surface (warm camp brown)
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, panelY, LOGICAL_W, NOTICE_PANEL_H)

    // Subtle top border
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, panelY)
    ctx.lineTo(LOGICAL_W, panelY)
    ctx.stroke()

    // Notice cards
    const card1Y = panelY + 20
    drawNoticeCard(ctx, card1Y, state.noticeState.notices[0].text)
    const card2Y = card1Y + NOTICE_CARD_H + NOTICE_CARD_GAP
    drawNoticeCard(ctx, card2Y, state.noticeState.notices[1].text)

    // Ghost dismiss label (fades after 2 s of being fully open)
    if (state.noticeDismissVisible && state.noticeDismissAlpha > 0 && state.noticePanelProgress >= 1) {
      ctx.globalAlpha = state.noticeDismissAlpha
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('tap to dismiss', LOGICAL_W / 2, LOGICAL_H - 12)
      ctx.globalAlpha = 1
    }
  }

  function openNoticePanel(): void {
    state.noticePanelOpen = true
    state.noticePanelAnimStart = performance.now()
    state.noticeDismissVisible = false
    state.noticeDismissAlpha = 0
  }

  function closeNoticePanel(): void {
    state.noticePanelOpen = false
    state.noticePanelAnimStart = performance.now()
    state.noticeDismissVisible = false
  }

  function drawDescendButton(ctx: CanvasRenderingContext2D): void {
    const hovered = state.isMouseDevice && state.hoveredElement === 'descend'
    ctx.globalAlpha = hovered ? 0.95 : 0.85
    ctx.fillStyle = colors.gold
    ctx.fillRect(DESCEND_BTN.x, DESCEND_BTN.y, DESCEND_BTN.w, DESCEND_BTN.h)
    ctx.globalAlpha = 1

    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    strokeRoundRect(ctx, DESCEND_BTN, 4)

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#1a1208'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Descend', DESCEND_BTN.x + DESCEND_BTN.w / 2, DESCEND_BTN.y + DESCEND_BTN.h / 2)
  }

  function drawStubPanel(ctx: CanvasRenderingContext2D, title: string, message: string): void {
    const panel = getStubPanelRect()

    // Dim the camp behind the stub panel
    ctx.globalAlpha = 0.75
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.globalAlpha = 1

    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h)

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(title, panel.x + panel.w / 2, panel.y + 20)

    ctx.font = '13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    const lines = wrapText(ctx, message, panel.w - 48)
    let lineY = panel.y + 56
    for (const line of lines) {
      ctx.fillText(line, panel.x + panel.w / 2, lineY)
      lineY += 20
    }

    // Draw close (X) button in top-right corner of stub panel
    const closeBtn = getStubCloseButtonRect()
    const closeCenterX = closeBtn.x + closeBtn.w / 2
    const closeCenterY = closeBtn.y + closeBtn.h / 2
    const closeSize = 12
    ctx.strokeStyle = state.hoveredElement === 'stub-close' ? colors.gold : colors.textMuted
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(closeCenterX - closeSize / 2, closeCenterY - closeSize / 2)
    ctx.lineTo(closeCenterX + closeSize / 2, closeCenterY + closeSize / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(closeCenterX + closeSize / 2, closeCenterY - closeSize / 2)
    ctx.lineTo(closeCenterX - closeSize / 2, closeCenterY + closeSize / 2)
    ctx.stroke()
  }

  // ── Weapon-selection panel drawing ──────────────────────────────────────────

  function drawWeaponCard(ctx: CanvasRenderingContext2D, weaponId: string, r: Rect, isSelected: boolean): void {
    const spec = WEAPON_SPECS[weaponId]
    if (!spec) return

    ctx.fillStyle = isSelected ? '#3a2818' : '#241608'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = isSelected ? colors.gold : '#5a3d1a'
    ctx.lineWidth = isSelected ? 3 : 1
    ctx.strokeRect(r.x, r.y, r.w, r.h)

    const cx = r.x + r.w / 2
    const pad = 10
    let textY = r.y + pad

    // Name
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(spec.name, cx, textY)
    textY += 20

    // Flavour (wrapped)
    ctx.font = 'italic 11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    const flavourLines = wrapText(ctx, spec.flavour, r.w - pad * 2)
    for (const line of flavourLines) {
      ctx.fillText(line, cx, textY)
      textY += 14
    }
    textY += 6

    // Dice glyphs
    const dieSize = 20
    const gap = 6
    const dice = spec.addedDice
    const totalW = dice.length * dieSize + (dice.length - 1) * gap
    let dieX = cx - totalW / 2
    const dieY = textY
    for (const die of dice) {
      drawDie(ctx, dieX, dieY, die.sides, die.color, dieSize)
      dieX += dieSize + gap
    }
    textY += dieSize + 8

    // Strike line
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    if (spec.strikeAction) {
      ctx.fillText(`Strike: ${spec.strikeAction.cost.red}🔴`, cx, textY)
    } else {
      ctx.fillText('— no strike —', cx, textY)
    }
  }

  function drawWeaponSelectionPanel(ctx: CanvasRenderingContext2D): void {
    const panelY = state.panelMode === 'selection' ? PANEL_SELECTION_Y : PANEL_BROWSER_Y
    const panelHeight = state.panelMode === 'selection' ? PANEL_SELECTION_HEIGHT : PANEL_BROWSER_HEIGHT

    // Dim the camp behind the panel
    ctx.globalAlpha = 0.75
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.globalAlpha = 1

    // Panel surface
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, panelY, PANEL_W, panelHeight)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    ctx.strokeRect(0, panelY, PANEL_W, panelHeight)

    // Header: centered title (varies by mode)
    const panelTitle = state.panelMode === 'selection' ? 'Choose Your Weapon' : 'Weapons'
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(panelTitle, LOGICAL_W / 2, panelY + 24)

    // Close (X) button in top-right
    const closeHovered = state.hoveredElement === 'close'
    const closeCenterX = CLOSE_BTN.x + CLOSE_BTN.w / 2
    const closeCenterY = panelY + CLOSE_BTN.h / 2
    const closeSize = 12
    ctx.strokeStyle = closeHovered ? colors.gold : colors.textMuted
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(closeCenterX - closeSize / 2, closeCenterY - closeSize / 2)
    ctx.lineTo(closeCenterX + closeSize / 2, closeCenterY + closeSize / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(closeCenterX + closeSize / 2, closeCenterY - closeSize / 2)
    ctx.lineTo(closeCenterX - closeSize / 2, closeCenterY + closeSize / 2)
    ctx.stroke()

    // Weapon cards
    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      drawWeaponCard(ctx, ids[i], getWeaponCardRect(i), ids[i] === state.selectedWeaponId)
    }

    // Pool preview (only in selection mode)
    if (state.panelMode === 'selection') {
      const poolPreviewY = panelY + panelHeight - 120
      ctx.font = '12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('Your dice this run:', LOGICAL_W / 2, poolPreviewY - 22)

      const poolDice = getRunPoolDice()
      const totalW = poolDice.length * DIE_SIZE + (poolDice.length - 1) * 6
      let dieX = (LOGICAL_W - totalW) / 2
      for (const die of poolDice) {
        drawDie(ctx, dieX, poolPreviewY, die.sides, die.color, DIE_SIZE)
        dieX += DIE_SIZE + 6
      }

      // Descend CTA
      const hovered = state.isMouseDevice && state.hoveredElement === 'panel-descend'
      ctx.globalAlpha = hovered ? 0.95 : 0.85
      ctx.fillStyle = colors.gold
      ctx.fillRect(PANEL_DESCEND_BTN.x, PANEL_DESCEND_BTN.y, PANEL_DESCEND_BTN.w, PANEL_DESCEND_BTN.h)
      ctx.globalAlpha = 1
      ctx.strokeStyle = colors.gold
      ctx.lineWidth = 2
      strokeRoundRect(ctx, PANEL_DESCEND_BTN, 4)

      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#1a1208'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        'Descend into the Dark',
        PANEL_DESCEND_BTN.x + PANEL_DESCEND_BTN.w / 2,
        PANEL_DESCEND_BTN.y + PANEL_DESCEND_BTN.h / 2,
      )
    }
  }

  // ── Top-level draw ────────────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Advance notice panel animation
    if (state.noticePanelOpen && state.noticePanelProgress < 1) {
      const elapsed = timestamp - state.noticePanelAnimStart
      state.noticePanelProgress = Math.min(1, elapsed / NOTICE_PANEL_RISE_MS)
      if (state.noticePanelProgress >= 1 && !state.noticeDismissVisible) {
        state.noticeDismissVisible = true
        state.noticeDismissAlpha = 1
        state.noticeDismissStart = timestamp
      }
    } else if (!state.noticePanelOpen && state.noticePanelProgress > 0) {
      const elapsed = timestamp - state.noticePanelAnimStart
      state.noticePanelProgress = Math.max(0, 1 - elapsed / NOTICE_PANEL_SINK_MS)
    }

    // Advance dismiss label fade (starts 2 s after panel fully opens)
    if (state.noticeDismissVisible && state.noticePanelProgress >= 1) {
      const elapsed = timestamp - state.noticeDismissStart
      if (elapsed >= 2000) {
        state.noticeDismissAlpha = Math.max(0, 1 - (elapsed - 2000) / 500)
        if (state.noticeDismissAlpha <= 0) state.noticeDismissVisible = false
      }
    }

    // Camp scene is always the base layer and always clears the full canvas.
    drawCampScene(ctx)

    // Weapon panel (highest priority overlay)
    if (state.panelOpen) {
      drawWeaponSelectionPanel(ctx)
      return
    }

    // Notice panel (animating or open)
    if (state.noticePanelProgress > 0) {
      drawNoticePanel(ctx)
      return
    }

    // Stub panel (only meaningful on the camp scene)
    if (state.stubPanelOpen) {
      const stub = STUB_MESSAGES[state.stubPanelOpen]
      if (stub) drawStubPanel(ctx, stub.title, stub.msg)
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    // Stub panel handling: close on X button or click outside
    if (state.stubPanelOpen) {
      const closeBtn = getStubCloseButtonRect()
      if (inRect(closeBtn, x, y)) {
        state.stubPanelOpen = null
        return
      }
      // Click outside the stub panel to dismiss
      const panel = getStubPanelRect()
      if (!inRect(panel, x, y)) {
        state.stubPanelOpen = null
        return
      }
      // Click inside panel but not on close button: stay open
      return
    }

    // Notice panel: consume all taps while visible (open or mid-close animation)
    if (state.noticePanelOpen || state.noticePanelProgress > 0) {
      if (state.noticePanelOpen) {
        const panelTop = LOGICAL_H - NOTICE_PANEL_H
        if (y < panelTop) closeNoticePanel()
      }
      return
    }

    if (state.panelOpen) {
      // Close button in top-right
      const closeBtnForHitTest: Rect = {
        x: CLOSE_BTN.x,
        y: state.panelMode === 'selection' ? PANEL_SELECTION_Y : PANEL_BROWSER_Y,
        w: CLOSE_BTN.w,
        h: CLOSE_BTN.h,
      }
      if (inRect(closeBtnForHitTest, x, y)) {
        state.panelOpen = false
        state.hoveredElement = null
        return
      }

      const weapon = weaponAt(x, y)
      if (weapon) {
        state.selectedWeaponId = weapon
        return
      }

      if (state.panelMode === 'selection' && inRect(PANEL_DESCEND_BTN, x, y)) {
        const newState: MetaState = {
          ...state.metaState,
          activeWeaponId: state.selectedWeaponId,
        }
        saveMetaState(newState)
        onStartRun(newState)
      }
      return
    }

    // Camp scene
    if (inRect(DESCEND_BTN, x, y)) {
      state.panelOpen = true
      state.panelMode = 'selection'
      state.hoveredElement = null
      return
    }
    if (inRect(WEAPON_RACK, x, y)) {
      state.panelOpen = true
      state.panelMode = 'browser'
      state.hoveredElement = null
      return
    }
    if (inRect(WORKBENCH, x, y)) {
      openStub('workbench')
      return
    }
    if (inRect(SCROLL_WALL, x, y)) {
      openStub('scrollWall')
      return
    }
    if (inRect(DESCENT_RECORD, x, y)) {
      openStub('descentRecord')
      return
    }
    if (inRect(NOTICE_BOARD, x, y)) {
      openNoticePanel()
      return
    }
  }

  function openStub(id: string): void {
    state.stubPanelOpen = id
  }

  function handlePointerMove(x: number, y: number): void {
    state.isMouseDevice = true

    if (state.stubPanelOpen) {
      const closeBtn = getStubCloseButtonRect()
      state.hoveredElement = inRect(closeBtn, x, y) ? 'stub-close' : null
      return
    }

    if (state.panelOpen) {
      const closeBtnForHitTest: Rect = {
        x: CLOSE_BTN.x,
        y: state.panelMode === 'selection' ? PANEL_SELECTION_Y : PANEL_BROWSER_Y,
        w: CLOSE_BTN.w,
        h: CLOSE_BTN.h,
      }
      if (inRect(closeBtnForHitTest, x, y)) {
        state.hoveredElement = 'close'
      } else if (state.panelMode === 'selection' && inRect(PANEL_DESCEND_BTN, x, y)) {
        state.hoveredElement = 'panel-descend'
      } else {
        state.hoveredElement = weaponAt(x, y)
      }
      return
    }

    if (state.noticePanelOpen || state.noticePanelProgress > 0) {
      state.hoveredElement = null
      return
    }

    if (inRect(NOTICE_BOARD, x, y)) {
      state.hoveredElement = 'notice-board'
    } else {
      state.hoveredElement = inRect(DESCEND_BTN, x, y) ? 'descend' : null
    }
  }

  return { draw, handleClick, handlePointerMove }
}
