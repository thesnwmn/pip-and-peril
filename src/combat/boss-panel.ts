import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { canAfford, resetPool, rollPool, spendPips } from '../dice/pool'
import type { CombatState } from './types'
import type { Enemy } from './types'
import { damageToPip, rollGoldReward } from './encounter'
import { drawCombatBanner, drawCombatPanel, hitTest, type CatId } from './panel'
import { drawCombatOverlay } from './overlay'
import type { Inventory, Item } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { applyItemEffect } from '../satchel/items'
import { COMBAT_CONFIG } from '../encounter/config'
import { PANEL_TOP, COMBAT_MAP_CENTER_X, COMBAT_MAP_CENTER_Y } from '../screens/game-layout'
import { applyPoisonTick } from './encounter'

// ── BossSpec and types ────────────────────────────────────────────────────────

export interface BossIntent {
  kind: 'attack' | 'guard' | 'empower' | 'lunge' | 'recover' | 'status'
  value?: number
}

export interface BossPhase {
  cycle: BossIntent[]
}

export interface BossSpec {
  id: string
  name: string
  titleCard: {
    name: string
    flavour: string
  }
  maxHp: number
  enrageThreshold: number
  goldMin: number
  goldMax: number
  phases: BossPhase[]
}

export const RAT_KING: BossSpec = {
  id: 'rat-king',
  name: 'The Rat King',
  titleCard: {
    name: 'THE RAT KING',
    flavour: 'Ancient. Patient. Hungry.',
  },
  maxHp: 20,
  enrageThreshold: 10,
  goldMin: 15,
  goldMax: 25,
  phases: [
    {
      cycle: [
        { kind: 'attack', value: 4 },
        { kind: 'guard', value: 3 },
        { kind: 'empower' },
        { kind: 'attack', value: 4 },
      ],
    },
    {
      cycle: [
        { kind: 'attack', value: 5 },
        { kind: 'lunge', value: 8 },
        { kind: 'attack', value: 5 },
      ],
    },
  ],
}

export interface BossCombatContext {
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

export function createBossEncounterPanel(
  onComplete: (outcome: string) => void,
  ctx: BossCombatContext,
  bossSpec: BossSpec = RAT_KING,
  entryFrom: { col: number; row: number } = { col: 0, row: 0 },
): EncounterPanel {
  // ── Boss state ────────────────────────────────────────────────────────────

  let bossActivePhase = 0
  let bossCyclePosition = 0
  let bossEnraged = false
  let bossEmpowered = false
  let bossBlock = 0
  let bossHp = bossSpec.maxHp
  let combatPhase: CombatState['phase'] = 'awaiting-roll'
  let reservedGreen = 0
  let goldAwarded = 0
  let lastEnemyHeadline = ''
  let lastEnemyDetail = ''
  let lastEnemyKind: CombatState['intent']['kind'] | null = null

  const phase1Cycle = bossSpec.phases[0]!.cycle
  const phase2Cycle = bossSpec.phases[1]!.cycle

  let introStartTime: number | null = null
  let introComplete = false
  let bannerStartTime: number | null = null
  let completed = false

  let openCategory: CatId | null = null
  let hoveredElement: string | null = null
  let flashingElement: string | null = null
  let flashEndTime: number | null = null

  interface AnimState { startTime: number | null; lastTick: number; scramble: number[] }
  const anim: AnimState = { startTime: null, lastTick: 0, scramble: [] }

  ctx.setPool(resetPool(ctx.getPool()))

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getCurrentCycle(): BossIntent[] {
    return bossActivePhase === 0 ? phase1Cycle : phase2Cycle
  }

  function getCurrentIntent(): BossIntent {
    const cycle = getCurrentCycle()
    return cycle[bossCyclePosition]!
  }

  function advanceCyclePosition(): void {
    const cycle = getCurrentCycle()
    bossCyclePosition = (bossCyclePosition + 1) % cycle.length
  }

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
  }

  function checkEnrage(): void {
    if (!bossEnraged && bossHp <= bossSpec.enrageThreshold) {
      bossEnraged = true
      bossActivePhase = 1
      bossCyclePosition = 0
      bossBlock = 0
      bossEmpowered = false
    }
  }

  function markRoomCleared(): void {
    const ds = ctx.getDungeonState()
    const newCells = ds.grid.cells.map(row => [...row])
    const cell = newCells[ds.pip.row][ds.pip.col]
    if (cell) {
      newCells[ds.pip.row][ds.pip.col] = { ...cell, cleared: true }
    }
    ctx.setDungeonState({ ...ds, grid: { ...ds.grid, cells: newCells } })
  }

  function fireBossIntent(): void {
    const intent = getCurrentIntent()
    const prevPipHp = ctx.getPipHp()
    let newPipHp = prevPipHp
    let damage = 0

    if (intent.kind === 'guard') {
      bossBlock = (bossBlock || 0) + (intent.value || 0)
    } else if (intent.kind === 'empower') {
      bossEmpowered = true
    } else if (intent.kind === 'attack' || intent.kind === 'lunge') {
      const baseDamage = intent.value || 0
      const actualDamage = damageToPip(baseDamage, reservedGreen)
      const finalDamage = bossEmpowered ? actualDamage * 2 : actualDamage
      newPipHp = Math.max(0, prevPipHp - finalDamage)
      damage = finalDamage
      ctx.setPipHp(newPipHp)
      bossEmpowered = false
    }

    // Record what the boss just did
    if (intent.kind === 'guard') {
      lastEnemyKind = 'guard'
      lastEnemyHeadline = `The ${bossSpec.name} guards`
      lastEnemyDetail = `+${intent.value} block`
    } else if (intent.kind === 'empower') {
      lastEnemyKind = 'empower'
      lastEnemyHeadline = `The ${bossSpec.name} empowers`
      lastEnemyDetail = 'Next attack ×2!'
    } else if (damage === 0) {
      lastEnemyKind = intent.kind as any
      lastEnemyHeadline = `The ${bossSpec.name} ${intent.kind === 'lunge' ? 'lunges' : 'attacks'}`
      lastEnemyDetail = 'Dodged!'
    } else {
      lastEnemyKind = intent.kind as any
      lastEnemyHeadline = `The ${bossSpec.name} ${intent.kind === 'lunge' ? 'lunges' : 'attacks'}`
      lastEnemyDetail = `−${damage} HP`
    }

    reservedGreen = 0
    advanceCyclePosition()

    if (newPipHp <= 0) {
      combatPhase = 'defeat'
      bannerStartTime = performance.now()
    } else {
      combatPhase = 'awaiting-roll'
    }

    ctx.setPool(resetPool(ctx.getPool()))
  }

  // ── Map view ──────────────────────────────────────────────────────────────

  const mapView: MapViewConfig = {
    zoom: COMBAT_CONFIG.cameraZoom,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  // ── Draw intro sequence ───────────────────────────────────────────────────

  function drawIntroSequence(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (introStartTime === null || introComplete) return

    const elapsed = timestamp - introStartTime
    const INTRO_DURATION = 2500

    if (elapsed < 500) {
      // Title card hasn't appeared yet
    } else if (elapsed < 1800) {
      const cardAge = elapsed - 500
      let alpha = 1.0
      if (cardAge < 300) {
        alpha = cardAge / 300
      } else if (cardAge > 1300) {
        alpha = Math.max(0, 1.0 - ((cardAge - 1300) / 300))
      }

      const centerX = 192
      const centerY = 200 // Top of screen
      const cardW = 360
      const cardH = 120

      const gradient = renderCtx.createLinearGradient(centerY - 80, 0, centerY + 80, 0)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      renderCtx.fillStyle = gradient
      renderCtx.globalAlpha = alpha
      renderCtx.fillRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH)

      renderCtx.font = 'bold 24px monospace'
      renderCtx.fillStyle = '#c8941e'
      renderCtx.textAlign = 'center'
      renderCtx.textBaseline = 'middle'
      renderCtx.fillText(bossSpec.titleCard.name, centerX, centerY - 20)

      renderCtx.font = 'italic 13px system-ui'
      renderCtx.fillStyle = '#8b7355'
      renderCtx.fillText(bossSpec.titleCard.flavour, centerX, centerY + 20)

      renderCtx.globalAlpha = 1.0
    }

    if (elapsed >= INTRO_DURATION) {
      introComplete = true
    }
  }

  // ── draw ──────────────────────────────────────────────────────────────────

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Initialize intro timing (only once)
    if (introStartTime === null && !introComplete && bannerStartTime === null) {
      introStartTime = timestamp
    }

    // Advance roll animation
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

    // Clear expired flash
    if (flashEndTime !== null && timestamp > flashEndTime) {
      flashingElement = null
      flashEndTime = null
    }

    // Draw intro sequence
    if (!introComplete && introStartTime !== null) {
      drawIntroSequence(renderCtx, timestamp)
      return
    }

    // Create CombatState for the panel UI
    const combatState: CombatState = {
      enemy: {
        id: bossSpec.id,
        name: bossSpec.name,
        hp: bossHp,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: bossBlock,
        empowered: bossEmpowered,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      },
      phase: combatPhase,
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    }

    // Banner display
    if (bannerStartTime !== null) {
      drawCombatBanner(renderCtx, timestamp, combatState, bannerStartTime)
      if (combatPhase === 'defeat') {
        if (timestamp - bannerStartTime >= 2000) {
          signalComplete('defeat')
        }
      } else if (timestamp - bannerStartTime >= 2000 && combatPhase === 'victory') {
        signalComplete('run-complete')
      }
      return
    }

    // Combat panel
    drawCombatPanel(renderCtx, {
      pool,
      combat: combatState,
      openCategory,
      fleePending: false,
      lastEnemyHeadline,
      lastEnemyDetail,
      lastEnemyKind,
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
    if (!introComplete || bannerStartTime !== null) return
    const combatState: CombatState = {
      enemy: {
        id: bossSpec.id,
        name: bossSpec.name,
        hp: bossHp,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: bossBlock,
        empowered: bossEmpowered,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      },
      phase: combatPhase,
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    }
    drawCombatOverlay(renderCtx, combatState, ctx.getPipHp(), ctx.getPipMaxHp())
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleStrike(heavy: boolean): void {
    const cost = heavy ? { red: 4 } : { red: 2 }
    if (!canAfford(ctx.getPool(), cost)) { flash(heavy ? 'sub-heavy' : 'sub-strike'); return }
    const { pool: updated } = spendPips(ctx.getPool(), cost)
    ctx.setPool(updated)
    const rawDamage = heavy ? 4 : 2
    const absorbed = Math.min(rawDamage, bossBlock)
    const damage = rawDamage - absorbed
    bossBlock = Math.max(0, bossBlock - absorbed)
    bossHp = Math.max(0, bossHp - damage)
    if (bossHp <= 0) {
      goldAwarded = rollGoldReward({
        id: bossSpec.id,
        name: bossSpec.name,
        hp: 0,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: 0,
        empowered: false,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      })
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      combatPhase = 'victory'
      bannerStartTime = performance.now()
      openCategory = null
      return
    }
    checkEnrage()
    fireBossIntent()
    openCategory = null
  }

  function handleAnalyse(): void {
    if (!canAfford(ctx.getPool(), { blue: 2 })) { flash('sub-analyse'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 2 })
    ctx.setPool(updated)
    fireBossIntent()
    openCategory = null
  }

  function handleExploit(): void {
    if (!canAfford(ctx.getPool(), { blue: 4 })) { flash('sub-exploit'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 4 })
    ctx.setPool(updated)
    const damage = 3
    bossHp = Math.max(0, bossHp - damage)
    if (bossHp <= 0) {
      goldAwarded = rollGoldReward({
        id: bossSpec.id,
        name: bossSpec.name,
        hp: 0,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: 0,
        empowered: false,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      })
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      combatPhase = 'victory'
      bannerStartTime = performance.now()
      openCategory = null
      return
    }
    checkEnrage()
    fireBossIntent()
    openCategory = null
  }

  function handleIdentify(): void {
    if (!canAfford(ctx.getPool(), { blue: 1 })) { flash('sub-identify'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 1 })
    ctx.setPool(updated)
    fireBossIntent()
    openCategory = null
  }

  function handleResist(): void {
    if (!canAfford(ctx.getPool(), { blue: 3 })) { flash('sub-resist'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 3 })
    ctx.setPool(updated)
    fireBossIntent()
    openCategory = null
  }

  function handleFeint(): void {
    if (!canAfford(ctx.getPool(), { green: 2 })) { flash('sub-feint'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 2 })
    ctx.setPool(updated)
    bossBlock = Math.max(0, bossBlock - 2)
    fireBossIntent()
    openCategory = null
  }

  function handleDisengage(): void {
    if (!canAfford(ctx.getPool(), { green: 1 })) { flash('sub-disengage'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 1 })
    ctx.setPool(updated)
    advanceCyclePosition()
    combatPhase = 'awaiting-roll'
    ctx.setPool(resetPool(ctx.getPool()))
    openCategory = null
  }

  function handleShove(): void {
    if (!canAfford(ctx.getPool(), { red: 1 })) { flash('sub-shove'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { red: 1 })
    ctx.setPool(updated)
    advanceCyclePosition()
    combatPhase = 'awaiting-roll'
    ctx.setPool(resetPool(ctx.getPool()))
    openCategory = null
  }

  function handleConvert(): void {
    if (!canAfford(ctx.getPool(), { yellow: 3 })) { flash('sub-convert'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 3 })
    ctx.setPool(updated)
    fireBossIntent()
    openCategory = null
  }

  function handleLuckyShot(): void {
    if (!canAfford(ctx.getPool(), { yellow: 4 })) { flash('sub-lucky-shot'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 4 })
    ctx.setPool(updated)
    const damage = Math.floor(Math.random() * 3) + 1
    bossHp = Math.max(0, bossHp - damage)
    if (bossHp <= 0) {
      goldAwarded = rollGoldReward({
        id: bossSpec.id,
        name: bossSpec.name,
        hp: 0,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: 0,
        empowered: false,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      })
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      combatPhase = 'victory'
      bannerStartTime = performance.now()
      openCategory = null
      return
    }
    checkEnrage()
    fireBossIntent()
    openCategory = null
  }

  function handleItem(item: Item): void {
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
    }
    if (result.poolAfter !== undefined) {
      const rolled = rollPool(result.poolAfter)
      ctx.setPool(rolled)
      anim.startTime = performance.now(); anim.lastTick = 0; anim.scramble = []
    }
    if (result.dungeonStateAfter !== undefined) {
      ctx.setDungeonState(result.dungeonStateAfter)
    }

    // Decrement quantity
    const idx = inventory.items.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      const updated = [...inventory.items]
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 }
      if (updated[idx].quantity <= 0) updated.splice(idx, 1)
      ctx.setInventory({ ...inventory, items: updated })
    }

    fireBossIntent()
    openCategory = null
  }

  // ── handleClick ───────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    if (bannerStartTime !== null) {
      if (combatPhase === 'victory' || combatPhase === 'defeat') {
        signalComplete(combatPhase)
        return
      }
    }

    if (y < PANEL_TOP) return

    const pool = ctx.getPool()
    const combatState: CombatState = {
      enemy: {
        id: bossSpec.id,
        name: bossSpec.name,
        hp: bossHp,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: bossBlock,
        empowered: bossEmpowered,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      },
      phase: combatPhase,
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    }

    const id = hitTest(x, y, pool, combatState, openCategory, false, ctx.getInventory())

    if (!id) {
      openCategory = null
      return
    }

    // Handle roll
    if (id === 'roll') {
      if (combatPhase === 'awaiting-roll') {
        combatPhase = 'player-turn'
        startRoll()
      }
      return
    }

    // Category toggles
    if (id === 'cat-red') {
      if (!canAfford(pool, { red: 2 })) { flash('cat-red'); return }
      openCategory = openCategory === 'red' ? null : 'red'
      return
    }
    if (id === 'cat-green') {
      if (!canAfford(pool, { green: 1 })) { flash('cat-green'); return }
      openCategory = openCategory === 'green' ? null : 'green'
      return
    }
    if (id === 'cat-blue') {
      if (!canAfford(pool, { blue: 1 })) { flash('cat-blue'); return }
      openCategory = openCategory === 'blue' ? null : 'blue'
      return
    }
    if (id === 'cat-yellow') {
      if (!canAfford(pool, { yellow: 1 })) { flash('cat-yellow'); return }
      openCategory = openCategory === 'yellow' ? null : 'yellow'
      return
    }
    if (id === 'cat-item') {
      if (!ctx.getInventory().items.some(i => i.usableInCombat)) {
        flash('cat-item'); return
      }
      openCategory = openCategory === 'item' ? null : 'item'
      return
    }

    // Action dispatching
    if (id === 'sub-strike') {
      handleStrike(false)
      return
    }
    if (id === 'sub-heavy') {
      handleStrike(true)
      return
    }
    if (id === 'sub-analyse') {
      handleAnalyse()
      return
    }
    if (id === 'sub-exploit') {
      handleExploit()
      return
    }
    if (id === 'sub-identify') {
      handleIdentify()
      return
    }
    if (id === 'sub-resist') {
      handleResist()
      return
    }
    if (id === 'sub-feint') {
      handleFeint()
      return
    }
    if (id === 'sub-disengage') {
      handleDisengage()
      return
    }
    if (id === 'sub-shove') {
      handleShove()
      return
    }
    if (id === 'sub-convert') {
      handleConvert()
      return
    }
    if (id === 'sub-lucky-shot') {
      handleLuckyShot()
      return
    }
    if (id === 'sub-reserve') {
      if (!canAfford(pool, { green: 1 })) { flash('sub-reserve'); return }
      const { pool: updated } = spendPips(pool, { green: 1 })
      ctx.setPool(updated)
      reservedGreen += 1
      return
    }
    if (id === 'sub-clear-reserve') {
      if (reservedGreen === 0) return
      const pool_ = ctx.getPool()
      ctx.setPool({ ...pool_, totals: { ...pool_.totals, green: pool_.totals.green + reservedGreen } })
      reservedGreen = 0
      return
    }

    // Items
    if (id.startsWith('item-')) {
      const itemId = id.replace('item-', '')
      const item = ctx.getInventory().items.find(i => i.id === itemId)
      if (item) {
        handleItem(item)
      }
      return
    }

    if (id === 'cat-flee') {
      return // Boss disables flee
    }
  }

  function handlePointerMove(_x: number, _y: number): void {
    // noop
  }

  return {
    draw,
    drawMapOverlay,
    handleClick,
    handlePointerMove,
    mapView,
  }
}
