import { colors } from '../colors'
import type { ScreenController } from './main-menu'
import type { MetaState } from '../meta/state'
import { loadMetaState, saveMetaState } from '../meta/state'
import { WEAPON_SPECS } from '../meta/weapons'
import type { Die } from '../dice/pool'
import { generateNotices } from '../camp/notices'
import type { NoticeState } from '../camp/notices'
import { easeOut } from '../animation/easing'
import { STATUS_BAR_H } from './game-layout'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'
import type { MenuModal } from '../menu/modal'

// ── Canvas dimensions ──────────────────────────────────────────────────────────
export const LOGICAL_W = 390
export const LOGICAL_H = 844

// ── Shared geometry ────────────────────────────────────────────────────────────
export interface Rect { x: number; y: number; w: number; h: number }

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

// ── Zone split ─────────────────────────────────────────────────────────────────
// Scene zone: Y 0 → SCENE_BOTTOM (≥55% of LOGICAL_H per spec)
// Activity bar zone: Y SCENE_BOTTOM → LOGICAL_H
export const SCENE_BOTTOM = Math.round(0.62 * LOGICAL_H)  // ≈ 523

// ── Activity bar ───────────────────────────────────────────────────────────────
const ACTIVITY_BAR_PAD_TOP = 20
export const ACTIVITY_BTN_H = 68   // icon(28)+gap(8)+label(14)+padding(18) → always ≥44
export const ACTIVITY_BTN_Y = SCENE_BOTTOM + ACTIVITY_BAR_PAD_TOP
const ACTIVITY_BTN_W = Math.floor(LOGICAL_W / 4)  // 97
export const DESCEND_H = 64                        // always ≥56
export const DESCEND_Y = LOGICAL_H - DESCEND_H

export function getActivityButtonRect(index: number): Rect {
  return { x: index * ACTIVITY_BTN_W, y: ACTIVITY_BTN_Y, w: ACTIVITY_BTN_W, h: ACTIVITY_BTN_H }
}

export function getDescendStripRect(): Rect {
  return { x: 0, y: DESCEND_Y, w: LOGICAL_W, h: DESCEND_H }
}

// ── Sub-panel (all overlays share these constants) ─────────────────────────────
// Panels rise to the scene/activity dividing line — activity bar is always visible beneath
const SUB_PANEL_TOP = SCENE_BOTTOM
const SUB_PANEL_RISE_MS = 400
const SUB_PANEL_SINK_MS = 300
const CLOSE_BTN_SIZE = 44          // 44×44 tap target per spec

export function getAnimatedPanelY(progress: number): number {
  const eased = easeOut(progress)
  return Math.round(SUB_PANEL_TOP + (LOGICAL_H - SUB_PANEL_TOP) * (1 - eased))
}

export function getCloseBtnRect(panelY: number): Rect {
  return { x: LOGICAL_W - CLOSE_BTN_SIZE, y: panelY, w: CLOSE_BTN_SIZE, h: CLOSE_BTN_SIZE }
}

// ── Weapon-card layout (relative to animated panelY) ──────────────────────────
const WEAPON_CARD_W = 150
const WEAPON_CARD_H = 80
const WEAPON_CARD_GAP = 14
const WEAPON_GRID_COLS = 2
const WEAPON_GRID_X = (LOGICAL_W - (WEAPON_CARD_W * WEAPON_GRID_COLS + WEAPON_CARD_GAP)) / 2
const WEAPON_GRID_Y_OFFSET = 56
const DIE_SIZE = 28

// Descend CTA inside weapon panel
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

// ── Notice panel ───────────────────────────────────────────────────────────────
const NOTICE_CARD_W = LOGICAL_W - 32
const NOTICE_CARD_H = 82
const NOTICE_CARD_PADDING = 12
const NOTICE_CARD_GAP = 10
const NOTICE_BG = '#f5e8c4'
const NOTICE_TEXT = '#1a0f05'

// ── Scene element positions (shifted up ~70 px after scroll-wall removal) ──────
// Arch passage (back wall)
const ARCH: Rect = { x: LOGICAL_W / 2 - 55, y: 285, w: 110, h: 125 }
// Workbench (left side)
const WORKBENCH_SCENE: Rect = { x: 16, y: 178, w: 132, h: 80 }

// Campfire
const FIRE_CX = 185
const FIRE_CY = 382
const FIRE_BASE_RADIUS = 44
const FIRE_FLAME_MIN = 12
const FIRE_FLAME_MAX = 22
const FIRE_FRAME_MIN_MS = 150
const FIRE_FRAME_MAX_MS = 250

// Pip
const PIP_CX = 242
const PIP_CY = 390

// Visitor stool
const STOOL_CX = 128
const STOOL_CY = 375

// Weapon silhouettes (decorative, right wall)
const WEAPON_SILS = [
  { x: 284, yBase: 350, w: 7,  h: 52, lean: -0.12 },  // dagger
  { x: 308, yBase: 330, w: 11, h: 70, lean:  0.10 },  // sword
  { x: 336, yBase: 315, w: 5,  h: 80, lean: -0.08 },  // staff
]

// ── State ──────────────────────────────────────────────────────────────────────

export type SubPanelName = 'weapons' | 'workbench' | 'notices' | 'visitor'

interface CampState {
  metaState: MetaState
  menuModal: MenuModal
  // Active sub-panel and shared animation progress
  activeSubPanel: SubPanelName | null
  panelProgress: number       // 0 = closed, 1 = fully open
  panelAnimStart: number      // performance.now() when current anim started (offset for mid-flight)
  panelClosing: boolean       // true while sinking; prevents null-activeSubPanel during close anim
  // Weapon panel
  selectedWeaponId: string
  // Notice panel extras
  noticeState: NoticeState
  noticeDismissVisible: boolean
  noticeDismissAlpha: number
  noticeDismissStart: number
  // Campfire animation
  fireFlameHeights: [number, number, number]
  fireNextFrameTime: number
  // Hover feedback (mouse devices)
  hoveredElement: string | null
  isMouseDevice: boolean
}

export function createCamp(
  transitionTo: (screen: string) => void,
  onStartRun: (metaState: MetaState) => void,
): ScreenController {
  const meta = loadMetaState()
  const state: CampState = {
    metaState: meta,
    menuModal: createMenuModal('home', transitionTo),
    activeSubPanel: null,
    panelProgress: 0,
    panelAnimStart: 0,
    panelClosing: false,
    selectedWeaponId: meta.activeWeaponId,
    noticeState: generateNotices(meta),
    noticeDismissVisible: false,
    noticeDismissAlpha: 0,
    noticeDismissStart: 0,
    fireFlameHeights: [16, 18, 14],
    fireNextFrameTime: 0,
    hoveredElement: null,
    isMouseDevice: false,
  }

  // ── Geometry helpers ─────────────────────────────────────────────────────────

  function getWeaponCardRect(index: number, panelY: number): Rect {
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

  function weaponAt(x: number, y: number, panelY: number): string | null {
    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      if (inRect(getWeaponCardRect(i, panelY), x, y)) return ids[i]
    }
    return null
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

  function drawCloseButton(ctx: CanvasRenderingContext2D, panelY: number): void {
    const closeBtn = getCloseBtnRect(panelY)
    const cx = closeBtn.x + closeBtn.w / 2
    const cy = closeBtn.y + closeBtn.h / 2
    const arm = 10
    const hovered = state.hoveredElement === 'panel-close'
    ctx.strokeStyle = hovered ? colors.gold : colors.textMuted
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - arm, cy - arm)
    ctx.lineTo(cx + arm, cy + arm)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + arm, cy - arm)
    ctx.lineTo(cx - arm, cy + arm)
    ctx.stroke()
  }

  // ── Scene drawing ────────────────────────────────────────────────────────────

  function drawAmbientGlow(ctx: CanvasRenderingContext2D): void {
    const tallest = Math.max(...state.fireFlameHeights)
    const radius = FIRE_BASE_RADIUS + (tallest - 17)
    const grad = ctx.createRadialGradient(FIRE_CX, FIRE_CY, 0, FIRE_CX, FIRE_CY, radius * 3)
    grad.addColorStop(0, 'rgba(200, 120, 30, 0.15)')
    grad.addColorStop(1, 'rgba(200, 120, 30, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, LOGICAL_W, SCENE_BOTTOM)
  }

  function drawArch(ctx: CanvasRenderingContext2D): void {
    const { x: ax, y: ay, w: aw, h: ah } = ARCH
    const pillarW = 16
    const archCX = ax + aw / 2
    const archOpenW = aw - pillarW * 2        // ~78
    const archRad   = archOpenW / 2           // ~39
    const archTopY  = ay + archRad + 8        // Y coordinate of arch curve apex

    // Stone face background
    ctx.fillStyle = '#2a2035'
    ctx.fillRect(ax, ay, aw, ah)

    // Arch opening (dark void carved into stone)
    ctx.fillStyle = '#07071a'
    ctx.beginPath()
    ctx.moveTo(ax + pillarW, ay + ah)
    ctx.lineTo(ax + pillarW, archTopY)
    ctx.arc(archCX, archTopY, archRad, Math.PI, 0, false)
    ctx.lineTo(ax + aw - pillarW, ay + ah)
    ctx.closePath()
    ctx.fill()

    // Cool ambient glow deep in the arch
    const grd = ctx.createRadialGradient(
      archCX, ay + ah * 0.7, 0,
      archCX, ay + ah * 0.7, archRad,
    )
    grd.addColorStop(0, 'rgba(60, 60, 150, 0.35)')
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.moveTo(ax + pillarW, ay + ah)
    ctx.lineTo(ax + pillarW, archTopY)
    ctx.arc(archCX, archTopY, archRad, Math.PI, 0, false)
    ctx.lineTo(ax + aw - pillarW, ay + ah)
    ctx.closePath()
    ctx.fill()

    // Stone border
    ctx.strokeStyle = '#4a3858'
    ctx.lineWidth = 2
    ctx.strokeRect(ax, ay, aw, ah)

    // Arch opening outline (keystone trace)
    ctx.strokeStyle = '#3a2850'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ax + pillarW, ay + ah)
    ctx.lineTo(ax + pillarW, archTopY)
    ctx.arc(archCX, archTopY, archRad, Math.PI, 0, false)
    ctx.lineTo(ax + aw - pillarW, ay + ah)
    ctx.stroke()
  }

  function drawWorkbenchScene(ctx: CanvasRenderingContext2D): void {
    const r = WORKBENCH_SCENE

    // Table legs (behind surface)
    const legW = 8
    const legH = 38
    const legY = r.y + r.h - legH
    ctx.fillStyle = '#5a3010'
    ctx.fillRect(r.x + 10, legY, legW, legH)
    ctx.fillRect(r.x + r.w - 10 - legW, legY, legW, legH)

    // Table top surface
    const surfH = 12
    const surfY = r.y + r.h - legH - surfH
    ctx.fillStyle = '#7a4818'
    ctx.fillRect(r.x, surfY, r.w, surfH)
    // Top face highlight
    ctx.fillStyle = '#9a6830'
    ctx.fillRect(r.x + 2, surfY, r.w - 4, 4)
    // Front edge shadow
    ctx.strokeStyle = '#5a3010'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(r.x, surfY + surfH)
    ctx.lineTo(r.x + r.w, surfY + surfH)
    ctx.stroke()

    // Permanent dice sitting on the table surface
    const dice = state.metaState.permanentPool
    const dieSize = 12
    const gap = 4
    const totalW = dice.length * dieSize + Math.max(0, dice.length - 1) * gap
    let dieX = r.x + (r.w - totalW) / 2
    const dieY = surfY - dieSize - 2
    for (const die of dice) {
      ctx.fillStyle = DIE_COLOR_MAP[die.colour] || '#888'
      ctx.fillRect(dieX, dieY, dieSize, dieSize)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 0.5
      ctx.strokeRect(dieX, dieY, dieSize, dieSize)
      dieX += dieSize + gap
    }
  }

  function drawWeaponSilhouettes(ctx: CanvasRenderingContext2D): void {
    for (const sil of WEAPON_SILS) {
      ctx.save()
      ctx.translate(sil.x + sil.w / 2, sil.yBase)
      ctx.rotate(sil.lean)
      ctx.fillStyle = '#1c1208'
      ctx.fillRect(-sil.w / 2, -sil.h, sil.w, sil.h)
      ctx.strokeStyle = '#3a2818'
      ctx.lineWidth = 1
      ctx.strokeRect(-sil.w / 2, -sil.h, sil.w, sil.h)
      // Crossguard on sword (widest shape)
      if (sil.w >= 10) {
        ctx.fillStyle = '#3a2818'
        ctx.fillRect(-sil.w / 2 - 5, -sil.h + 12, sil.w + 10, 4)
      }
      ctx.restore()
    }
  }

  function drawVisitorArea(ctx: CanvasRenderingContext2D): void {
    const stoolW = 30
    const stoolH = 8
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(STOOL_CX - stoolW / 2, STOOL_CY - stoolH / 2, stoolW, stoolH)
    ctx.strokeStyle = '#3a2818'
    ctx.lineWidth = 3
    const legY = STOOL_CY + stoolH / 2
    for (const legX of [STOOL_CX - 10, STOOL_CX + 10]) {
      ctx.beginPath()
      ctx.moveTo(legX, legY)
      ctx.lineTo(legX, legY + 14)
      ctx.stroke()
    }
  }

  function drawCampfire(ctx: CanvasRenderingContext2D): void {
    const heights = state.fireFlameHeights
    const offsets = [-7, 0, 7]
    for (let i = 0; i < 3; i++) {
      const h = heights[i]
      const fx = FIRE_CX + offsets[i]
      const fy = FIRE_CY
      ctx.beginPath()
      ctx.moveTo(fx, fy - h)
      ctx.bezierCurveTo(fx + 8, fy - h * 0.6, fx + 7, fy, fx, fy + 2)
      ctx.bezierCurveTo(fx - 7, fy, fx - 8, fy - h * 0.6, fx, fy - h)
      ctx.closePath()
      const flameGrad = ctx.createLinearGradient(fx, fy, fx, fy - h)
      flameGrad.addColorStop(0, '#c8781e')
      flameGrad.addColorStop(1, '#e89a30')
      ctx.fillStyle = flameGrad
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(FIRE_CX, FIRE_CY + 2, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#c8781e'
    ctx.fill()
  }

  function drawPip(ctx: CanvasRenderingContext2D): void {
    const cx = PIP_CX
    const cy = PIP_CY
    const bodyColor = '#a07048'
    const bellyColor = '#c09860'

    // Body: upright oval (taller than wide)
    ctx.beginPath()
    ctx.ellipse(cx, cy, 7, 12, 0, 0, Math.PI * 2)
    ctx.fillStyle = bodyColor
    ctx.fill()

    // Belly patch
    ctx.beginPath()
    ctx.ellipse(cx, cy + 2, 4, 7, 0, 0, Math.PI * 2)
    ctx.fillStyle = bellyColor
    ctx.fill()

    // Head: above body
    const hx = cx
    const hy = cy - 18
    ctx.beginPath()
    ctx.arc(hx, hy, 8, 0, Math.PI * 2)
    ctx.fillStyle = bodyColor
    ctx.fill()

    // Ears: two triangles pointing UP (tip above, base at head edge)
    ctx.fillStyle = bodyColor
    for (const ex of [hx - 5, hx + 2]) {
      ctx.beginPath()
      ctx.moveTo(ex, hy - 16)      // tip: above head
      ctx.lineTo(ex - 4, hy - 8)   // base-left: at head edge
      ctx.lineTo(ex + 4, hy - 8)   // base-right: at head edge
      ctx.closePath()
      ctx.fill()
    }

    // Inner ear (pink)
    ctx.fillStyle = '#d08060'
    for (const ex of [hx - 5, hx + 2]) {
      ctx.beginPath()
      ctx.moveTo(ex, hy - 14)
      ctx.lineTo(ex - 2, hy - 9)
      ctx.lineTo(ex + 2, hy - 9)
      ctx.closePath()
      ctx.fill()
    }

    // Eye (facing left, toward fire)
    ctx.beginPath()
    ctx.arc(hx - 3, hy - 1, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = '#2a1808'
    ctx.fill()

    // Eye shine
    ctx.beginPath()
    ctx.arc(hx - 4, hy - 2, 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Snout
    ctx.beginPath()
    ctx.ellipse(hx - 6, hy + 1, 3, 2, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = bellyColor
    ctx.fill()

    // Tail: curves from lower body
    ctx.beginPath()
    ctx.moveTo(cx + 7, cy + 8)
    ctx.quadraticCurveTo(cx + 22, cy + 18, cx + 16, cy + 28)
    ctx.strokeStyle = bodyColor
    ctx.lineWidth = 2
    ctx.stroke()
  }

  function drawActivityIcon(
    ctx: CanvasRenderingContext2D,
    name: SubPanelName,
    cx: number,
    cy: number,
    alpha: number,
  ): void {
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#c8781e'
    ctx.fillStyle = '#c8781e'
    ctx.lineWidth = 1.5
    const s = 10

    if (name === 'weapons') {
      ctx.fillRect(cx - 2, cy - s, 4, s * 2)
      ctx.fillRect(cx - s, cy - 2, s * 2, 4)
      ctx.beginPath()
      ctx.arc(cx, cy + s + 3, 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (name === 'workbench') {
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2)
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (name === 'notices') {
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2)
      ctx.fillRect(cx - s + 3, cy - 3, s * 2 - 6, 2)
      ctx.fillRect(cx - s + 3, cy + 3, s * 2 - 6, 2)
    } else if (name === 'visitor') {
      ctx.beginPath()
      ctx.arc(cx, cy - s + 4, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(cx - 4, cy - s + 10, 8, 10)
    }

    ctx.globalAlpha = 1
  }

  function drawActivityBar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, SCENE_BOTTOM, LOGICAL_W, LOGICAL_H - SCENE_BOTTOM)

    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, SCENE_BOTTOM)
    ctx.lineTo(LOGICAL_W, SCENE_BOTTOM)
    ctx.stroke()

    const buttons: Array<{ name: SubPanelName; label: string }> = [
      { name: 'weapons', label: 'Weapons' },
      { name: 'workbench', label: 'Workbench' },
      { name: 'notices', label: 'Notices' },
      { name: 'visitor', label: 'Visitor' },
    ]

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      const r = getActivityButtonRect(i)
      const isVisitor = btn.name === 'visitor'
      const alpha = isVisitor ? 0.4 : 1
      const hovered = state.isMouseDevice && state.hoveredElement === `activity-${btn.name}`

      if (hovered && !isVisitor) {
        ctx.fillStyle = 'rgba(90, 61, 26, 0.4)'
        ctx.fillRect(r.x, r.y, r.w, r.h)
      }

      if (i > 0) {
        ctx.strokeStyle = '#3a2818'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(r.x, ACTIVITY_BTN_Y + 8)
        ctx.lineTo(r.x, ACTIVITY_BTN_Y + ACTIVITY_BTN_H - 8)
        ctx.stroke()
      }

      const cx = r.x + r.w / 2
      const iconCY = r.y + 24
      drawActivityIcon(ctx, btn.name, cx, iconCY, alpha)

      ctx.globalAlpha = alpha
      ctx.font = '12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = isVisitor ? colors.textMuted : colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(btn.label, cx, r.y + 44)
      ctx.globalAlpha = 1
    }

    // Descend strip
    const descend = getDescendStripRect()
    const descendHovered = state.isMouseDevice && state.hoveredElement === 'descend'
    if (descendHovered) {
      ctx.fillStyle = 'rgba(200,120,30,0.15)'
      ctx.fillRect(descend.x, descend.y, descend.w, descend.h)
    }

    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, DESCEND_Y)
    ctx.lineTo(LOGICAL_W, DESCEND_Y)
    ctx.stroke()

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#c8781e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Descend', descend.x + descend.w / 2, descend.y + descend.h / 2)
  }

  function drawStatusBar(ctx: CanvasRenderingContext2D): void {
    // Semi-transparent backing so status bar reads over scene
    ctx.fillStyle = 'rgba(26, 18, 8, 0.85)'
    ctx.fillRect(0, 0, LOGICAL_W, STATUS_BAR_H)

    ctx.strokeStyle = '#3a2818'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, STATUS_BAR_H)
    ctx.lineTo(LOGICAL_W, STATUS_BAR_H)
    ctx.stroke()

    // Menu button (left)
    const menuHovered = state.isMouseDevice && state.hoveredElement === 'menu-btn'
    drawMenuButton(ctx, menuHovered)

    // Scraps count (right)
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`◈ ${state.metaState.scraps}`, LOGICAL_W - 16, STATUS_BAR_H / 2)
  }

  function drawCampScene(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1208'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    drawAmbientGlow(ctx)
    drawArch(ctx)
    drawWorkbenchScene(ctx)
    drawWeaponSilhouettes(ctx)
    drawVisitorArea(ctx)
    drawCampfire(ctx)
    drawPip(ctx)
    drawActivityBar(ctx)
  }

  // ── Sub-panel drawing ────────────────────────────────────────────────────────

  function drawSubPanelBase(ctx: CanvasRenderingContext2D, panelY: number, title: string): void {
    // Scrim over scene zone only (status bar stays clear)
    ctx.globalAlpha = 0.40
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, STATUS_BAR_H, LOGICAL_W, panelY - STATUS_BAR_H)
    ctx.globalAlpha = 1

    // Panel surface
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, panelY, LOGICAL_W, LOGICAL_H - panelY)

    // Top border
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, panelY)
    ctx.lineTo(LOGICAL_W, panelY)
    ctx.stroke()

    // Panel title
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, LOGICAL_W / 2, panelY + 28)

    drawCloseButton(ctx, panelY)
  }

  function drawWeaponPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    drawSubPanelBase(ctx, panelY, 'Choose Your Weapon')

    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      const cardRect = getWeaponCardRect(i, panelY)
      const weaponId = ids[i]
      const spec = WEAPON_SPECS[weaponId]
      if (!spec) continue
      const isSelected = weaponId === state.selectedWeaponId

      ctx.fillStyle = isSelected ? '#3a2818' : '#241608'
      ctx.fillRect(cardRect.x, cardRect.y, cardRect.w, cardRect.h)
      ctx.strokeStyle = isSelected ? colors.gold : '#5a3d1a'
      ctx.lineWidth = isSelected ? 3 : 1
      ctx.strokeRect(cardRect.x, cardRect.y, cardRect.w, cardRect.h)

      const cardCX = cardRect.x + cardRect.w / 2
      const pad = 8
      let textY = cardRect.y + pad

      // Name
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(spec.name, cardCX, textY)
      textY += 18

      // Flavour (first line only at small size)
      ctx.font = 'italic 10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      const flavourLines = wrapText(ctx, spec.flavour, cardRect.w - pad * 2)
      ctx.fillText(flavourLines[0], cardCX, textY)
      textY += 14

      // Dice
      const dieSize = 16
      const dieGap = 5
      const dice = spec.addedDice
      const totalDiceW = dice.length * dieSize + (dice.length - 1) * dieGap
      let dieX = cardCX - totalDiceW / 2
      for (const die of dice) {
        drawDie(ctx, dieX, textY, die.sides, die.color, dieSize)
        dieX += dieSize + dieGap
      }
      textY += dieSize + 4

      // Strike cost
      ctx.font = '10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      if (spec.strikeAction) {
        ctx.fillText(`Strike: ${spec.strikeAction.cost.red}🔴`, cardCX, textY)
      } else {
        ctx.fillText('— no strike —', cardCX, textY)
      }
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

  function drawNoticeCard(ctx: CanvasRenderingContext2D, cardY: number, text: string): void {
    const cardX = 16
    ctx.globalAlpha = 0.25
    ctx.fillStyle = '#000'
    ctx.fillRect(cardX + 2, cardY + 2, NOTICE_CARD_W, NOTICE_CARD_H)
    ctx.globalAlpha = 1

    ctx.fillStyle = NOTICE_BG
    ctx.fillRect(cardX, cardY, NOTICE_CARD_W, NOTICE_CARD_H)
    ctx.strokeStyle = 'rgba(26, 15, 5, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(cardX, cardY, NOTICE_CARD_W, NOTICE_CARD_H)

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

  function drawNoticesPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    drawSubPanelBase(ctx, panelY, 'Notices')

    const card1Y = panelY + 56
    drawNoticeCard(ctx, card1Y, state.noticeState.notices[0].text)
    const card2Y = card1Y + NOTICE_CARD_H + NOTICE_CARD_GAP
    drawNoticeCard(ctx, card2Y, state.noticeState.notices[1].text)

    if (state.noticeDismissVisible && state.noticeDismissAlpha > 0 && state.panelProgress >= 1) {
      ctx.globalAlpha = state.noticeDismissAlpha
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('tap outside to dismiss', LOGICAL_W / 2, LOGICAL_H - 12)
      ctx.globalAlpha = 1
    }
  }

  function drawWorkbenchPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    drawSubPanelBase(ctx, panelY, 'Workbench')
    ctx.font = '13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Pip tinkers with his dice.', LOGICAL_W / 2, panelY + 80)
    ctx.fillText('Upgrades coming soon.', LOGICAL_W / 2, panelY + 100)
  }

  // ── Panel open/close helpers ─────────────────────────────────────────────────

  function openPanel(name: SubPanelName): void {
    state.activeSubPanel = name
    state.panelClosing = false
    // Continue from current progress rather than snapping to bottom
    state.panelAnimStart = performance.now() - state.panelProgress * SUB_PANEL_RISE_MS
    if (name === 'notices') {
      state.noticeDismissVisible = false
      state.noticeDismissAlpha = 0
    }
  }

  function closePanel(): void {
    state.panelClosing = true
    // Continue from current progress rather than snapping to top
    state.panelAnimStart = performance.now() - (1 - state.panelProgress) * SUB_PANEL_SINK_MS
    state.noticeDismissVisible = false
    // activeSubPanel stays set until panelProgress reaches 0 (draw loop clears it)
  }

  // ── Main draw ────────────────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Advance fire animation
    if (timestamp >= state.fireNextFrameTime) {
      for (let i = 0; i < 3; i++) {
        state.fireFlameHeights[i] =
          FIRE_FLAME_MIN + Math.random() * (FIRE_FLAME_MAX - FIRE_FLAME_MIN)
      }
      const interval = FIRE_FRAME_MIN_MS + Math.random() * (FIRE_FRAME_MAX_MS - FIRE_FRAME_MIN_MS)
      state.fireNextFrameTime = timestamp + interval
    }

    // Advance sub-panel animation
    if (!state.panelClosing && state.activeSubPanel !== null && state.panelProgress < 1) {
      const elapsed = timestamp - state.panelAnimStart
      state.panelProgress = Math.min(1, elapsed / SUB_PANEL_RISE_MS)
      if (
        state.activeSubPanel === 'notices' &&
        state.panelProgress >= 1 &&
        !state.noticeDismissVisible
      ) {
        state.noticeDismissVisible = true
        state.noticeDismissAlpha = 1
        state.noticeDismissStart = timestamp
      }
    } else if (state.panelClosing && state.panelProgress > 0) {
      const elapsed = timestamp - state.panelAnimStart
      state.panelProgress = Math.max(0, 1 - elapsed / SUB_PANEL_SINK_MS)
      if (state.panelProgress <= 0) {
        state.activeSubPanel = null
        state.panelClosing = false
      }
    }

    // Advance notice dismiss label fade
    if (state.noticeDismissVisible && state.panelProgress >= 1) {
      const elapsed = timestamp - state.noticeDismissStart
      if (elapsed >= 2000) {
        state.noticeDismissAlpha = Math.max(0, 1 - (elapsed - 2000) / 500)
        if (state.noticeDismissAlpha <= 0) state.noticeDismissVisible = false
      }
    }

    // Base camp scene (no status bar — drawn last so it stays on top)
    drawCampScene(ctx)

    // Sub-panel overlay
    if (state.panelProgress > 0 && state.activeSubPanel !== null) {
      const panelY = getAnimatedPanelY(state.panelProgress)
      if (state.activeSubPanel === 'weapons') drawWeaponPanel(ctx, panelY)
      else if (state.activeSubPanel === 'notices') drawNoticesPanel(ctx, panelY)
      else if (state.activeSubPanel === 'workbench') drawWorkbenchPanel(ctx, panelY)
    }

    // Status bar always on top of scene and panels
    drawStatusBar(ctx)

    // Menu modal on very top
    state.menuModal.draw(ctx)
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    // Menu modal takes priority
    if (state.menuModal.handleClick(x, y)) return

    // Menu button opens modal
    if (isInMenuButton(x, y)) {
      state.menuModal.open()
      return
    }

    // Panel is open or animating — intercept all taps
    if (state.panelProgress > 0 && state.activeSubPanel !== null) {
      const panelY = getAnimatedPanelY(state.panelProgress)
      const closeBtn = getCloseBtnRect(panelY)

      if (inRect(closeBtn, x, y)) {
        closePanel()
        state.hoveredElement = null
        return
      }

      if (state.activeSubPanel === 'weapons' && !state.panelClosing) {
        const weapon = weaponAt(x, y, panelY)
        if (weapon) {
          state.selectedWeaponId = weapon
          return
        }
        if (inRect(PANEL_DESCEND_BTN, x, y)) {
          const newState: MetaState = { ...state.metaState, activeWeaponId: state.selectedWeaponId }
          saveMetaState(newState)
          onStartRun(newState)
          return
        }
      }

      if (state.activeSubPanel === 'notices' && !state.panelClosing && y < panelY) {
        closePanel()
        return
      }

      return
    }

    // Activity bar buttons
    const buttons: SubPanelName[] = ['weapons', 'workbench', 'notices', 'visitor']
    for (let i = 0; i < buttons.length; i++) {
      const r = getActivityButtonRect(i)
      if (inRect(r, x, y)) {
        if (buttons[i] === 'visitor') return
        openPanel(buttons[i])
        return
      }
    }

    // Descend strip
    const descend = getDescendStripRect()
    if (inRect(descend, x, y)) {
      openPanel('weapons')
      return
    }
  }

  function handlePointerMove(x: number, y: number): void {
    state.isMouseDevice = true

    // Modal consumes pointer when open
    if (state.menuModal.handlePointerMove(x, y)) return

    // Menu button hover
    if (isInMenuButton(x, y)) {
      state.hoveredElement = 'menu-btn'
      return
    }

    if (state.panelProgress > 0 && state.activeSubPanel !== null) {
      const panelY = getAnimatedPanelY(state.panelProgress)
      const closeBtn = getCloseBtnRect(panelY)
      if (inRect(closeBtn, x, y)) {
        state.hoveredElement = 'panel-close'
      } else if (state.activeSubPanel === 'weapons' && !state.panelClosing && inRect(PANEL_DESCEND_BTN, x, y)) {
        state.hoveredElement = 'panel-descend'
      } else if (state.activeSubPanel === 'weapons' && !state.panelClosing) {
        const w = weaponAt(x, y, panelY)
        state.hoveredElement = w
      } else {
        state.hoveredElement = null
      }
      return
    }

    const buttons: SubPanelName[] = ['weapons', 'workbench', 'notices', 'visitor']
    for (let i = 0; i < buttons.length; i++) {
      const r = getActivityButtonRect(i)
      if (inRect(r, x, y)) {
        state.hoveredElement = buttons[i] === 'visitor' ? null : `activity-${buttons[i]}`
        return
      }
    }

    const descend = getDescendStripRect()
    state.hoveredElement = inRect(descend, x, y) ? 'descend' : null
  }

  return { draw, handleClick, handlePointerMove }
}
