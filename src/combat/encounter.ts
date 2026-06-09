import type { CombatState, Enemy, Intent, StatusIntent } from './types'
import { selectIntent, pickNextIntent, peekNextIntent } from './intents'

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

// After taking damage, check if the enemy crosses their enrage threshold.
function applyEnrageCheck(enemy: Enemy): Enemy {
  if (!enemy.enraged && enemy.enrageThreshold !== undefined &&
      enemy.hp <= enemy.enrageThreshold && enemy.enragedCycle) {
    return {
      ...enemy,
      enraged: true,
      intentCycle: enemy.enragedCycle,
      // Set to length-1 so pickNextIntent wraps to position 0 on next advance.
      cyclePosition: enemy.enragedCycle.length - 1,
    }
  }
  return enemy
}

function resolveStrike(combat: CombatState, rawDamage: number): StrikeResult {
  const absorbed = Math.min(rawDamage, combat.enemy.block)
  const damage = rawDamage - absorbed
  const newBlock = combat.enemy.block - absorbed
  const newHp = Math.max(0, combat.enemy.hp - damage)
  const victory = newHp <= 0
  let newEnemy = { ...combat.enemy, hp: newHp, block: newBlock }
  if (!victory) newEnemy = applyEnrageCheck(newEnemy)
  return {
    combat: {
      ...combat,
      enemy: newEnemy,
      phase: victory ? 'victory' : combat.phase,
    },
    damage,
    absorbed,
    victory,
  }
}

// Strike — weapon attack action. Damage determined by active weapon.
export function applyStrike(combat: CombatState): StrikeResult {
  const damage = combat.strikeAction?.damage ?? 2
  return resolveStrike(combat, damage)
}

// Heavy Strike — 4🔴 — weapon attack value +2 (4).
export function applyHeavyStrike(combat: CombatState): StrikeResult {
  return resolveStrike(combat, 4)
}

// ── Blue category actions ────────────────────────────────────────────────────

export function applyAnalyse(combat: CombatState): CombatState {
  const nextIntent = peekNextIntent(combat.enemy)
  return {
    ...combat,
    nextIntent,
    analysedThisCombat: true,
    analysedThisTurn: true,
  }
}

export function applyExploit(combat: CombatState): StrikeResult {
  // Bypass Guard entirely — always 3 damage to HP (ignoring block)
  const damage = 3
  const newHp = Math.max(0, combat.enemy.hp - damage)
  const victory = newHp <= 0
  let newEnemy = { ...combat.enemy, hp: newHp }
  if (!victory) newEnemy = applyEnrageCheck(newEnemy)
  return {
    combat: {
      ...combat,
      enemy: newEnemy,
      phase: victory ? 'victory' : combat.phase,
    },
    damage,
    absorbed: 0,
    victory,
  }
}

export function applyResist(combat: CombatState): CombatState {
  return {
    ...combat,
    pipPoison: null,
  }
}

export function applyIdentify(combat: CombatState): CombatState {
  return {
    ...combat,
    identified: true,
  }
}

// ── Yellow category actions ──────────────────────────────────────────────────

export function applyConvert(combat: CombatState, toColor: 'red' | 'green' | 'blue'): CombatState {
  // This just marks that the conversion happened; the actual pip adjustment happens in the panel
  return combat
}

export function applyLuckyShot(combat: CombatState): StrikeResult {
  // Bypass Guard entirely — 1-3 random damage to HP (ignoring block)
  const damage = Math.floor(Math.random() * 3) + 1
  const newHp = Math.max(0, combat.enemy.hp - damage)
  const victory = newHp <= 0
  let newEnemy = { ...combat.enemy, hp: newHp }
  if (!victory) newEnemy = applyEnrageCheck(newEnemy)
  return {
    combat: {
      ...combat,
      enemy: newEnemy,
      phase: victory ? 'victory' : combat.phase,
    },
    damage,
    absorbed: 0,
    victory,
  }
}

// ── Red spend actions ────────────────────────────────────────────────────────

export function applyShove(combat: CombatState): CombatState {
  const { intent: nextIntent, updatedEnemy } = pickNextIntent(combat.enemy)
  return {
    ...combat,
    enemy: updatedEnemy,
    intent: nextIntent,
  }
}

// ── Green spend actions ──────────────────────────────────────────────────────

export function applyFeint(combat: CombatState): CombatState {
  const newBlock = Math.max(0, combat.enemy.block - 2)
  return {
    ...combat,
    enemy: { ...combat.enemy, block: newBlock },
  }
}

export function applyDisengage(combat: CombatState): CombatState {
  const { intent: nextIntent, updatedEnemy } = pickNextIntent(combat.enemy)
  return {
    ...combat,
    intent: nextIntent,
    enemy: { ...updatedEnemy, disengaged: true },
  }
}

// ── Poison tick at start of Pip's turn ───────────────────────────────────────

type PoisonCondition = { n: number; remaining: number } | null

export interface PoisonTickResult {
  pipHp: number
  pipPoison: PoisonCondition
  defeat: boolean
}

export function applyPoisonTick(pipHp: number, poison: PoisonCondition): PoisonTickResult {
  if (!poison || poison.remaining <= 0) {
    return {
      pipHp,
      pipPoison: null,
      defeat: false,
    }
  }

  const newHp = Math.max(0, pipHp - poison.n)
  const newRemaining = poison.remaining - 1
  const newPoison = newRemaining === 0 ? null : { ...poison, remaining: newRemaining }
  const defeat = newHp <= 0

  return {
    pipHp: newHp,
    pipPoison: newPoison,
    defeat,
  }
}

export interface EnemyTurnResult {
  combat: CombatState
  pipHp: number
  damage: number  // 0 on Guard/Empower/Recover turns
  defeat: boolean
}

// Fires the current intent, resets reservedGreen, advances to the next intent.
export function applyEnemyTurn(combat: CombatState, pipHp: number): EnemyTurnResult {
  const { intent: nextIntent, updatedEnemy: enemyAdvanced } = pickNextIntent(combat.enemy)
  let damage = 0
  let newHp = pipHp
  let newPipPoison = combat.pipPoison
  let newEnemy = enemyAdvanced
  let defeat = false

  // Handle intent suppression from Disengage
  if (combat.enemy.disengaged) {
    return {
      combat: {
        ...combat,
        enemy: { ...enemyAdvanced, disengaged: false },
        reservedGreen: 0,
        intent: nextIntent,
      },
      pipHp,
      damage: 0,
      defeat: false,
    }
  }

  if (combat.intent.kind === 'guard') {
    newEnemy = { ...enemyAdvanced, block: enemyAdvanced.block + combat.intent.value }
  } else if (combat.intent.kind === 'empower') {
    newEnemy = { ...enemyAdvanced, empowered: true }
  } else if (combat.intent.kind === 'recover') {
    newEnemy = { ...enemyAdvanced, hp: Math.min(enemyAdvanced.hp + combat.intent.value, enemyAdvanced.maxHp) }
  } else if (combat.intent.kind === 'status') {
    const statusIntent = combat.intent as StatusIntent
    // If full dodge (2G), avoid both damage and condition
    if (combat.reservedGreen >= 2) {
      // No condition applied, damage = 0
    } else if (combat.reservedGreen === 1 && statusIntent.statusKind === 'poison') {
      // Partial dodge: -1 damage but condition still applied
      damage = Math.max(0, statusIntent.value - 1)
      newHp = Math.max(0, pipHp - damage)
      newPipPoison = { n: statusIntent.value, remaining: statusIntent.ticks }
    } else {
      // No dodge: full damage and condition
      damage = statusIntent.value
      newHp = Math.max(0, pipHp - damage)
      newPipPoison = { n: statusIntent.value, remaining: statusIntent.ticks }
    }
    defeat = newHp <= 0
  } else if (combat.intent.kind === 'lunge' || combat.intent.kind === 'attack') {
    // Lunge uses same mitigation as Attack, just with higher value
    const baseDamage = combat.intent.value
    const actualDamage = damageToPip(baseDamage, combat.reservedGreen)
    const empoweredDamage = enemyAdvanced.empowered ? actualDamage * 2 : actualDamage
    newHp = Math.max(0, pipHp - empoweredDamage)
    damage = empoweredDamage
    newEnemy = { ...enemyAdvanced, empowered: false }
    defeat = newHp <= 0
  }

  return {
    combat: {
      ...combat,
      enemy: newEnemy,
      reservedGreen: 0,
      phase: defeat ? 'defeat' : combat.phase,
      intent: nextIntent,
      pipPoison: newPipPoison,
    },
    pipHp: newHp,
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
