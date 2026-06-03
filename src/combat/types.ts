export interface Enemy {
  id: string
  name: string
  hp: number
  maxHp: number
  attack: number
  goldMin: number
  goldMax: number
}

export interface CombatState {
  enemy: Enemy
  phase: 'awaiting-roll' | 'player-turn' | 'victory' | 'defeat'
  evadeBuffer: number
  goldAwarded: number
}

export const GOBLIN: Enemy = {
  id: 'goblin',
  name: 'Goblin',
  hp: 6,
  maxHp: 6,
  attack: 2,
  goldMin: 2,
  goldMax: 4,
}
