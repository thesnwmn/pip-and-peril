import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { canAfford, resetPool, rollPool, spendPips } from '../dice/pool'
import type { CombatState } from './types'
import { GOBLIN } from './intents'
import { selectIntent } from './intents'
import {
  applyStrike,
  applyHeavyStrike,
  applyEnemyTurn,
  applyFlee,
  canFlee,
  rollGoldReward,
} from './encounter'
import { drawCombatBanner, drawCombatPanel, hitTest, type CatId } from './panel'
import { drawCombatOverlay } from './overlay'
import type { Inventory, Item } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { applyItemEffect } from '../satchel/items'
import { COMBAT_CONFIG } from '../encounter/config'
import { PANEL_TOP, COMBAT_MAP_CENTER_X, COMBAT_MAP_CENTER_Y } from '../screens/game-layout'

export interface CombatContext {
  getPool: () => DicePool
  setPool: (pool: DicePool) => void
  getPipHp: () => number
  setPipHp: (hp: number) => void
  getPipMaxHp: () => number
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => DungeonState
  setDungeonState: (state: DungeonState) => void
}

export function createCombatEncounterPanel(
  onComplete: (outcome: string) => void,
  ctx: CombatContext,
  entryFrom: { col: number; row: number },
): EncounterPanel {
  // ── Combat state ─────────────────────────────────────────────────────────

  let combat: CombatState = {
    enemy: { ...GOBLIN },
    phase: 'awaiting-roll',
    intent: selectIntent(GOBLIN.intents),  // telegraph before first roll
    reservedGreen: 0,
    entryFrom,
    goldAwarded: 0,
    itemUsedThisTurn: false,
  }

  let log = ''
  let bannerStartTime: number | null = null
  let completed = false

  // ── Panel UI state ────────────────────────────────────────────────────────

  let openCategory: CatId | null = null
  let fleePending = false
  let hoveredElement: string | null = null
  let flashingElement: string | null = null
  let flashEndTime: number | null = null

  // ── Roll animation ────────────────────────────────────────────────────────

  interface AnimState { startTime: number | null; lastTick: number; scramble: number[] }
  const anim: AnimState = { startTime: null, lastTick: 0, scramble: [] }

  ctx.setPool(resetPool(ctx.getPool()))

  // ── Helpers ───────────────────────────────────────────────────────────────

  function signalComplete(outcome: string): void {
    if (completed) return
    completed = true
    onComplete(outcome)
  }

  function flash(id: string): void {
    flashingElement = id
    flashEndTime = performance.now() + 300
  }

  function startRoll(): void {
    const rolled = rollPool(ctx.getPool())
    ctx.setPool(rolled)
    anim.startTime = performance.now()
    anim.lastTick = 0
    anim.scramble = []
    openCategory = null
    fleePending = false
  }

  function markRoomFled(): void {
    const ds = ctx.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const cell = newCells[ds.pip.row][ds.pip.col]
    if (cell) {
      newCells[ds.pip.row][ds.pip.col] = { ...cell, fled: true, cleared: false }
    }
    ctx.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function markRoomCleared(): void {
    const ds = ctx.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const cell = newCells[ds.pip.row][ds.pip.col]
    if (cell) {
      newCells[ds.pip.row][ds.pip.col] = { ...cell, cleared: true, fled: false }
    }
    ctx.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleRoll(): void {
    const pool = ctx.getPool()
    if (pool.state === 'rolling') return

    if (combat.phase === 'awaiting-roll') {
      // First roll: start player turn.
      combat = { ...combat, phase: 'player-turn', itemUsedThisTurn: false }
      startRoll()
      return
    }

    if (combat.phase === 'player-turn') {
      // End turn: fire enemy intent, reset, then await next roll.
      const firedIntent = combat.intent  // capture before applyEnemyTurn swaps to next intent
      const prevHp = ctx.getPipHp()
      const result = applyEnemyTurn(combat, prevHp)
      ctx.setPipHp(result.pipHp)
      // Return to awaiting-roll so the player sees the new intent before rolling again.
      combat = { ...result.combat, phase: result.defeat ? 'defeat' : 'awaiting-roll', itemUsedThisTurn: false }
      openCategory = null
      fleePending = false

      if (result.defeat) {
        log = ''
        bannerStartTime = performance.now()
        return
      }

      // Build log entry for what just fired.
      if (firedIntent.kind === 'guard') {
        log = `${combat.enemy.name} braces — +${firedIntent.value} block`
      } else if (result.damage === 0) {
        log = `${combat.enemy.name} strikes — dodged! (${prevHp}HP)`
      } else {
        log = `${combat.enemy.name} strikes — −${result.damage}HP! (${prevHp}→${ctx.getPipHp()})`
      }

      // Reset dice to idle; player must roll to start their next turn.
      ctx.setPool(resetPool(ctx.getPool()))
    }
  }

  function handleStrike(heavy: boolean): void {
    const cost = heavy ? { red: 4 } : { red: 2 }
    if (!canAfford(ctx.getPool(), cost)) { flash(heavy ? 'sub-heavy' : 'sub-strike'); return }
    const { pool: updated } = spendPips(ctx.getPool(), cost)
    ctx.setPool(updated)
    const prevEnemyHp = combat.enemy.hp
    const result = heavy ? applyHeavyStrike(combat) : applyStrike(combat)
    combat = result.combat
    const label = heavy ? 'Heavy Strike' : 'Strike'
    const absorbed = result.absorbed > 0 ? ` (${result.absorbed} blocked)` : ''
    log = `${label} — ${result.damage} dmg${absorbed}! (${combat.enemy.name}: ${prevEnemyHp}→${combat.enemy.hp})`

    if (result.victory) {
      const goldEarned = rollGoldReward(combat.enemy)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldEarned })
      combat = { ...combat, goldAwarded: goldEarned }
      markRoomCleared()
      log = ''
      bannerStartTime = performance.now()
      openCategory = null
    }
  }

  function handleReserve(): void {
    if (!canAfford(ctx.getPool(), { green: 1 })) { flash('sub-reserve'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 1 })
    ctx.setPool(updated)
    combat = { ...combat, reservedGreen: combat.reservedGreen + 1 }
    const note = reserveNote(combat.reservedGreen)
    log = `Reserve: ${note}`
  }

  function handleClearReserve(): void {
    if (combat.reservedGreen === 0) return
    const returned = combat.reservedGreen
    const pool = ctx.getPool()
    ctx.setPool({ ...pool, totals: { ...pool.totals, green: pool.totals.green + returned } })
    combat = { ...combat, reservedGreen: 0 }
    log = 'Reserve cleared.'
  }

  function handleFlee(): void {
    if (!canFlee(combat.enemy)) return
    if (!fleePending) {
      fleePending = true
      openCategory = null
      return
    }
    // Confirmed: apply free hit then flee.
    const result = applyFlee(combat, ctx.getPipHp())
    ctx.setPipHp(result.pipHp)
    if (result.defeat) {
      combat = { ...combat, phase: 'defeat' }
      log = ''
      bannerStartTime = performance.now()
    } else {
      markRoomFled()
      combat = { ...combat, phase: 'fled' }
      bannerStartTime = performance.now()
    }
    fleePending = false
  }

  function handleItem(item: Item): void {
    if (combat.itemUsedThisTurn) return
    const inventory = ctx.getInventory()
    const prevHp = ctx.getPipHp()
    const ds = ctx.getDungeonState()
    const result = applyItemEffect(
      { pipHp: prevHp, pipMaxHp: ctx.getPipMaxHp(), pool: ctx.getPool(), dungeonState: ds,
        tileRow: ds.pip.row, tileCol: ds.pip.col },
      item.effect,
    )

    if (result.pipHpAfter !== undefined) {
      ctx.setPipHp(result.pipHpAfter)
      log = `${item.name}: +${result.pipHpAfter - prevHp}HP (${prevHp}→${result.pipHpAfter})`
    }
    if (result.poolAfter !== undefined) {
      const rolled = rollPool(result.poolAfter)
      ctx.setPool(rolled)
      anim.startTime = performance.now(); anim.lastTick = 0; anim.scramble = []
      log = `${item.name}: rerolled!`
    }
    if (result.dungeonStateAfter !== undefined) {
      ctx.setDungeonState(result.dungeonStateAfter)
      if (item.effect.type === 'flee-combat') {
        combat = { ...combat, phase: 'fled' }
        bannerStartTime = performance.now()
        log = `${item.name}: fled!`
      } else if (item.effect.type === 'reveal-fog') {
        log = `${item.name}: fog cleared!`
      }
    }

    // Decrement quantity.
    const idx = inventory.items.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      const updated = [...inventory.items]
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 }
      if (updated[idx].quantity <= 0) updated.splice(idx, 1)
      ctx.setInventory({ ...inventory, items: updated })
    }

    combat = { ...combat, itemUsedThisTurn: true }
    openCategory = null
  }

  // ── Map view ──────────────────────────────────────────────────────────────

  const mapView: MapViewConfig = {
    zoom: COMBAT_CONFIG.cameraZoom,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  // ── draw ──────────────────────────────────────────────────────────────────

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Advance roll animation.
    let pool = ctx.getPool()
    if (pool.state === 'rolling' && anim.startTime !== null) {
      const elapsed = timestamp - anim.startTime
      if (elapsed >= 500) {
        anim.startTime = null
        pool = { ...pool, state: 'rolled' }
        ctx.setPool(pool)
      } else if (timestamp - anim.lastTick >= 50) {
        anim.lastTick = timestamp
        anim.scramble = pool.dice.map(d => Math.floor(Math.random() * d.sides) + 1)
      }
    }

    // Clear expired flash.
    if (flashEndTime !== null && timestamp > flashEndTime) {
      flashingElement = null
      flashEndTime = null
    }

    if (combat.phase === 'victory' || combat.phase === 'defeat') {
      // Victory waits for a tap (handleClick signals completion).
      // Defeat auto-advances after 2 s so the player isn't stuck.
      if (bannerStartTime !== null && !completed && combat.phase === 'defeat') {
        if (timestamp - bannerStartTime >= 2000) signalComplete('defeat')
      }
      if (bannerStartTime !== null) drawCombatBanner(renderCtx, timestamp, combat, bannerStartTime)
      return
    }

    if (combat.phase === 'fled') {
      if (bannerStartTime !== null && !completed) {
        if (timestamp - bannerStartTime >= 1000) signalComplete('fled')
      }
      return
    }

    drawCombatPanel(renderCtx, {
      pool,
      combat,
      openCategory,
      fleePending,
      log,
      hoveredElement,
      flashingElement,
      flashEndTime,
      animScramble: anim.scramble,
      inventory: ctx.getInventory(),
      timestamp,
    })
  }

  // ── drawMapOverlay ────────────────────────────────────────────────────────

  function drawMapOverlay(renderCtx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    if (combat.phase === 'victory' || combat.phase === 'defeat' || combat.phase === 'fled') return
    drawCombatOverlay(renderCtx, combat, ctx.getPipHp(), ctx.getPipMaxHp())
  }

  // ── handleClick ───────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    if (bannerStartTime !== null) {
      if (combat.phase === 'victory' || combat.phase === 'defeat' || combat.phase === 'fled') {
        signalComplete(combat.phase)
        return
      }
    }
    if (y < PANEL_TOP) return

    const pool = ctx.getPool()
    const id = hitTest(x, y, pool, combat, openCategory, fleePending, ctx.getInventory())

    if (!id) {
      // Tap outside buttons cancels flee-pending and closes submenu.
      if (fleePending) fleePending = false
      else openCategory = null
      return
    }

    if (id === 'roll') { handleRoll(); return }

    // Category toggles
    if (id === 'cat-red') {
      if (!canAfford(pool, { red: 2 })) { flash('cat-red'); return }
      openCategory = openCategory === 'red' ? null : 'red'
      fleePending = false
      return
    }
    if (id === 'cat-green') {
      if (!canAfford(pool, { green: 1 })) { flash('cat-green'); return }
      openCategory = openCategory === 'green' ? null : 'green'
      fleePending = false
      return
    }
    if (id === 'cat-item') {
      if (!ctx.getInventory().items.some(i => i.usableInCombat) || combat.itemUsedThisTurn) {
        flash('cat-item'); return
      }
      openCategory = openCategory === 'item' ? null : 'item'
      fleePending = false
      return
    }
    if (id === 'cat-flee') {
      if (!canFlee(combat.enemy)) return
      handleFlee()
      return
    }

    // Submenu actions
    if (id === 'sub-strike') { handleStrike(false); return }
    if (id === 'sub-heavy') { handleStrike(true); return }
    if (id === 'sub-reserve') { handleReserve(); return }
    if (id === 'sub-clear') { handleClearReserve(); return }

    // Item slots
    if (id.startsWith('item-')) {
      const idx = parseInt(id.slice(5), 10)
      const items = ctx.getInventory().items.filter(i => i.usableInCombat)
      const item = items[idx]
      if (item) handleItem(item)
    }
  }

  // ── handlePointerMove ─────────────────────────────────────────────────────

  function handlePointerMove(x: number, y: number): void {
    if (combat.phase !== 'player-turn' && combat.phase !== 'awaiting-roll') return
    const pool = ctx.getPool()
    hoveredElement = hitTest(x, y, pool, combat, openCategory, fleePending, ctx.getInventory())
  }

  return { draw, drawMapOverlay, handleClick, handlePointerMove, mapView }
}

// ── Reserve note helper (also used by panel drawing) ─────────────────────────

function reserveNote(reservedGreen: number): string {
  if (reservedGreen >= 2) return 'Dodge ready'
  if (reservedGreen === 1) return '−1 damage'
  return 'full hit'
}
