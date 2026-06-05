import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { drawMap, MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { DungeonState } from '../navigation/dungeon-state'
import { DIR_DELTA, initDungeon, OPP } from '../navigation/dungeon-state'
import { movePip } from '../navigation/movement'
import { generateOfferings, placeRoom, descendFloor, CARD_TEASES } from '../navigation/room-selection'
import { LOG_MESSAGES, pickRandom } from '../navigation/room-pool'
import { createNavigationPanel } from '../navigation/panel'
import type { ScreenController } from './main-menu'
import type { DicePool } from '../dice/pool'
import { resetPool, starterPool } from '../dice/pool'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'
import { createSatchelOverlay, drawSatchelButton, isInSatchelButton } from '../satchel/overlay'
import type { Inventory } from '../satchel/types'
import { applyItemEffect } from '../satchel/items'
import { createEncounterRegistry } from '../encounter/registry'
import { createCombatEncounterPanel } from '../combat/combat-panel'
import { createBossEncounterPanel, RAT_KING } from '../combat/boss-panel'
import { createItemEncounterPanel } from '../encounter/item-panel'
import { ITEM_CONFIG } from '../encounter/config'
import {
  LOGICAL_W,
  LOGICAL_H,
  VIEWPORT_COLS,
  VIEWPORT_ROWS,
} from './game-layout'

export function createGame(transitionTo: (screen: string) => void): ScreenController {
  let state: DungeonState = initDungeon()
  let hoveredElement: string | null = null
  let isMouseDevice = false
  let dicePool: DicePool = starterPool()
  let inventory: Inventory = { gold: 0, items: [] }

  // Floor transition tracking
  let floorTransitionStartTime: number | null = null

  // Tile Pip stepped in from — updated on every move, used by Flee to retreat.
  let combatEntryFrom: { col: number; row: number } = { col: state.pip.col, row: state.pip.row }

  const pipMaxHp = 10
  let pipHp = pipMaxHp

  const satchelOverlay = createSatchelOverlay({
    onItemUse: (item) => {
      const prevHp = pipHp
      const result = applyItemEffect({
        pipHp,
        pipMaxHp,
        pool: dicePool,
        dungeonState: state,
        tileRow: state.pip.row,
        tileCol: state.pip.col,
      }, item.effect)

      if (result.pipHpAfter !== undefined) {
        pipHp = result.pipHpAfter
        const hpChange = result.pipHpAfter - prevHp
        const whisperText = item.id === 'cheese-crumb'
          ? 'Pip nibbles the crumb. +2 HP.'
          : item.id === 'gouda-wedge'
          ? 'A real meal. +5 HP.'
          : item.id === 'glowstone-dust'
          ? 'The tunnel glows softly. Fog clears.'
          : `${item.name} used. +${hpChange} HP.`
        navPanel.triggerWhisper(whisperText)
      }

      if (result.poolAfter !== undefined) {
        dicePool = result.poolAfter
      }

      if (result.dungeonStateAfter !== undefined) {
        state = result.dungeonStateAfter
      }

      // Decrement item quantity
      const itemIndex = inventory.items.findIndex(i => i.id === item.id)
      if (itemIndex >= 0) {
        const updated = [...inventory.items]
        updated[itemIndex] = { ...updated[itemIndex], quantity: updated[itemIndex].quantity - 1 }
        if (updated[itemIndex].quantity <= 0) {
          updated.splice(itemIndex, 1)
        }
        inventory = { ...inventory, items: updated }
      }
    },
  })

  function resetRunState(): void {
    state = initDungeon()
    dicePool = starterPool()
    pipHp = pipMaxHp
    inventory = { gold: 0, items: [] }
    navPanel.clearTeases()
    navPanel.clearWhisper()
    satchelOverlay.close()
  }

  const menuModal = createMenuModal('game', (screen) => {
    resetRunState()
    transitionTo(screen)
  })

  const registry = createEncounterRegistry()

  const navPanel = createNavigationPanel(
    () => state,
    () => registry.isActive(),
    {
      onCardChosen: (idx) => {
        const offering = state.offerings[idx]
        const { dc, dr } = DIR_DELTA[state.pendingDir!]
        const targetPos = { col: state.pip.col + dc, row: state.pip.row + dr }
        combatEntryFrom = { col: state.pip.col, row: state.pip.row }

        if (offering.roomType === 'stairwell') {
          floorTransitionStartTime = performance.now()
          state = descendFloor(state)
          navPanel.clearTeases()
          const stairwellMsg = state.floor === 2 ? 'Pip descends deeper…' : 'The third floor. The air is wrong.'
          navPanel.triggerWhisper(stairwellMsg)
        } else {
          state = placeRoom(state, offering, targetPos)
          state = { ...state, roomsEntered: state.roomsEntered + 1 }
          navPanel.clearTeases()
          const cell = state.grid.cells[state.pip.row][state.pip.col]
          if (cell) triggerWhisper(cell.roomType)
          checkEncounterTrigger()
        }
      },
      onDirButton: (dir, dirState) => {
        if (dirState === 'fog') {
          const { dc, dr } = DIR_DELTA[dir]
          const nc = state.pip.col + dc
          const nr = state.pip.row + dr
          const offerings = generateOfferings(state, { col: nc, row: nr }, OPP[dir])
          navPanel.setTeases(offerings.map(o => {
            const teaseList = CARD_TEASES[o.roomType]
            return teaseList ? pickRandom(teaseList) : ''
          }))
          state = { ...state, uiState: 'choosing', pendingDir: dir, offerings }
        } else {
          combatEntryFrom = { col: state.pip.col, row: state.pip.row }
          state = movePip(state, dir)
          state = { ...state, roomsEntered: state.roomsEntered + 1 }
          const cell = state.grid.cells[state.pip.row][state.pip.col]
          if (cell) triggerWhisper(cell.roomType)
          checkEncounterTrigger()
        }
      },
      onWhisperEnd: () => {},
    },
  )

  // Register item room encounter.
  registry.register({
    trigger: (cell) => cell.roomType === 'item' && cell.cleared !== true,
    factory: (onComplete) => {
      const vpCol = state.pip.col - (state.camera.col - Math.floor(VIEWPORT_COLS / 2))
      const vpRow = state.pip.row - (state.camera.row - Math.floor(VIEWPORT_ROWS / 2))
      const pipNatX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
      const pipNatY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2
      const cell = state.grid.cells[state.pip.row][state.pip.col]!
      return createItemEncounterPanel(onComplete, cell,
        { zoom: ITEM_CONFIG.cameraZoom, pipTargetX: pipNatX, pipTargetY: pipNatY },
        {
          getInventory: () => inventory,
          setInventory: (inv) => { inventory = inv },
          getDungeonState: () => state,
          setDungeonState: (s) => { state = s },
        },
      )
    },
    handlers: {
      taken: () => {
        navPanel.clearWhisper()
      },
      left: () => {
        navPanel.clearWhisper()
      },
    },
  })

  // Register combat as the reference encounter type.
  // Adding a new encounter type requires only registering here — no other changes to this file.
  registry.register({
    trigger: (cell) => cell.roomType === 'enemy' && cell.cleared !== true,
    factory: (onComplete) => createCombatEncounterPanel(
      onComplete,
      {
        getPool: () => dicePool,
        setPool: (p) => { dicePool = p },
        getPipHp: () => pipHp,
        setPipHp: (hp) => { pipHp = hp },
        getPipMaxHp: () => pipMaxHp,
        getInventory: () => inventory,
        setInventory: (inv) => { inventory = inv },
        getDungeonState: () => state,
        setDungeonState: (s) => { state = s },
      },
      combatEntryFrom,
    ),
    handlers: {
      victory: () => {
        state = { ...state, enemiesDefeated: state.enemiesDefeated + 1, uiState: 'idle' }
        dicePool = resetPool(dicePool)
        navPanel.clearWhisper()
      },
      defeat: () => {
        resetRunState()
        transitionTo('home')
      },
      fled: () => {
        // Retreat Pip to the tile she entered from.
        const { col, row } = combatEntryFrom
        state = { ...state, pip: { col, row }, camera: { col, row }, uiState: 'idle' }
        dicePool = resetPool(dicePool)
        navPanel.clearWhisper()
      },
    },
  })

  // Register boss encounter.
  registry.register({
    trigger: (cell) => cell.roomType === 'boss' && cell.cleared !== true,
    factory: (onComplete) => createBossEncounterPanel(
      onComplete,
      {
        getPool: () => dicePool,
        setPool: (p) => { dicePool = p },
        getPipHp: () => pipHp,
        setPipHp: (hp) => { pipHp = hp },
        getPipMaxHp: () => pipMaxHp,
        getInventory: () => inventory,
        setInventory: (inv) => { inventory = inv },
        getDungeonState: () => state,
        setDungeonState: (s) => { state = s },
      },
      RAT_KING,
      combatEntryFrom,
    ),
    handlers: {
      'run-complete': () => {
        resetRunState()
        transitionTo('home')
      },
      defeat: () => {
        resetRunState()
        transitionTo('home')
      },
    },
  })

  function checkEncounterTrigger(): void {
    const cell = state.grid.cells[state.pip.row][state.pip.col]
    if (cell) registry.checkTrigger(cell)
  }

  function triggerWhisper(roomType: import('../map/types').RoomType): void {
    const messages = LOG_MESSAGES[roomType]
    if (!messages) return
    const text = pickRandom(messages)
    if (text) navPanel.triggerWhisper(text)
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    // Pip's natural (un-zoomed) screen position — needed for map-view interpolation
    const vpCol = state.pip.col - (state.camera.col - Math.floor(VIEWPORT_COLS / 2))
    const vpRow = state.pip.row - (state.camera.row - Math.floor(VIEWPORT_ROWS / 2))
    const pipNatX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
    const pipNatY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2

    // Advance transition state machine and get animated map render params
    const { zoom, pipTargetX, pipTargetY } = registry.computeMapState(timestamp, pipNatX, pipNatY)

    // Compute floor transition fade (out 500ms, stay hidden 200ms, fade in 500ms = 1200ms total)
    let floorTransitionAlpha = 1.0
    if (floorTransitionStartTime !== null) {
      const elapsed = timestamp - floorTransitionStartTime
      const FADE_OUT_MS = 500
      const FADE_HOLD_MS = 200
      const FADE_IN_MS = 500
      const TOTAL_MS = FADE_OUT_MS + FADE_HOLD_MS + FADE_IN_MS

      if (elapsed < FADE_OUT_MS) {
        // Fade out: 1.0 → 0
        floorTransitionAlpha = 1.0 - (elapsed / FADE_OUT_MS)
      } else if (elapsed < FADE_OUT_MS + FADE_HOLD_MS) {
        // Stay hidden
        floorTransitionAlpha = 0
      } else if (elapsed < TOTAL_MS) {
        // Fade in: 0 → 1.0
        floorTransitionAlpha = (elapsed - FADE_OUT_MS - FADE_HOLD_MS) / FADE_IN_MS
      } else {
        // Animation complete
        floorTransitionAlpha = 1.0
        floorTransitionStartTime = null
      }
    }

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

    // ── Map (with zoom transform during encounters) ──────────────────────────
    ctx.save()
    ctx.beginPath()
    ctx.rect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
    ctx.clip()

    if (registry.isActive()) {
      ctx.fillStyle = DUNGEON.voidFill
      ctx.fillRect(MAP_X, MAP_Y, MAP_W, VIEWPORT_ROWS * TILE_SIZE)
      ctx.translate(pipTargetX, pipTargetY)
      ctx.scale(zoom, zoom)
      ctx.translate(-pipNatX, -pipNatY)
    }

    ctx.globalAlpha = floorTransitionAlpha
    drawMap(ctx, state.grid, state.fog, state.camera, state.pip, DUNGEON)
    ctx.globalAlpha = 1.0
    ctx.restore()

    // ── Navigation panel (background layer; hidden once encounter panel covers it) ──
    if (registry.shouldDrawNavPanel()) {
      navPanel.draw(ctx, timestamp)
    }

    // MENU button always visible (except during transitions — blocked in handleClick)
    drawMenuButton(ctx, !menuModal.isOpen() && isMouseDevice && hoveredElement === 'menu-btn')

    // Satchel button — disabled (encounter active) or enabled (navigation)
    if (registry.isActive()) {
      drawSatchelButton(ctx, true, false)
    } else {
      drawSatchelButton(
        ctx,
        false,
        !menuModal.isOpen() && !satchelOverlay.isOpen() && isMouseDevice && hoveredElement === 'satchel-btn',
      )
    }

    // ── Encounter panel drawn on top of everything above ────────────────────
    registry.draw(ctx, timestamp)

    // Satchel overlay and menu modal always on top
    satchelOverlay.draw(ctx, timestamp, inventory, state)
    menuModal.draw(ctx)
  }

  function handleClick(x: number, y: number): void {
    if (menuModal.handleClick(x, y)) return
    if (satchelOverlay.handleClick(x, y)) return

    // Transitions block all non-modal/overlay input (same as before refactor)
    if (registry.isTransitioning()) return

    if (isInMenuButton(x, y)) {
      menuModal.open()
      return
    }

    // Encounter ACTIVE — registry handles input (returns true)
    if (registry.handleClick(x, y)) return

    if (isInSatchelButton(x, y)) {
      satchelOverlay.open()
      return
    }

    navPanel.handleClick(x, y)
  }

  function handlePointerMove(x: number, y: number): void {
    isMouseDevice = true

    if (menuModal.handlePointerMove(x, y)) {
      hoveredElement = null
      return
    }

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

    if (registry.isActive()) {
      registry.handlePointerMove(x, y)
      hoveredElement = null
      return
    }

    navPanel.handlePointerMove(x, y)
    hoveredElement = null
  }

  return { draw, handleClick, handlePointerMove }
}
