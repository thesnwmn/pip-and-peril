import type { GridPos, RoomType } from '../map/types'
import type { LogStyle } from './dungeon-state'
import { DUNGEON_TUNING } from '../dungeon/tuning'

export function getDepthPhase(floor: 1 | 2 | 3, floorTilesPlaced: number): 'early' | 'mid' | 'late' {
  const { mid, late } = DUNGEON_TUNING.phaseThresholds[floor]
  if (floorTilesPlaced < mid) return 'early'
  if (floorTilesPlaced < late) return 'mid'
  return 'late'
}

export interface RoomWeightContext {
  floor: 1 | 2 | 3
  floorTilesPlaced: number
  floorEntryPosition: GridPos
  candidatePos: GridPos
  shopPlacedThisFloor: boolean
}

export function getRoomWeights(context: RoomWeightContext): Record<RoomType, number> {
  const depthPhase = getDepthPhase(context.floor, context.floorTilesPlaced)
  const baseWeights = DUNGEON_TUNING.roomWeights[context.floor][depthPhase]

  const weights: Record<RoomType, number> = {
    start: 0,
    corridor: baseWeights.corridor,
    enemy: baseWeights.enemy,
    shop: context.shopPlacedThisFloor ? 0 : baseWeights.shop,
    npc: baseWeights.npc,
    item: baseWeights.item,
    chest: baseWeights.chest,
    trap: baseWeights.trap,
    stairwell: 0,
    boss: 0,
  }

  // Stairwell override: available if threshold met and not on floor 3
  if (context.floor !== 3 && context.floorTilesPlaced >= DUNGEON_TUNING.stairwellThreshold[context.floor]) {
    weights.stairwell = baseWeights.stairwell
  }

  // Shop debt override: spike weight if threshold reached and no shop placed
  if (context.shopPlacedThisFloor === false && context.floorTilesPlaced >= DUNGEON_TUNING.SHOP_DEBT_THRESHOLD[context.floor]) {
    weights.shop = DUNGEON_TUNING.SHOP_DEBT_WEIGHT
  }

  // Boss override: only on floor 3, with distance-based weighting
  if (context.floor === 3) {
    weights.boss = computeBossWeight(context)
  }

  return weights
}

function computeBossWeight(context: RoomWeightContext): number {
  if (context.floor !== 3) return 0
  if (context.floorTilesPlaced < DUNGEON_TUNING.BOSS_MIN_EXPLORATION) return 0

  const distance = Math.abs(context.candidatePos.col - context.floorEntryPosition.col) +
                   Math.abs(context.candidatePos.row - context.floorEntryPosition.row)

  if (distance < DUNGEON_TUNING.BOSS_DIST_MIN) return 0

  let tierFactor: number
  if (distance < DUNGEON_TUNING.BOSS_DIST_MID) {
    tierFactor = 0.10
  } else if (distance < DUNGEON_TUNING.BOSS_DIST_OUTER) {
    tierFactor = 0.35
  } else {
    tierFactor = 1.00
  }

  const explorationFactor = Math.min(
    1.0,
    Math.max(
      0,
      (context.floorTilesPlaced - DUNGEON_TUNING.BOSS_MIN_EXPLORATION) / DUNGEON_TUNING.BOSS_EXPLORATION_SCALE,
    ),
  )

  return DUNGEON_TUNING.BASE_BOSS_WEIGHT * explorationFactor * tierFactor
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
  trap: [
    'Tiles click ominously beneath your feet.',
    'Something sharp glints in the darkness.',
    'You sense danger.',
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
  stairwell: ['Descend deeper. You won\'t come back up.', 'Stone steps fade into shadow below.'],
  trap: ['Sharp edges glint in shadows.', 'Something dangerous lurks here.', 'You sense a trap.'],
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
