import { colors } from '../colors'
import type { ScreenController } from './main-menu'
import type { MetaState } from '../meta/state'
import { loadMetaState, saveMetaState } from '../meta/state'
import { WEAPON_SPECS } from '../meta/weapons'
import type { Die } from '../dice/pool'

const LOGICAL_W = 390
const LOGICAL_H = 844

const DESCEND_BUTTON_W = 280
const DESCEND_BUTTON_H = 55
const DESCEND_BUTTON_X = (LOGICAL_W - DESCEND_BUTTON_W) / 2
const DESCEND_BUTTON_Y = LOGICAL_H - 60

const PANEL_HEIGHT = 550
const PANEL_Y = LOGICAL_H - PANEL_HEIGHT
const PANEL_W = LOGICAL_W

interface CampState {
  metaState: MetaState
  panelOpen: boolean
  selectedWeaponId: string
  hoveredElement: string | null
  isMouseDevice: boolean
}

const WEAPON_GRID_COLS = 2
const WEAPON_GRID_ROWS = 2
const WEAPON_CARD_W = 130
const WEAPON_CARD_H = 140
const WEAPON_GRID_START_X = (LOGICAL_W - (WEAPON_CARD_W * 2 + 10)) / 2
const WEAPON_GRID_START_Y = 80

const DIE_SIZE = 28
const POOL_PREVIEW_Y = PANEL_Y + 380

export function createCamp(
  transitionTo: (screen: string) => void,
  onStartRun: (metaState: MetaState) => void,
): ScreenController {
  const state: CampState = {
    metaState: loadMetaState(),
    panelOpen: false,
    selectedWeaponId: loadMetaState().activeWeaponId,
    hoveredElement: null,
    isMouseDevice: false,
  }

  function isInDescendButton(x: number, y: number): boolean {
    return (
      x >= DESCEND_BUTTON_X &&
      x <= DESCEND_BUTTON_X + DESCEND_BUTTON_W &&
      y >= DESCEND_BUTTON_Y &&
      y <= DESCEND_BUTTON_Y + DESCEND_BUTTON_H
    )
  }

  function getWeaponCardPos(col: number, row: number): { x: number; y: number } {
    return {
      x: WEAPON_GRID_START_X + col * (WEAPON_CARD_W + 10),
      y: WEAPON_GRID_START_Y + row * (WEAPON_CARD_H + 10),
    }
  }

  function isInWeaponCard(x: number, y: number): string | null {
    const weaponIds = state.metaState.unlockedWeaponIds
    for (let i = 0; i < weaponIds.length; i++) {
      const col = i % WEAPON_GRID_COLS
      const row = Math.floor(i / WEAPON_GRID_COLS)
      const pos = getWeaponCardPos(col, row)
      if (x >= pos.x && x <= pos.x + WEAPON_CARD_W && y >= pos.y && y <= pos.y + WEAPON_CARD_H) {
        return weaponIds[i]
      }
    }
    return null
  }

  function getRunPoolDice(): Die[] {
    const permanent = state.metaState.permanentPool.map(p => ({
      color: p.colour as any,
      sides: p.faces,
    }))
    const weapon = WEAPON_SPECS[state.selectedWeaponId]
    return [...permanent, ...weapon.addedDice]
  }

  function drawCampBackground(ctx: CanvasRenderingContext2D): void {
    // Warm dark background
    ctx.fillStyle = '#1a1208'
    ctx.fillRect(0, 0, LOGICAL_W, PANEL_Y)

    // Scroll wall (upper area)
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(0, 40, LOGICAL_W, 80)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 40, LOGICAL_W, 80)

    // Draw parchment rolls
    for (let i = 0; i < 4; i++) {
      const x = 50 + i * 80
      ctx.fillStyle = '#2e1d0d'
      ctx.fillRect(x, 50, 50, 60)
      ctx.strokeStyle = '#5a3d1a'
      ctx.lineWidth = 1
      ctx.strokeRect(x, 50, 50, 60)
    }
  }

  function drawScrapCounter(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`◈ ${state.metaState.scraps} scraps`, 20, 10)
  }

  function drawWorkbench(ctx: CanvasRenderingContext2D): void {
    const benchX = 20
    const benchY = 200
    const benchW = 150
    const benchH = 120

    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(benchX, benchY, benchW, benchH)
    ctx.strokeStyle = '#5a3d1a'
    ctx.lineWidth = 2
    ctx.strokeRect(benchX, benchY, benchW, benchH)

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Workbench', benchX + benchW / 2, benchY + 5)

    let diceX = benchX + 15
    const diceY = benchY + 30
    const diceGap = 35

    for (const die of state.metaState.permanentPool) {
      drawDie(ctx, diceX, diceY, die.faces, die.colour as any, 20)
      diceX += diceGap
    }
  }

  function drawWeaponRack(ctx: CanvasRenderingContext2D): void {
    const rackX = LOGICAL_W - 120
    const rackY = 180

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Rack', rackX + 50, rackY)

    const weaponSymbols = ['🗡', '🗡', '⚔', '🪄']
    for (let i = 0; i < 4; i++) {
      const x = rackX + (i % 2) * 40
      const y = rackY + 30 + Math.floor(i / 2) * 40
      ctx.font = '24px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(weaponSymbols[i], x, y)
    }
  }

  function drawVisitorStool(ctx: CanvasRenderingContext2D): void {
    const stoolX = LOGICAL_W / 2
    const stoolY = 380

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('[ stool ]', stoolX, stoolY)
  }

  function drawDescendButton(ctx: CanvasRenderingContext2D): void {
    const buttonFill = state.isMouseDevice && state.hoveredElement === 'descend'
      ? '#c8941e'
      : colors.gold

    ctx.fillStyle = buttonFill
    ctx.globalAlpha = 0.8
    ctx.fillRect(DESCEND_BUTTON_X, DESCEND_BUTTON_Y, DESCEND_BUTTON_W, DESCEND_BUTTON_H)

    ctx.globalAlpha = 1
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    const ctxAny = ctx as any
    if ('roundRect' in ctxAny) {
      ctxAny.roundRect(DESCEND_BUTTON_X, DESCEND_BUTTON_Y, DESCEND_BUTTON_W, DESCEND_BUTTON_H, 4)
      ctx.stroke()
    } else {
      ctx.strokeRect(DESCEND_BUTTON_X, DESCEND_BUTTON_Y, DESCEND_BUTTON_W, DESCEND_BUTTON_H)
    }

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Descend', DESCEND_BUTTON_X + DESCEND_BUTTON_W / 2, DESCEND_BUTTON_Y + DESCEND_BUTTON_H / 2)
  }

  function drawWeaponCard(
    ctx: CanvasRenderingContext2D,
    weaponId: string,
    x: number,
    y: number,
    isSelected: boolean,
  ): void {
    const spec = WEAPON_SPECS[weaponId]
    if (!spec) return

    const bgColor = isSelected ? '#3a2818' : '#2e1d0d'
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y, WEAPON_CARD_W, WEAPON_CARD_H)

    const borderColor = isSelected ? colors.gold : '#5a3d1a'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.strokeRect(x, y, WEAPON_CARD_W, WEAPON_CARD_H)

    let textY = y + 8
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(spec.name, x + WEAPON_CARD_W / 2, textY)

    textY += 16
    ctx.font = '10px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.fillText(spec.flavour, x + 5, textY, WEAPON_CARD_W - 10)

    textY += 28
    ctx.font = '10px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    const diceText = spec.addedDice.map(d => `d${d.sides}`).join(', ')
    ctx.fillText(`+${diceText}`, x + WEAPON_CARD_W / 2, textY)

    if (spec.strikeAction) {
      textY += 14
      ctx.font = '10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      const cost = spec.strikeAction.cost.red
      ctx.fillText(`Strike: ${cost}🔴`, x + WEAPON_CARD_W / 2, textY)
    } else {
      textY += 14
      ctx.font = '10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.fillText('—', x + WEAPON_CARD_W / 2, textY)
    }
  }

  function drawWeaponSelectionPanel(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, PANEL_Y)
    ctx.globalAlpha = 1

    ctx.fillStyle = '#2e1d0d'
    ctx.fillRect(0, PANEL_Y, PANEL_W, PANEL_HEIGHT)
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    ctx.strokeRect(0, PANEL_Y, PANEL_W, PANEL_HEIGHT)

    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('← Back', 20, PANEL_Y + 15)

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('Choose Your Weapon', LOGICAL_W - 20, PANEL_Y + 15)

    const weaponIds = state.metaState.unlockedWeaponIds
    for (let i = 0; i < weaponIds.length; i++) {
      const col = i % WEAPON_GRID_COLS
      const row = Math.floor(i / WEAPON_GRID_COLS)
      const pos = getWeaponCardPos(col, row)
      const isSelected = weaponIds[i] === state.selectedWeaponId
      drawWeaponCard(ctx, weaponIds[i], pos.x, pos.y, isSelected)
    }

    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Your dice this run:', LOGICAL_W / 2, POOL_PREVIEW_Y - 25)

    const poolDice = getRunPoolDice()
    const totalDiceWidth = poolDice.length * DIE_SIZE + (poolDice.length - 1) * 6
    const poolStartX = (LOGICAL_W - totalDiceWidth) / 2

    for (let i = 0; i < poolDice.length; i++) {
      const die = poolDice[i]
      const x = poolStartX + i * (DIE_SIZE + 6)
      drawDie(ctx, x, POOL_PREVIEW_Y, die.sides, die.color, DIE_SIZE - 4)
    }

    const buttonFill = state.isMouseDevice && state.hoveredElement === 'descend-into-dark'
      ? '#c8941e'
      : colors.gold

    const descendButtonY = LOGICAL_H - 70
    ctx.fillStyle = buttonFill
    ctx.globalAlpha = 0.8
    ctx.fillRect(DESCEND_BUTTON_X, descendButtonY, DESCEND_BUTTON_W, DESCEND_BUTTON_H)

    ctx.globalAlpha = 1
    ctx.strokeStyle = colors.gold
    ctx.lineWidth = 2
    if ('roundRect' in (ctx as any)) {
      (ctx as any).roundRect(DESCEND_BUTTON_X, descendButtonY, DESCEND_BUTTON_W, DESCEND_BUTTON_H, 4)
      ctx.stroke()
    } else {
      ctx.strokeRect(DESCEND_BUTTON_X, descendButtonY, DESCEND_BUTTON_W, DESCEND_BUTTON_H)
    }

    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Descend into the Dark', DESCEND_BUTTON_X + DESCEND_BUTTON_W / 2, descendButtonY + DESCEND_BUTTON_H / 2)
  }

  function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, sides: number, color: any, size: number): void {
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
    }

    ctx.fillStyle = colorMap[color] || '#999'
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

  function draw(ctx: CanvasRenderingContext2D): void {
    if (!state.panelOpen) {
      drawCampBackground(ctx)
      drawScrapCounter(ctx)
      drawWorkbench(ctx)
      drawWeaponRack(ctx)
      drawVisitorStool(ctx)
      drawDescendButton(ctx)
    } else {
      drawCampBackground(ctx)
      drawScrapCounter(ctx)
      drawWorkbench(ctx)
      drawWeaponRack(ctx)
      drawWeaponSelectionPanel(ctx)
    }
  }

  function handleClick(x: number, y: number): void {
    if (state.panelOpen) {
      if (x <= 60 && y >= PANEL_Y && y <= PANEL_Y + 40) {
        state.panelOpen = false
        return
      }

      const hoveredWeapon = isInWeaponCard(x, y)
      if (hoveredWeapon) {
        state.selectedWeaponId = hoveredWeapon
        return
      }

      if (x >= DESCEND_BUTTON_X && x <= DESCEND_BUTTON_X + DESCEND_BUTTON_W &&
          y >= LOGICAL_H - 70 && y <= LOGICAL_H - 15) {
        const newState = {
          ...state.metaState,
          activeWeaponId: state.selectedWeaponId,
          runCount: state.metaState.runCount + 1,
        }
        saveMetaState(newState)
        onStartRun(newState)
        return
      }
    } else {
      if (isInDescendButton(x, y)) {
        state.panelOpen = true
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    state.isMouseDevice = true
    if (!state.panelOpen) {
      state.hoveredElement = isInDescendButton(x, y) ? 'descend' : null
    } else {
      const hoveredWeapon = isInWeaponCard(x, y)
      if (hoveredWeapon) {
        state.hoveredElement = hoveredWeapon
      } else if (x >= DESCEND_BUTTON_X && x <= DESCEND_BUTTON_X + DESCEND_BUTTON_W &&
                 y >= LOGICAL_H - 70 && y <= LOGICAL_H - 15) {
        state.hoveredElement = 'descend-into-dark'
      } else {
        state.hoveredElement = null
      }
    }
  }

  return { draw, handleClick, handlePointerMove }
}
