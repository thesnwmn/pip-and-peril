export type RoomType = 'start' | 'corridor' | 'enemy' | 'shop' | 'npc' | 'item' | 'chest' | 'boss'

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
}

export interface GameMap {
  cells: (TileCell | null)[][]
  width: number
  height: number
}
