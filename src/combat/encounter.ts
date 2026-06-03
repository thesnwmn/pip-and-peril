import type { CombatState, Enemy } from './types'

export function rollGoldReward(enemy: Enemy): number {
  return Math.floor(Math.random() * (enemy.goldMax - enemy.goldMin + 1)) + enemy.goldMin
}

export interface StrikeResult {
  combat: CombatState
  damage: number
  victory: boolean
}

export interface EnemyAttackResult {
  combat: CombatState
  pipHp: number
  damage: number
  defeat: boolean
}

export function applyStrike(combat: CombatState): StrikeResult {
  const damage = 2
  const newHp = Math.max(0, combat.enemy.hp - damage)
  const victory = newHp <= 0
  return {
    combat: {
      ...combat,
      enemy: { ...combat.enemy, hp: newHp },
      phase: victory ? 'victory' : combat.phase,
    },
    damage,
    victory,
  }
}

export function applyEvade(combat: CombatState): CombatState {
  return { ...combat, evadeBuffer: Math.max(combat.evadeBuffer, 2) }
}

export function applyFocus(pipHp: number, pipMaxHp: number): { pipHp: number; heal: number } {
  const newHp = Math.min(pipHp + 1, pipMaxHp)
  return { pipHp: newHp, heal: newHp - pipHp }
}

export function applyEnemyAttack(combat: CombatState, pipHp: number): EnemyAttackResult {
  const damage = Math.max(0, combat.enemy.attack - combat.evadeBuffer)
  const newPipHp = Math.max(0, pipHp - damage)
  const defeat = newPipHp <= 0
  return {
    combat: {
      ...combat,
      evadeBuffer: 0,
      phase: defeat ? 'defeat' : combat.phase,
    },
    pipHp: newPipHp,
    damage,
    defeat,
  }
}
