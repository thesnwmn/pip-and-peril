import type { CombatState, Enemy } from './types'
import { selectIntent } from './intents'

export function rollGoldReward(enemy: Enemy): number {
  return Math.floor(Math.random() * (enemy.goldMax - enemy.goldMin + 1)) + enemy.goldMin
}

// Pure mitigation rule: 2G fully dodges, 1G shaves 1, 0G takes full hit.
export function damageToPip(intentValue: number, reservedGreen: number): number {
  if (reservedGreen >= 2) return 0
  return Math.max(0, intentValue - reservedGreen)
}

export interface StrikeResult {
  combat: CombatState
  damage: number    // HP damage actually dealt after block absorbs
  absorbed: number  // damage absorbed by enemy block
  victory: boolean
}

function resolveStrike(combat: CombatState, rawDamage: number): StrikeResult {
  const absorbed = Math.min(rawDamage, combat.enemy.block)
  const damage = rawDamage - absorbed
  const newBlock = combat.enemy.block - absorbed
  const newHp = Math.max(0, combat.enemy.hp - damage)
  const victory = newHp <= 0
  return {
    combat: {
      ...combat,
      enemy: { ...combat.enemy, hp: newHp, block: newBlock },
      phase: victory ? 'victory' : combat.phase,
    },
    damage,
    absorbed,
    victory,
  }
}

// Strike — 2🔴 — weapon attack value (2).
export function applyStrike(combat: CombatState): StrikeResult {
  return resolveStrike(combat, 2)
}

// Heavy Strike — 4🔴 — weapon attack value +2 (4).
export function applyHeavyStrike(combat: CombatState): StrikeResult {
  return resolveStrike(combat, 4)
}

export interface EnemyTurnResult {
  combat: CombatState
  pipHp: number
  damage: number  // 0 on Guard turns
  defeat: boolean
}

// Fires the current intent, resets reservedGreen, selects the next intent.
export function applyEnemyTurn(combat: CombatState, pipHp: number): EnemyTurnResult {
  const nextIntent = selectIntent(combat.enemy.intents)

  if (combat.intent.kind === 'guard') {
    return {
      combat: {
        ...combat,
        enemy: { ...combat.enemy, block: combat.enemy.block + combat.intent.value },
        reservedGreen: 0,
        intent: nextIntent,
      },
      pipHp,
      damage: 0,
      defeat: false,
    }
  }

  // Attack intent: apply mitigation then land damage.
  const damage = damageToPip(combat.intent.value, combat.reservedGreen)
  const newPipHp = Math.max(0, pipHp - damage)
  const defeat = newPipHp <= 0
  return {
    combat: {
      ...combat,
      reservedGreen: 0,
      phase: defeat ? 'defeat' : combat.phase,
      intent: nextIntent,
    },
    pipHp: newPipHp,
    damage,
    defeat,
  }
}

export interface FleeResult {
  pipHp: number
  damage: number
  defeat: boolean
}

// Flee: enemy deals base attack as a free hit, ignoring reservedGreen.
export function applyFlee(combat: CombatState, pipHp: number): FleeResult {
  const damage = combat.enemy.attack
  const newPipHp = Math.max(0, pipHp - damage)
  return {
    pipHp: newPipHp,
    damage,
    defeat: newPipHp <= 0,
  }
}

// Flee is always disabled against a boss; this pure function is the canonical gate.
export function canFlee(enemy: Enemy): boolean {
  return !enemy.isBoss
}
