export type DiceColour = 'red' | 'green' | 'blue' | 'yellow'
export type DiceFaces = 4 | 6 | 8 | 10 | 12

export interface PermanentDie {
  id: string
  colour: DiceColour
  faces: DiceFaces
}

export interface MetaState {
  version: 1
  scraps: number
  permanentPool: PermanentDie[]
  activeWeaponId: string
  unlockedWeaponIds: string[]
  runCount: number
}

const STORAGE_KEY = 'pip-meta-v1'

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

function isValidMetaState(data: unknown): data is MetaState {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    obj.version === 1 &&
    typeof obj.scraps === 'number' &&
    Array.isArray(obj.permanentPool) &&
    typeof obj.activeWeaponId === 'string' &&
    Array.isArray(obj.unlockedWeaponIds) &&
    typeof obj.runCount === 'number'
  )
}

export function loadMetaState(): MetaState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      saveMetaState(DEFAULT_META_STATE)
      return DEFAULT_META_STATE
    }

    const parsed = JSON.parse(stored)
    if (!isValidMetaState(parsed)) {
      console.warn('Corrupted or unrecognisable MetaState; starting fresh')
      saveMetaState(DEFAULT_META_STATE)
      return DEFAULT_META_STATE
    }

    return parsed
  } catch (error) {
    console.warn('Failed to load MetaState from localStorage; starting fresh', error)
    return DEFAULT_META_STATE
  }
}

export function saveMetaState(state: MetaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save MetaState to localStorage', error)
  }
}

export function getDefaultMetaState(): MetaState {
  return JSON.parse(JSON.stringify(DEFAULT_META_STATE))
}
