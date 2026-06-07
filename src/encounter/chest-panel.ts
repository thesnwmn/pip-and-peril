import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { DicePool } from '../dice/pool'
import { rollPool } from '../dice/pool'
import type { Item, Inventory } from '../satchel/types'
import { acquireItem, consumeItem } from '../satchel/items'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { iconGlyph } from '../satchel/icon'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H, MAP_X, MAP_W } from '../screens/game-layout'
import { PIP_SLOTS } from '../dice/pip-slots'

// Trap damage calculation (for trapped variant)
function computeTrapDamage(trapDifficulty: number): number {
  return Math.max(1, Math.ceil(trapDifficulty / 2))
}

// Panel state machine phases
type PanelState =
  | 'closed'              // showing the unopened chest choice
  | 'lock-rolling'        // locked variant: rolling blue dice
  | 'lock-outcome'        // locked variant: showing pass/fail result
  | 'trap-rolling'        // trapped variant: rolling agility (green) dice
  | 'trap-outcome'        // trapped variant: showing pass/fail result
  | 'luck-prompt'         // showing luck interrupt on failed lock/trap
  | 'loot-reveal'         // showing loot animation and collect button
  | 'empty-reveal'        // showing "Empty." with auto-dismiss

// Layout constants
const PANEL_W = LOGICAL_W
const SIDE_MARGIN = 16
const HEADER_CY = PANEL_TOP + 30
const DESC_CY = PANEL_TOP + 60

// Button layout
const BTN_W = 244
const BTN_H = 52
const PRIMARY_BTN_X = (PANEL_W - BTN_W) / 2
const PRIMARY_BTN_Y = DESC_CY + 36
const SECONDARY_BTN_Y = PRIMARY_BTN_Y + BTN_H + 12

// Die display
const DIE_ROW_TOP = PANEL_TOP + 68
const DIE_SIZE = 62
const DIE_RADIUS = 10
const DIE_GAP = 8
const PIP_DOT_R = 3.8

// Loot card
const LOOT_CARD_X = PRIMARY_BTN_X
const LOOT_CARD_W = BTN_W
const LOOT_CARD_Y = DESC_CY + 30
const COLLECT_BTN_Y = LOOT_CARD_Y + 140

const DIE_FACE_BG: Record<string, string> = {
  red: colors.dieFaceRed,
  blue: colors.dieFaceBlue,
  green: colors.dieFaceGreen,
  yellow: colors.dieFaceYellow,
}

export interface ChestPanelContext {
  getPool: () => DicePool
  getPipHp: () => number
  setPipHp: (hp: number) => void
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}

function drawDieFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  die: { color: string; sides: number },
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

function dieCentresX(diceCount: number): number[] {
  const totalW = diceCount * DIE_SIZE + (diceCount - 1) * DIE_GAP
  const startX = MAP_X + (MAP_W - totalW) / 2
  return Array.from({ length: diceCount }, (_, i) => startX + i * (DIE_SIZE + DIE_GAP))
}

export function createChestEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: ChestPanelContext,
): EncounterPanel {
  const variant = cell.chestVariant ?? 'basic'
  const loot = cell.loot
  const lockDifficulty = cell.lockDifficulty ?? 0
  const trapDifficulty = cell.trapDifficulty ?? 0
  const trapDamage = computeTrapDamage(trapDifficulty)

  let panelState: PanelState = 'closed'
  let completed = false
  let hoveredElement: 'primary' | 'secondary' | 'collect' | null = null

  // Lock roll state
  let rolledPool: DicePool | null = null
  let rollStartTime: DOMHighResTimeStamp | null = null
  let lastScrambleTick: DOMHighResTimeStamp = 0
  let scramble: number[] = []
  let lockRollPassed = false

  // Trap roll state
  let trapRollStartTime: DOMHighResTimeStamp | null = null
  let lastTrapScrambleTick: DOMHighResTimeStamp = 0
  let trapScramble: number[] = []
  let trapRollPassed = false

  // Luck interrupt state
  let luckPromptStartTime: DOMHighResTimeStamp | null = null
  let noReLuckPrompt = false
  const LUCK_TIMER_DURATION = 3000

  // Loot reveal animation
  let lootRevealStartTime: DOMHighResTimeStamp | null = null
  const LOOT_ANIMATION_DURATION = 300
  const GOLD_COUNT_DURATION = 500

  function getLuckItem(): Item | null {
    return context.getInventory().items.find(i => i.luckyClass) ?? null
  }

  function markChestOpened(): void {
    const ds = context.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const c = newCells[ds.pip.row][ds.pip.col]
    if (c) {
      newCells[ds.pip.row][ds.pip.col] = { ...c, chestState: 'opened' }
    }
    context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function markTrapFired(): void {
    const ds = context.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const c = newCells[ds.pip.row][ds.pip.col]
    if (c) {
      newCells[ds.pip.row][ds.pip.col] = { ...c, trapFired: true }
    }
    context.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function handleLockRollComplete(timestamp: DOMHighResTimeStamp): void {
    if (!rolledPool) return
    const blueTotal = rolledPool.totals.blue
    lockRollPassed = lockDifficulty === 0 || blueTotal >= lockDifficulty

    if (lockRollPassed) {
      panelState = 'loot-reveal'
      lootRevealStartTime = timestamp
    } else {
      panelState = 'lock-outcome'
      const luckItem = noReLuckPrompt ? null : getLuckItem()
      if (luckItem !== null) {
        setTimeout(() => {
          panelState = 'luck-prompt'
          luckPromptStartTime = timestamp
        }, 100)
      }
    }
  }

  function handleTrapRollComplete(timestamp: DOMHighResTimeStamp): void {
    if (!rolledPool) return
    const greenTotal = rolledPool.totals.green
    trapRollPassed = trapDifficulty === 0 || greenTotal >= trapDifficulty

    markTrapFired()

    if (trapRollPassed) {
      panelState = 'loot-reveal'
      lootRevealStartTime = timestamp
    } else {
      context.setPipHp(Math.max(0, context.getPipHp() - trapDamage))
      panelState = 'trap-outcome'
      if (context.getPipHp() <= 0) {
        setTimeout(() => {
          completed = true
          onComplete('defeat')
        }, 1500)
      }
    }
  }

  function useLuckItem(item: Item): void {
    context.setInventory(consumeItem(context.getInventory(), item.id))
    rolledPool = rollPool(context.getPool())
    noReLuckPrompt = true
    luckPromptStartTime = null
    rollStartTime = null
    scramble = []
    panelState = 'lock-rolling'
  }

  function dismissLuckPrompt(): void {
    panelState = 'lock-outcome'
    luckPromptStartTime = null
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // State machine updates
    if (panelState === 'lock-rolling') {
      if (rollStartTime === null) rollStartTime = timestamp
      const elapsed = timestamp - rollStartTime
      if (elapsed >= 500) {
        handleLockRollComplete(timestamp)
      } else if (timestamp - lastScrambleTick >= 50) {
        lastScrambleTick = timestamp
        const pool = context.getPool()
        scramble = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
      }
    }

    if (panelState === 'trap-rolling') {
      if (trapRollStartTime === null) trapRollStartTime = timestamp
      const elapsed = timestamp - trapRollStartTime
      if (elapsed >= 500) {
        handleTrapRollComplete(timestamp)
      } else if (timestamp - lastTrapScrambleTick >= 50) {
        lastTrapScrambleTick = timestamp
        const pool = context.getPool()
        trapScramble = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
      }
    }

    if (panelState === 'luck-prompt' && luckPromptStartTime !== null) {
      if (timestamp - luckPromptStartTime >= LUCK_TIMER_DURATION) {
        dismissLuckPrompt()
      }
    }

    if (panelState === 'empty-reveal') {
      // Auto-dismiss after 1.5s
      setTimeout(() => {
        if (panelState === 'empty-reveal' && !completed) {
          completed = true
          markChestOpened()
          onComplete('collected')
        }
      }, 1500)
    }

    // Render background and header
    ctx.save()
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, PANEL_W, LOGICAL_H - PANEL_TOP)
    ctx.fillStyle = colors.roomChest
    ctx.fillRect(0, PANEL_TOP, PANEL_W, 2)

    const desc = variant === 'basic' ? 'An old chest.'
      : variant === 'locked' ? 'A locked chest.'
      : 'A trapped chest.'

    ctx.font = 'bold 18px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(desc, PANEL_W / 2, HEADER_CY)

    if (variant === 'locked') {
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.fillText(`Needs 🔵 ${lockDifficulty}`, PANEL_W / 2, DESC_CY)
    } else if (variant === 'trapped') {
      ctx.font = '14px monospace'
      ctx.fillStyle = colors.textMuted
      ctx.fillText('Something is rigged to this lid.', PANEL_W / 2, DESC_CY)
    }

    // Render state-specific content
    if (panelState === 'closed') {
      renderClosedPanel(ctx)
    } else if (panelState === 'lock-rolling') {
      renderLockRollingPhase(ctx)
    } else if (panelState === 'lock-outcome') {
      renderLockOutcomePhase(ctx, timestamp)
    } else if (panelState === 'trap-rolling') {
      renderTrapRollingPhase(ctx)
    } else if (panelState === 'trap-outcome') {
      renderTrapOutcomePhase(ctx)
    } else if (panelState === 'luck-prompt') {
      renderLuckPrompt(ctx, timestamp)
    } else if (panelState === 'loot-reveal') {
      renderLootReveal(ctx, timestamp)
    } else if (panelState === 'empty-reveal') {
      renderEmptyReveal(ctx)
    }

    ctx.restore()
  }

  function renderClosedPanel(ctx: CanvasRenderingContext2D): void {
    // Dice for locked variant
    if (variant === 'locked') {
      const pool = context.getPool()
      const centres = dieCentresX(pool.dice.length)
      for (let i = 0; i < pool.dice.length; i++) {
        const die = pool.dice[i]
        drawDieFace(ctx, centres[i], die, null, die.color !== 'blue')
      }
    }

    // Buttons
    const primaryText = variant === 'basic' ? 'Open'
      : variant === 'locked' ? 'Try the Lock'
      : 'Open Anyway'

    const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
    const primaryHovered = hoveredElement === 'primary'
    ctx.fillStyle = primaryHovered ? 'rgba(106,44,16,0.35)' : 'rgba(106,44,16,0.2)'
    ctx.strokeStyle = colors.roomChest
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(PRIMARY_BTN_X, PRIMARY_BTN_Y, BTN_W, BTN_H, 6)
    } else {
      ctx.rect(PRIMARY_BTN_X, PRIMARY_BTN_Y, BTN_W, BTN_H)
    }
    ctx.fill()
    ctx.stroke()

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(primaryText, PANEL_W / 2, PRIMARY_BTN_Y + BTN_H / 2)

    const secondaryHovered = hoveredElement === 'secondary'
    ctx.fillStyle = secondaryHovered ? colors.textPrimary : colors.textMuted
    ctx.font = '12px monospace'
    ctx.fillText('Leave', PANEL_W / 2, SECONDARY_BTN_Y + BTN_H / 2)
  }

  function renderLockRollingPhase(ctx: CanvasRenderingContext2D): void {
    const pool = context.getPool()
    const centres = dieCentresX(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      const displayValue = scramble[i] ?? null
      drawDieFace(ctx, centres[i], die, displayValue, false)
    }
  }

  function renderLockOutcomePhase(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    if (!rolledPool) return
    const pool = context.getPool()
    const centres = dieCentresX(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      const displayValue = rolledPool.rolls[i]?.value ?? null
      drawDieFace(ctx, centres[i], die, displayValue, false)
    }

    const blueTotal = rolledPool.totals.blue
    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🔵 ${blueTotal} vs. ${lockDifficulty} — ${lockRollPassed ? 'Pass' : 'Fail'}`, PANEL_W / 2, DIE_ROW_TOP + DIE_SIZE + 20)

    if (lockRollPassed) {
      ctx.font = 'italic 16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.fillText('Lock clicks open.', PANEL_W / 2, DIE_ROW_TOP + DIE_SIZE + 50)
    }
  }

  function renderTrapRollingPhase(ctx: CanvasRenderingContext2D): void {
    const pool = context.getPool()
    const centres = dieCentresX(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      const displayValue = trapScramble[i] ?? null
      const greyed = die.color !== 'green'
      drawDieFace(ctx, centres[i], die, displayValue, greyed)
    }

    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Spring trap!', PANEL_W / 2, DIE_ROW_TOP + DIE_SIZE + 20)
  }

  function renderTrapOutcomePhase(ctx: CanvasRenderingContext2D): void {
    if (!rolledPool) return
    const pool = context.getPool()
    const centres = dieCentresX(pool.dice.length)
    for (let i = 0; i < pool.dice.length; i++) {
      const die = pool.dice[i]
      const displayValue = rolledPool.rolls[i]?.value ?? null
      drawDieFace(ctx, centres[i], die, displayValue, false)
    }

    const greenTotal = rolledPool.totals.green
    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🟢 ${greenTotal} vs. ${trapDifficulty}`, PANEL_W / 2, DIE_ROW_TOP + DIE_SIZE + 20)

    if (context.getPipHp() > 0) {
      ctx.font = 'italic 16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.fillText(`Caught! −${trapDamage} HP.`, PANEL_W / 2, DIE_ROW_TOP + DIE_SIZE + 50)
    }
  }

  function renderLuckPrompt(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    const item = getLuckItem()
    if (!item) return

    const elapsed = luckPromptStartTime !== null ? timestamp - luckPromptStartTime : 0
    const timerFraction = Math.max(0, 1 - elapsed / LUCK_TIMER_DURATION)

    const LUCK_SUB_X = 26
    const LUCK_SUB_W = 328
    const LUCK_SUB_Y = DIE_ROW_TOP + DIE_SIZE + 20
    const LUCK_SUB_H = 192

    const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }
    ctx.fillStyle = colors.surface
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LUCK_SUB_X, LUCK_SUB_Y, LUCK_SUB_W, LUCK_SUB_H, 8)
    } else {
      ctx.rect(LUCK_SUB_X, LUCK_SUB_Y, LUCK_SUB_W, LUCK_SUB_H)
    }
    ctx.fill()
    ctx.strokeStyle = colors.roomChest
    ctx.lineWidth = 1.5
    ctx.stroke()

    const LUCK_ITEM_Y = LUCK_SUB_Y + 16
    const LUCK_LABEL_Y = LUCK_ITEM_Y + 20
    const LUCK_BTN_X = LUCK_SUB_X + 8
    const LUCK_BTN_W = LUCK_SUB_W - 16
    const LUCK_USE_BTN_Y = LUCK_LABEL_Y + 22
    const LUCK_USE_BTN_H = 44
    const LUCK_PASS_BTN_Y = LUCK_USE_BTN_Y + LUCK_USE_BTN_H + 8

    ctx.font = 'bold 15px monospace'
    ctx.fillStyle = colors.textPrimary
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_ITEM_Y)

    ctx.font = '13px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('Reroll?', LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_LABEL_Y)

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

    ctx.fillStyle = colors.surface
    ctx.strokeStyle = colors.textMuted
    ctx.lineWidth = 1
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LUCK_BTN_X, LUCK_PASS_BTN_Y, LUCK_BTN_W, 40, 6)
    } else {
      ctx.rect(LUCK_BTN_X, LUCK_PASS_BTN_Y, LUCK_BTN_W, 40)
    }
    ctx.fill()
    ctx.stroke()
    ctx.font = '14px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('Pass', LUCK_SUB_X + LUCK_SUB_W / 2, LUCK_PASS_BTN_Y + 20)

    // Timer bar
    const timerTrackX = LUCK_SUB_X + 12
    const timerTrackW = LUCK_SUB_W - 24
    ctx.fillStyle = colors.surfaceRaised
    ctx.beginPath()
    ctx.rect(timerTrackX, LUCK_PASS_BTN_Y + 50, timerTrackW, 8)
    ctx.fill()

    if (timerFraction > 0) {
      ctx.fillStyle = colors.roomChest
      ctx.beginPath()
      ctx.rect(timerTrackX, LUCK_PASS_BTN_Y + 50, timerTrackW * timerFraction, 8)
      ctx.fill()
    }
  }

  function renderLootReveal(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (lootRevealStartTime === null) {
      lootRevealStartTime = timestamp
    }

    const elapsed = timestamp - lootRevealStartTime
    const progress = Math.min(1, elapsed / LOOT_ANIMATION_DURATION)

    ctx.save()
    const ctxAny = ctx as unknown as { roundRect?: (...args: unknown[]) => void }

    // Loot card background
    ctx.globalAlpha = progress
    ctx.fillStyle = colors.surfaceRaised
    ctx.beginPath()
    if (ctxAny.roundRect) {
      ctxAny.roundRect(LOOT_CARD_X, LOOT_CARD_Y, LOOT_CARD_W, 120, 6)
    } else {
      ctx.rect(LOOT_CARD_X, LOOT_CARD_Y, LOOT_CARD_W, 120)
    }
    ctx.fill()

    if (loot && loot.gold > 0) {
      const goldElapsed = Math.min(GOLD_COUNT_DURATION, elapsed)
      const goldProgress = goldElapsed / GOLD_COUNT_DURATION
      const displayedGold = Math.round(loot.gold * goldProgress)

      ctx.font = 'bold 22px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`◈ ${displayedGold}`, PANEL_W / 2, LOOT_CARD_Y + 30)
    }

    if (loot && loot.item) {
      const item = CATALOG_ITEMS.find(i => i.id === loot.item)
      if (item) {
        ctx.font = '14px monospace'
        ctx.fillStyle = colors.textPrimary
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.name, PANEL_W / 2, LOOT_CARD_Y + 70)

        ctx.font = 'italic 12px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.fillText(item.description, PANEL_W / 2, LOOT_CARD_Y + 90)
      }
    }

    ctx.restore()

    // Collect button appears after animation
    if (progress >= 1) {
      const collectHovered = hoveredElement === 'collect'
      ctx.fillStyle = collectHovered ? 'rgba(106,44,16,0.35)' : 'rgba(106,44,16,0.2)'
      ctx.strokeStyle = colors.roomChest
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (ctxAny.roundRect) {
        ctxAny.roundRect(PRIMARY_BTN_X, COLLECT_BTN_Y, BTN_W, BTN_H, 6)
      } else {
        ctx.rect(PRIMARY_BTN_X, COLLECT_BTN_Y, BTN_W, BTN_H)
      }
      ctx.fill()
      ctx.stroke()

      ctx.font = 'bold 14px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Collect', PANEL_W / 2, COLLECT_BTN_Y + BTN_H / 2)
    }
  }

  function renderEmptyReveal(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'italic 18px monospace'
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Empty.', PANEL_W / 2, LOOT_CARD_Y + 50)
  }

  function handleClick(x: number, y: number): void {
    if (completed) return

    if (panelState === 'closed') {
      // Primary button
      if (x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= PRIMARY_BTN_Y && y <= PRIMARY_BTN_Y + BTN_H) {
        if (variant === 'basic') {
          if (loot === null) {
            panelState = 'empty-reveal'
          } else {
            panelState = 'loot-reveal'
            lootRevealStartTime = null
          }
        } else if (variant === 'locked') {
          panelState = 'lock-rolling'
          rolledPool = rollPool(context.getPool())
          rollStartTime = null
          scramble = []
        } else if (variant === 'trapped') {
          panelState = 'trap-rolling'
          rolledPool = rollPool(context.getPool())
          trapRollStartTime = null
          trapScramble = []
        }
        return
      }
      // Secondary button (Leave)
      if (x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= SECONDARY_BTN_Y && y <= SECONDARY_BTN_Y + BTN_H) {
        completed = true
        onComplete('left')
        return
      }
    }

    if (panelState === 'loot-reveal') {
      if (x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= COLLECT_BTN_Y && y <= COLLECT_BTN_Y + BTN_H) {
        if (loot) {
          const inv = context.getInventory()
          context.setInventory({ ...inv, gold: inv.gold + loot.gold })
          if (loot.item) {
            const item = CATALOG_ITEMS.find(i => i.id === loot.item)
            if (item) {
              context.setInventory(acquireItem(context.getInventory(), item))
            }
          }
        }
        markChestOpened()
        completed = true
        onComplete('collected')
        return
      }
    }

    if (panelState === 'lock-outcome' || panelState === 'trap-outcome') {
      // Tapping outcome auto-closes
      if (!getLuckItem()) {
        completed = true
        onComplete('left')
      }
    }

    if (panelState === 'luck-prompt') {
      const item = getLuckItem()
      const LUCK_BTN_X = 26 + 8
      const LUCK_BTN_W = 328 - 16
      const LUCK_USE_BTN_Y = DIE_ROW_TOP + DIE_SIZE + 20 + 16 + 20 + 22
      const LUCK_PASS_BTN_Y = LUCK_USE_BTN_Y + 44 + 8

      if (item && x >= LUCK_BTN_X && x <= LUCK_BTN_X + LUCK_BTN_W
        && y >= LUCK_USE_BTN_Y && y <= LUCK_USE_BTN_Y + 44) {
        useLuckItem(item)
        return
      }

      if (x >= LUCK_BTN_X && x <= LUCK_BTN_X + LUCK_BTN_W
        && y >= LUCK_PASS_BTN_Y && y <= LUCK_PASS_BTN_Y + 40) {
        dismissLuckPrompt()
        return
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (panelState === 'closed') {
      const inPrimary = x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= PRIMARY_BTN_Y && y <= PRIMARY_BTN_Y + BTN_H
      const inSecondary = x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= SECONDARY_BTN_Y && y <= SECONDARY_BTN_Y + BTN_H

      hoveredElement = inPrimary ? 'primary' : inSecondary ? 'secondary' : null
    } else if (panelState === 'loot-reveal') {
      const inCollect = x >= PRIMARY_BTN_X && x <= PRIMARY_BTN_X + BTN_W
        && y >= COLLECT_BTN_Y && y <= COLLECT_BTN_Y + BTN_H
      hoveredElement = inCollect ? 'collect' : null
    }
  }

  return { draw, handleClick, handlePointerMove, mapView }
}
