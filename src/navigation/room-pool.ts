import type { RoomType } from '../map/types'
import type { LogStyle } from './dungeon-state'

export const DEPTH_POOLS: { maxChebyshev: number; pool: RoomType[] }[] = [
  {
    maxChebyshev: 2,
    pool: ['corridor', 'corridor', 'shop', 'npc', 'item'],
  },
  {
    maxChebyshev: 4,
    pool: ['enemy', 'enemy', 'shop', 'chest', 'npc', 'item'],
  },
  {
    maxChebyshev: Infinity,
    pool: ['enemy', 'enemy', 'enemy', 'chest', 'item', 'shop', 'boss'],
  },
]

export function poolForDepth(depth: number): RoomType[] {
  for (const band of DEPTH_POOLS) {
    if (depth <= band.maxChebyshev) return band.pool
  }
  return DEPTH_POOLS[DEPTH_POOLS.length - 1].pool
}

export const LOG_MESSAGES: Partial<Record<RoomType, string[]>> = {
  enemy: [
    'Something snarls in the dark.',
    'Claws scrape on stone.',
    'An enemy bars the way.',
    'A low growl. Close.',
  ],
  boss: [
    'THE FLOOR SHAKES.',
    'A terrible presence fills this place.',
  ],
  shop: [
    'A merchant grins at your coin pouch.',
    'Strange wares in the torchlight.',
    'Coins clink.',
  ],
  npc: [
    'A stranger whispers a warning.',
    'Someone slumps against the far wall.',
    'A robed figure stares.',
  ],
  item: [
    'Something glints on a stone pedestal.',
  ],
  chest: [
    'A locked chest catches your eye.',
    'Gold light under the lid.',
    'Heavy iron lock. Weak hinges.',
  ],
}

export const CARD_TEASES: Partial<Record<RoomType, string[]>> = {
  enemy: ['A distant growl…', 'Scratching on stone.', 'Iron smell of old blood.'],
  boss: ['Something immense stirs.', 'Cold dread seeps through the door.', 'The ground trembles faintly.'],
  shop: ['Coins clink faintly.', 'The smell of pipe smoke.', 'A low, cheerful whistle.'],
  npc: ['A whispered voice.', 'Shuffling. Breathing.', 'Soft candlelight under the door.'],
  item: ['A faint gleam in the dark.', 'Something shiny, half-buried.', 'Discarded and forgotten.'],
  chest: ['The dull gleam of iron.', 'Someone locked this for a reason.', 'Heavy. Promising.'],
  corridor: ['Quiet. Just dust.', 'A draft from ahead.', 'Footsteps, long silent.'],
}

export function logStyleForRoom(roomType: RoomType): LogStyle {
  const map: Partial<Record<RoomType, LogStyle>> = {
    enemy: 'enemy',
    boss: 'boss',
    shop: 'shop',
    npc: 'npc',
    item: 'item',
    chest: 'chest',
  }
  return map[roomType] ?? 'normal'
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
