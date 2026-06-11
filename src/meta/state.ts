export type DiceColour = 'red' | 'green' | 'blue' | 'yellow'
export type DiceFaces = 4 | 6 | 8 | 10 | 12

export interface PermanentDie {
  id: string
  colour: DiceColour
  faces: DiceFaces
  minFloor?: number   // absent = 1; present = 2..Math.floor(faces/2)
}

export interface MetaState {
  version: 1
  scraps: number
  permanentPool: PermanentDie[]
  activeWeaponId: string
  unlockedWeaponIds: string[]
  runCount: number
}

const DEFAULT_META_STATE: MetaState = {
  version: 1,
  scraps: 0,
  permanentPool: [
    { id: 'r1', colour: 'red', faces: 6 },
    { id: 'g1', colour: 'green', faces: 6 },
    { id: 'y1', colour: 'yellow', faces: 4 },
  ],
  activeWeaponId: 'shortsword',
  unlockedWeaponIds: ['dagger', 'shortsword', 'broadsword', 'whiskerStaff'],
  runCount: 0,
}

export function loadMetaState(): MetaState {
  return getDefaultMetaState()
}

export function saveMetaState(_state: MetaState): void {
  // persistence disabled — save game system not yet implemented
}

export function getDefaultMetaState(): MetaState {
  return JSON.parse(JSON.stringify(DEFAULT_META_STATE))
}
