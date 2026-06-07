export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'heal-full' }
  | { type: 'reroll-dice' }
  | { type: 'flee-combat' }
  | { type: 'reveal-fog'; radius: number }
  | { type: 'armor-buff'; reduction: number }

export type ItemWindow =
  | 'pre-roll'
  | 'on-roll-luck'
  | 'during-allocation'
  | 'on-strike'
  | 'post-spend-tenacity'
  | 'on-enemy-hit'
  | 'post-damage'
  | 'between-turns'
  | 'navigation'

export interface Item {
  id: string
  name: string
  iconType: string
  quantity: number
  description: string
  kind: 'consumable'
  usableInNav: boolean
  usableInCombat: boolean
  effect: ItemEffect
  shopPrice?: number
  window: ItemWindow
  luckyClass: boolean
  charges?: number
  passiveArmour?: number
  deathPrevention?: boolean
}

export interface Inventory {
  gold: number
  items: Item[]
}
