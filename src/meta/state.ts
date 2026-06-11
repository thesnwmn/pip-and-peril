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

function isValidMetaState(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    obj.version === 1 &&
    typeof obj.scraps === 'number' &&
    Array.isArray(obj.permanentPool) &&
    typeof obj.activeWeaponId === 'string' &&
    Array.isArray(obj.unlockedWeaponIds)
    // runCount is optional — migrated from pre-053 saves on load
  )
}

export function loadMetaState(): MetaState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      saveMetaState(DEFAULT_META_STATE)
      return DEFAULT_META_STATE
    }

    const parsed = JSON.parse(stored) as Record<string, unknown>
    if (!isValidMetaState(parsed)) {
      console.warn('Corrupted or unrecognisable MetaState; starting fresh')
      saveMetaState(DEFAULT_META_STATE)
      return DEFAULT_META_STATE
    }

    // Migrate runCount from pre-053 saves that lack the field
    const runCountRaw = parsed.runCount
    const runCount =
      typeof runCountRaw === 'number' && !isNaN(runCountRaw) ? runCountRaw : 0

    const permanentPool = (parsed.permanentPool as PermanentDie[]).map(die => {
      const mf = die.minFloor
      if (typeof mf !== 'number' || mf <= 1) return die
      const maxFloor = Math.floor(die.faces / 2)
      const clamped = Math.max(2, Math.min(Math.floor(mf), maxFloor))
      return { ...die, minFloor: clamped }
    })

    const result: MetaState = {
      version: 1,
      scraps: parsed.scraps as number,
      permanentPool,
      activeWeaponId: parsed.activeWeaponId as string,
      unlockedWeaponIds: parsed.unlockedWeaponIds as string[],
      runCount,
    }

    if (typeof runCountRaw !== 'number' || isNaN(runCountRaw as number)) {
      saveMetaState(result)
    }

    return result
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
