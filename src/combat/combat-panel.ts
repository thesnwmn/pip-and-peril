import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { resetPool } from '../dice/pool'
import type { CombatLogEntry } from '../dice/panel'
import { createDicePanel } from '../dice/panel'
import type { CombatState } from './types'
import { GOBLIN } from './types'
import { applyEnemyAttack, applyEvade, applyFocus, applyStrike, rollGoldReward } from './encounter'
import { drawCombatBanner } from './panel'
import type { Inventory } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { COMBAT_CONFIG } from '../encounter/config'
import { PANEL_TOP, COMBAT_MAP_CENTER_X, COMBAT_MAP_CENTER_Y } from '../screens/game-layout'

// External state the combat panel reads and writes during combat.
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

// Creates a self-contained combat encounter panel.
// Owns: CombatState, DicePool, combatLog, bannerStartTime.
// Reads/writes external state via ctx.
// Signals completion via onComplete('victory') or onComplete('defeat') after the
// banner timeout or an immediate tap — the registry then begins the FALLING transition.
export function createCombatEncounterPanel(
  onComplete: (outcome: string) => void,
  ctx: CombatContext,
): EncounterPanel {
  let combat: CombatState = {
    enemy: { ...GOBLIN },
    phase: 'awaiting-roll',
    evadeBuffer: 0,
    goldAwarded: 0,
  }
  let combatLog: CombatLogEntry[] = []
  let bannerStartTime: number | null = null
  let completed = false

  // Reset dice pool at combat start
  ctx.setPool(resetPool(ctx.getPool()))

  function addLogEntry(message: string): void {
    combatLog = [{ message }, ...combatLog.slice(0, 4)]
  }

  function signalComplete(outcome: string): void {
    if (completed) return
    completed = true
    onComplete(outcome)
  }

  const dicePanel = createDicePanel(
    ctx.getPool,
    // Registry handles animated offset via ctx.translate; dice panel draws at natural PANEL_TOP.
    () => PANEL_TOP,
    {
      onStateChange: (pool) => { ctx.setPool(pool) },
      addLog: addLogEntry,
      getCombatLog: () => combatLog,
      getHpInfo: () => ({
        pipHp: ctx.getPipHp(),
        pipMaxHp: ctx.getPipMaxHp(),
        enemyHp: combat.enemy.hp,
        enemyMaxHp: combat.enemy.maxHp,
        enemyName: combat.enemy.name,
      }),
      onBeforeRoll: (): boolean => {
        if (combat.phase === 'awaiting-roll') {
          combat = { ...combat, phase: 'player-turn' }
          return true
        }
        if (combat.phase === 'player-turn') {
          const prevHp = ctx.getPipHp()
          const result = applyEnemyAttack(combat, ctx.getPipHp())
          ctx.setPipHp(result.pipHp)
          combat = result.combat
          addLogEntry(
            `Goblin strikes — −${result.damage} HP! (Pip: ${prevHp}→${ctx.getPipHp()})`,
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
        if (actionId === 'strike') {
          const prevEnemyHp = combat.enemy.hp
          const result = applyStrike(combat)
          combat = result.combat
          addLogEntry(`Strike — 2 damage! (Goblin: ${prevEnemyHp}→${combat.enemy.hp})`)
          if (result.victory) {
            const goldEarned = rollGoldReward(combat.enemy)
            ctx.setInventory({ ...ctx.getInventory(), gold: ctx.getInventory().gold + goldEarned })
            combat = { ...result.combat, goldAwarded: goldEarned }
            // Mark enemy cell cleared immediately so it won't re-trigger on re-entry
            const dungeonState = ctx.getDungeonState()
            const newCells = dungeonState.grid.cells.map(row => [...row])
            const cell = newCells[dungeonState.pip.row][dungeonState.pip.col]
            if (cell) {
              newCells[dungeonState.pip.row][dungeonState.pip.col] = { ...cell, cleared: true }
            }
            ctx.setDungeonState({ ...dungeonState, grid: { ...dungeonState.grid, cells: newCells } })
            combatLog = []
            bannerStartTime = performance.now()
          }
        } else if (actionId === 'evade') {
          combat = applyEvade(combat)
          addLogEntry('Evade — incoming damage reduced.')
        } else if (actionId === 'focus') {
          const prevPipHp = ctx.getPipHp()
          const focusResult = applyFocus(ctx.getPipHp(), ctx.getPipMaxHp())
          ctx.setPipHp(focusResult.pipHp)
          if (focusResult.heal === 0) {
            addLogEntry(`Focus — +0 HP (Pip: ${prevPipHp}/${ctx.getPipMaxHp()} full)`)
          } else {
            addLogEntry(`Focus — +${focusResult.heal} HP (Pip: ${prevPipHp}→${ctx.getPipHp()})`)
          }
        }
      },
    },
  )

  const mapView: MapViewConfig = {
    zoom: COMBAT_CONFIG.cameraZoom,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (combat.phase === 'victory' || combat.phase === 'defeat') {
      // Banner auto-advance timeout
      if (bannerStartTime !== null && !completed) {
        const timeout = combat.phase === 'victory' ? 1500 : 2000
        if (timestamp - bannerStartTime >= timeout) {
          signalComplete(combat.phase)
        }
      }
      if (bannerStartTime !== null) {
        drawCombatBanner(renderCtx, timestamp, combat, bannerStartTime)
      }
    } else {
      dicePanel.draw(renderCtx, timestamp)
    }
  }

  function handleClick(x: number, y: number): void {
    // Immediate advance on banner tap
    if (bannerStartTime !== null) {
      if (combat.phase === 'victory' || combat.phase === 'defeat') {
        signalComplete(combat.phase)
        return
      }
    }
    // Delegate panel-zone clicks to dice panel
    if (y >= PANEL_TOP) {
      dicePanel.handleClick(x, y)
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (combat.phase !== 'victory' && combat.phase !== 'defeat' && y >= PANEL_TOP) {
      dicePanel.handlePointerMove(x, y)
    }
  }

  return { draw, handleClick, handlePointerMove, mapView }
}
