import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { canAfford, resetPool, rollPool, spendPips } from '../dice/pool'
import type { CombatState } from './types'
import type { Enemy, Intent } from './types'
import { damageToPip } from './encounter'
import { drawCombatBanner, drawCombatPanel, hitTest, type CatId } from './panel'
import { drawCombatOverlay } from './overlay'
import type { Inventory, Item } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { applyItemEffect } from '../satchel/items'
import { colors } from '../colors'
import { COMBAT_CONFIG } from '../encounter/config'
import { PANEL_TOP, COMBAT_MAP_CENTER_X, COMBAT_MAP_CENTER_Y } from '../screens/game-layout'

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
    name: string // caps variant for title card
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

function rollGoldReward(spec: BossSpec): number {
  return Math.floor(Math.random() * (spec.goldMax - spec.goldMin + 1)) + spec.goldMin
}

// ── Boss combat state ─────────────────────────────────────────────────────────

interface BossCombatState {
  activePhase: number // 0 = Phase 1, 1 = Phase 2
  cyclePosition: number
  enraged: boolean
  pipHp: number
  pipMaxHp: number
  reservedGreen: number
  phase: 'intro' | 'combat' | 'complete' | 'defeat'
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
  // ── Initialize boss state ─────────────────────────────────────────────────

  const pipMaxHp = ctx.getPipMaxHp()
  let bossState: BossCombatState = {
    activePhase: 0,
    cyclePosition: 0,
    enraged: false,
    pipHp: ctx.getPipHp(),
    pipMaxHp,
    reservedGreen: 0,
    phase: 'intro',
  }

  let bossHp = bossSpec.maxHp
  let bossBlock = 0
  let empowered = false
  let goldAwarded = 0

  const phase1Cycle = bossSpec.phases[0]!.cycle
  const phase2Cycle = bossSpec.phases[1]!.cycle

  let introStartTime: number | null = null
  let combatStartTime: number | null = null
  let completeStartTime: number | null = null
  let completed = false

  // ── Panel UI state ────────────────────────────────────────────────────────

  let openCategory: CatId | null = null
  let hoveredElement: string | null = null
  let flashingElement: string | null = null
  let flashEndTime: number | null = null

  interface AnimState { startTime: number | null; lastTick: number; scramble: number[] }
  const anim: AnimState = { startTime: null, lastTick: 0, scramble: [] }

  ctx.setPool(resetPool(ctx.getPool()))

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getCurrentCycle(): BossIntent[] {
    return bossState.activePhase === 0 ? phase1Cycle : phase2Cycle
  }

  function getCurrentIntent(): BossIntent {
    const cycle = getCurrentCycle()
    return cycle[bossState.cyclePosition]!
  }

  function advanceCyclePosition(): void {
    const cycle = getCurrentCycle()
    bossState.cyclePosition = (bossState.cyclePosition + 1) % cycle.length
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
    if (!bossState.enraged && bossHp <= bossSpec.enrageThreshold) {
      bossState.enraged = true
      bossState.activePhase = 1
      bossState.cyclePosition = 0
      bossBlock = 0
      empowered = false
      // Log enrage message (could be displayed in UI)
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

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleRoll(): void {
    const pool = ctx.getPool()
    if (pool.state === 'rolling') return

    if (bossState.phase === 'combat') {
      // For now, just start the roll animation and advance state
      startRoll()
      return
    }
  }

  function handleStrike(heavy: boolean): void {
    const cost = heavy ? { red: 4 } : { red: 2 }
    if (!canAfford(ctx.getPool(), cost)) { flash(heavy ? 'sub-heavy' : 'sub-strike'); return }

    const damage = heavy ? 4 : 2
    const absorbed = Math.min(damage, bossBlock)
    const hpDamage = damage - absorbed
    bossBlock = Math.max(0, bossBlock - damage)
    bossHp = Math.max(0, bossHp - hpDamage)

    const { pool: updated } = spendPips(ctx.getPool(), cost)
    ctx.setPool(updated)

    if (bossHp <= 0) {
      goldAwarded = rollGoldReward(bossSpec)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      bossState.phase = 'complete'
      completeStartTime = performance.now()
      openCategory = null
    } else {
      checkEnrage()
      // End turn: fire enemy intent
      fireEnemyIntent()
    }
  }

  function handleReserve(): void {
    if (!canAfford(ctx.getPool(), { green: 1 })) { flash('sub-reserve'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 1 })
    ctx.setPool(updated)
    bossState.reservedGreen += 1
  }

  function handleClearReserve(): void {
    if (bossState.reservedGreen === 0) return
    const returned = bossState.reservedGreen
    const pool = ctx.getPool()
    ctx.setPool({ ...pool, totals: { ...pool.totals, green: pool.totals.green + returned } })
    bossState.reservedGreen = 0
  }

  function handleExploit(): void {
    if (!canAfford(ctx.getPool(), { blue: 4 })) { flash('sub-exploit'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 4 })
    ctx.setPool(updated)

    const damage = 3
    bossBlock = 0 // Bypass guard
    bossHp = Math.max(0, bossHp - damage)

    if (bossHp <= 0) {
      goldAwarded = rollGoldReward(bossSpec)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      bossState.phase = 'complete'
      completeStartTime = performance.now()
      openCategory = null
    } else {
      checkEnrage()
      fireEnemyIntent()
    }
  }

  function handleIdentify(): void {
    if (!canAfford(ctx.getPool(), { blue: 1 })) { flash('sub-identify'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 1 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleAnalyse(): void {
    if (!canAfford(ctx.getPool(), { blue: 2 })) { flash('sub-analyse'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 2 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleFeint(): void {
    if (!canAfford(ctx.getPool(), { green: 2 })) { flash('sub-feint'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 2 })
    ctx.setPool(updated)
    bossBlock = Math.max(0, bossBlock - 2)
    fireEnemyIntent()
  }

  function handleShove(): void {
    if (!canAfford(ctx.getPool(), { red: 3 })) { flash('cat-red'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { red: 3 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleDisengage(): void {
    if (!canAfford(ctx.getPool(), { green: 2 })) { flash('sub-disengage'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { green: 2 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleResist(): void {
    if (!canAfford(ctx.getPool(), { blue: 3 })) { flash('sub-resist'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { blue: 3 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleConvert(): void {
    if (!canAfford(ctx.getPool(), { yellow: 3 })) { flash('sub-convert'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 3 })
    ctx.setPool(updated)
    fireEnemyIntent()
  }

  function handleLuckyShot(): void {
    if (!canAfford(ctx.getPool(), { yellow: 4 })) { flash('sub-lucky-shot'); return }
    const { pool: updated } = spendPips(ctx.getPool(), { yellow: 4 })
    ctx.setPool(updated)

    const damage = Math.floor(Math.random() * 3) + 1
    bossBlock = 0 // Bypass guard
    bossHp = Math.max(0, bossHp - damage)

    if (bossHp <= 0) {
      goldAwarded = rollGoldReward(bossSpec)
      ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldAwarded })
      markRoomCleared()
      bossState.phase = 'complete'
      completeStartTime = performance.now()
      openCategory = null
    } else {
      checkEnrage()
      fireEnemyIntent()
    }
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
      bossState.pipHp = result.pipHpAfter
    }
    if (result.poolAfter !== undefined) {
      const rolled = rollPool(result.poolAfter)
      ctx.setPool(rolled)
      anim.startTime = performance.now(); anim.lastTick = 0; anim.scramble = []
    }
    if (result.dungeonStateAfter !== undefined) {
      ctx.setDungeonState(result.dungeonStateAfter)
    }

    // Decrement quantity.
    const idx = inventory.items.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      const updated = [...inventory.items]
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 }
      if (updated[idx].quantity <= 0) updated.splice(idx, 1)
      ctx.setInventory({ ...inventory, items: updated })
    }

    openCategory = null
    fireEnemyIntent()
  }

  function fireEnemyIntent(): void {
    const intent = getCurrentIntent()
    const prevPipHp = ctx.getPipHp()

    if (intent.kind === 'guard') {
      bossBlock = (bossBlock || 0) + (intent.value || 0)
    } else if (intent.kind === 'empower') {
      empowered = true
    } else if (intent.kind === 'attack' || intent.kind === 'lunge') {
      const baseDamage = intent.value || 0
      const actualDamage = damageToPip(baseDamage, bossState.reservedGreen)
      const finalDamage = empowered ? actualDamage * 2 : actualDamage
      const newPipHp = Math.max(0, prevPipHp - finalDamage)
      ctx.setPipHp(newPipHp)
      bossState.pipHp = newPipHp
      empowered = false
      bossState.reservedGreen = 0

      if (newPipHp <= 0) {
        bossState.phase = 'defeat'
        completeStartTime = performance.now()
        return
      }
    }

    advanceCyclePosition()
  }

  // ── Map view ──────────────────────────────────────────────────────────────
  // During intro: wide-zoom (0.75) for first ~1.5s, then tight-zoom (1.5)
  // During combat/complete: tight-zoom

  function getMapView(): MapViewConfig {
    const tightZoom = COMBAT_CONFIG.cameraZoom
    const wideZoom = 0.75

    if (bossState.phase === 'intro' && introStartTime !== null) {
      const elapsed = performance.now() - introStartTime
      const TRANSITION_START = 1500
      const TRANSITION_DURATION = 400

      if (elapsed < TRANSITION_START) {
        // Wide zoom during title card
        return {
          zoom: wideZoom,
          pipTargetX: COMBAT_MAP_CENTER_X,
          pipTargetY: COMBAT_MAP_CENTER_Y,
        }
      } else if (elapsed < TRANSITION_START + TRANSITION_DURATION) {
        // Transitioning from wide to tight
        const t = (elapsed - TRANSITION_START) / TRANSITION_DURATION
        const zoom = wideZoom + (tightZoom - wideZoom) * t
        return {
          zoom,
          pipTargetX: COMBAT_MAP_CENTER_X,
          pipTargetY: COMBAT_MAP_CENTER_Y,
        }
      }
    }

    // Default to tight zoom for combat and complete phases
    return {
      zoom: tightZoom,
      pipTargetX: COMBAT_MAP_CENTER_X,
      pipTargetY: COMBAT_MAP_CENTER_Y,
    }
  }

  let mapView: MapViewConfig = {
    zoom: 0.75,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  // ── Draw functions ────────────────────────────────────────────────────────

  function drawIntroSequence(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (introStartTime === null) return

    const elapsed = timestamp - introStartTime
    const INTRO_DURATION = 2500

    // At start, show wide-zoom (already handled by mapView in registry)
    // At 500ms, title card fades in
    // At 1500ms, title card fades out, tight-zoom starts
    // At 2500ms, intro ends, combat begins

    if (elapsed < 500) {
      // Title card hasn't appeared yet, just dark background
    } else if (elapsed < 1800) {
      // Title card visible, fade in 0-300ms, hold 300-1500ms, fade out 1500-1800ms
      const cardAge = elapsed - 500
      let alpha = 1.0
      if (cardAge < 300) {
        alpha = cardAge / 300
      } else if (cardAge > 1300) {
        alpha = Math.max(0, 1.0 - ((cardAge - 1300) / 300))
      }

      // Draw title card
      const centerX = 192
      const centerY = 200
      const cardW = 360
      const cardH = 120

      // Gradient scrim
      const gradient = ctx.createLinearGradient(centerY - 80, 0, centerY + 80, 0)
      gradient.addColorStop(0, `rgba(0, 0, 0, 0)`)
      gradient.addColorStop(0.5, `rgba(0, 0, 0, 0.3)`)
      gradient.addColorStop(1, `rgba(0, 0, 0, 0)`)
      ctx.fillStyle = gradient
      ctx.globalAlpha = alpha
      ctx.fillRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH)

      // Boss name (bold 24px monospace, gold)
      ctx.font = 'bold 24px monospace'
      ctx.fillStyle = colors.gold
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(bossSpec.titleCard.name, centerX, centerY - 20)

      // Flavour (italic 13px system-ui, text-muted)
      ctx.font = 'italic 13px system-ui'
      ctx.fillStyle = colors.textMuted
      ctx.fillText(bossSpec.titleCard.flavour, centerX, centerY + 20)

      ctx.globalAlpha = 1.0
    }

    if (elapsed >= INTRO_DURATION) {
      bossState.phase = 'combat'
      combatStartTime = performance.now()
    }
  }

  function drawCompleteBanner(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (completeStartTime === null) return

    const elapsed = timestamp - completeStartTime
    const BANNER_WIDTH = 360
    const BANNER_HEIGHT = 160
    const centerX = 192
    const startY = PANEL_TOP

    // Draw banner background
    ctx.fillStyle = '#201810' // surface-parchment
    ctx.fillRect(10, startY, BANNER_WIDTH - 20, BANNER_HEIGHT)

    // Top border
    ctx.fillStyle = colors.gold
    ctx.fillRect(10, startY, BANNER_WIDTH - 20, 3)

    // Victory title
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = colors.gold
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('── VICTORY ──', centerX, startY + 16)

    // Main text
    ctx.font = '14px system-ui'
    ctx.fillStyle = colors.textPrimary
    ctx.fillText('The Rat King falls.', centerX, startY + 48)

    // Flavour text
    ctx.font = 'italic 12px system-ui'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('The dungeon holds its breath.', centerX, startY + 68)

    // Gold reward (appears at 0.5s)
    if (elapsed >= 500) {
      ctx.font = 'bold 14px monospace'
      ctx.fillStyle = colors.gold
      ctx.fillText(`+ ${goldAwarded} gold ◈`, centerX, startY + 96)
    }

    // Tap to continue (appears at 0.5s)
    if (elapsed >= 500) {
      ctx.font = 'italic 11px system-ui'
      ctx.fillStyle = colors.textMuted
      const alpha = Math.min(1, (elapsed - 500) / 500)
      ctx.globalAlpha = alpha
      ctx.fillText('Tap to continue', centerX, startY + 124)
      ctx.globalAlpha = 1.0
    }
  }

  function drawDefeatBanner(ctx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    if (completeStartTime === null) return

    const BANNER_WIDTH = 360
    const BANNER_HEIGHT = 160
    const centerX = 192
    const startY = PANEL_TOP

    // Draw banner background (darker for defeat)
    ctx.fillStyle = '#1a0f0f'
    ctx.fillRect(10, startY, BANNER_WIDTH - 20, BANNER_HEIGHT)

    // Top border (red for defeat)
    ctx.fillStyle = '#c0200a'
    ctx.fillRect(10, startY, BANNER_WIDTH - 20, 3)

    // Defeat title
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = '#c0200a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('── DEFEATED ──', centerX, startY + 16)

    // Flavour text
    ctx.font = 'italic 12px system-ui'
    ctx.fillStyle = colors.textMuted
    ctx.fillText('The darkness claims you.', centerX, startY + 68)
  }

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Initialize timing
    if (introStartTime === null && bossState.phase === 'intro') {
      introStartTime = timestamp
    }

    // Update mapView for intro sequence camera transitions
    mapView = getMapView()

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

    // Intro phase
    if (bossState.phase === 'intro') {
      drawIntroSequence(renderCtx, timestamp)
      return
    }

    // Complete phase
    if (bossState.phase === 'complete') {
      drawCompleteBanner(renderCtx, timestamp)
      if (completeStartTime !== null && !completed && timestamp - completeStartTime >= 3000) {
        signalComplete('run-complete')
      }
      return
    }

    // Defeat phase
    if (bossState.phase === 'defeat') {
      drawDefeatBanner(renderCtx, timestamp)
      if (completeStartTime !== null && !completed && timestamp - completeStartTime >= 2000) {
        signalComplete('defeat')
      }
      return
    }

    // Combat phase — reuse combat panel
    if (bossState.phase === 'combat') {
      // Create a pseudo-CombatState for the combat panel
      const pseudoCombat: CombatState = {
        enemy: {
          id: bossSpec.id,
          name: bossSpec.name,
          hp: bossHp,
          maxHp: bossSpec.maxHp,
          attack: 0,
          block: bossBlock,
          empowered,
          disengaged: false,
          isBoss: true,
          goldMin: bossSpec.goldMin,
          goldMax: bossSpec.goldMax,
          intents: [], // Boss uses fixed cycles, not random intents
        },
        phase: 'player-turn',
        intent: getCurrentIntent() as any,
        nextIntent: undefined,
        reservedGreen: bossState.reservedGreen,
        entryFrom,
        goldAwarded,
        itemUsedThisTurn: false,
        analysedThisCombat: false,
        analysedThisTurn: false,
        identified: false,
        pipPoison: null,
      }

      drawCombatPanel(renderCtx, {
        pool,
        combat: pseudoCombat,
        openCategory,
        fleePending: false,
        lastEnemyHeadline: '',
        lastEnemyDetail: '',
        lastEnemyKind: null,
        hoveredElement,
        flashingElement,
        flashEndTime,
        animScramble: anim.scramble,
        inventory: ctx.getInventory(),
        timestamp,
      })
    }
  }

  // ── drawMapOverlay ────────────────────────────────────────────────────────

  function drawMapOverlay(renderCtx: CanvasRenderingContext2D, _timestamp: DOMHighResTimeStamp): void {
    if (bossState.phase !== 'combat') return
    drawCombatOverlay(renderCtx, {
      enemy: {
        id: bossSpec.id,
        name: bossSpec.name,
        hp: bossHp,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: bossBlock,
        empowered,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      },
      phase: 'player-turn',
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen: bossState.reservedGreen,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    } as CombatState, ctx.getPipHp(), ctx.getPipMaxHp())
  }

  // ── handleClick ───────────────────────────────────────────────────────────

  function handleClick(x: number, y: number): void {
    // Complete phase — tap to advance
    if (bossState.phase === 'complete' && completeStartTime !== null) {
      signalComplete('run-complete')
      return
    }

    if (bossState.phase === 'defeat' && completeStartTime !== null) {
      signalComplete('defeat')
      return
    }

    if (y < PANEL_TOP) return
    if (bossState.phase !== 'combat') return

    const pool = ctx.getPool()
    const id = hitTest(x, y, pool, {
      enemy: {
        id: bossSpec.id,
        name: bossSpec.name,
        hp: bossHp,
        maxHp: bossSpec.maxHp,
        attack: 0,
        block: bossBlock,
        empowered,
        disengaged: false,
        isBoss: true,
        goldMin: bossSpec.goldMin,
        goldMax: bossSpec.goldMax,
        intents: [],
      },
      phase: 'player-turn',
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen: bossState.reservedGreen,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    } as CombatState, openCategory, false, ctx.getInventory())

    if (!id) {
      openCategory = null
      return
    }

    if (id === 'roll') { handleRoll(); return }

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
    if (id === 'cat-flee') {
      // Boss doesn't allow flee (AC 13)
      return
    }

    // Submenu actions
    if (id === 'sub-strike') { handleStrike(false); return }
    if (id === 'sub-heavy') { handleStrike(true); return }
    if (id === 'sub-reserve') { handleReserve(); return }
    if (id === 'sub-clear-reserve') { handleClearReserve(); return }
    if (id === 'sub-feint') { handleFeint(); return }
    if (id === 'sub-shove') { handleShove(); return }
    if (id === 'sub-disengage') { handleDisengage(); return }
    if (id === 'sub-analyse') { handleAnalyse(); return }
    if (id === 'sub-exploit') { handleExploit(); return }
    if (id === 'sub-resist') { handleResist(); return }
    if (id === 'sub-identify') { handleIdentify(); return }
    if (id === 'sub-convert') { handleConvert(); return }
    if (id === 'sub-lucky-shot') { handleLuckyShot(); return }

    // Item actions
    if (id?.startsWith('item-')) {
      const itemId = id.substring(5)
      const inv = ctx.getInventory()
      const item = inv.items.find(i => i.id === itemId)
      if (item) handleItem(item)
      return
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (bossState.phase !== 'combat') {
      hoveredElement = null
      return
    }
    // Could implement hover state for buttons
  }

  return {
    draw,
    drawMapOverlay,
    handleClick,
    handlePointerMove,
    mapView,
  }
}
