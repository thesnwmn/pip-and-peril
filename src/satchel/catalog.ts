import type { Item } from './types'

export const CHEESE_CRUMB: Item = {
  id: 'cheese-crumb',
  name: 'Crumb of Cheese',
  iconType: 'cheese',
  quantity: 1,
  description: 'A mouthful for a mouse.',
  kind: 'consumable',
  usableInNav: true,
  usableInCombat: true,
  effect: { type: 'heal', amount: 2 },
}

export const GOUDA_WEDGE: Item = {
  id: 'gouda-wedge',
  name: 'Wedge of Gouda',
  iconType: 'gouda',
  quantity: 1,
  description: 'A proper meal.',
  kind: 'consumable',
  usableInNav: true,
  usableInCombat: true,
  effect: { type: 'heal', amount: 5 },
}

export const LUCKY_ACORN: Item = {
  id: 'lucky-acorn',
  name: 'Lucky Acorn',
  iconType: 'acorn',
  quantity: 1,
  description: 'Still warm from the oak.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
}

export const SMOKE_PELLET: Item = {
  id: 'smoke-pellet',
  name: 'Smoke Pellet',
  iconType: 'smoke',
  quantity: 1,
  description: 'Light the fuse, run.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'flee-combat' },
}

export const GLOWSTONE_DUST: Item = {
  id: 'glowstone-dust',
  name: 'Glowstone Dust',
  iconType: 'glowstone',
  quantity: 1,
  description: 'A pinch of cave light.',
  kind: 'consumable',
  usableInNav: true,
  usableInCombat: false,
  effect: { type: 'reveal-fog', radius: 2 },
}
