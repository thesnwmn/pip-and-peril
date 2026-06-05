import type { IntentSet, Intent } from './types'

export function selectIntent(intents: IntentSet): Intent {
  const total = intents.reduce((sum, wi) => sum + wi.weight, 0)
  let rand = Math.random() * total
  for (const wi of intents) {
    rand -= wi.weight
    if (rand <= 0) return wi.intent
  }
  return intents[intents.length - 1].intent
}
