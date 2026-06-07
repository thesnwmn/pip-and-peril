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

export const GRIT_STONE: Item = {
  id: 'grit-stone',
  name: 'Grit Stone',
  iconType: 'grit-stone',
  quantity: 1,
  description: 'A smooth dark stone. It helps to have something to hold.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
  shopPrice: 5,
  window: 'post-spend-tenacity',
  luckyClass: false,
}

export const SECOND_WIND_VIAL: Item = {
  id: 'second-wind-vial',
  name: 'Second Wind Vial',
  iconType: 'second-wind-vial',
  quantity: 1,
  description: 'A bitter draught. Your lungs clear. Go again.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
  shopPrice: 5,
  window: 'post-spend-tenacity',
  luckyClass: false,
}

export const BITTER_ROOT_BREW: Item = {
  id: 'bitter-root-brew',
  name: 'Bitter Root Brew',
  iconType: 'bitter-root-brew',
  quantity: 1,
  description: 'Whatever it is, it works.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
  shopPrice: 5,
  window: 'post-spend-tenacity',
  luckyClass: false,
}

export const FORTUNE_PEBBLE: Item = {
  id: 'fortune-pebble',
  name: 'Fortune Pebble',
  iconType: 'fortune-pebble',
  quantity: 1,
  description: 'A smooth grey river pebble. Just feels right.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'reroll-dice' },
  shopPrice: 4,
  window: 'on-roll-luck',
  luckyClass: true,
}

export const LEATHER_JERKIN: Item = {
  id: 'leather-jerkin',
  name: 'Leather Jerkin',
  iconType: 'leather-jerkin',
  quantity: 1,
  description: 'A mouse-sized jacket, weathered and patched. Reduces all damage by 1.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: false,
  effect: { type: 'armor-buff', reduction: 1 },
  shopPrice: 4,
  window: 'on-enemy-hit',
  luckyClass: false,
  passiveArmour: 1,
}

export const PADDED_COAT: Item = {
  id: 'padded-coat',
  name: 'Padded Coat',
  iconType: 'padded-coat',
  quantity: 1,
  description: 'Heavy padding, stitched for a mouse. Slows you down.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: false,
  effect: { type: 'armor-buff', reduction: 2 },
  shopPrice: 6,
  window: 'on-enemy-hit',
  luckyClass: false,
  passiveArmour: 2,
  greenPenalty: 1,
}

export const SAINTS_ACORN: Item = {
  id: 'saints-acorn',
  name: 'Saint\'s Acorn',
  iconType: 'saints-acorn',
  quantity: 1,
  description: 'Pip found this near the stairwell. He\'s not sure what it is.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: false,
  effect: { type: 'heal', amount: 0 },
  shopPrice: 8,
  window: 'post-damage',
  luckyClass: false,
  deathPrevention: true,
}

export const NINE_LIVES_TOKEN: Item = {
  id: 'nine-lives-token',
  name: 'Nine Lives Token',
  iconType: 'nine-lives-token',
  quantity: 1,
  description: 'Pip found this near a cat. Somehow that feels right.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: false,
  effect: { type: 'heal', amount: 0 },
  shopPrice: 8,
  window: 'post-damage',
  luckyClass: false,
  deathPrevention: true,
}

export const BANDAGE_ROLL: Item = {
  id: 'bandage-roll',
  name: 'Healing Bandage Roll',
  iconType: 'bandage-roll',
  quantity: 1,
  description: 'Three clean strips of cotton. Good for three wounds.',
  kind: 'consumable',
  usableInNav: true,
  usableInCombat: true,
  effect: { type: 'heal', amount: 3 },
  shopPrice: 6,
  window: 'post-damage',
  luckyClass: false,
  charges: 3,
}

export const SMOKE_CANISTER: Item = {
  id: 'smoke-canister',
  name: 'Smoke Canister',
  iconType: 'smoke-canister',
  quantity: 1,
  description: 'A larger pellet. Two escapes, if it comes to it.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'flee-combat' },
  shopPrice: 8,
  window: 'during-allocation',
  luckyClass: false,
  charges: 2,
}

export const TAINTED_MUSHROOM: Item = {
  id: 'tainted-mushroom',
  name: 'Tainted Mushroom',
  iconType: 'tainted-mushroom',
  quantity: 1,
  description: '+3 bonus pips this turn. It tastes wrong. 2 damage on use.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'bonus-pips', amount: 3, selfDamage: 2 },
  shopPrice: 5,
  window: 'during-allocation',
  luckyClass: false,
  cursed: true,
}

export const STOLEN_IDOL: Item = {
  id: 'stolen-idol',
  name: 'Stolen Idol',
  iconType: 'stolen-idol',
  quantity: 1,
  description: '+2 gold per room entered. The dungeon\'s inhabitants want it back.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: false,
  effect: { type: 'heal', amount: 0 },
  shopPrice: 0,
  window: 'post-damage',
  luckyClass: false,
  cursed: true,
}

export const BERSERKER_DRAUGHT: Item = {
  id: 'berserker-draught',
  name: 'Berserker Draught',
  iconType: 'berserker-draught',
  quantity: 1,
  description: 'Double strike damage for 3 turns. No dodging.',
  kind: 'consumable',
  usableInNav: false,
  usableInCombat: true,
  effect: { type: 'berserk', turnsLeft: 3 },
  shopPrice: 7,
  window: 'during-allocation',
  luckyClass: false,
  cursed: true,
}

export const CATALOG_ITEMS: Item[] = [
  CHEESE_CRUMB, GOUDA_WEDGE, LUCKY_ACORN, SMOKE_PELLET, GLOWSTONE_DUST,
  STOUT_FLASK, RABBITS_FOOT, IRON_THIMBLE,
  GRIT_STONE, SECOND_WIND_VIAL, BITTER_ROOT_BREW, FORTUNE_PEBBLE,
  LEATHER_JERKIN, PADDED_COAT, SAINTS_ACORN, NINE_LIVES_TOKEN,
  BANDAGE_ROLL, SMOKE_CANISTER, TAINTED_MUSHROOM, STOLEN_IDOL, BERSERKER_DRAUGHT,
]
