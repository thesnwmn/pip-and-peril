import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { DicePool, Die } from '../dice/pool'
import { rollPool } from '../dice/pool'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H, MAP_X, MAP_W } from '../screens/game-layout'
import { PIP_SLOTS } from '../dice/pip-slots'

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
const LABEL_CY     = PANEL_TOP + 30   // 460 — gold trap label
const DIE_ROW_TOP  = PANEL_TOP + 58   // 488 — die top edge
const DIE_SIZE     = 62
const DIE_RADIUS   = 10
const DIE_GAP      = 8
const PIP_DOT_R    = 3.8

export const ROLL_BTN_X = MAP_X + SIDE_MARGIN           // 26
export const ROLL_BTN_W = MAP_W - SIDE_MARGIN * 2        // 328
export const ROLL_BTN_Y = DIE_ROW_TOP + DIE_SIZE + 16    // 566
export const ROLL_BTN_H = 50

const RESULT_LINE_Y  = ROLL_BTN_Y + 14    // 580
const OUTCOME_LINE_Y = ROLL_BTN_Y + 38    // 604

const DIE_FACE_BG: Record<string, string> = {
  red: colors.dieFaceRed,
  blue: colors.dieFaceBlue,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
}

export interface TrapPanelContext {
  getPool: () => DicePool
  getPipHp: () => number
  setPipHp: (hp: number) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
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

  ctx.beginPath()
  const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
  if (ctxAny.roundRect) {
    ctxAny.roundRect(x, DIE_ROW_TOP, DIE_SIZE, DIE_SIZE, DIE_RADIUS)
  } else {
    ctx.rect(x, DIE_ROW_TOP, DIE_SIZE, DIE_SIZE)
  }
  ctx.fillStyle = DIE_FACE_BG[die.color] ?? colors.dieFaceGreen
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (value !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    if (die.sides > 6) {
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(value), x + DIE_SIZE / 2, DIE_ROW_TOP + DIE_SIZE / 2)
    } else {
      const slots = PIP_SLOTS[value] ?? []
      const cellW = DIE_SIZE / 3
      for (const slot of slots) {
        const col = slot % 3
        const row = Math.floor(slot / 3)
        const cx = x + col * cellW + cellW / 2
        const cy = DIE_ROW_TOP + row * cellW + cellW / 2
        ctx.beginPath()
        ctx.arc(cx, cy, PIP_DOT_R, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.restore()
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

  type PanelState = 'roll' | 'rolling' | 'outcome'

  let panelState: PanelState = 'roll'
  let rolledPool: DicePool | null = null
  let rollStartTime: DOMHighResTimeStamp | null = null
  let lastScrambleTick: DOMHighResTimeStamp = 0
  let scramble: number[] = []
  let outcomeStartTime: DOMHighResTimeStamp | null = null
  let outcomeResult: 'resolved' | 'defeat' = 'resolved'
  let resultText = ''
  let outcomeText = ''
  let completed = false
  let inputLocked = false
  let hoveredRoll = false

  function markTrapFired(): void {
    const ds = context.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const c = newCells[ds.pip.row][ds.pip.col]
    if (c) {
      newCells[ds.pip.row][ds.pip.col] = { ...c, trapFired: true, trapFlavour: flavourIdx }
    }
    context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function rollComplete(timestamp: DOMHighResTimeStamp): void {
    if (!rolledPool) return

    const greenTotal = rolledPool.totals.green
    const passed = trapDifficulty === 0 || greenTotal >= trapDifficulty

    if (passed) {
      resultText = `🟢 ${greenTotal} vs. ${trapDifficulty} — Pass`
      outcomeText = flavour.pass
      outcomeResult = 'resolved'
    } else {
      const hp = context.getPipHp()
      const newHp = Math.max(0, hp - trapDamage)
      context.setPipHp(newHp)
      resultText = `🟢 ${greenTotal} vs. ${trapDifficulty} — Fail`
      outcomeText = `${flavour.fail} −${trapDamage} HP.`
      outcomeResult = newHp <= 0 ? 'defeat' : 'resolved'
    }

    markTrapFired()
    panelState = 'outcome'
    outcomeStartTime = timestamp
  }

  function dieCentresX(diceCount: number): number[] {
    const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
    const startX = MAP_X + (MAP_W - totalW) / 2
    return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
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

    if (panelState === 'outcome' && !completed && outcomeStartTime !== null) {
      if (timestamp - outcomeStartTime >= 1500) {
        completed = true
        onComplete(outcomeResult)
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
      } else if (panelState === 'outcome' && rolledPool) {
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

    // Outcome phase: result + flavour lines
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
    }

    ctx.restore()
  }

  function handleClick(x: number, y: number): void {
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
