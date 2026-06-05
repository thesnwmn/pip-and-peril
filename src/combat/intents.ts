import type { IntentSet, Intent, Enemy } from './types'

export const GOBLIN_INTENTS: IntentSet = [
  { intent: { kind: 'attack', value: 2 }, weight: 3 },
  { intent: { kind: 'guard',  value: 2 }, weight: 1 },
]

export function selectIntent(intents: IntentSet): Intent {
  const total = intents.reduce((sum, wi) => sum + wi.weight, 0)
  let rand = Math.random() * total
  for (const wi of intents) {
    rand -= wi.weight
    if (rand <= 0) return wi.intent
  }
  return intents[intents.length - 1].intent
}

export const GOBLIN: Enemy = {
  id: 'goblin',
  name: 'Goblin',
  hp: 6,
  maxHp: 6,
  attack: 2,
  block: 0,
  isBoss: false,
  goldMin: 2,
  goldMax: 4,
  intents: GOBLIN_INTENTS,
}
