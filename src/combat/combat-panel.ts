import type { EncounterPanel, MapViewConfig } from '../encounter/panel'
import type { DicePool } from '../dice/pool'
import { resetPool } from '../dice/pool'
import type { CombatLogEntry } from '../dice/panel'
import { createDicePanel } from '../dice/panel'
import type { CombatState } from './types'
import { GOBLIN } from './types'
import { applyEnemyAttack, applyEvade, applyFocus, applyStrike, rollGoldReward } from './encounter'
import { drawCombatBanner } from './panel'
import type { Inventory, Item } from '../satchel/types'
import type { DungeonState } from '../navigation/dungeon-state'
import { applyItemEffect } from '../satchel/items'
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
    itemUsedThisTurn: false,
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
      getInventory: () => ctx.getInventory(),
      getItemUsedThisTurn: () => combat.itemUsedThisTurn,
      onBeforeRoll: (): boolean => {
        if (combat.phase === 'awaiting-roll') {
          combat = { ...combat, phase: 'player-turn', itemUsedThisTurn: false }
          return true
        }
        if (combat.phase === 'player-turn') {
          const prevHp = ctx.getPipHp()
          const result = applyEnemyAttack(combat, ctx.getPipHp())
          ctx.setPipHp(result.pipHp)
          combat = { ...result.combat, itemUsedThisTurn: false }
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
      onItem: (item: Item): void => {
        const inventory = ctx.getInventory()
        const prevHp = ctx.getPipHp()
        const dungeonState = ctx.getDungeonState()
        const result = applyItemEffect(
          {
            pipHp: ctx.getPipHp(),
            pipMaxHp: ctx.getPipMaxHp(),
            pool: ctx.getPool(),
            dungeonState,
            tileRow: dungeonState.pip.row,
            tileCol: dungeonState.pip.col,
          },
          item.effect,
        )

        if (result.pipHpAfter !== undefined) {
          ctx.setPipHp(result.pipHpAfter)
          const hpChange = result.pipHpAfter - prevHp
          addLogEntry(`${item.name} — +${hpChange} HP! (Pip: ${prevHp}→${result.pipHpAfter})`)
        }

        if (result.poolAfter !== undefined) {
          ctx.setPool(result.poolAfter)
          dicePanel.startRollAnimation()
          addLogEntry(`${item.name} — Rerolled all dice!`)
        }

        if (result.dungeonStateAfter !== undefined) {
          ctx.setDungeonState(result.dungeonStateAfter)
          if (item.effect.type === 'flee-combat') {
            combat = { ...combat, phase: 'fled' }
            bannerStartTime = performance.now()
            addLogEntry(`${item.name} — Fled combat!`)
          } else if (item.effect.type === 'reveal-fog') {
            addLogEntry(`${item.name} — Fog cleared!`)
          }
        }

        // Decrement item quantity
        const itemIndex = inventory.items.findIndex(i => i.id === item.id)
        if (itemIndex >= 0) {
          const updated = [...inventory.items]
          updated[itemIndex] = { ...updated[itemIndex], quantity: updated[itemIndex].quantity - 1 }
          if (updated[itemIndex].quantity <= 0) {
            updated.splice(itemIndex, 1)
          }
          ctx.setInventory({ ...inventory, items: updated })
        }

        combat = { ...combat, itemUsedThisTurn: true }
      },
    },
  )

  const mapView: MapViewConfig = {
    zoom: COMBAT_CONFIG.cameraZoom,
    pipTargetX: COMBAT_MAP_CENTER_X,
    pipTargetY: COMBAT_MAP_CENTER_Y,
  }

  function draw(renderCtx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (combat.phase === 'victory' || combat.phase === 'defeat' || combat.phase === 'fled') {
      if (bannerStartTime !== null && !completed) {
        const timeout = combat.phase === 'victory' ? 1500 : combat.phase === 'fled' ? 1000 : 2000
        if (timestamp - bannerStartTime >= timeout) {
          signalComplete(combat.phase)
        }
      }
      if (bannerStartTime !== null && (combat.phase === 'victory' || combat.phase === 'defeat')) {
        drawCombatBanner(renderCtx, timestamp, combat, bannerStartTime)
      }
    } else {
      dicePanel.draw(renderCtx, timestamp)
    }
  }

  function handleClick(x: number, y: number): void {
    if (bannerStartTime !== null) {
      if (combat.phase === 'victory' || combat.phase === 'defeat' || combat.phase === 'fled') {
        signalComplete(combat.phase)
        return
      }
    }
    if (y >= PANEL_TOP) {
      dicePanel.handleClick(x, y)
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (combat.phase !== 'victory' && combat.phase !== 'defeat' && combat.phase !== 'fled' && y >= PANEL_TOP) {
      dicePanel.handlePointerMove(x, y)
    }
  }

  return { draw, handleClick, handlePointerMove, mapView }
}
