export type DiceColour = 'red' | 'green' | 'blue' | 'yellow'
export type DiceFaces = 4 | 6 | 8 | 10 | 12

export interface PermanentDie {
  id: string
  colour: DiceColour
  faces: DiceFaces
  minFloor?: number   // absent = 1; present = 2..Math.floor(faces/2)
}

// ── Visitor system types (feature 051) ────────────────────────────────────────

export interface BoonDie {
  colour: DiceColour
  faces: DiceFaces
}

export type VisitorType = 'tinker' | 'wounded-traveller' | 'trickster' | 'scholar'
export type VisitorOfferKind = 'tinker-boon' | 'traveller-help' | 'traveller-gift' | 'trickster-wager' | 'scholar-lesson' | 'scholar-lore'

export interface VisitorOffer {
  kind: VisitorOfferKind
  costScraps: number
  boonDie?: BoonDie
  rewardScraps?: number
  offerLine: string
  acceptLine: string
  // trickster-wager fields
  checkColour?: 'yellow'
  rewardCritical?: number
  rewardSuccess?: number
  rewardPartial?: number
  penaltyFailure?: number
  tier?: 'stranger' | 'familiar' | 'regular'
  // scholar-lesson fields
  skillId?: string
  // scholar-lore fields
  loreLine?: string
}

export interface VisitorInstance {
  individualId: string
  type: VisitorType
  condition: string
  offer: VisitorOffer
  resolved: boolean
}

export interface MetaState {
  version: 1
  scraps: number
  permanentPool: PermanentDie[]
  activeWeaponId: string
  unlockedWeaponIds: string[]
  runCount: number
  visitorRelationships: Record<string, number>
  currentVisitors: VisitorInstance[]
  visitorEpoch: number
  pendingRunBoons: BoonDie[]
  marksEarned: string[]       // list of earned mark IDs, in order of earning (feature 052)
  unlockedSkillIds: string[]  // IDs of skills Pip has earned, in earn order (feature 091)
  activeLoadout: string[]     // IDs of skills chosen for the next run (feature 091)
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
  visitorRelationships: {},
  currentVisitors: [],
  visitorEpoch: -1,
  pendingRunBoons: [],
  marksEarned: [],
  unlockedSkillIds: [],
  activeLoadout: [],
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
