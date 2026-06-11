import type { DiceColour, DiceFaces, MetaState } from './state'

// ── Types ──────────────────────────────────────────────────────────────────────

export type MarkCondition =
  | { kind: 'floor-reached'; floor: number }
  | { kind: 'boss-killed' }
  | { kind: 'floor-no-healing'; floor: number }
  | { kind: 'weapon-and-floor'; weaponId: string; floor: number }
  | { kind: 'rattled-kill' }

export type MarkUnlock =
  | { kind: 'die'; colour: DiceColour; size: DiceFaces }
  | { kind: 'stub'; hint: string }

export interface MarkSpec {
  id: string
  name: string
  flavourLine: string
  conditionText: string
  condition: MarkCondition
  unlock: MarkUnlock
}

export interface RunRecord {
  floorsReached: number
  victory: boolean
  healingItemsUsed: number
  rattledKillingBlow: boolean
  weaponId: string
}

// ── Mark definitions ───────────────────────────────────────────────────────────

export const MARK_SPECS: MarkSpec[] = [
  {
    id: 'mark-floor-2',
    name: 'Into the Dark',
    flavourLine: 'Pip took his first real step downward.',
    conditionText: 'Reach floor 2 for the first time.',
    condition: { kind: 'floor-reached', floor: 2 },
    unlock: { kind: 'die', colour: 'blue', size: 4 },
  },
  {
    id: 'mark-floor-3',
    name: 'Below the Bells',
    flavourLine: "The deep is not a place. It's a feeling.",
    conditionText: 'Reach floor 3 for the first time.',
    condition: { kind: 'floor-reached', floor: 3 },
    unlock: { kind: 'stub', hint: 'A weapon will appear on the rack when the next weapon spec ships.' },
  },
  {
    id: 'mark-first-boss',
    name: 'Bane',
    flavourLine: 'Something old died tonight.',
    conditionText: 'Defeat the dungeon boss for the first time.',
    condition: { kind: 'boss-killed' },
    unlock: { kind: 'stub', hint: 'A weapon will appear on the rack when the next weapon spec ships.' },
  },
  {
    id: 'mark-no-healing',
    name: 'Steady Paw',
    flavourLine: 'The herbs sat untouched.',
    conditionText: 'Complete a run past floor 1 without using a healing item.',
    condition: { kind: 'floor-no-healing', floor: 2 },
    unlock: { kind: 'stub', hint: 'A skill scroll will appear when the skill system ships.' },
  },
  {
    id: 'mark-whisker-run',
    name: "Scholar's Gambit",
    flavourLine: 'Pip put down the sword. He thought instead.',
    conditionText: 'Reach floor 2 in a run using only the Whisker Staff.',
    condition: { kind: 'weapon-and-floor', weaponId: 'whiskerStaff', floor: 2 },
    unlock: { kind: 'stub', hint: 'A new weapon will appear on the rack.' },
  },
  {
    id: 'mark-rattled-kill',
    name: 'Through the Fear',
    flavourLine: 'Shaking paws, and still — a killing blow.',
    conditionText: 'Land a killing blow while in the Rattled state.',
    condition: { kind: 'rattled-kill' },
    unlock: { kind: 'stub', hint: 'An upgrade will become available.' },
  },
]

// ── Evaluation ─────────────────────────────────────────────────────────────────

function conditionMet(condition: MarkCondition, run: RunRecord): boolean {
  switch (condition.kind) {
    case 'floor-reached':
      return run.floorsReached >= condition.floor
    case 'boss-killed':
      return run.victory
    case 'floor-no-healing':
      return run.floorsReached >= condition.floor && run.healingItemsUsed === 0
    case 'weapon-and-floor':
      return run.weaponId === condition.weaponId && run.floorsReached >= condition.floor
    case 'rattled-kill':
      return run.rattledKillingBlow
  }
}

export function evaluateMarks(run: RunRecord, meta: MetaState): string[] {
  const earned = new Set(meta.marksEarned ?? [])
  return MARK_SPECS
    .filter(m => !earned.has(m.id) && conditionMet(m.condition, run))
    .map(m => m.id)
}

// ── Unlock application ─────────────────────────────────────────────────────────

const COLOUR_PREFIX: Record<DiceColour, string> = {
  red: 'r', green: 'g', blue: 'b', yellow: 'y',
}

export function applyMarkUnlocks(markIds: string[], meta: MetaState): MetaState {
  let updated = { ...meta }
  for (const id of markIds) {
    const spec = MARK_SPECS.find(m => m.id === id)
    if (!spec) continue
    if (spec.unlock.kind === 'die') {
      const { colour, size } = spec.unlock
      const prefix = COLOUR_PREFIX[colour]
      const count = updated.permanentPool.filter(d => d.colour === colour).length
      const newDieId = `${prefix}${count + 1}`
      updated = {
        ...updated,
        permanentPool: [
          ...updated.permanentPool,
          { id: newDieId, colour, faces: size },
        ],
      }
    }
  }
  return {
    ...updated,
    marksEarned: [...(updated.marksEarned ?? []), ...markIds],
  }
}
