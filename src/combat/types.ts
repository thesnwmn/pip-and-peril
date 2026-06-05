export type IntentKind = 'attack' | 'guard' | 'empower' | 'recover' | 'status' | 'lunge'

export interface Intent {
  kind: IntentKind
  value: number
}

export interface StatusIntent extends Intent {
  kind: 'status'
  statusKind: 'poison' | 'slow' | 'stun'
  ticks: number
}

export interface WeightedIntent {
  intent: Intent
  weight: number
}

export type IntentSet = WeightedIntent[]

export interface EnemyPersonality {
  attackLine?: string
  guardLine?: string
  empowerLine?: string
  recoverLine?: string
  lungeLine?: string
  statusLine?: string
}

export interface EnemySpec {
  id: string
  name: string
  tier: 1 | 2 | 3
  maxHp: number
  attack: number
  goldMin: number
  goldMax: number
  intents: IntentSet
  personality: EnemyPersonality
}

export interface Enemy {
  id: string
  name: string
  hp: number
  maxHp: number
  attack: number     // base attack damage (used for Flee free hit)
  block: number      // current Guard block (0 = none); depletes before HP
  empowered: boolean // set by Empower intent; cleared after next attack fires
  disengaged: boolean // set by Disengage; cleared after one suppressed turn
  isBoss: boolean
  goldMin: number
  goldMax: number
  intents: IntentSet
}

export interface PipState {
  poison: { n: number; remaining: number } | null
}

export interface CombatState {
  enemy: Enemy
  phase: 'awaiting-roll' | 'player-turn' | 'tenacity-window' | 'victory' | 'defeat' | 'fled'
  intent: Intent                           // current telegraphed intent
  nextIntent?: Intent                      // next intent, revealed by Analyse
  reservedGreen: number                    // Green pips held for defence; reset after enemy turn
  entryFrom: { col: number; row: number }  // tile Pip stepped in from (for Flee retreat)
  goldAwarded: number
  itemUsedThisTurn: boolean
  analysedThisCombat: boolean              // set by Analyse; persists until combat ends
  analysedThisTurn: boolean                // set when Analyse fires this turn; reset each turn
  identified: boolean                      // set by Identify (exact HP shown)
  pipPoison: PipState['poison']
}
