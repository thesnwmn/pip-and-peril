export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'reroll-dice' }
  | { type: 'flee-combat' }
  | { type: 'reveal-fog'; radius: number }

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
}

export interface Inventory {
  gold: number
  items: Item[]
}
