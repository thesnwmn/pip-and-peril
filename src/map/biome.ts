import { colors } from '../colors'
import type { RoomType } from './types'

export interface BiomePalette {
  wallBase: string
  wallCourse: string
  wallJoint: string
  floorBase: string
  floorMortar: string
  floorFlagHi: string
  floorFlagLo: string
  voidFill: string
  fogOverlay: string
  voidDrop: string
  chasmRim: string
  featureStone: string
  wellWater: string
  magicGlow: string
}

export const DUNGEON: BiomePalette = {
  wallBase: '#1c1714',
  wallCourse: '#241e18',
  wallJoint: '#120e0a',
  floorBase: '#322b22',
  floorMortar: '#221c16',
  floorFlagHi: '#3c3028',
  floorFlagLo: '#2a241c',
  voidFill: '#080810',
  fogOverlay: 'rgba(8,8,16,0.65)',
  voidDrop: '#0a0a14',
  chasmRim: '#000000',
  featureStone: '#3a342c',
  wellWater: '#10202c',
  magicGlow: 'rgba(150,90,230,0.55)',
}

export const ROOM_ACCENTS: Partial<Record<RoomType, string>> = {
  enemy: colors.roomEnemy,
  shop: colors.roomShop,
  npc: colors.roomNpc,
  item: colors.roomItem,
  chest: colors.roomChest,
  trap: colors.roomTrap,
  stairwell: colors.roomStairwell,
  boss: colors.roomBoss,
}
