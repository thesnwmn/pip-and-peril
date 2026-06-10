import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { canAfford, resetPool, rollPool, spendPips } from '../dice/pool'
import type { CombatState } from './types'
import { selectIntent } from './intents'
import { getEnemySpec, spawnEnemy } from './roster'
import {
  applyStrike,
  applyHeavyStrike,
  applyAnalyse,
  applyExploit,
  applyResist,
  applyIdentify,
  applyConvert,
  applyLuckyShot,
  applyEnemyTurn,
  applyFlee,
  canFlee,
  rollGoldReward,
} from './encounter'
import { drawCombatBanner, drawCombatPanel, getCombatUsableItems, hitTest, type CatId } from './panel'
import { drawCombatOverlay } from './overlay'
import type { Inventory, Item } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { applyItemEffect, consumeItem, applyDeathPrevention, applyPassiveArmour } from '../satchel/items'
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

export interface CombatOptions {
  // Outcome string emitted on victory (default: 'victory').
  victoryOutcome?: string
  // If set, an intro sequence (title card + zoom-out/in) is shown before combat.
  intro?: {
    titleCard: { name: string; flavour: string }
    wideZoom: number
  }
  // Strike action from the active weapon (null if weapon has no strike)
  strikeAction?: { damage: number } | null
}

export function createCombatEncounterPanel(
  onComplete: (outcome: string) => void,
  ctx: CombatContext,
  entryFrom: { col: number; row: number },
  options: CombatOptions = {},
): EncounterPanel {
  const victoryOutcome = options.victoryOutcome ?? 'victory'
  const intro = options.intro ?? null
  const strikeAction = options.strikeAction ?? { damage: 2 }

  // ── Combat state ─────────────────────────────────────────────────────────

  const dungeonState = ctx.getDungeonState()
  const tile = dungeonState.grid.cells[dungeonState.pip.row][dungeonState.pip.col]
  const enemyId = tile?.enemyId || 'goblin-runt' // fallback to goblin-runt if no enemyId
  const spec = getEnemySpec(enemyId)
  const enemy = spawnEnemy(spec)

  // Initial intent: use cycle position 0 for cycled enemies, else random.
  const initialIntent = enemy.intentCycle ? enemy.intentCycle[0]! : selectIntent(enemy.intents)

  let combat: CombatState = {
    enemy,
    phase: 'awaiting-roll',
    intent: initialIntent,
    reservedGreen: 0,
    entryFrom,
    goldAwarded: 0,
    itemUsedThisTurn: false,
    pipsSpentThisTurn: false,
    analysedThisCombat: false,
    analysedThisTurn: false,
    identified: false,
    pipPoison: null,
    berserkTurnsLeft: 0,
    bonusPipsRemaining: 0,
    strikeAction,
  }

  let lastEnemyHeadline = ''
  let lastEnemyDetail = ''
  let lastEnemyKind: CombatState['intent']['kind'] | null = null
  const personality = spec.personality
  let bannerStartTime: number | null = null
  let completed = false

  // ── Intro state ───────────────────────────────────────────────────────────

  let introStartTime: number | null = null
  let introComplete = intro === null  // no intro = skip straight to combat

  // ── Panel UI state ────────────────────────────────────────────────────────

  let openCategory: CatId | null = null
  let fleePending = false
  let hoveredElement: string | null = null
  let flashingElement: string | null = null
  let flashEndTime: number | null = null
  let paddedCoatLoggedThisCombat = false
  let deathPreventionNotificationEndTime: number | null = null

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
    let rolled = rollPool(ctx.getPool())
    const inventory = ctx.getInventory()
    const totalPenalty = inventory.items.reduce((sum, i) => sum + (i.greenPenalty ?? 0), 0)
    if (totalPenalty > 0) {
      rolled = { ...rolled, totals: { ...rolled.totals, green: Math.max(0, rolled.totals.green - totalPenalty) } }
      if (!paddedCoatLoggedThisCombat) {
        paddedCoatLoggedThisCombat = true
      }
    }
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
      if (combat.berserkTurnsLeft > 0) combat.berserkTurnsLeft -= 1
      combat = { ...combat, phase: 'player-turn', itemUsedThisTurn: false, pipsSpentThisTurn: false, analysedThisTurn: false }
      startRoll()
      return
    }

    if (combat.phase === 'player-turn') {
      // End turn: fire enemy intent with damage mitigation, reset, then await next roll.
      const firedIntent = combat.intent  // capture before applyEnemyTurn swaps to next intent
      const prevHp = ctx.getPipHp()
      let inventory = ctx.getInventory()

      // Apply Stolen Idol damage bonus before damage calculation
      let modifiedCombat = combat
      if ((firedIntent.kind === 'attack' || firedIntent.kind === 'lunge') &&
          inventory.items.some(i => i.id === 'stolen-idol')) {
        const modifiedIntent = { ...firedIntent, value: firedIntent.value + 1 }
        modifiedCombat = { ...combat, intent: modifiedIntent }
      }

      // Get raw enemy turn result
      const result = applyEnemyTurn(modifiedCombat, prevHp)
      const rawDamage = result.damage

      // Apply passive armour to reduce damage
      const actualDamage = applyPassiveArmour(rawDamage, inventory)

      // Calculate new HP and check for death prevention
      const newPipHp = Math.max(0, prevHp - actualDamage)
      const { pipHp: finalHp, inventory: finalInventory } = applyDeathPrevention(newPipHp, inventory)
      const defeat = finalHp <= 0

      ctx.setPipHp(finalHp)
      ctx.setInventory(finalInventory)

      // Handle death prevention notification
      if (newPipHp <= 0 && finalHp === 1) {
        deathPreventionNotificationEndTime = performance.now() + 2500
      }

      // Return to awaiting-roll so the player sees the new intent before rolling again.
      combat = { ...result.combat, phase: defeat ? 'defeat' : 'awaiting-roll', itemUsedThisTurn: false, pipsSpentThisTurn: false, analysedThisTurn: false, bonusPipsRemaining: 0 }
      openCategory = null
      fleePending = false

      if (defeat) {
        // Record defeat information before transition
        const dungeonState = ctx.getDungeonState()
        ctx.setDungeonState({
          ...dungeonState,
          killedBy: combat.enemy.name,
          killedByFloor: dungeonState.floor,
        })
        bannerStartTime = performance.now()
        return
      }

      // Record what the enemy just did for the awaiting-roll display.
      lastEnemyKind = firedIntent.kind as any
      if (firedIntent.kind === 'guard') {
        const guardLine = personality.guardLine || 'guards'
        lastEnemyHeadline = `The ${combat.enemy.name} ${guardLine}`
        lastEnemyDetail = `+${firedIntent.value} block`
      } else if (firedIntent.kind === 'empower') {
        const empowerLine = personality.empowerLine || 'empowers'
        lastEnemyHeadline = `The ${combat.enemy.name} ${empowerLine}`
        lastEnemyDetail = 'Next attack ×2!'
      } else if (firedIntent.kind === 'recover') {
        const recoverLine = personality.recoverLine || 'recovers'
        lastEnemyHeadline = `The ${combat.enemy.name} ${recoverLine}`
        lastEnemyDetail = `+${firedIntent.value} HP`
      } else if (result.damage === 0) {
        const fallbackName = firedIntent.kind === 'lunge' ? 'lunges' : 'attacks'
        let actionLine = fallbackName
        if (firedIntent.kind === 'lunge') {
          actionLine = personality.lungeLine || 'lunges'
        } else if (firedIntent.kind === 'attack') {
          actionLine = personality.attackLine || 'attacks'
        } else if (firedIntent.kind === 'status') {
          actionLine = personality.statusLine || 'strikes'
        }
        lastEnemyHeadline = `The ${combat.enemy.name} ${actionLine}`
        lastEnemyDetail = 'Dodged!'
      } else {
        const fallbackName = firedIntent.kind === 'lunge' ? 'lunges' : 'attacks'
        let actionLine = fallbackName
        if (firedIntent.kind === 'lunge') {
          actionLine = personality.lungeLine || 'lunges'
        } else if (firedIntent.kind === 'attack') {
          actionLine = personality.attackLine || 'attacks'
        } else if (firedIntent.kind === 'status') {
          actionLine = personality.statusLine || 'strikes'
        }
        lastEnemyHeadline = `The ${combat.enemy.name} ${actionLine}`
        const blocked = rawDamage - actualDamage
        if (blocked > 0) {
          lastEnemyDetail = `−${actualDamage} HP (${blocked} blocked)  (${prevHp} → ${finalHp})`
        } else {
          lastEnemyDetail = `−${actualDamage} HP  (${prevHp} → ${finalHp})`
        }
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
    let result = heavy ? applyHeavyStrike(combat) : applyStrike(combat)
    let finalCombat = result.combat
    let finalVictory = result.victory

    // Apply berserk damage doubling
    if (combat.berserkTurnsLeft > 0) {
      const berserkBonus = heavy ? 4 : 2  // Strike: 2→4, Heavy: 4→8
      const newEnemyHp = Math.max(0, finalCombat.enemy.hp - berserkBonus)
      const newVictory = newEnemyHp <= 0
      let newEnemy = { ...finalCombat.enemy, hp: newEnemyHp }
      if (!newVictory && newEnemyHp > 0 && !finalCombat.enemy.enraged) {
        // Check for enrage with the reduced HP
        if (newEnemy.enrageThreshold !== undefined && newEnemyHp <= newEnemy.enrageThreshold && newEnemy.enragedCycle) {
          newEnemy = { ...newEnemy, enraged: true }
        }
      }
      finalCombat = { ...finalCombat, enemy: newEnemy, phase: newVictory ? 'victory' : finalCombat.phase }
      finalVictory = newVictory
    }

    combat = { ...finalCombat, pipsSpentThisTurn: true }
    if (finalVictory) {
      const goldEarned = rollGoldReward(combat.enemy)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldEarned })
      combat = { ...combat, goldAwarded: goldEarned }
      markRoomCleared()
      bannerStartTime = performance.now()
      openCategory = null
    }
  }

  function handleReserve(): void {
    if (combat.berserkTurnsLeft > 0) { flash('sub-reserve'); return }
    if (!canAfford(ctx.getPool(), { green: 1 })) { flash('sub-reserve'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 1 })
    ctx.setPool(updated)
    combat = { ...combat, reservedGreen: combat.reservedGreen + 1, pipsSpentThisTurn: true }
  }

  function handleClearReserve(): void {
    if (combat.reservedGreen === 0) return
    const returned = combat.reservedGreen
    const pool = ctx.getPool()
    ctx.setPool({ ...pool, totals: { ...pool.totals, green: pool.totals.green + returned } })
    combat = { ...combat, reservedGreen: 0 }
  }

  function handleAnalyse(): void {
    if (!canAfford(ctx.getPool(), { blue: 2 })) { flash('sub-analyse'); return }
    if (combat.analysedThisTurn) { flash('sub-analyse'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 2 })
    ctx.setPool(updated)
    combat = { ...applyAnalyse(combat), pipsSpentThisTurn: true }
  }

  function handleExploit(): void {
    if (!canAfford(ctx.getPool(), { blue: 4 })) { flash('sub-exploit'); return }
    if (!combat.analysedThisTurn) { flash('sub-exploit'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 4 })
    ctx.setPool(updated)
    const result = applyExploit(combat)
    combat = { ...result.combat, pipsSpentThisTurn: true }
    if (result.victory) {
      const goldEarned = rollGoldReward(combat.enemy)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldEarned })
      combat = { ...combat, goldAwarded: goldEarned }
      markRoomCleared()
      bannerStartTime = performance.now()
      openCategory = null
    }
  }

  function handleResist(): void {
    if (!canAfford(ctx.getPool(), { blue: 3 })) { flash('sub-resist'); return }
    if (combat.pipPoison === null) { flash('sub-resist'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 3 })
    ctx.setPool(updated)
    combat = { ...applyResist(combat), pipsSpentThisTurn: true }
  }

  function handleIdentify(): void {
    if (!canAfford(ctx.getPool(), { blue: 1 })) { flash('sub-identify'); return }
    if (combat.identified) { flash('sub-identify'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 1 })
    ctx.setPool(updated)
    combat = { ...applyIdentify(combat), pipsSpentThisTurn: true }
  }

  function handleConvert(): void {
    if (!canAfford(ctx.getPool(), { yellow: 3 })) { flash('sub-convert'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 3 })
    ctx.setPool(updated)
    combat = { ...applyConvert(combat, 'red'), pipsSpentThisTurn: true }
  }

  function handleLuckyShot(): void {
    if (!canAfford(ctx.getPool(), { yellow: 4 })) { flash('sub-lucky-shot'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 4 })
    ctx.setPool(updated)
    const result = applyLuckyShot(combat)
    combat = { ...result.combat, pipsSpentThisTurn: true }
    if (result.victory) {
      const goldEarned = rollGoldReward(combat.enemy)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldEarned })
      combat = { ...combat, goldAwarded: goldEarned }
      markRoomCleared()
      bannerStartTime = performance.now()
      openCategory = null
    }
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
      const dungeonState = ctx.getDungeonState()
      ctx.setDungeonState({
        ...dungeonState,
        killedBy: combat.enemy.name,
        killedByFloor: dungeonState.floor,
      })
      combat = { ...combat, phase: 'defeat' }
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
    if (item.luckyClass && combat.pipsSpentThisTurn) return

    // Tenacity gate: item only usable after pips spent this turn
    if (item.window === 'post-spend-tenacity' && !combat.pipsSpentThisTurn) {
      const usableItems = ctx.getInventory().items.filter(i => i.usableInCombat)
      const itemIdx = usableItems.findIndex(i => i.id === item.id)
      flash('item-' + itemIdx)
      return
    }

    let inventory = ctx.getInventory()
    let pipHp = ctx.getPipHp()
    const pipMaxHp = ctx.getPipMaxHp()

    // Handle bonus-pips effect (Tainted Mushroom)
    if (item.effect.type === 'bonus-pips') {
      const selfDamage = item.effect.selfDamage
      const newHp = Math.max(0, pipHp - selfDamage)
      const { pipHp: survivedHp, inventory: postDeathInv } = applyDeathPrevention(newHp, inventory)

      if (survivedHp <= 0) {
        ctx.setPipHp(survivedHp)
        ctx.setInventory(postDeathInv)
        const dungeonState = ctx.getDungeonState()
        ctx.setDungeonState({
          ...dungeonState,
          killedBy: combat.enemy.name,
          killedByFloor: dungeonState.floor,
        })
        combat = { ...combat, phase: 'defeat' }
        bannerStartTime = performance.now()
        return
      }

      if (newHp <= 0 && survivedHp === 1) {
        // Death prevented: show notification
        deathPreventionNotificationEndTime = performance.now() + 2500
      }

      ctx.setPipHp(survivedHp)
      ctx.setInventory(postDeathInv)
      inventory = consumeItem(postDeathInv, item.id)
      ctx.setInventory(inventory)
      combat = { ...combat, bonusPipsRemaining: item.effect.amount, itemUsedThisTurn: true }
      openCategory = null
      return
    }

    // Handle berserk effect (Berserker Draught)
    if (item.effect.type === 'berserk') {
      combat = { ...combat, berserkTurnsLeft: item.effect.turnsLeft, itemUsedThisTurn: true }
      inventory = consumeItem(inventory, item.id)
      ctx.setInventory(inventory)
      openCategory = null
      return
    }

    // Standard item effects
    const ds = ctx.getDungeonState()
    const result = applyItemEffect(
      { pipHp, pipMaxHp, pool: ctx.getPool(), dungeonState: ds,
        tileRow: ds.pip.row, tileCol: ds.pip.col },
      item.effect,
    )

    if (result.pipHpAfter !== undefined) {
      ctx.setPipHp(result.pipHpAfter)
    }
    if (result.poolAfter !== undefined) {
      const rolled = rollPool(result.poolAfter)
      ctx.setPool(rolled)
      anim.startTime = performance.now(); anim.lastTick = 0; anim.scramble = []
    }
    if (result.dungeonStateAfter !== undefined) {
      ctx.setDungeonState(result.dungeonStateAfter)
      if (item.effect.type === 'flee-combat') {
        combat = { ...combat, phase: 'fled' }
        bannerStartTime = performance.now()
      }
    }

    inventory = consumeItem(inventory, item.id)
    ctx.setInventory(inventory)
    combat = { ...combat, itemUsedThisTurn: true }
    openCategory = null
  }

  // ── Map view ──────────────────────────────────────────────────────────────

  const tightMapView: MapViewConfig = {
    zoom: COMBAT_CONFIG.cameraZoom,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  // ── draw ──────────────────────────────────────────────────────────────────

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Track intro timing from the first frame so the title card can reference it.
    if (intro && introStartTime === null) introStartTime = timestamp

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
      lastEnemyHeadline,
      lastEnemyDetail,
      lastEnemyKind,
      hoveredElement,
      flashingElement,
      flashEndTime,
      animScramble: anim.scramble,
      inventory: ctx.getInventory(),
      timestamp,
      deathPreventionNotificationEndTime,
    })
  }

  // ── drawMapOverlay ────────────────────────────────────────────────────────

  function drawMapOverlay(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Title card: drawn over the map area during the intro window.
    if (intro && !introComplete && introStartTime !== null) {
      const elapsed = timestamp - introStartTime
      if (elapsed >= 2500) {
        introComplete = true
      } else if (elapsed >= 500 && elapsed < 1800) {
        const cardAge = elapsed - 500
        let alpha = 1.0
        if (cardAge < 300) alpha = cardAge / 300
        else if (cardAge > 1300) alpha = Math.max(0, 1.0 - (cardAge - 1300) / 300)

        const cx = 192
        const cy = 200
        const cardW = 360
        const cardH = 120
        const grad = renderCtx.createLinearGradient(cx - cardW / 2, 0, cx + cardW / 2, 0)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(0.5, 'rgba(0,0,0,0.45)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        renderCtx.globalAlpha = alpha
        renderCtx.fillStyle = grad
        renderCtx.fillRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH)
        renderCtx.font = 'bold 24px monospace'
        renderCtx.fillStyle = '#c8941e'
        renderCtx.textAlign = 'center'
        renderCtx.textBaseline = 'middle'
        renderCtx.fillText(intro.titleCard.name, cx, cy - 20)
        renderCtx.font = 'italic 13px system-ui'
        renderCtx.fillStyle = '#8b7355'
        renderCtx.fillText(intro.titleCard.flavour, cx, cy + 20)
        renderCtx.globalAlpha = 1.0
      }
      return  // don't draw combat overlay during intro
    }

    if (combat.phase === 'victory' || combat.phase === 'defeat' || combat.phase === 'fled') return
    drawCombatOverlay(renderCtx, combat, ctx.getPipHp(), ctx.getPipMaxHp())
  }

  // ── handleClick ───────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    if (!introComplete) return  // ignore taps during intro
    if (bannerStartTime !== null) {
      if (combat.phase === 'victory') { signalComplete(victoryOutcome); return }
      if (combat.phase === 'defeat' || combat.phase === 'fled') {
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

    // Bonus pip assignment mode
    if (combat.bonusPipsRemaining > 0) {
      if (id === 'cat-red') {
        const pool = ctx.getPool()
        ctx.setPool({ ...pool, totals: { ...pool.totals, red: pool.totals.red + 1 } })
        combat = { ...combat, bonusPipsRemaining: combat.bonusPipsRemaining - 1 }
        return
      }
      if (id === 'cat-green') {
        const pool = ctx.getPool()
        ctx.setPool({ ...pool, totals: { ...pool.totals, green: pool.totals.green + 1 } })
        combat = { ...combat, bonusPipsRemaining: combat.bonusPipsRemaining - 1 }
        return
      }
      if (id === 'cat-blue') {
        const pool = ctx.getPool()
        ctx.setPool({ ...pool, totals: { ...pool.totals, blue: pool.totals.blue + 1 } })
        combat = { ...combat, bonusPipsRemaining: combat.bonusPipsRemaining - 1 }
        return
      }
      if (id === 'cat-yellow') {
        const pool = ctx.getPool()
        ctx.setPool({ ...pool, totals: { ...pool.totals, yellow: pool.totals.yellow + 1 } })
        combat = { ...combat, bonusPipsRemaining: combat.bonusPipsRemaining - 1 }
        return
      }
      // All other actions disabled while bonus pip assignment is active
      return
    }

    // Category toggles (normal mode)
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
    if (id === 'cat-blue') {
      if (!canAfford(pool, { blue: 1 })) { flash('cat-blue'); return }
      openCategory = openCategory === 'blue' ? null : 'blue'
      fleePending = false
      return
    }
    if (id === 'cat-yellow') {
      if (!canAfford(pool, { yellow: 1 })) { flash('cat-yellow'); return }
      openCategory = openCategory === 'yellow' ? null : 'yellow'
      fleePending = false
      return
    }
    if (id === 'cat-item') {
      const usableItems = getCombatUsableItems(ctx.getInventory(), combat.pipsSpentThisTurn)
      if (usableItems.length === 0 || combat.itemUsedThisTurn) {
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
    if (id === 'sub-analyse') { handleAnalyse(); return }
    if (id === 'sub-exploit') { handleExploit(); return }
    if (id === 'sub-resist') { handleResist(); return }
    if (id === 'sub-identify') { handleIdentify(); return }
    if (id === 'sub-convert') { handleConvert(); return }
    if (id === 'sub-lucky-shot') { handleLuckyShot(); return }

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

  return {
    draw,
    drawMapOverlay,
    handleClick,
    handlePointerMove,
    get mapView(): MapViewConfig {
      if (intro && !introComplete && introStartTime !== null) {
        const elapsed = performance.now() - introStartTime
        const TRANSITION_START = 1500
        const TRANSITION_DURATION = 400
        const tight = COMBAT_CONFIG.cameraZoom
        const wide = intro.wideZoom
        if (elapsed < TRANSITION_START) {
          return { zoom: wide, pipTargetX: COMBAT_MAP_CENTER_X, pipTargetY: COMBAT_MAP_CENTER_Y }
        }
        if (elapsed < TRANSITION_START + TRANSITION_DURATION) {
          const t = (elapsed - TRANSITION_START) / TRANSITION_DURATION
          return { zoom: wide + (tight - wide) * t, pipTargetX: COMBAT_MAP_CENTER_X, pipTargetY: COMBAT_MAP_CENTER_Y }
        }
      }
      return tightMapView
    },
  }
}

