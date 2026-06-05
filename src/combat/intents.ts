import type { IntentSet, Intent, Enemy } from './types'

export function selectIntent(intents: IntentSet): Intent {
  const total = intents.reduce((sum, wi) => sum + wi.weight, 0)
  let rand = Math.random() * total
  for (const wi of intents) {
    rand -= wi.weight
    if (rand <= 0) return wi.intent
  }
  return intents[intents.length - 1].intent
}

// Advance the cycle by one position and return the resulting intent + updated enemy.
export function pickNextIntent(enemy: Enemy): { intent: Intent; updatedEnemy: Enemy } {
  if (enemy.intentCycle && enemy.cyclePosition !== undefined) {
    const cycle = enemy.intentCycle
    const newPos = (enemy.cyclePosition + 1) % cycle.length
    return {
      intent: cycle[newPos]!,
      updatedEnemy: { ...enemy, cyclePosition: newPos },
    }
  }
  return { intent: selectIntent(enemy.intents), updatedEnemy: enemy }
}

// Peek at the next intent without advancing the cycle (used by Analyse).
export function peekNextIntent(enemy: Enemy): Intent {
  if (enemy.intentCycle && enemy.cyclePosition !== undefined) {
    const cycle = enemy.intentCycle
    const nextPos = (enemy.cyclePosition + 1) % cycle.length
    return cycle[nextPos]!
  }
  return selectIntent(enemy.intents)
}
