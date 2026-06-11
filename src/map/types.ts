export type Archetype = 'chamber' | 'passage' | 'cavern' | 'pillared' | 'rubble' | 'bridge' | 'well' | 'pool' | 'squeeze'

export type RoomType = 'start' | 'corridor' | 'enemy' | 'shop' | 'npc' | 'item' | 'chest' | 'trap' | 'stairwell' | 'boss'

export type ExitMask = number
export const N: ExitMask = 1
export const E: ExitMask = 2
export const S: ExitMask = 4
export const W: ExitMask = 8

export type FogState = 'hidden' | 'seen' | 'visible'

export interface GridPos {
  col: number
  row: number
}

export interface TileCell {
  roomType: RoomType
  exits: ExitMask
  archetype?: Archetype
  cleared?: boolean
  fled?: boolean
  itemId?: string
  trapDifficulty?: number
  trapFired?: boolean
  trapFlavour?: number
  enemyId?: string
  shopStock?: string[]
  shopMerchant?: string
  chestVariant?: 'basic' | 'locked' | 'trapped'
  chestState?: 'closed' | 'opened'
  lockDifficulty?: number
  loot?: { gold: number; item?: string } | null
  npcType?: 'rat-scavenger' | 'frightened-mouse' | 'old-hermit'
  npcState?: 'active' | 'completed'
}

export interface GameMap {
  cells: (TileCell | null)[][]
  width: number
  height: number
}
