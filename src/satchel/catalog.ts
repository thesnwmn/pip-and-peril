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
  shopPrice: 2,
  window: 'post-damage',
  luckyClass: false,
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
  shopPrice: 5,
  window: 'post-damage',
  luckyClass: false,
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
  shopPrice: 4,
  window: 'on-roll-luck',
  luckyClass: true,
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
  shopPrice: 6,
  window: 'during-allocation',
  luckyClass: false,
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
  shopPrice: 3,
  window: 'navigation',
  luckyClass: false,
}

export const STOUT_FLASK: Item = {
  id: 'stout-flask',
  name: 'Stout Flask',
  iconType: 'flask',
  quantity: 1,
  description: 'Restore to full health.',
  kind: 'consumable',
  usableInNav: true,
  usableInCombat: true,
  effect: { type: 'heal-full' },
  shopPrice: 8,
  window: 'post-damage',
  luckyClass: false,
}

export const RABBITS_FOOT: Item = {
  id: 'rabbits-foot',
  name: 'Rabbit\'s Foot',
  iconType: 'foot',
  quantity: 1,
  description: 'Reroll dice — combat or on a failed check.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
  shopPrice: 6,
  window: 'on-roll-luck',
  luckyClass: true,
}

export const IRON_THIMBLE: Item = {
  id: 'iron-thimble',
  name: 'Iron Thimble',
  iconType: 'thimble',
  quantity: 1,
  description: 'Use in combat',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'armor-buff', reduction: 1 },
  shopPrice: 7,
  window: 'during-allocation',
  luckyClass: false,
}

export const CATALOG_ITEMS: Item[] = [
  CHEESE_CRUMB, GOUDA_WEDGE, LUCKY_ACORN, SMOKE_PELLET, GLOWSTONE_DUST,
  STOUT_FLASK, RABBITS_FOOT, IRON_THIMBLE,
]
