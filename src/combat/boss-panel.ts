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
  let goldAwarded = 0

  const phase1Cycle = bossSpec.phases[0]!.cycle
  const phase2Cycle = bossSpec.phases[1]!.cycle

  let introStartTime: number | null = null
  let bannerStartTime: number | null = null
  let completed = false

  let openCategory: CatId | null = null
  let hoveredElement: string | null = null
  let flashingElement: string | null = null
  let flashEndTime: number | null = null
  let lastEnemyHeadline = ''
  let lastEnemyDetail = ''
  let lastEnemyKind: CombatState['intent']['kind'] | null = null

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

  function fireEnemyIntent(): void {
    const intent = getCurrentIntent()
    const prevPipHp = ctx.getPipHp()

    if (intent.kind === 'guard') {
      bossBlock = (bossBlock || 0) + (intent.value || 0)
    } else if (intent.kind === 'empower') {
      bossEmpowered = true
    } else if (intent.kind === 'attack' || intent.kind === 'lunge') {
      const baseDamage = intent.value || 0
      const actualDamage = damageToPip(baseDamage, 0) // will be mitigated by reserved green
      const finalDamage = bossEmpowered ? actualDamage * 2 : actualDamage
      const newPipHp = Math.max(0, prevPipHp - finalDamage)
      ctx.setPipHp(newPipHp)
      bossEmpowered = false

      if (newPipHp <= 0) {
        return // defeat will be handled by the combat state
      }
    }

    advanceCyclePosition()
  }

  // ── Map view ──────────────────────────────────────────────────────────────

  function getMapView(): MapViewConfig {
    const tightZoom = COMBAT_CONFIG.cameraZoom
    const wideZoom = 0.75

    if (introStartTime !== null) {
      const elapsed = performance.now() - introStartTime
      const TRANSITION_START = 1500
      const TRANSITION_DURATION = 400

      if (elapsed < TRANSITION_START) {
        return {
          zoom: wideZoom,
          pipTargetX: COMBAT_MAP_CENTER_X,
          pipTargetY: COMBAT_MAP_CENTER_Y,
        }
      } else if (elapsed < TRANSITION_START + TRANSITION_DURATION) {
        const t = (elapsed - TRANSITION_START) / TRANSITION_DURATION
        const zoom = wideZoom + (tightZoom - wideZoom) * t
        return {
          zoom,
          pipTargetX: COMBAT_MAP_CENTER_X,
          pipTargetY: COMBAT_MAP_CENTER_Y,
        }
      }
    }

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
      const centerY = 200
      const cardW = 360
      const cardH = 120

      const gradient = ctx.createLinearGradient(centerY - 80, 0, centerY + 80, 0)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.globalAlpha = alpha
      ctx.fillRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH)

      ctx.font = 'bold 24px monospace'
      ctx.fillStyle = '#c8941e'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(bossSpec.titleCard.name, centerX, centerY - 20)

      ctx.font = 'italic 13px system-ui'
      ctx.fillStyle = '#8b7355'
      ctx.fillText(bossSpec.titleCard.flavour, centerX, centerY + 20)

      ctx.globalAlpha = 1.0
    }

    if (elapsed >= INTRO_DURATION) {
      introStartTime = null
    }
  }

  // ── draw ──────────────────────────────────────────────────────────────────

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Initialize intro timing
    if (introStartTime === null && bannerStartTime === null) {
      introStartTime = timestamp
    }

    // Update mapView for intro camera transitions
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

    // Draw intro sequence
    if (introStartTime !== null) {
      drawIntroSequence(renderCtx, timestamp)
      return
    }

    // Create pseudo-CombatState for the panel UI
    const pseudoCombat: CombatState = {
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
      phase: bannerStartTime !== null ? 'victory' : 'player-turn',
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen: 0,
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
      drawCombatBanner(renderCtx, timestamp, pseudoCombat, bannerStartTime)
      if (timestamp - bannerStartTime >= 2000) {
        signalComplete('run-complete')
      }
      return
    }

    // Combat panel
    drawCombatPanel(renderCtx, {
      pool,
      combat: pseudoCombat,
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
    if (introStartTime !== null || bannerStartTime !== null) return
    drawCombatOverlay(renderCtx, {
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
      phase: 'player-turn',
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen: 0,
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
    if (bannerStartTime !== null) {
      if (!completed) signalComplete('run-complete')
      return
    }

    if (y < PANEL_TOP) return

    const pool = ctx.getPool()
    const pseudoCombat: CombatState = {
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
      phase: 'player-turn',
      intent: getCurrentIntent() as any,
      nextIntent: undefined,
      reservedGreen: 0,
      entryFrom,
      goldAwarded,
      itemUsedThisTurn: false,
      analysedThisCombat: false,
      analysedThisTurn: false,
      identified: false,
      pipPoison: null,
    }

    const id = hitTest(x, y, pool, pseudoCombat, openCategory, false, ctx.getInventory())

    if (!id) {
      openCategory = null
      return
    }

    if (id === 'roll') {
      startRoll()
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
      const cost = { red: 2 }
      if (!canAfford(pool, cost)) { flash('sub-strike'); return }
      const { pool: updated } = spendPips(pool, cost)
      ctx.setPool(updated)
      const damage = Math.min(2, bossBlock) + Math.max(0, 2 - bossBlock)
      bossBlock = Math.max(0, bossBlock - 2)
      bossHp = Math.max(0, bossHp - Math.max(0, 2 - Math.min(2, bossBlock)))
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
        bannerStartTime = performance.now()
        openCategory = null
        return
      }
      checkEnrage()
      fireEnemyIntent()
      openCategory = null
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
