export type IntentKind = 'attack' | 'guard'

export interface Intent {
  kind: IntentKind
  value: number
}

export interface WeightedIntent {
  intent: Intent
  weight: number
}

export type IntentSet = WeightedIntent[]

export interface Enemy {
  id: string
  name: string
  hp: number
  maxHp: number
  attack: number     // base attack damage (used for Flee free hit)
  block: number      // current Guard block (0 = none); depletes before HP
  isBoss: boolean
  goldMin: number
  goldMax: number
  intents: IntentSet
}

export interface CombatState {
  enemy: Enemy
  phase: 'awaiting-roll' | 'player-turn' | 'victory' | 'defeat' | 'fled'
  intent: Intent                           // current telegraphed intent
  reservedGreen: number                    // Green pips held for defence; reset after enemy turn
  entryFrom: { col: number; row: number }  // tile Pip stepped in from (for Flee retreat)
  goldAwarded: number
  itemUsedThisTurn: boolean
}
