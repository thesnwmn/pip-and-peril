import { colors } from '../colors'
import type { ScreenController } from './main-menu'
import type { MetaState, DiceColour, DiceFaces, VisitorInstance } from '../meta/state'
import { loadMetaState, saveMetaState } from '../meta/state'
import { WEAPON_SPECS } from '../meta/weapons'
import type { Die } from '../dice/pool'
import { generateNotices } from '../camp/notices'
import type { NoticeState } from '../camp/notices'
import {
  generateVisitors,
  getDisplayName,
  getVisitorTint,
  tierFor,
  VISITOR_TYPE_LABELS,
} from '../camp/visitors'
import {
  getNextFaces,
  getSwapCost,
  getEngraveValues,
  makeNewDieId,
  ADD_COST,
  ENGRAVE_COST,
} from '../camp/workbench'
import { MARK_SPECS } from '../meta/marks'
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
export const SCENE_BOTTOM = Math.round(0.56 * LOGICAL_H)  // ≈ 473

// ── Activity bar ───────────────────────────────────────────────────────────────
const ACTIVITY_BAR_PAD_TOP = 20
export const ACTIVITY_BTN_H = 68   // icon(28)+gap(8)+label(14)+padding(18) → always ≥44
export const ACTIVITY_BTN_Y = SCENE_BOTTOM + ACTIVITY_BAR_PAD_TOP
const ACTIVITY_BTN_W = Math.floor(LOGICAL_W / 5)  // 78
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

// ── Workbench panel geometry ───────────────────────────────────────────────────
export const WB_DIE_SIZE = 52          // >= 44px tap target
export const WB_DICE_PER_ROW = 6      // wrap threshold
const WB_HEADER_H = 56
const WB_DIE_ROW_TOP = 72             // offset from panelY (header + 16px gap)
const WB_DIE_GAP = 8
const WB_OPS_GAP = 12
const WB_DONE_STRIP_H = 54
const WB_ADD_BTN_H = 40
const WB_ADD_BTN_W = 180
const WB_PANEL_H = LOGICAL_H - Math.round(0.56 * LOGICAL_H)  // panel height when fully open
const WB_DONE_OFFSET = WB_PANEL_H - WB_DONE_STRIP_H
const WB_ADD_BTN_OFFSET = WB_DONE_OFFSET - 8 - WB_ADD_BTN_H
const WB_CAMP_ACCENT = '#c8781e'
const WB_CONFIRM_BTN_W = 140
const WB_CONFIRM_BTN_H = 40
const WB_VALUE_BTN_SIZE = 44
const WB_VALUE_BTN_GAP = 8

export function getWbOpsTop(panelY: number, poolSize: number): number {
  const numRows = Math.ceil(Math.max(1, poolSize) / WB_DICE_PER_ROW)
  const dieRowH = numRows * WB_DIE_SIZE + (numRows - 1) * WB_DIE_GAP
  return panelY + WB_DIE_ROW_TOP + dieRowH + WB_OPS_GAP
}

export function getWbDieRect(dieIndex: number, panelY: number, poolSize: number): Rect {
  const col = dieIndex % WB_DICE_PER_ROW
  const row = Math.floor(dieIndex / WB_DICE_PER_ROW)
  const rowStart = row * WB_DICE_PER_ROW
  const rowDieCount = Math.min(WB_DICE_PER_ROW, poolSize - rowStart)
  const rowWidth = rowDieCount * WB_DIE_SIZE + (rowDieCount - 1) * WB_DIE_GAP
  const startX = (LOGICAL_W - rowWidth) / 2
  return {
    x: Math.round(startX + col * (WB_DIE_SIZE + WB_DIE_GAP)),
    y: panelY + WB_DIE_ROW_TOP + row * (WB_DIE_SIZE + WB_DIE_GAP),
    w: WB_DIE_SIZE,
    h: WB_DIE_SIZE,
  }
}

export function getWbDoneRect(panelY: number): Rect {
  return { x: 0, y: panelY + WB_DONE_OFFSET, w: LOGICAL_W, h: WB_DONE_STRIP_H }
}

export function getWbAddBtnRect(panelY: number): Rect {
  return {
    x: (LOGICAL_W - WB_ADD_BTN_W) / 2,
    y: panelY + WB_ADD_BTN_OFFSET,
    w: WB_ADD_BTN_W,
    h: WB_ADD_BTN_H,
  }
}

// ── Weapon-card layout (relative to animated panelY) ──────────────────────────
const WEAPON_CARD_W = 150
const WEAPON_CARD_H = 80
const WEAPON_CARD_GAP = 14
const WEAPON_GRID_COLS = 2
const WEAPON_GRID_X = (LOGICAL_W - (WEAPON_CARD_W * WEAPON_GRID_COLS + WEAPON_CARD_GAP)) / 2
const WEAPON_GRID_Y_OFFSET = 56
const DIE_SIZE = 28

// Descend CTA and pool preview — offsets from panelY so they scroll in with the panel
const GRID_BOTTOM_OFFSET  = WEAPON_GRID_Y_OFFSET + 2 * WEAPON_CARD_H + WEAPON_CARD_GAP  // 230
const POOL_LABEL_OFFSET   = GRID_BOTTOM_OFFSET + 8    // 238
const POOL_DICE_OFFSET    = POOL_LABEL_OFFSET + 14    // 252
const POOL_DIE_SIZE       = 22
const DESCEND_BTN_OFFSET  = POOL_DICE_OFFSET + POOL_DIE_SIZE + 8  // 282
const DESCEND_BTN_W       = 280
const DESCEND_BTN_H       = 54

const DIE_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

// ── Visitor panel ──────────────────────────────────────────────────────────────
const VP_BTN_H = 48
const VP_BTN_GAP = 12
const VP_BTN_W = Math.floor((LOGICAL_W - 32 - VP_BTN_GAP) / 2)
const VP_ACCEPT_X = 16
const VP_SENDAWAY_X = 16 + VP_BTN_W + VP_BTN_GAP
const VP_BTN_Y = LOGICAL_H - VP_BTN_H - 28    // thumb zone, absolute
const VP_ACCEPT_FEEDBACK_MS = 1500

export function getVpAcceptRect(): { x: number; y: number; w: number; h: number } {
  return { x: VP_ACCEPT_X, y: VP_BTN_Y, w: VP_BTN_W, h: VP_BTN_H }
}

export function getVpSendAwayRect(): { x: number; y: number; w: number; h: number } {
  return { x: VP_SENDAWAY_X, y: VP_BTN_Y, w: VP_BTN_W, h: VP_BTN_H }
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
const ARCH: Rect = { x: LOGICAL_W / 2 - 55, y: 215, w: 110, h: 125 }
// Workbench (left side)
const WORKBENCH_SCENE: Rect = { x: 16, y: 108, w: 132, h: 80 }

// Campfire
const FIRE_CX = 185
const FIRE_CY = 312
const FIRE_BASE_RADIUS = 44
const FIRE_FLAME_MIN = 12
const FIRE_FLAME_MAX = 22
const FIRE_FRAME_MIN_MS = 150
const FIRE_FRAME_MAX_MS = 250

// Pip
const PIP_CX = 242
const PIP_CY = 320

// Visitor stool
const STOOL_CX = 128
const STOOL_CY = 305

// Weapon silhouettes (decorative, right wall)
const WEAPON_SILS = [
  { x: 284, yBase: 280, w: 7,  h: 52, lean: -0.12 },  // dagger
  { x: 308, yBase: 260, w: 11, h: 70, lean:  0.10 },  // sword
  { x: 336, yBase: 245, w: 5,  h: 80, lean: -0.08 },  // staff
]

// ── State ──────────────────────────────────────────────────────────────────────

export type SubPanelName = 'weapons' | 'workbench' | 'notices' | 'visitor' | 'marks'

type WorkbenchMode =
  | 'idle'
  | 'die-selected'
  | 'swap-confirm'
  | 'engrave-picker'
  | 'engrave-confirm'
  | 'add-picker'
  | 'add-confirm'

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
  // Workbench panel state
  workbenchMode: WorkbenchMode
  workbenchSelectedDie: number       // index in permanentPool, -1 if none
  workbenchEngraveValue: number      // chosen value during engrave confirm
  workbenchAddColour: DiceColour | null
  // Hover feedback (mouse devices)
  hoveredElement: string | null
  isMouseDevice: boolean
  // Visitor panel transient state
  visitorFeedback: string | null
  visitorFeedbackEnd: number
  visitorFeedbackSubject: VisitorInstance | null  // snapshot of the accepted visitor for feedback display
  // Marks panel session state
  marksRevealedIds: Set<string>    // locked marks whose conditions have been revealed this session
}

function initVisitorState(base: MetaState): MetaState {
  if (base.visitorEpoch === base.runCount) return base
  const currentVisitors = generateVisitors(base)
  const updated: MetaState = { ...base, currentVisitors, visitorEpoch: base.runCount }
  saveMetaState(updated)
  return updated
}

export function createCamp(
  transitionTo: (screen: string) => void,
  onStartRun: (metaState: MetaState) => void,
  initialMetaState?: MetaState,
): ScreenController {
  const meta = initVisitorState(initialMetaState ?? loadMetaState())
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
    workbenchMode: 'idle',
    workbenchSelectedDie: -1,
    workbenchEngraveValue: 0,
    workbenchAddColour: null,
    hoveredElement: null,
    isMouseDevice: false,
    visitorFeedback: null,
    visitorFeedbackEnd: 0,
    visitorFeedbackSubject: null,
    marksRevealedIds: new Set(),
  }

  // ── Visitor helpers ──────────────────────────────────────────────────────────

  function getActiveVisitor(): VisitorInstance | null {
    return state.metaState.currentVisitors.find(v => !v.resolved) ?? null
  }

  function getUnresolvedCount(): number {
    return state.metaState.currentVisitors.filter(v => !v.resolved).length
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

  function getDescendPanelBtnRect(panelY: number): Rect {
    return {
      x: (LOGICAL_W - DESCEND_BTN_W) / 2,
      y: panelY + DESCEND_BTN_OFFSET,
      w: DESCEND_BTN_W,
      h: DESCEND_BTN_H,
    }
  }

  function weaponAt(x: number, y: number, panelY: number): string | null {
    const ids = state.metaState.unlockedWeaponIds
    for (let i = 0; i < ids.length; i++) {
      if (inRect(getWeaponCardRect(i, panelY), x, y)) return ids[i]
    }
    return null
  }

  function getRunPoolDice(): Die[] {
    const permanent: Die[] = state.metaState.permanentPool.map((p) => ({
      color: p.colour as Die['color'],
      sides: p.faces,
      ...(p.minFloor && p.minFloor > 1 ? { minFloor: p.minFloor } : {}),
    }))
    const weapon = WEAPON_SPECS[state.selectedWeaponId]
    const boons: Die[] = (state.metaState.pendingRunBoons ?? []).map(b => ({
      color: b.colour as Die['color'],
      sides: b.faces,
    }))
    const base = weapon ? [...permanent, ...weapon.addedDice] : permanent
    return boons.length > 0 ? [...base, ...boons] : base
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
    engraved = false,
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
    if (engraved) {
      const markerH = Math.max(4, Math.round(size / 10))
      ctx.globalAlpha = 0.6
      ctx.fillStyle = DIE_COLOR_MAP[color] || '#999'
      ctx.fillRect(x + 2, y + size - markerH - 1, size - 4, markerH)
      ctx.globalAlpha = 1
    }
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

    // Seated visitor figure when there's an unresolved visitor
    const active = getActiveVisitor()
    if (active) {
      const tint = getVisitorTint(active.type)
      ctx.globalAlpha = 0.85
      ctx.fillStyle = tint
      // Body seated on stool
      ctx.beginPath()
      ctx.ellipse(STOOL_CX, STOOL_CY - 14, 6, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      // Head
      ctx.beginPath()
      ctx.arc(STOOL_CX, STOOL_CY - 28, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
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
    } else if (name === 'marks') {
      // Wax-seal outline: circle with ✦ inside
      ctx.beginPath()
      ctx.arc(cx, cy, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.font = `${Math.round(s * 1.1)}px monospace`
      ctx.fillStyle = '#c8781e'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✦', cx, cy)
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
      { name: 'marks', label: 'Marks' },
    ]

    const unresolvedCount = getUnresolvedCount()

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      const r = getActivityButtonRect(i)
      const isVisitor = btn.name === 'visitor'
      const visitorActive = isVisitor && unresolvedCount > 0
      const isMarks = btn.name === 'marks'
      const alpha = isVisitor && !visitorActive ? 0.4 : 1
      const hovered = state.isMouseDevice && state.hoveredElement === `activity-${btn.name}`

      if (hovered && (!isVisitor || visitorActive || isMarks)) {
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
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = isVisitor && !visitorActive ? colors.textMuted : colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(btn.label, cx, r.y + 44)
      ctx.globalAlpha = 1

      // Count badge on visitor button when unresolved visitors exist
      if (visitorActive) {
        const badgeR = 9
        const badgeCX = r.x + r.w - badgeR - 2
        const badgeCY = r.y + badgeR + 2
        ctx.fillStyle = colors.gold
        ctx.beginPath()
        ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#2e1d0d'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(unresolvedCount), badgeCX, badgeCY)
      }
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

    // Run dice pool preview — position relative to panelY so it scrolls in with the panel
    const poolDice = getRunPoolDice()
    const poolLabelY = panelY + POOL_LABEL_OFFSET
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Your dice this run:', LOGICAL_W / 2, poolLabelY)
    const poolDieGap = 5
    const poolTotalW = poolDice.length * POOL_DIE_SIZE + (poolDice.length - 1) * poolDieGap
    let poolDieX = (LOGICAL_W - poolTotalW) / 2
    const poolDieY = panelY + POOL_DICE_OFFSET
    for (const die of poolDice) {
      drawDie(ctx, poolDieX, poolDieY, die.sides, die.color, POOL_DIE_SIZE, !!(die.minFloor && die.minFloor > 1))
      poolDieX += POOL_DIE_SIZE + poolDieGap
    }

    // Descend CTA — relative to panelY so it scrolls in with the panel
    const descendBtn = getDescendPanelBtnRect(panelY)
    const hovered = state.isMouseDevice && state.hoveredElement === 'panel-descend'
    ctx.globalAlpha = hovered ? 0.95 : 0.85
    ctx.fillStyle = colors.gold
    ctx.fillRect(descendBtn.x, descendBtn.y, descendBtn.w, descendBtn.h)
    ctx.globalAlpha = 1
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    strokeRoundRect(ctx, descendBtn, 4)
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#1a1208'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      'Descend into the Dark',
      descendBtn.x + descendBtn.w / 2,
      descendBtn.y + descendBtn.h / 2,
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

  // ── Workbench panel drawing helpers ─────────────────────────────────────────

  function drawWbConfirmBtn(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    label: string,
    hoverKey: string,
  ): void {
    const btnRect: Rect = { x: cx - WB_CONFIRM_BTN_W / 2, y, w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H }
    const hovered = state.isMouseDevice && state.hoveredElement === hoverKey
    ctx.globalAlpha = hovered ? 1 : 0.9
    ctx.fillStyle = WB_CAMP_ACCENT
    ctx.fillRect(btnRect.x, btnRect.y, btnRect.w, btnRect.h)
    ctx.globalAlpha = 1
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#1a1208'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, y + WB_CONFIRM_BTN_H / 2)
  }

  function drawWbCancelLink(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    hoverKey: string,
  ): void {
    const hovered = state.isMouseDevice && state.hoveredElement === hoverKey
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = hovered ? colors.textPrimary : colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Cancel', cx, y)
  }

  function drawWbDivider(ctx: CanvasRenderingContext2D, y: number): void {
    ctx.strokeStyle = '#3a2818'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(LOGICAL_W - 16, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  function drawWbDieOpsArea(ctx: CanvasRenderingContext2D, opsTop: number): void {
    const pool = state.metaState.permanentPool
    const selectedIdx = state.workbenchSelectedDie
    const mode = state.workbenchMode
    const cx = LOGICAL_W / 2

    if (mode === 'die-selected') {
      if (selectedIdx < 0 || selectedIdx >= pool.length) return
      const die = pool[selectedIdx]
      const nextFaces = getNextFaces(die.faces as DiceFaces)
      const swapCost = getSwapCost(die.faces as DiceFaces)
      const scraps = state.metaState.scraps

      const swapY = opsTop + 8
      if (nextFaces !== null && swapCost !== null) {
        const canAffordSwap = scraps >= swapCost
        ctx.globalAlpha = canAffordSwap ? 1 : 0.4
        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textPrimary
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`Swap → d${nextFaces}`, 24, swapY + 14)
        ctx.font = '12px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.gold
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${swapCost} sc`, LOGICAL_W - 24, swapY + 14)
        ctx.globalAlpha = 1
      } else {
        ctx.globalAlpha = 0.4
        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('Max size', 24, swapY + 14)
        ctx.globalAlpha = 1
      }

      const engraveY = opsTop + 48
      if (!die.minFloor || die.minFloor <= 1) {
        const canAffordEngrave = scraps >= ENGRAVE_COST
        ctx.globalAlpha = canAffordEngrave ? 1 : 0.4
        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textPrimary
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('Engrave minimum face', 24, engraveY + 14)
        ctx.font = '12px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.gold
        ctx.textAlign = 'right'
        ctx.fillText(`${ENGRAVE_COST} sc`, LOGICAL_W - 24, engraveY + 14)
        ctx.globalAlpha = 1
      } else {
        ctx.font = '11px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`Engraved: min ${die.minFloor}`, 24, engraveY + 14)
      }
    } else if (mode === 'swap-confirm') {
      if (selectedIdx < 0 || selectedIdx >= pool.length) return
      const die = pool[selectedIdx]
      const nextFaces = getNextFaces(die.faces as DiceFaces)!
      const cost = getSwapCost(die.faces as DiceFaces)!
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`Swap to d${nextFaces} for ${cost} scraps?`, cx, opsTop + 10)
      drawWbConfirmBtn(ctx, cx, opsTop + 36, 'Confirm', 'wb-swap-confirm')
      drawWbCancelLink(ctx, cx, opsTop + 84, 'wb-cancel')
    } else if (mode === 'engrave-picker') {
      if (selectedIdx < 0 || selectedIdx >= pool.length) return
      const die = pool[selectedIdx]
      const values = getEngraveValues(die.faces as DiceFaces)
      const totalW = values.length * WB_VALUE_BTN_SIZE + (values.length - 1) * WB_VALUE_BTN_GAP
      const startX = Math.round((LOGICAL_W - totalW) / 2)
      const btnY = opsTop + 36
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('Engrave minimum face:', cx, opsTop + 10)
      for (let vi = 0; vi < values.length; vi++) {
        const v = values[vi]
        const bx = startX + vi * (WB_VALUE_BTN_SIZE + WB_VALUE_BTN_GAP)
        const hkey = `wb-engrave-val-${v}`
        const hovered = state.isMouseDevice && state.hoveredElement === hkey
        ctx.fillStyle = hovered ? '#3a2818' : '#241608'
        ctx.fillRect(bx, btnY, WB_VALUE_BTN_SIZE, WB_VALUE_BTN_SIZE)
        ctx.strokeStyle = hovered ? colors.gold : '#5a3d1a'
        ctx.lineWidth = 1
        ctx.strokeRect(bx, btnY, WB_VALUE_BTN_SIZE, WB_VALUE_BTN_SIZE)
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textPrimary
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(v), bx + WB_VALUE_BTN_SIZE / 2, btnY + WB_VALUE_BTN_SIZE / 2)
      }
      drawWbCancelLink(ctx, cx, btnY + WB_VALUE_BTN_SIZE + 10, 'wb-cancel')
    } else if (mode === 'engrave-confirm') {
      const v = state.workbenchEngraveValue
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`Lock minimum face to ${v}`, cx, opsTop + 10)
      ctx.fillText(`for ${ENGRAVE_COST} scraps?`, cx, opsTop + 28)
      drawWbConfirmBtn(ctx, cx, opsTop + 54, 'Confirm', 'wb-engrave-confirm')
      drawWbCancelLink(ctx, cx, opsTop + 102, 'wb-cancel')
    }
  }

  function drawWbAddPickerArea(ctx: CanvasRenderingContext2D, opsTop: number): void {
    const meta = state.metaState
    const mode = state.workbenchMode
    const cx = LOGICAL_W / 2
    const hasBlue = meta.permanentPool.some(d => d.colour === 'blue')

    if (mode === 'add-picker') {
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('Add a d4 die to your pool', cx, opsTop + 12)

      const availableColours: DiceColour[] = ['red', 'green', 'yellow']
      if (hasBlue) availableColours.push('blue')
      const dieSize = WB_VALUE_BTN_SIZE
      const dieGap = 10
      const totalW = availableColours.length * dieSize + (availableColours.length - 1) * dieGap
      const startX = Math.round((LOGICAL_W - totalW) / 2)
      const dieY = opsTop + 40

      for (let ci = 0; ci < availableColours.length; ci++) {
        const colour = availableColours[ci]
        const bx = startX + ci * (dieSize + dieGap)
        const canAfford = meta.scraps >= ADD_COST
        const hkey = `wb-add-${colour}`
        const hovered = state.isMouseDevice && state.hoveredElement === hkey && canAfford
        ctx.globalAlpha = hovered ? 0.8 : canAfford ? 1 : 0.4
        drawDie(ctx, bx, dieY, 4, colour, dieSize)
        ctx.globalAlpha = canAfford ? 1 : 0.4
        ctx.font = '12px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.gold
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${ADD_COST} sc`, bx + dieSize / 2, dieY + dieSize + 4)
        ctx.globalAlpha = 1
      }
      drawWbCancelLink(ctx, cx, dieY + dieSize + 22, 'wb-cancel')
    } else if (mode === 'add-confirm') {
      const colour = state.workbenchAddColour!
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`Add d4 ${colour} for ${ADD_COST} scraps?`, cx, opsTop + 12)
      drawWbConfirmBtn(ctx, cx, opsTop + 40, 'Confirm', 'wb-add-confirm')
      drawWbCancelLink(ctx, cx, opsTop + 88, 'wb-cancel')
    }
  }

  function drawWorkbenchPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    const meta = state.metaState
    const pool = meta.permanentPool
    const mode = state.workbenchMode
    const cx = LOGICAL_W / 2

    ctx.globalAlpha = 0.40
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, STATUS_BAR_H, LOGICAL_W, panelY - STATUS_BAR_H)
    ctx.globalAlpha = 1

    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, panelY, LOGICAL_W, LOGICAL_H - panelY)

    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, panelY)
    ctx.lineTo(LOGICAL_W, panelY)
    ctx.stroke()

    // Header
    const headerMidY = panelY + WB_HEADER_H / 2
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText("Pip's Dice", cx, headerMidY)

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`◈ ${meta.scraps}`, LOGICAL_W - CLOSE_BTN_SIZE - 10, headerMidY)

    drawCloseButton(ctx, panelY)

    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, panelY + WB_HEADER_H)
    ctx.lineTo(LOGICAL_W, panelY + WB_HEADER_H)
    ctx.stroke()

    // Die row
    const poolSize = pool.length
    for (let i = 0; i < poolSize; i++) {
      const die = pool[i]
      const r = getWbDieRect(i, panelY, poolSize)
      const isSelected = mode !== 'add-picker' && mode !== 'add-confirm' && state.workbenchSelectedDie === i
      if (isSelected) {
        ctx.strokeStyle = colors.gold
        ctx.lineWidth = 2
        ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4)
      }
      const hovered = state.isMouseDevice && state.hoveredElement === `wb-die-${i}` && !isSelected
      ctx.globalAlpha = hovered ? 0.8 : 1
      drawDie(ctx, r.x, r.y, die.faces, die.colour, WB_DIE_SIZE, !!(die.minFloor && die.minFloor > 1))
      ctx.globalAlpha = 1
    }

    // Operations / add-picker area
    const opsTop = getWbOpsTop(panelY, poolSize)

    if (mode === 'add-picker' || mode === 'add-confirm') {
      drawWbAddPickerArea(ctx, opsTop)
    } else {
      if (mode !== 'idle') {
        drawWbDivider(ctx, opsTop - 6)
        drawWbDieOpsArea(ctx, opsTop)
      }

      // "+ Add Die" button
      const addRect = getWbAddBtnRect(panelY)
      const addHovered = state.isMouseDevice && state.hoveredElement === 'wb-add-die'
      ctx.strokeStyle = addHovered ? colors.textPrimary : '#5a3d1a'
      ctx.lineWidth = 1
      ctx.strokeRect(addRect.x, addRect.y, addRect.w, addRect.h)
      ctx.font = '13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = addHovered ? colors.textPrimary : colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+ Add Die', cx, addRect.y + addRect.h / 2)
    }

    // Done strip
    const doneRect = getWbDoneRect(panelY)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, doneRect.y)
    ctx.lineTo(LOGICAL_W, doneRect.y)
    ctx.stroke()
    const doneHovered = state.isMouseDevice && state.hoveredElement === 'wb-done'
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = doneHovered ? colors.textPrimary : colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Done', cx, doneRect.y + doneRect.h / 2)
  }

  // ── Visitor panel ────────────────────────────────────────────────────────────

  function drawVisitorPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    // During accept feedback, show the accepted visitor's identity; otherwise the next unresolved
    const visitor = state.visitorFeedbackSubject ?? getActiveVisitor()
    if (!visitor) return

    const meta    = state.metaState
    const rel     = meta.visitorRelationships[visitor.individualId] ?? 0
    const tier    = tierFor(rel)
    const name    = getDisplayName(visitor.individualId, tier)
    const typeLabel = VISITOR_TYPE_LABELS[visitor.type]
    const tint    = getVisitorTint(visitor.type)
    const canAfford = meta.scraps >= visitor.offer.costScraps

    // Scrim
    ctx.globalAlpha = 0.40
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, STATUS_BAR_H, LOGICAL_W, panelY - STATUS_BAR_H)
    ctx.globalAlpha = 1

    // Panel surface
    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, panelY, LOGICAL_W, LOGICAL_H - panelY)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, panelY)
    ctx.lineTo(LOGICAL_W, panelY)
    ctx.stroke()

    drawCloseButton(ctx, panelY)

    // Portrait silhouette: straddles top edge (head above, body below)
    const pCX = LOGICAL_W / 2
    const pCY = panelY
    ctx.fillStyle = tint
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.arc(pCX, pCY - 10, 12, 0, Math.PI * 2)  // head
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(pCX, pCY + 12, 10, 14, 0, 0, Math.PI * 2)  // body
    ctx.fill()
    ctx.globalAlpha = 1

    let y = panelY + 38

    // Name
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, LOGICAL_W / 2, y)
    y += 20

    // "regular" warmth marker
    if (tier === 'regular') {
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = WB_CAMP_ACCENT
      ctx.fillText('⋆ regular', LOGICAL_W / 2, y)
      y += 16
    }

    // Type label
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.fillText(typeLabel, LOGICAL_W / 2, y)
    y += 28

    // Condition blurb
    ctx.font = 'italic 13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    const condLines = wrapText(ctx, `"${visitor.condition}"`, LOGICAL_W - 48)
    for (const line of condLines) {
      ctx.fillText(line, LOGICAL_W / 2, y)
      y += 20
    }
    y += 16

    // Accept feedback (1.5 s post-accept) replaces offer + buttons
    if (state.visitorFeedback !== null) {
      ctx.font = 'italic 14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = WB_CAMP_ACCENT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const feedLines = wrapText(ctx, state.visitorFeedback, LOGICAL_W - 48)
      for (const line of feedLines) {
        ctx.fillText(line, LOGICAL_W / 2, y)
        y += 22
      }
      return
    }

    // Offer line
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    const offerLines = wrapText(ctx, visitor.offer.offerLine, LOGICAL_W - 48)
    for (const line of offerLines) {
      ctx.fillText(line, LOGICAL_W / 2, y)
      y += 22
    }

    // Not-enough-scraps note
    if (visitor.offer.costScraps > 0 && !canAfford) {
      y += 6
      ctx.font = '12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#8b3a3a'
      ctx.fillText('Not enough scraps.', LOGICAL_W / 2, y)
    }

    // Accept button
    const acceptRect = getVpAcceptRect()
    const acceptHovered = state.isMouseDevice && state.hoveredElement === 'vp-accept'
    ctx.globalAlpha = !canAfford ? 0.4 : acceptHovered ? 1 : 0.9
    ctx.fillStyle = WB_CAMP_ACCENT
    ctx.fillRect(acceptRect.x, acceptRect.y, acceptRect.w, acceptRect.h)
    ctx.globalAlpha = 1
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = !canAfford ? colors.textMuted : '#1a1208'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Accept', acceptRect.x + acceptRect.w / 2, acceptRect.y + acceptRect.h / 2)

    // Send Away button
    const sendRect = getVpSendAwayRect()
    const sendHovered = state.isMouseDevice && state.hoveredElement === 'vp-send'
    ctx.strokeStyle = sendHovered ? colors.textPrimary : '#5a3d1a'
    ctx.lineWidth = 1
    ctx.strokeRect(sendRect.x, sendRect.y, sendRect.w, sendRect.h)
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = sendHovered ? colors.textPrimary : WB_CAMP_ACCENT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Send Away', sendRect.x + sendRect.w / 2, sendRect.y + sendRect.h / 2)
  }

  // ── Marks panel ──────────────────────────────────────────────────────────────

  const MARK_STAMP_EARNED = '#c8a96e'
  const MARK_STAMP_LOCKED = '#8a7c6a'
  const MARK_FLAVOUR_TEXT = '#5c4a36'
  const MARKS_EARNED_ROW_H = 72
  const MARKS_LOCKED_ROW_H = 44
  const MARKS_LEFT_PAD = 20
  const MARKS_ICON_W = 24
  const MARKS_SECTION_H = 26

  function getMarksLockedRects(panelY: number): Array<{ id: string; rect: Rect }> {
    const meta = state.metaState
    const earnedIds = new Set(meta.marksEarned ?? [])
    const earnedMarks = MARK_SPECS.filter(m => earnedIds.has(m.id))
    const lockedMarks = MARK_SPECS.filter(m => !earnedIds.has(m.id))
    let y = panelY + 56
    if (earnedMarks.length > 0) {
      y += MARKS_SECTION_H
      y += earnedMarks.length * MARKS_EARNED_ROW_H
    }
    if (lockedMarks.length === 0) return []
    y += MARKS_SECTION_H
    return lockedMarks.map(mark => {
      const rect: Rect = { x: 0, y, w: LOGICAL_W, h: MARKS_LOCKED_ROW_H }
      y += MARKS_LOCKED_ROW_H
      return { id: mark.id, rect }
    })
  }

  function drawMarksPanel(ctx: CanvasRenderingContext2D, panelY: number): void {
    drawSubPanelBase(ctx, panelY, 'Descent Record')

    const meta = state.metaState
    const earnedIds = new Set(meta.marksEarned ?? [])
    const earnedMarks = MARK_SPECS.filter(m => earnedIds.has(m.id))
    const lockedMarks = MARK_SPECS.filter(m => !earnedIds.has(m.id))

    let y = panelY + 56

    // Earned section
    if (earnedMarks.length > 0) {
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`Earned (${earnedMarks.length})`, MARKS_LEFT_PAD, y)
      y += MARKS_SECTION_H

      for (const mark of earnedMarks) {
        ctx.font = '16px monospace'
        ctx.fillStyle = MARK_STAMP_EARNED
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText('✦', MARKS_LEFT_PAD, y + 2)

        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = colors.textPrimary
        ctx.fillText(mark.name, MARKS_LEFT_PAD + MARKS_ICON_W, y)
        y += 20

        ctx.font = 'italic 12px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = MARK_FLAVOUR_TEXT
        const lines = wrapText(ctx, mark.flavourLine, LOGICAL_W - MARKS_LEFT_PAD * 2 - MARKS_ICON_W)
        for (const line of lines) {
          ctx.fillText(line, MARKS_LEFT_PAD + MARKS_ICON_W, y)
          y += 17
        }
        y += MARKS_EARNED_ROW_H - 20 - lines.length * 17
      }
    }

    // Locked section
    if (lockedMarks.length > 0) {
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`Locked (${lockedMarks.length})`, MARKS_LEFT_PAD, y)
      y += MARKS_SECTION_H

      for (const mark of lockedMarks) {
        const isRevealed = state.marksRevealedIds.has(mark.id)
        const rowMidY = y + MARKS_LOCKED_ROW_H / 2 - 8

        ctx.font = '14px monospace'
        ctx.fillStyle = MARK_STAMP_LOCKED
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText('○', MARKS_LEFT_PAD, rowMidY)

        ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = isRevealed ? MARK_FLAVOUR_TEXT : colors.textMuted
        const text = isRevealed ? mark.conditionText : '[Tap to reveal]'
        ctx.fillText(text, MARKS_LEFT_PAD + MARKS_ICON_W, rowMidY)

        y += MARKS_LOCKED_ROW_H
      }
    }
  }

  // ── Panel open/close helpers ─────────────────────────────────────────────────

  function resetWorkbenchState(): void {
    state.workbenchMode = 'idle'
    state.workbenchSelectedDie = -1
    state.workbenchEngraveValue = 0
    state.workbenchAddColour = null
  }

  function openPanel(name: SubPanelName): void {
    state.activeSubPanel = name
    state.panelClosing = false
    // Continue from current progress rather than snapping to bottom
    state.panelAnimStart = performance.now() - state.panelProgress * SUB_PANEL_RISE_MS
    if (name === 'notices') {
      state.noticeDismissVisible = false
      state.noticeDismissAlpha = 0
    }
    if (name === 'workbench') {
      resetWorkbenchState()
    }
  }

  function closePanel(): void {
    state.panelClosing = true
    state.panelAnimStart = performance.now() - (1 - state.panelProgress) * SUB_PANEL_SINK_MS
    state.noticeDismissVisible = false
    state.visitorFeedback = null
    state.visitorFeedbackEnd = 0
    state.visitorFeedbackSubject = null
    resetWorkbenchState()
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

    // Advance visitor accept feedback timer
    if (state.visitorFeedback !== null && timestamp >= state.visitorFeedbackEnd) {
      state.visitorFeedback = null
      state.visitorFeedbackEnd = 0
      state.visitorFeedbackSubject = null
      if (getUnresolvedCount() === 0) closePanel()
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
      else if (state.activeSubPanel === 'visitor') drawVisitorPanel(ctx, panelY)
      else if (state.activeSubPanel === 'marks') drawMarksPanel(ctx, panelY)
    }

    // Status bar always on top of scene and panels
    drawStatusBar(ctx)

    // Menu modal on very top
    state.menuModal.draw(ctx)
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  function handleVisitorAccept(visitor: VisitorInstance): void {
    const meta  = state.metaState
    const offer = visitor.offer
    let scraps  = meta.scraps - offer.costScraps
    const pendingRunBoons = [...(meta.pendingRunBoons ?? [])]

    if (offer.kind === 'tinker-boon' && offer.boonDie) {
      pendingRunBoons.push(offer.boonDie)
    } else if (offer.kind === 'traveller-gift' && offer.rewardScraps !== undefined) {
      scraps += offer.rewardScraps
    }

    const relationships = { ...meta.visitorRelationships }
    relationships[visitor.individualId] = (relationships[visitor.individualId] ?? 0) + 1

    const currentVisitors = meta.currentVisitors.map(v =>
      v.individualId === visitor.individualId ? { ...v, resolved: true } : v
    )

    const newMeta: MetaState = {
      ...meta,
      scraps,
      pendingRunBoons,
      visitorRelationships: relationships,
      currentVisitors,
    }
    saveMetaState(newMeta)
    state.metaState = newMeta

    state.visitorFeedback = offer.acceptLine
    state.visitorFeedbackEnd = performance.now() + VP_ACCEPT_FEEDBACK_MS
    state.visitorFeedbackSubject = visitor   // snapshot so feedback renders under the right identity
  }

  function handleVisitorResolve(visitor: VisitorInstance): void {
    const currentVisitors = state.metaState.currentVisitors.map(v =>
      v.individualId === visitor.individualId ? { ...v, resolved: true } : v
    )
    const newMeta: MetaState = { ...state.metaState, currentVisitors }
    saveMetaState(newMeta)
    state.metaState = newMeta
    if (getUnresolvedCount() === 0) closePanel()
  }

  function handleWorkbenchClick(x: number, y: number, panelY: number): void {
    const meta = state.metaState
    const pool = meta.permanentPool
    const mode = state.workbenchMode
    const opsTop = getWbOpsTop(panelY, pool.length)
    const cx = LOGICAL_W / 2

    if (inRect(getWbDoneRect(panelY), x, y)) {
      closePanel()
      return
    }

    if (mode !== 'add-picker' && mode !== 'add-confirm') {
      for (let i = 0; i < pool.length; i++) {
        if (inRect(getWbDieRect(i, panelY, pool.length), x, y)) {
          if (state.workbenchSelectedDie === i) {
            state.workbenchMode = 'idle'
            state.workbenchSelectedDie = -1
          } else {
            state.workbenchMode = 'die-selected'
            state.workbenchSelectedDie = i
          }
          return
        }
      }
    }

    if (mode === 'idle' || mode === 'die-selected') {
      if (inRect(getWbAddBtnRect(panelY), x, y)) {
        state.workbenchMode = 'add-picker'
        state.workbenchSelectedDie = -1
        return
      }
    }

    if (mode === 'die-selected') {
      const selectedIdx = state.workbenchSelectedDie
      if (selectedIdx < 0 || selectedIdx >= pool.length) return
      const die = pool[selectedIdx]
      const swapY = opsTop + 10
      const engraveY = opsTop + 48
      const swapCost = getSwapCost(die.faces as DiceFaces)
      if (swapCost !== null && meta.scraps >= swapCost) {
        if (y >= swapY && y <= swapY + 28) {
          state.workbenchMode = 'swap-confirm'
          return
        }
      }
      if (!die.minFloor || die.minFloor <= 1) {
        if (meta.scraps >= ENGRAVE_COST && y >= engraveY && y <= engraveY + 28) {
          state.workbenchMode = 'engrave-picker'
          return
        }
      }
    }

    if (mode === 'swap-confirm') {
      const confirmRect: Rect = {
        x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 36,
        w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H,
      }
      if (inRect(confirmRect, x, y)) {
        const selectedIdx = state.workbenchSelectedDie
        if (selectedIdx < 0 || selectedIdx >= pool.length) return
        const die = pool[selectedIdx]
        const nextFaces = getNextFaces(die.faces as DiceFaces)!
        const cost = getSwapCost(die.faces as DiceFaces)!
        const newPool = pool.map((d, i) => i === selectedIdx ? { ...d, faces: nextFaces } : d)
        const newMeta: MetaState = { ...meta, scraps: meta.scraps - cost, permanentPool: newPool }
        saveMetaState(newMeta)
        state.metaState = newMeta
        state.workbenchMode = 'idle'
        state.workbenchSelectedDie = -1
        return
      }
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 84, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) {
        state.workbenchMode = 'die-selected'
        return
      }
    }

    if (mode === 'engrave-picker') {
      const selectedIdx = state.workbenchSelectedDie
      if (selectedIdx < 0 || selectedIdx >= pool.length) return
      const die = pool[selectedIdx]
      const values = getEngraveValues(die.faces as DiceFaces)
      const totalW = values.length * WB_VALUE_BTN_SIZE + (values.length - 1) * WB_VALUE_BTN_GAP
      const startX = Math.round((LOGICAL_W - totalW) / 2)
      const btnY = opsTop + 36
      for (let vi = 0; vi < values.length; vi++) {
        const bx = startX + vi * (WB_VALUE_BTN_SIZE + WB_VALUE_BTN_GAP)
        if (x >= bx && x <= bx + WB_VALUE_BTN_SIZE && y >= btnY && y <= btnY + WB_VALUE_BTN_SIZE) {
          state.workbenchEngraveValue = values[vi]
          state.workbenchMode = 'engrave-confirm'
          return
        }
      }
      const cancelRect: Rect = { x: cx - 40, y: btnY + WB_VALUE_BTN_SIZE + 10, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) {
        state.workbenchMode = 'die-selected'
        return
      }
    }

    if (mode === 'engrave-confirm') {
      const confirmRect: Rect = {
        x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 54,
        w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H,
      }
      if (inRect(confirmRect, x, y)) {
        const selectedIdx = state.workbenchSelectedDie
        if (selectedIdx < 0 || selectedIdx >= pool.length) return
        const v = state.workbenchEngraveValue
        const newPool = pool.map((d, i) => i === selectedIdx ? { ...d, minFloor: v } : d)
        const newMeta: MetaState = { ...meta, scraps: meta.scraps - ENGRAVE_COST, permanentPool: newPool }
        saveMetaState(newMeta)
        state.metaState = newMeta
        state.workbenchMode = 'idle'
        state.workbenchSelectedDie = -1
        state.workbenchEngraveValue = 0
        return
      }
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 102, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) {
        state.workbenchMode = 'engrave-picker'
        return
      }
    }

    if (mode === 'add-picker') {
      const hasBlue = meta.permanentPool.some(d => d.colour === 'blue')
      const availableColours: DiceColour[] = ['red', 'green', 'yellow']
      if (hasBlue) availableColours.push('blue')
      const dieSize = WB_VALUE_BTN_SIZE
      const dieGap = 10
      const totalW = availableColours.length * dieSize + (availableColours.length - 1) * dieGap
      const startX = Math.round((LOGICAL_W - totalW) / 2)
      const dieY = opsTop + 40
      for (let ci = 0; ci < availableColours.length; ci++) {
        const colour = availableColours[ci]
        const bx = startX + ci * (dieSize + dieGap)
        if (meta.scraps >= ADD_COST && x >= bx && x <= bx + dieSize && y >= dieY && y <= dieY + dieSize) {
          state.workbenchAddColour = colour
          state.workbenchMode = 'add-confirm'
          return
        }
      }
      const cancelRect: Rect = { x: cx - 40, y: dieY + dieSize + 22, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) {
        state.workbenchMode = 'idle'
        state.workbenchAddColour = null
        return
      }
    }

    if (mode === 'add-confirm') {
      const confirmRect: Rect = {
        x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 40,
        w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H,
      }
      if (inRect(confirmRect, x, y)) {
        const colour = state.workbenchAddColour!
        const newDie = { id: makeNewDieId(pool, colour), colour, faces: 4 as DiceFaces }
        const newPool = [...pool, newDie]
        const newMeta: MetaState = { ...meta, scraps: meta.scraps - ADD_COST, permanentPool: newPool }
        saveMetaState(newMeta)
        state.metaState = newMeta
        state.workbenchMode = 'idle'
        state.workbenchAddColour = null
        return
      }
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 88, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) {
        state.workbenchMode = 'add-picker'
        state.workbenchAddColour = null
        return
      }
    }
  }

  function getWorkbenchHoverTarget(x: number, y: number, panelY: number): string | null {
    const meta = state.metaState
    const pool = meta.permanentPool
    const mode = state.workbenchMode
    const opsTop = getWbOpsTop(panelY, pool.length)
    const cx = LOGICAL_W / 2

    if (inRect(getWbDoneRect(panelY), x, y)) return 'wb-done'

    if (mode !== 'add-picker' && mode !== 'add-confirm') {
      for (let i = 0; i < pool.length; i++) {
        if (inRect(getWbDieRect(i, panelY, pool.length), x, y)) return `wb-die-${i}`
      }
    }

    if (mode === 'idle' || mode === 'die-selected') {
      if (inRect(getWbAddBtnRect(panelY), x, y)) return 'wb-add-die'
    }

    if (mode === 'die-selected') {
      const selectedIdx = state.workbenchSelectedDie
      if (selectedIdx >= 0 && selectedIdx < pool.length) {
        const die = pool[selectedIdx]
        const swapY = opsTop + 10
        const engraveY = opsTop + 48
        const swapCost = getSwapCost(die.faces as DiceFaces)
        if (swapCost !== null && meta.scraps >= swapCost && y >= swapY && y <= swapY + 28) {
          return 'wb-swap'
        }
        if (!die.minFloor || die.minFloor <= 1) {
          if (meta.scraps >= ENGRAVE_COST && y >= engraveY && y <= engraveY + 28) return 'wb-engrave'
        }
      }
    }

    if (mode === 'swap-confirm') {
      const confirmRect: Rect = { x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 36, w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H }
      if (inRect(confirmRect, x, y)) return 'wb-swap-confirm'
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 84, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) return 'wb-cancel'
    }

    if (mode === 'engrave-picker') {
      const selectedIdx = state.workbenchSelectedDie
      if (selectedIdx >= 0 && selectedIdx < pool.length) {
        const die = pool[selectedIdx]
        const values = getEngraveValues(die.faces as DiceFaces)
        const totalW = values.length * WB_VALUE_BTN_SIZE + (values.length - 1) * WB_VALUE_BTN_GAP
        const startX = Math.round((LOGICAL_W - totalW) / 2)
        const btnY = opsTop + 36
        for (let vi = 0; vi < values.length; vi++) {
          const v = values[vi]
          const bx = startX + vi * (WB_VALUE_BTN_SIZE + WB_VALUE_BTN_GAP)
          if (x >= bx && x <= bx + WB_VALUE_BTN_SIZE && y >= btnY && y <= btnY + WB_VALUE_BTN_SIZE) {
            return `wb-engrave-val-${v}`
          }
        }
        const btnY2 = opsTop + 36
        const cancelRect: Rect = { x: cx - 40, y: btnY2 + WB_VALUE_BTN_SIZE + 10, w: 80, h: 28 }
        if (inRect(cancelRect, x, y)) return 'wb-cancel'
      }
    }

    if (mode === 'engrave-confirm') {
      const confirmRect: Rect = { x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 54, w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H }
      if (inRect(confirmRect, x, y)) return 'wb-engrave-confirm'
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 102, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) return 'wb-cancel'
    }

    if (mode === 'add-picker') {
      const hasBlue = meta.permanentPool.some(d => d.colour === 'blue')
      const availableColours: DiceColour[] = ['red', 'green', 'yellow']
      if (hasBlue) availableColours.push('blue')
      const dieSize = WB_VALUE_BTN_SIZE
      const dieGap = 10
      const totalW = availableColours.length * dieSize + (availableColours.length - 1) * dieGap
      const startX = Math.round((LOGICAL_W - totalW) / 2)
      const dieY = opsTop + 40
      for (let ci = 0; ci < availableColours.length; ci++) {
        const colour = availableColours[ci]
        const bx = startX + ci * (dieSize + dieGap)
        if (meta.scraps >= ADD_COST && x >= bx && x <= bx + dieSize && y >= dieY && y <= dieY + dieSize) {
          return `wb-add-${colour}`
        }
      }
      const cancelRect: Rect = { x: cx - 40, y: dieY + dieSize + 22, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) return 'wb-cancel'
    }

    if (mode === 'add-confirm') {
      const confirmRect: Rect = { x: cx - WB_CONFIRM_BTN_W / 2, y: opsTop + 40, w: WB_CONFIRM_BTN_W, h: WB_CONFIRM_BTN_H }
      if (inRect(confirmRect, x, y)) return 'wb-add-confirm'
      const cancelRect: Rect = { x: cx - 40, y: opsTop + 88, w: 80, h: 28 }
      if (inRect(cancelRect, x, y)) return 'wb-cancel'
    }

    return null
  }

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
        if (inRect(getDescendPanelBtnRect(panelY), x, y)) {
          const stateForRun: MetaState = {
            ...state.metaState,
            activeWeaponId: state.selectedWeaponId,
          }
          // Persist with boons cleared (consumed on run start); game receives them via stateForRun
          saveMetaState({ ...stateForRun, pendingRunBoons: [] })
          onStartRun(stateForRun)
          return
        }
      }

      if (state.activeSubPanel === 'workbench' && !state.panelClosing) {
        handleWorkbenchClick(x, y, panelY)
        return
      }

      if (state.activeSubPanel === 'visitor' && !state.panelClosing && state.panelProgress >= 1) {
        // While showing accept feedback, ignore all taps
        if (state.visitorFeedback !== null) return

        const visitor = getActiveVisitor()
        if (visitor) {
          const canAfford = state.metaState.scraps >= visitor.offer.costScraps
          if (inRect(getVpAcceptRect(), x, y) && canAfford) {
            handleVisitorAccept(visitor)
            return
          }
          if (inRect(getVpSendAwayRect(), x, y)) {
            handleVisitorResolve(visitor)
            return
          }
        }
      }

      if (state.activeSubPanel === 'marks' && !state.panelClosing && state.panelProgress >= 1) {
        for (const { id, rect } of getMarksLockedRects(panelY)) {
          if (inRect(rect, x, y)) {
            state.marksRevealedIds.add(id)
            return
          }
        }
      }

      // Tap in the scene zone (above the panel) closes any open panel
      if (!state.panelClosing && y < panelY) {
        closePanel()
        return
      }

      return
    }

    // Activity bar buttons
    const buttons: SubPanelName[] = ['weapons', 'workbench', 'notices', 'visitor', 'marks']
    for (let i = 0; i < buttons.length; i++) {
      const r = getActivityButtonRect(i)
      if (inRect(r, x, y)) {
        if (buttons[i] === 'visitor') {
          if (getUnresolvedCount() > 0) openPanel('visitor')
          return
        }
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
      } else if (state.activeSubPanel === 'weapons' && !state.panelClosing && inRect(getDescendPanelBtnRect(panelY), x, y)) {
        state.hoveredElement = 'panel-descend'
      } else if (state.activeSubPanel === 'weapons' && !state.panelClosing) {
        const w = weaponAt(x, y, panelY)
        state.hoveredElement = w
      } else if (state.activeSubPanel === 'workbench' && !state.panelClosing) {
        state.hoveredElement = getWorkbenchHoverTarget(x, y, panelY)
      } else if (state.activeSubPanel === 'visitor' && !state.panelClosing && state.visitorFeedback === null) {
        const visitor = getActiveVisitor()
        if (visitor) {
          const canAfford = state.metaState.scraps >= visitor.offer.costScraps
          if (canAfford && inRect(getVpAcceptRect(), x, y)) {
            state.hoveredElement = 'vp-accept'
          } else if (inRect(getVpSendAwayRect(), x, y)) {
            state.hoveredElement = 'vp-send'
          } else {
            state.hoveredElement = null
          }
        } else {
          state.hoveredElement = null
        }
      } else {
        state.hoveredElement = null
      }
      return
    }

    const buttons: SubPanelName[] = ['weapons', 'workbench', 'notices', 'visitor', 'marks']
    for (let i = 0; i < buttons.length; i++) {
      const r = getActivityButtonRect(i)
      if (inRect(r, x, y)) {
        const isVisitorActive = buttons[i] === 'visitor' && getUnresolvedCount() > 0
        state.hoveredElement = (buttons[i] === 'visitor' && !isVisitorActive) ? null : `activity-${buttons[i]}`
        return
      }
    }

    const descend = getDescendStripRect()
    state.hoveredElement = inRect(descend, x, y) ? 'descend' : null
  }

  return { draw, handleClick, handlePointerMove }
}
