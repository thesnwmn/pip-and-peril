import { colors } from '../colors'
import { DUNGEON } from '../map/biome'
import { drawMap, MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'
import type { DungeonState } from '../navigation/dungeon-state'
import { DIR_DELTA, initDungeon, OPP } from '../navigation/dungeon-state'
import { movePip } from '../navigation/movement'
import { generateOfferings, placeRoom, CARD_TEASES } from '../navigation/room-selection'
import { LOG_MESSAGES, pickRandom } from '../navigation/room-pool'
import { createNavigationPanel } from '../navigation/panel'
import type { ScreenController } from './main-menu'
import type { DicePool } from '../dice/pool'
import { resetPool, starterPool } from '../dice/pool'
import { createMenuModal, drawMenuButton, isInMenuButton } from '../menu/modal'
import { createSatchelOverlay, drawSatchelButton, isInSatchelButton } from '../satchel/overlay'
import type { Inventory } from '../satchel/types'
import { createEncounterRegistry } from '../encounter/registry'
import { createCombatEncounterPanel } from '../combat/combat-panel'
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

  const pipMaxHp = 10
  let pipHp = pipMaxHp

  const satchelOverlay = createSatchelOverlay()

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
        state = placeRoom(state, offering, targetPos)
        state = { ...state, roomsEntered: state.roomsEntered + 1 }
        navPanel.clearTeases()
        const cell = state.grid.cells[state.pip.row][state.pip.col]
        if (cell) triggerWhisper(cell.roomType)
        checkEncounterTrigger()
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

  // Register combat as the reference encounter type.
  // Adding a new encounter type requires only registering here — no other changes to this file.
  registry.register({
    trigger: (cell) => cell.roomType === 'enemy' && cell.cleared !== true,
    factory: (onComplete) => createCombatEncounterPanel(onComplete, {
      getPool: () => dicePool,
      setPool: (p) => { dicePool = p },
      getPipHp: () => pipHp,
      setPipHp: (hp) => { pipHp = hp },
      getPipMaxHp: () => pipMaxHp,
      getInventory: () => inventory,
      setInventory: (inv) => { inventory = inv },
      getDungeonState: () => state,
      setDungeonState: (s) => { state = s },
    }),
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

    drawMap(ctx, state.grid, state.fog, state.camera, state.pip, DUNGEON)
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
