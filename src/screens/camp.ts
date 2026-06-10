import { colors } from '../colors'
import type { ScreenController } from './main-menu'
import type { MetaState } from '../meta/state'
import { loadMetaState, saveMetaState } from '../meta/state'
import { WEAPON_SPECS } from '../meta/weapons'
import type { Die } from '../dice/pool'

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

// Descend CTA (camp scene)
const DESCEND_BTN: Rect = {
  x: (LOGICAL_W - 280) / 2,
  y: LOGICAL_H - 80,
  w: 280,
  h: 56,
}

// ── Weapon-selection panel ────────────────────────────────────────────────────
const PANEL_HEIGHT = 560
const PANEL_Y = LOGICAL_H - PANEL_HEIGHT
const PANEL_W = LOGICAL_W

const BACK_BTN: Rect = { x: 0, y: PANEL_Y, w: 90, h: 48 }

const WEAPON_CARD_W = 150
const WEAPON_CARD_H = 150
const WEAPON_CARD_GAP = 14
const WEAPON_GRID_COLS = 2
// Centre the 2-wide grid horizontally.
const WEAPON_GRID_X = (LOGICAL_W - (WEAPON_CARD_W * WEAPON_GRID_COLS + WEAPON_CARD_GAP)) / 2
const WEAPON_GRID_Y = PANEL_Y + 56

const DIE_SIZE = 28
const POOL_PREVIEW_Y = WEAPON_GRID_Y + WEAPON_CARD_H * 2 + WEAPON_CARD_GAP + 36

// Descend CTA (panel)
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
  selectedWeaponId: string
  hoveredElement: string | null
  isMouseDevice: boolean
  stubPanelOpen: string | null
  stubPanelStartTime: number | null
}

export function createCamp(
  transitionTo: (screen: string) => void,
  onStartRun: (metaState: MetaState) => void,
): ScreenController {
  const meta = loadMetaState()
  const state: CampState = {
    metaState: meta,
    panelOpen: false,
    selectedWeaponId: meta.activeWeaponId,
    hoveredElement: null,
    isMouseDevice: false,
    stubPanelOpen: null,
    stubPanelStartTime: null,
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getWeaponCardRect(index: number): Rect {
    const col = index % WEAPON_GRID_COLS
    const row = Math.floor(index / WEAPON_GRID_COLS)
    return {
      x: WEAPON_GRID_X + col * (WEAPON_CARD_W + WEAPON_CARD_GAP),
      y: WEAPON_GRID_Y + row * (WEAPON_CARD_H + WEAPON_CARD_GAP),
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
    const panelW = 320
    const panelH = 150
    const panelX = (LOGICAL_W - panelW) / 2
    const panelY = (LOGICAL_H - panelH) / 2

    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(panelX, panelY, panelW, panelH)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    ctx.strokeRect(panelX, panelY, panelW, panelH)

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(title, panelX + panelW / 2, panelY + 20)

    ctx.font = '13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    const lines = wrapText(ctx, message, panelW - 48)
    let lineY = panelY + 56
    for (const line of lines) {
      ctx.fillText(line, panelX + panelW / 2, lineY)
      lineY += 20
    }

    ctx.font = 'italic 11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('tap to dismiss', panelX + panelW / 2, panelY + panelH - 26)
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
    // Dim the camp behind the panel
    ctx.globalAlpha = 0.55
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.globalAlpha = 1

    // Panel surface
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, PANEL_Y, PANEL_W, PANEL_HEIGHT)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    ctx.strokeRect(0, PANEL_Y, PANEL_W, PANEL_HEIGHT)

    // Header
    ctx.font = '15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = state.hoveredElement === 'back' ? colors.gold : colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('← Back', 18, BACK_BTN.y + BACK_BTN.h / 2)

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('Choose Your Weapon', LOGICAL_W - 18, BACK_BTN.y + BACK_BTN.h / 2)

    // Weapon cards
    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      drawWeaponCard(ctx, ids[i], getWeaponCardRect(i), ids[i] === state.selectedWeaponId)
    }

    // Pool preview
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Your dice this run:', LOGICAL_W / 2, POOL_PREVIEW_Y - 22)

    const poolDice = getRunPoolDice()
    const totalW = poolDice.length * DIE_SIZE + (poolDice.length - 1) * 6
    let dieX = (LOGICAL_W - totalW) / 2
    for (const die of poolDice) {
      drawDie(ctx, dieX, POOL_PREVIEW_Y, die.sides, die.color, DIE_SIZE)
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

  // ── Top-level draw ────────────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Camp scene is always the base layer and always clears the full canvas.
    drawCampScene(ctx)

    if (state.panelOpen) {
      drawWeaponSelectionPanel(ctx)
      return
    }

    // Stub panel (only meaningful on the camp scene, never over the weapon panel)
    if (state.stubPanelOpen && state.stubPanelStartTime !== null) {
      if (timestamp - state.stubPanelStartTime >= 2000) {
        state.stubPanelOpen = null
        state.stubPanelStartTime = null
      } else {
        const stub = STUB_MESSAGES[state.stubPanelOpen]
        if (stub) drawStubPanel(ctx, stub.title, stub.msg)
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    // A stub panel swallows the next click (dismiss).
    if (state.stubPanelOpen) {
      state.stubPanelOpen = null
      state.stubPanelStartTime = null
      return
    }

    if (state.panelOpen) {
      if (inRect(BACK_BTN, x, y)) {
        state.panelOpen = false
        state.hoveredElement = null
        return
      }

      const weapon = weaponAt(x, y)
      if (weapon) {
        state.selectedWeaponId = weapon
        return
      }

      if (inRect(PANEL_DESCEND_BTN, x, y)) {
        const newState: MetaState = {
          ...state.metaState,
          activeWeaponId: state.selectedWeaponId,
          runCount: state.metaState.runCount + 1,
        }
        saveMetaState(newState)
        onStartRun(newState)
      }
      return
    }

    // Camp scene
    if (inRect(DESCEND_BTN, x, y) || inRect(WEAPON_RACK, x, y)) {
      state.panelOpen = true
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
  }

  function openStub(id: string): void {
    state.stubPanelOpen = id
    state.stubPanelStartTime = performance.now()
  }

  function handlePointerMove(x: number, y: number): void {
    state.isMouseDevice = true

    if (state.panelOpen) {
      if (inRect(BACK_BTN, x, y)) {
        state.hoveredElement = 'back'
      } else if (inRect(PANEL_DESCEND_BTN, x, y)) {
        state.hoveredElement = 'panel-descend'
      } else {
        state.hoveredElement = weaponAt(x, y)
      }
      return
    }

    state.hoveredElement = inRect(DESCEND_BTN, x, y) ? 'descend' : null
  }

  return { draw, handleClick, handlePointerMove }
}
