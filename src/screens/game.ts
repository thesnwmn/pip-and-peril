import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { drawMap, MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { DungeonState, LogStyle } from '../navigation/dungeon-state'
import { DIR_DELTA, initDungeon, OPP } from '../navigation/dungeon-state'
import { dirFromPipToNeighbour, isBacktrackable, movePip } from '../navigation/movement'
import { generateOfferings, placeRoom, CARD_TEASES } from '../navigation/room-selection'
import { LOG_MESSAGES, pickRandom } from '../navigation/room-pool'
import { createNavigationPanel } from '../navigation/panel'
import type { ScreenController } from './main-menu'
import type { DicePool } from '../dice/pool'
import { resetPool, starterPool } from '../dice/pool'
import { createDicePanel } from '../dice/panel'
import type { CombatLogEntry } from '../dice/panel'
import type { CombatState } from '../combat/types'
import { GOBLIN } from '../combat/types'
import { applyEnemyAttack, applyEvade, applyFocus, applyStrike, rollGoldReward } from '../combat/encounter'
import { drawCombatBanner } from '../combat/panel'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'
import { createSatchelOverlay, drawSatchelButton, isInSatchelButton } from '../satchel/overlay'
import type { Inventory } from '../satchel/types'
import { COMBAT_CONFIG } from '../encounter/config'
import { easeIn, easeOut, lerp } from '../animation/easing'
import {
  LOGICAL_W,
  LOGICAL_H,
  VIEWPORT_COLS,
  VIEWPORT_ROWS,
  PANEL_TOP,
  ENCOUNTER_PANEL_GAP,
  COMBAT_PANEL_TOP,
  TRANSITION_DURATION,
  COMBAT_MAP_CENTER_X,
  COMBAT_MAP_CENTER_Y,
} from './game-layout'

type EncounterTransition =
  | { phase: 'rising'; startTime: number; fromPanelTop: number }
  | { phase: 'falling'; startTime: number; fallAction: 'victory' | 'defeat' }

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let state: DungeonState = initDungeon()
  let hoveredElement: string | null = null
  let isMouseDevice = false
  let dicePool: DicePool = starterPool()
  let inventory: Inventory = { gold: 0, items: [] }
  let combatLog: CombatLogEntry[] = []

  const pipMaxHp = 10
  let pipHp = pipMaxHp
  let combat: CombatState | null = null
  let bannerStartTime: number | null = null
  let transition: EncounterTransition | null = null

  // Last-computed panel top, updated every frame — used by dice panel hit detection
  let livePanelTop = PANEL_TOP

  const satchelOverlay = createSatchelOverlay()

  function resetRunState(): void {
    state = initDungeon()
    dicePool = starterPool()
    pipHp = pipMaxHp
    combat = null
    bannerStartTime = null
    transition = null
    livePanelTop = PANEL_TOP
    inventory = { gold: 0, items: [] }
    combatLog = []
    navPanel.clearTeases()
    navPanel.clearWhisper()
    satchelOverlay.close()
  }

  const menuModal = createMenuModal('game', (screen) => {
    resetRunState()
    transitionTo(screen)
  })

  const dicePanel = createDicePanel(
    () => dicePool,
    () => livePanelTop,
    {
      onStateChange: (pool) => { dicePool = pool },
      addLog: (message) => { addLogEntry(message, 'normal') },
      getCombatLog: () => combatLog,
      getHpInfo: () => combat ? {
        pipHp,
        pipMaxHp,
        enemyHp: combat.enemy.hp,
        enemyMaxHp: combat.enemy.maxHp,
        enemyName: combat.enemy.name,
      } : null,
      onBeforeRoll: (): boolean => {
        if (combat === null) return true
        if (combat.phase === 'awaiting-roll') {
          combat = { ...combat, phase: 'player-turn' }
          return true
        }
        if (combat.phase === 'player-turn') {
          const prevHp = pipHp
          const result = applyEnemyAttack(combat, pipHp)
          pipHp = result.pipHp
          combat = result.combat
          addLogEntry(
            `Goblin strikes — −${result.damage} HP! (Pip: ${prevHp}→${pipHp})`,
            'enemy',
          )
          if (result.defeat) {
            combatLog = []
            bannerStartTime = performance.now()
            return false
          }
          return true
        }
        return false
      },
      onAction: (actionId: string): void => {
        if (combat === null) return
        if (actionId === 'strike') {
          const prevEnemyHp = combat.enemy.hp
          const result = applyStrike(combat)
          combat = result.combat
          addLogEntry(
            `Strike — 2 damage! (Goblin: ${prevEnemyHp}→${combat.enemy.hp})`,
            'enemy',
          )
          if (result.victory) {
            const goldEarned = rollGoldReward(combat.enemy)
            inventory = { ...inventory, gold: inventory.gold + goldEarned }
            combat = { ...result.combat, goldAwarded: goldEarned }
            const newCells = state.grid.cells.map(row => [...row])
            const cell = newCells[state.pip.row][state.pip.col]
            if (cell) {
              newCells[state.pip.row][state.pip.col] = { ...cell, cleared: true }
            }
            state = { ...state, grid: { ...state.grid, cells: newCells } }
            combatLog = []
            bannerStartTime = performance.now()
          }
        } else if (actionId === 'evade') {
          combat = applyEvade(combat)
          addLogEntry('Evade — incoming damage reduced.', 'normal')
        } else if (actionId === 'focus') {
          const prevPipHp = pipHp
          const focusResult = applyFocus(pipHp, pipMaxHp)
          pipHp = focusResult.pipHp
          if (focusResult.heal === 0) {
            addLogEntry(`Focus — +0 HP (Pip: ${prevPipHp}/${pipMaxHp} full)`, 'normal')
          } else {
            addLogEntry(`Focus — +${focusResult.heal} HP (Pip: ${prevPipHp}→${pipHp})`, 'normal')
          }
        }
      },
    },
  )

  const navPanel = createNavigationPanel(
    () => state,
    () => combat !== null || transition !== null,
    {
      onCardChosen: (idx) => {
        const offering = state.offerings[idx]
        const { dc, dr } = DIR_DELTA[state.pendingDir!]
        const targetPos = { col: state.pip.col + dc, row: state.pip.row + dr }
        const chosenRoomType = offering.roomType
        state = placeRoom(state, offering, targetPos)
        state = { ...state, roomsEntered: state.roomsEntered + 1 }
        navPanel.clearTeases()
        triggerWhisper(chosenRoomType)
        checkCombatTrigger()
      },
    },
  )

  function addLogEntry(message: string, _style: LogStyle): void {
    combatLog = [{ message }, ...combatLog.slice(0, 4)]
  }

  function checkCombatTrigger(): void {
    const cell = state.grid.cells[state.pip.row][state.pip.col]
    if (cell && cell.roomType === 'enemy' && cell.cleared !== true) {
      combat = { enemy: { ...GOBLIN }, phase: 'awaiting-roll', evadeBuffer: 0, goldAwarded: 0 }
      combatLog = []
      dicePool = resetPool(dicePool)
      bannerStartTime = null
      navPanel.clearWhisper()
      transition = { phase: 'rising', startTime: performance.now(), fromPanelTop: livePanelTop }
    }
  }

  function startFallingTransition(fallAction: 'victory' | 'defeat'): void {
    transition = { phase: 'falling', startTime: performance.now(), fallAction }
    bannerStartTime = null
  }

  function triggerWhisper(roomType: import('../map/types').RoomType): void {
    const messages = LOG_MESSAGES[roomType]
    if (!messages) return
    const text = pickRandom(messages)
    if (text) navPanel.triggerWhisper(text)
  }

  function computeCanvasState(timestamp: DOMHighResTimeStamp): {
    currentPanelTop: number
    currentZoom: number
    pipNatX: number
    pipNatY: number
    pipTargetX: number
    pipTargetY: number
  } {
    const vpCol = state.pip.col - (state.camera.col - Math.floor(VIEWPORT_COLS / 2))
    const vpRow = state.pip.row - (state.camera.row - Math.floor(VIEWPORT_ROWS / 2))
    const pipNatX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
    const pipNatY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2

    if (combat === null && transition === null) {
      const panelTop = state.uiState === 'choosing' ? PANEL_TOP : LOGICAL_H
      return { currentPanelTop: panelTop, currentZoom: 1.0, pipNatX, pipNatY, pipTargetX: pipNatX, pipTargetY: pipNatY }
    }

    if (transition === null) {
      // Stable combat — panel fully risen
      return { currentPanelTop: COMBAT_PANEL_TOP, currentZoom: COMBAT_CONFIG.cameraZoom, pipNatX, pipNatY, pipTargetX: COMBAT_MAP_CENTER_X, pipTargetY: COMBAT_MAP_CENTER_Y }
    }

    const elapsed = timestamp - transition.startTime
    const t = Math.min(1, Math.max(0, elapsed / TRANSITION_DURATION))

    if (transition.phase === 'rising') {
      const easedT = easeOut(t)
      return {
        currentPanelTop: Math.round(lerp(transition.fromPanelTop, COMBAT_PANEL_TOP, easedT)),
        currentZoom: lerp(1.0, COMBAT_CONFIG.cameraZoom, easedT),
        pipNatX,
        pipNatY,
        pipTargetX: lerp(pipNatX, COMBAT_MAP_CENTER_X, easedT),
        pipTargetY: lerp(pipNatY, COMBAT_MAP_CENTER_Y, easedT),
      }
    } else {
      const easedT = easeIn(t)
      return {
        currentPanelTop: Math.round(lerp(COMBAT_PANEL_TOP, LOGICAL_H, easedT)),
        currentZoom: lerp(COMBAT_CONFIG.cameraZoom, 1.0, easedT),
        pipNatX,
        pipNatY,
        pipTargetX: lerp(COMBAT_MAP_CENTER_X, pipNatX, easedT),
        pipTargetY: lerp(COMBAT_MAP_CENTER_Y, pipNatY, easedT),
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // ── Transition completion ────────────────────────────────────────────────
    if (transition !== null) {
      const elapsed = timestamp - transition.startTime
      if (elapsed >= TRANSITION_DURATION) {
        if (transition.phase === 'rising') {
          transition = null  // combat stable
        } else {
          const { fallAction } = transition
          transition = null
          livePanelTop = PANEL_TOP
          if (fallAction === 'victory') {
            state = { ...state, enemiesDefeated: state.enemiesDefeated + 1 }
            combat = null
            dicePool = resetPool(dicePool)
            bannerStartTime = null
          } else {
            resetRunState()
            transitionTo('home')
            return
          }
        }
      }
    }

    // ── Banner auto-advance → start falling transition ──────────────────────
    if (combat !== null && bannerStartTime !== null && transition === null &&
        (combat.phase === 'victory' || combat.phase === 'defeat')) {
      const timeout = combat.phase === 'victory' ? 1500 : 2000
      if (timestamp - bannerStartTime >= timeout) {
        startFallingTransition(combat.phase)
      }
    }

    // ── Compute animated canvas state ────────────────────────────────────────
    const { currentPanelTop, currentZoom, pipNatX, pipNatY, pipTargetX, pipTargetY } = computeCanvasState(timestamp)
    livePanelTop = currentPanelTop

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // ── Map (with zoom transform during encounter register) ──────────────────
    ctx.save()
    ctx.beginPath()
    ctx.rect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
    ctx.clip()

    if (combat !== null || transition !== null) {
      // Fill so areas outside the dungeon boundary match the void tile colour.
      ctx.fillStyle = DUNGEON.voidFill
      ctx.fillRect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
      // Zoom around pip's natural position, centering it toward the map area centre.
      ctx.translate(pipTargetX, pipTargetY)
      ctx.scale(currentZoom, currentZoom)
      ctx.translate(-pipNatX, -pipNatY)
    }

    drawMap(ctx, state.grid, state.fog, state.camera, state.pip, DUNGEON)
    ctx.restore()

    // ── Navigation panel (status bar, nav arrows, whisper, room selection) ───
    navPanel.draw(ctx, timestamp)

    // MENU button always visible
    drawMenuButton(ctx, !menuModal.isOpen() && isMouseDevice && hoveredElement === 'menu-btn')

    // ── Encounter register: draw satchel BEFORE panel so panel covers it ─────
    const inEncounterRegister = combat !== null || transition !== null
    if (inEncounterRegister) {
      drawSatchelButton(ctx, true, false)
    }

    // ── Panel zone (encounter register) ─────────────────────────────────────
    if (inEncounterRegister && combat !== null) {
      // Gap strip — bg colour between map and the combat panel surface
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, currentPanelTop - ENCOUNTER_PANEL_GAP, LOGICAL_W, ENCOUNTER_PANEL_GAP)
      // Banner — shown during stable combat and during the falling transition
      if (combat.phase === 'victory' || combat.phase === 'defeat') {
        const bst = bannerStartTime ?? timestamp
        drawCombatBanner(ctx, timestamp, combat, bst, currentPanelTop)
      } else {
        dicePanel.draw(ctx, timestamp)
      }
    }

    // ── Satchel button (nav register — floats on top of nav panels) ──────────
    if (!inEncounterRegister) {
      drawSatchelButton(
        ctx,
        false,
        !menuModal.isOpen() && !satchelOverlay.isOpen() && isMouseDevice && hoveredElement === 'satchel-btn',
      )
    }

    // Satchel overlay and menu modal always on top
    satchelOverlay.draw(ctx, timestamp, inventory, state)
    menuModal.draw(ctx)
  }

  function handleClick(x: number, y: number): void {
    // Modal consumes all input when open
    if (menuModal.handleClick(x, y)) return

    // Satchel overlay consumes all input when open
    if (satchelOverlay.handleClick(x, y)) return

    // Block all game input during transitions
    if (transition !== null) return

    // MENU button
    if (isInMenuButton(x, y)) {
      dicePanel.handlePointerMove(-1, -1)
      menuModal.open()
      return
    }

    // Satchel button — navigation only, not during combat or transition
    if (isInSatchelButton(x, y) && combat === null) {
      satchelOverlay.open()
      return
    }

    // Combat active
    if (combat !== null) {
      if (y >= livePanelTop) {
        if (combat.phase === 'victory') {
          startFallingTransition('victory')
        } else if (combat.phase === 'defeat') {
          startFallingTransition('defeat')
        } else {
          dicePanel.handleClick(x, y)
        }
      }
      return
    }

    // Room selection — delegated to navigation panel
    if (state.uiState === 'choosing') {
      navPanel.handleClick(x, y)
      return
    }

    // Idle navigation
    if (state.uiState === 'idle') {
      const startCol = state.camera.col - Math.floor(VIEWPORT_COLS / 2)
      const startRow = state.camera.row - Math.floor(VIEWPORT_ROWS / 2)

      const vc = Math.floor((x - MAP_X) / TILE_SIZE)
      const vr = Math.floor((y - MAP_Y) / TILE_SIZE)

      if (vc < 0 || vc >= VIEWPORT_COLS || vr < 0 || vr >= VIEWPORT_ROWS) return

      const nc = startCol + vc
      const nr = startRow + vr

      if (nc < 0 || nc >= state.grid.width || nr < 0 || nr >= state.grid.height) return

      const dir = dirFromPipToNeighbour(state, nc, nr)
      if (dir === null) return

      const neighbour = state.grid.cells[nr][nc]

      if (neighbour === null) {
        const pipCell = state.grid.cells[state.pip.row][state.pip.col]
        if (!pipCell || !(pipCell.exits & dir)) return

        const offerings = generateOfferings(state, { col: nc, row: nr }, OPP[dir])
        navPanel.setTeases(offerings.map(o => {
          const teaseList = CARD_TEASES[o.roomType]
          return teaseList ? pickRandom(teaseList) : ''
        }))
        navPanel.clearWhisper()
        state = {
          ...state,
          uiState: 'choosing',
          pendingDir: dir,
          offerings,
        }
      } else if (isBacktrackable(state, dir)) {
        state = movePip(state, dir)
        state = { ...state, roomsEntered: state.roomsEntered + 1 }
        checkCombatTrigger()
      }
    }
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true

    // Modal blocks hover when open
    if (menuModal.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }

    // Satchel overlay consumes pointer when open
    if (satchelOverlay.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }

    if (isInMenuButton(x, y)) {
      hoveredElement = 'menu-btn'
      return
    }

    if (isInSatchelButton(x, y)) {
      hoveredElement = 'satchel-btn'
      return
    }

    // Combat active (or transitioning)
    if (combat !== null || transition !== null) {
      if (y >= livePanelTop && combat !== null &&
          combat.phase !== 'victory' && combat.phase !== 'defeat' &&
          transition === null) {
        dicePanel.handlePointerMove(x, y)
      }
      hoveredElement = null
      return
    }

    // Delegate card hover to navigation panel
    navPanel.handlePointerMove(x, y)
    hoveredElement = null
  }

  return { draw, handleClick, handlePointerMove }
}
