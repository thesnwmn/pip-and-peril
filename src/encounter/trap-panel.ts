import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { DicePool, Die } from '../dice/pool'
import { rollPool } from '../dice/pool'
import type { Item, Inventory } from '../satchel/types'
import { consumeItem } from '../satchel/items'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H, MAP_X, MAP_W } from '../screens/game-layout'
import { drawDie } from '../dice/draw'

// Trap flavour variants — same mechanic, different labels and outcome lines
export const TRAP_FLAVOURS = [
  { label: 'Pressure plate!', pass: 'Slipped clear.',   fail: 'Spikes.' },
  { label: 'Tripwire!',       pass: 'Ducked under.',    fail: 'Caught it.' },
  { label: 'Snap trap!',      pass: 'Squeezed through.', fail: 'Caught.' },
  { label: 'Falling stones!', pass: 'Rolled clear.',    fail: 'Struck.' },
] as const

// trapDamage = ceil(difficulty / 2), minimum 1
export function computeTrapDamage(trapDifficulty: number): number {
  return Math.max(1, Math.ceil(trapDifficulty / 2))
}

// Layout — panel zone from PANEL_TOP to LOGICAL_H
const PANEL_W = LOGICAL_W
const SIDE_MARGIN = 16
const LABEL_CY     = PANEL_TOP + 30   // gold trap label
const DIE_ROW_TOP  = PANEL_TOP + 58   // die top edge
const DIE_SIZE     = 62
const DIE_RADIUS   = 10
const DIE_GAP      = 8
const PIP_DOT_R    = 3.8

export const ROLL_BTN_X = MAP_X + SIDE_MARGIN           // 26
export const ROLL_BTN_W = MAP_W - SIDE_MARGIN * 2        // 328
export const ROLL_BTN_Y = DIE_ROW_TOP + DIE_SIZE + 16   // Roll button top
export const ROLL_BTN_H = 50

const RESULT_LINE_Y  = ROLL_BTN_Y + 14
const OUTCOME_LINE_Y = ROLL_BTN_Y + 38

// Luck interrupt sub-panel layout (below die row)
const LUCK_SUB_X = ROLL_BTN_X                            // 26
const LUCK_SUB_W = ROLL_BTN_W                            // 328
const LUCK_SUB_Y = DIE_ROW_TOP + DIE_SIZE + 20          // just below dice
const LUCK_SUB_H = 192
const LUCK_ITEM_Y = LUCK_SUB_Y + 16                     // item name row
const LUCK_LABEL_Y = LUCK_ITEM_Y + 20                   // "Reroll?" label
export const LUCK_BTN_X = LUCK_SUB_X + 8               // shared x for Use/Pass buttons
export const LUCK_BTN_W = LUCK_SUB_W - 16              // shared width for Use/Pass buttons
export const LUCK_USE_BTN_Y = LUCK_LABEL_Y + 22        // [Use] button top
export const LUCK_USE_BTN_H = 44
export const LUCK_PASS_BTN_Y = LUCK_USE_BTN_Y + LUCK_USE_BTN_H + 8  // [Pass] button top
export const LUCK_PASS_BTN_H = 40
const LUCK_TIMER_Y = LUCK_PASS_BTN_Y + LUCK_PASS_BTN_H + 14  // timer bar top
const LUCK_TIMER_H = 8
const LUCK_TIMER_DURATION = 3000                        // ms

export interface TrapPanelContext {
  getPool: () => DicePool
  getPipHp: () => number
  setPipHp: (hp: number) => void
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}


export function createTrapEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: TrapPanelContext,
): EncounterPanel {
  const trapDifficulty = cell.trapDifficulty ?? 0
  const trapDamage = computeTrapDamage(trapDifficulty)

  // Assign flavour once; persist to cell so re-entry shows the same label
  const flavourIdx = cell.trapFlavour ?? Math.floor(Math.random() * TRAP_FLAVOURS.length)
  const flavour = TRAP_FLAVOURS[flavourIdx]

  type PanelState = 'roll' | 'rolling' | 'luck-prompt' | 'outcome'

  let panelState: PanelState = 'roll'
  let rolledPool: DicePool | null = null
  let rollStartTime: DOMHighResTimeStamp | null = null
  let lastScrambleTick: DOMHighResTimeStamp = 0
  let scramble: number[] = []
  let outcomeResult: 'resolved' | 'defeat' = 'resolved'
  let resultText = ''
  let outcomeText = ''
  let completed = false
  let inputLocked = false
  let hoveredRoll = false

  // Luck prompt state
  let luckPromptStartTime: DOMHighResTimeStamp | null = null
  let pendingGreenTotal: number = 0  // the failed roll total, stored for dismissal
  let noReLuckPrompt = false         // set after [Use] to suppress re-prompt on second fail

  function markTrapFired(): void {
    const ds = context.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const c = newCells[ds.pip.row][ds.pip.col]
    if (c) {
      newCells[ds.pip.row][ds.pip.col] = { ...c, trapFired: true, trapFlavour: flavourIdx }
    }
    context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function getLuckItem(): Item | null {
    return context.getInventory().items.find(i => i.luckyClass) ?? null
  }

  function applyTrapFailure(greenTotal: number): void {
    const hp = context.getPipHp()
    const newHp = Math.max(0, hp - trapDamage)
    context.setPipHp(newHp)
    resultText = `🟢 ${greenTotal} vs. ${trapDifficulty} — Fail`
    outcomeText = `${flavour.fail} −${trapDamage} HP.`
    outcomeResult = newHp <= 0 ? 'defeat' : 'resolved'
  }

  function rollComplete(timestamp: DOMHighResTimeStamp): void {
    if (!rolledPool) return

    const greenTotal = rolledPool.totals.green
    const passed = trapDifficulty === 0 || greenTotal >= trapDifficulty

    if (passed) {
      resultText = `🟢 ${greenTotal} vs. ${trapDifficulty} — Pass`
      outcomeText = flavour.pass
      outcomeResult = 'resolved'
      markTrapFired()
      panelState = 'outcome'
    } else {
      const luckItem = noReLuckPrompt ? null : getLuckItem()
      noReLuckPrompt = false
      if (luckItem !== null) {
        // Defer damage; show Luck interrupt prompt first
        pendingGreenTotal = greenTotal
        luckPromptStartTime = timestamp
        markTrapFired()
        panelState = 'luck-prompt'
      } else {
        applyTrapFailure(greenTotal)
        markTrapFired()
        panelState = 'outcome'
      }
    }
  }

  function useLuckItem(item: Item): void {
    // Consume item immediately, pre-roll the result, then animate through 'rolling'
    // so the player sees the dice tumble before the new outcome lands.
    context.setInventory(consumeItem(context.getInventory(), item.id))
    rolledPool = rollPool(context.getPool())
    noReLuckPrompt = true  // no re-prompt if this reroll also fails
    luckPromptStartTime = null
    rollStartTime = null
    scramble = []
    panelState = 'rolling'
  }

  function dismissLuckPrompt(): void {
    applyTrapFailure(pendingGreenTotal)
    luckPromptStartTime = null
    panelState = 'outcome'
  }

  function dieCentresX(diceCount: number): number[] {
    const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
    const startX = MAP_X + (MAP_W - totalW) / 2
    return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
  }

  function drawDieFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    die: Die,
    value: number | null,
    greyed: boolean,
  ): void {
    ctx.save()
    if (greyed) ctx.globalAlpha = 0.28
    drawDie(ctx, x, DIE_ROW_TOP, DIE_SIZE, die.color, die.sides, value ?? undefined)
    ctx.restore()
  }

  function drawLuckPrompt(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp, item: Item): void {
    const elapsed = luckPromptStartTime !== null ? timestamp - luckPromptStartTime : 0
    const timerFraction = Math.max(0, 1 - elapsed / LUCK_TIMER_DURATION)

    // Sub-panel background with amber border
    ctx.save()

    ctx.fillStyle = colors.surface
    ctx.beginPath()
    const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LUCK_SUB_X, LUCK_SUB_Y, LUCK_SUB_W, LUCK_SUB_H, 8)
    } else {
      ctx.rect(LUCK_SUB_X, LUCK_SUB_Y, LUCK_SUB_W, LUCK_SUB_H)
    }
    ctx.fill()
    ctx.strokeStyle = colors.roomChest
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Item name row
    ctx.font = 'bold 15px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_ITEM_Y)

    // "Reroll?" label
    ctx.font = '13px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('Reroll?', LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_LABEL_Y)

    // [Use] button — amber primary CTA
    ctx.fillStyle = colors.roomChest
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LUCK_BTN_X, LUCK_USE_BTN_Y, LUCK_BTN_W, LUCK_USE_BTN_H, 6)
    } else {
      ctx.rect(LUCK_BTN_X, LUCK_USE_BTN_Y, LUCK_BTN_W, LUCK_USE_BTN_H)
    }
    ctx.fill()
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.fillText(`Use ${item.name}`, LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_USE_BTN_Y + LUCK_USE_BTN_H / 2)

    // [Pass] button — muted secondary
    ctx.fillStyle = colors.surface
    ctx.strokeStyle = colors.textMuted
    ctx.lineWidth = 1
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LUCK_BTN_X, LUCK_PASS_BTN_Y, LUCK_BTN_W, LUCK_PASS_BTN_H, 6)
    } else {
      ctx.rect(LUCK_BTN_X, LUCK_PASS_BTN_Y, LUCK_BTN_W, LUCK_PASS_BTN_H)
    }
    ctx.fill()
    ctx.stroke()
    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('Pass', LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_PASS_BTN_Y + LUCK_PASS_BTN_H / 2)

    // Timer bar track
    const timerTrackX = LUCK_SUB_X + 12
    const timerTrackW = LUCK_SUB_W - 24
    ctx.fillStyle = colors.surfaceRaised
    ctx.beginPath()
    ctx.rect(timerTrackX, LUCK_TIMER_Y, timerTrackW, LUCK_TIMER_H)
    ctx.fill()

    // Timer bar fill (drains left to right)
    const fillW = Math.round(timerTrackW * timerFraction)
    if (fillW > 0) {
      ctx.fillStyle = colors.roomChest
      ctx.beginPath()
      ctx.rect(timerTrackX, LUCK_TIMER_Y, fillW, LUCK_TIMER_H)
      ctx.fill()
    }

    ctx.restore()
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // ── State machine update ────────────────────────────────────────────────
    if (panelState === 'rolling') {
      if (rollStartTime === null) rollStartTime = timestamp
      const elapsed = timestamp - rollStartTime
      if (elapsed >= 500) {
        rollComplete(timestamp)
      } else if (timestamp - lastScrambleTick >= 50) {
        lastScrambleTick = timestamp
        const pool = context.getPool()
        scramble = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
      }
    }

    if (panelState === 'luck-prompt' && luckPromptStartTime !== null) {
      if (timestamp - luckPromptStartTime >= LUCK_TIMER_DURATION) {
        dismissLuckPrompt()
      }
    }

    // ── Render ──────────────────────────────────────────────────────────────
    ctx.save()
    ctx.globalAlpha = 1

    // Background
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, PANEL_W, LOGICAL_H - PANEL_TOP)

    // Trap-colour top border (hot-dungeon temperature)
    ctx.fillStyle = colors.roomTrap
    ctx.fillRect(0, PANEL_TOP, PANEL_W, 2)

    // Trap label
    ctx.font = 'bold 19px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(flavour.label, PANEL_W / 2, LABEL_CY)

    // Dice row — all dice visible; non-green are greyed to reinforce "only green counts"
    const pool = context.getPool()
    const centres = dieCentresX(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      let displayValue: number | null = null

      if (panelState === 'rolling') {
        displayValue = scramble[i] !== undefined ? scramble[i] : null
      } else if ((panelState === 'outcome' || panelState === 'luck-prompt') && rolledPool) {
        displayValue = rolledPool.rolls[i]?.value ?? null
      }

      // Grey non-green dice only in the pre-roll state (reinforces "only green counts");
      // show all dice at full alpha once rolling so settled values are readable.
      const greyed = die.color !== 'green' && panelState === 'roll'
      drawDieFace(ctx, centres[i], die, displayValue, greyed)
    }

    // Roll phase: Roll button
    if (panelState === 'roll') {
      ctx.fillStyle = hoveredRoll ? 'rgba(106,44,16,0.35)' : 'rgba(106,44,16,0.2)'
      ctx.strokeStyle = colors.roomTrap
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(ROLL_BTN_X, ROLL_BTN_Y, ROLL_BTN_W, ROLL_BTN_H)
      ctx.fill()
      ctx.stroke()

      ctx.font = 'bold 15px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Roll', PANEL_W / 2, ROLL_BTN_Y + ROLL_BTN_H / 2)
    }

    // Luck interrupt prompt (drawn on top of the panel, below dice)
    if (panelState === 'luck-prompt') {
      const luckItem = getLuckItem()
      if (luckItem !== null) {
        drawLuckPrompt(ctx, timestamp, luckItem)
      } else {
        // No luck item found (consumed between rolls) — auto-dismiss
        dismissLuckPrompt()
      }
    }

    // Outcome phase: result + flavour lines + tap prompt
    if (panelState === 'outcome') {
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(resultText, PANEL_W / 2, RESULT_LINE_Y)

      ctx.font = 'italic 16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(outcomeText, PANEL_W / 2, OUTCOME_LINE_Y)

      ctx.font = '12px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('tap to continue', PANEL_W / 2, OUTCOME_LINE_Y + 36)
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
    if (panelState === 'outcome') {
      if (!completed) {
        completed = true
        onComplete(outcomeResult)
      }
      return
    }

    if (panelState === 'luck-prompt') {
      const luckItem = getLuckItem()
      // [Use] button
      if (x >= LUCK_BTN_X && x <= LUCK_BTN_X + LUCK_BTN_W && y >= LUCK_USE_BTN_Y && y <= LUCK_USE_BTN_Y + LUCK_USE_BTN_H) {
        if (luckItem !== null) useLuckItem(luckItem)
        return
      }
      // [Pass] button
      if (x >= LUCK_BTN_X && x <= LUCK_BTN_X + LUCK_BTN_W && y >= LUCK_PASS_BTN_Y && y <= LUCK_PASS_BTN_Y + LUCK_PASS_BTN_H) {
        dismissLuckPrompt()
        return
      }
      // All other taps ignored while prompt is visible
      return
    }

    if (inputLocked) return
    if (panelState !== 'roll') return

    const inBtn = x >= ROLL_BTN_X && x <= ROLL_BTN_X + ROLL_BTN_W
      && y >= ROLL_BTN_Y && y <= ROLL_BTN_Y + ROLL_BTN_H
    if (!inBtn) return

    inputLocked = true
    rolledPool = rollPool(context.getPool())
    rollStartTime = null
    panelState = 'rolling'
    scramble = []
  }

  function handlePointerMove(x: number, y: number): void {
    hoveredRoll = panelState === 'roll'
      && x >= ROLL_BTN_X && x <= ROLL_BTN_X + ROLL_BTN_W
      && y >= ROLL_BTN_Y && y <= ROLL_BTN_Y + ROLL_BTN_H
  }

  return { draw, handleClick, handlePointerMove, mapView, snapCamera: true }
}
