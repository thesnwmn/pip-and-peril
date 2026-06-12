import type {
  DiceColour,
  DiceFaces,
  MetaState,
  BoonDie,
  VisitorInstance,
  VisitorOffer,
  VisitorType,
} from '../meta/state'

export type TricksterBand = 'critical' | 'success' | 'cost' | 'failure'

export type RelationshipTier = 'stranger' | 'familiar' | 'regular'

// ── Tuning constants (weights live here per spec) ─────────────────────────────

export const VISITOR_COUNT_ENTRIES: [number, number][] = [
  [0, 25], [1, 45], [2, 25], [3, 5],
]

export const TIER_THRESHOLDS = { familiar: 2, regular: 5 } as const

export const TINKER_COSTS: Record<RelationshipTier, number> = {
  stranger: 3, familiar: 2, regular: 0,
}

export const TINKER_FACES: Record<RelationshipTier, DiceFaces> = {
  stranger: 4, familiar: 6, regular: 6,
}

export const TRAVELLER_HELP_COST = 2
export const TRAVELLER_GIFT_REWARD = 5

export const VISITOR_TINKER_TINT = '#b0763a'
export const VISITOR_TRAVELLER_TINT = '#6a7a6a'
export const VISITOR_TRICKSTER_TINT = '#8a6a3a'

// ── Trickster tuning ──────────────────────────────────────────────────────────

export const TRICKSTER_YELLOW_CRITICAL = 4
export const TRICKSTER_YELLOW_SUCCESS = 2
export const TRICKSTER_YELLOW_PARTIAL = 1

export const TRICKSTER_WAGER: Record<RelationshipTier, {
  penaltyFailure: number
  rewardCritical: number
  rewardSuccess: number
  rewardPartial: number
}> = {
  stranger: { penaltyFailure: 4, rewardCritical: 9, rewardSuccess: 4, rewardPartial: 1 },
  familiar: { penaltyFailure: 4, rewardCritical: 9, rewardSuccess: 4, rewardPartial: 1 },
  regular:  { penaltyFailure: 2, rewardCritical: 9, rewardSuccess: 4, rewardPartial: 1 },
}

export const TRICKSTER_OFFER_LINES: Record<RelationshipTier, string> = {
  stranger: "Barely any risk — roll your luck against mine. Mostly you'll come out ahead. Mostly.",
  familiar: "You've seen enough of me to know there's a catch. There is. Failure costs a few scraps. Worth it most days.",
  regular:  "You know the deal. I've shaved the edge off a little — call it professional respect. Roll.",
}

// ── Roster ────────────────────────────────────────────────────────────────────

interface RosterEntry {
  individualId: string
  type: VisitorType
  name: string
}

const ROSTER: RosterEntry[] = [
  { individualId: 'tinker-tussock',    type: 'tinker',             name: 'Tussock' },
  { individualId: 'tinker-pellam',     type: 'tinker',             name: 'Pellam'  },
  { individualId: 'traveller-marl',    type: 'wounded-traveller',  name: 'Marl'    },
  { individualId: 'traveller-finch',   type: 'wounded-traveller',  name: 'Finch'   },
  { individualId: 'trickster-sloke',   type: 'trickster',          name: 'Sloke'   },
  { individualId: 'trickster-fenwick', type: 'trickster',          name: 'Fenwick' },
]

export const VISITOR_NAMES: Record<string, string> = Object.fromEntries(
  ROSTER.map(r => [r.individualId, r.name])
)

export const VISITOR_TYPES_BY_ID: Record<string, VisitorType> = Object.fromEntries(
  ROSTER.map(r => [r.individualId, r.type])
)

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  tinker: 'Tinker',
  'wounded-traveller': 'Wounded Traveller',
  trickster: 'Trickster',
}

// ── Condition bank ────────────────────────────────────────────────────────────

const CONDITION_BANK = [
  'breathless and damp from the lower passages.',
  'asleep on the stool when Pip returns.',
  'eyeing the dungeon entrance nervously.',
  'warming both paws at the fire.',
  'carrying a bundle that clinks when it moves.',
  "with mud to the knees and a story they won't tell.",
  'humming something tuneless and old.',
  'watching the dark as though it might watch back.',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function tierFor(count: number): RelationshipTier {
  if (count >= TIER_THRESHOLDS.regular)  return 'regular'
  if (count >= TIER_THRESHOLDS.familiar) return 'familiar'
  return 'stranger'
}

export function getVisitorTint(type: VisitorType): string {
  if (type === 'tinker') return VISITOR_TINKER_TINT
  if (type === 'trickster') return VISITOR_TRICKSTER_TINT
  return VISITOR_TRAVELLER_TINT
}

export function getDisplayName(individualId: string, tier: RelationshipTier): string {
  if (tier === 'stranger') {
    const type = VISITOR_TYPES_BY_ID[individualId]
    if (!type) return 'A visitor'
    if (type === 'tinker') return 'A wandering tinker'
    if (type === 'trickster') return 'A shady traveller'
    return 'A wounded traveller'
  }
  return VISITOR_NAMES[individualId] ?? individualId
}

function pickWeighted(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const [key, weight] of Object.entries(weights)) {
    r -= weight
    if (r <= 0) return key
  }
  return Object.keys(weights)[0]
}

function drawVisitorCount(): number {
  const total = VISITOR_COUNT_ENTRIES.reduce((acc, [, w]) => acc + w, 0)
  let r = Math.random() * total
  for (const [count, weight] of VISITOR_COUNT_ENTRIES) {
    r -= weight
    if (r <= 0) return count
  }
  return 0
}

// ── Trickster helpers ─────────────────────────────────────────────────────────

export function evaluateTricksterBand(yellowPips: number): TricksterBand {
  if (yellowPips >= TRICKSTER_YELLOW_CRITICAL) return 'critical'
  if (yellowPips >= TRICKSTER_YELLOW_SUCCESS)  return 'success'
  if (yellowPips >= TRICKSTER_YELLOW_PARTIAL)  return 'cost'
  return 'failure'
}

export function canAffordTricksterWager(scraps: number, penaltyFailure: number): boolean {
  return scraps >= penaltyFailure
}

export function applyTricksterWager(currentScraps: number, band: TricksterBand, offer: VisitorOffer): number {
  if (band === 'critical') return currentScraps + (offer.rewardCritical ?? 0)
  if (band === 'success')  return currentScraps + (offer.rewardSuccess ?? 0)
  if (band === 'cost')     return currentScraps + (offer.rewardPartial ?? 0)
  return Math.max(0, currentScraps - (offer.penaltyFailure ?? 0))
}

export function getTricksterAcceptLine(band: TricksterBand, name: string): string {
  if (band === 'critical') return `${name} counts out the scraps with a grin that doesn't quite reach their eyes.`
  if (band === 'success')  return `${name} nods. Fair result. You played it straight.`
  if (band === 'cost')     return `'Nearly,' says ${name}, as if that helps.`
  return `${name} pockets the scraps without ceremony. 'Better luck below.'`
}

// ── Offer resolution ──────────────────────────────────────────────────────────

export function resolveVisitorOffer(
  type: VisitorType,
  tier: RelationshipTier,
  individualId: string,
  relationships: Record<string, number>,
): VisitorOffer {
  const name = getDisplayName(individualId, tier)

  if (type === 'trickster') {
    const values = TRICKSTER_WAGER[tier]
    return {
      kind: 'trickster-wager',
      costScraps: 0,
      checkColour: 'yellow',
      rewardCritical: values.rewardCritical,
      rewardSuccess: values.rewardSuccess,
      rewardPartial: values.rewardPartial,
      penaltyFailure: values.penaltyFailure,
      tier,
      offerLine: TRICKSTER_OFFER_LINES[tier],
      acceptLine: '',  // set dynamically at check-resolve time
    }
  }

  if (type === 'tinker') {
    const faces   = TINKER_FACES[tier]
    const cost    = TINKER_COSTS[tier]
    const colours: DiceColour[] = ['red', 'green', 'blue', 'yellow']
    const colour  = colours[Math.floor(Math.random() * colours.length)]
    const costStr = cost > 0 ? `${cost} scraps.` : 'Free.'
    const boonDie: BoonDie = { colour, faces }
    return {
      kind: 'tinker-boon',
      costScraps: cost,
      boonDie,
      offerLine: `A spare ${colour} d${faces} — yours for this run.  ${costStr}`,
      acceptLine: `${name} presses the die into Pip's paw.`,
    }
  }

  // wounded-traveller — helped once relationship ≥ 1 (help is the only way to reach 1)
  const helped = (relationships[individualId] ?? 0) >= 1
  if (!helped) {
    return {
      kind: 'traveller-help',
      costScraps: TRAVELLER_HELP_COST,
      offerLine: `Help me as far as the upper arch.  ${TRAVELLER_HELP_COST} scraps.`,
      acceptLine: "The traveller limps forward, clutching Pip's arm.",
    }
  }
  return {
    kind: 'traveller-gift',
    costScraps: 0,
    rewardScraps: TRAVELLER_GIFT_REWARD,
    offerLine: `"You again. I never forgot." — a gift, freely given.  +${TRAVELLER_GIFT_REWARD} scraps.`,
    acceptLine: `${name} presses ${TRAVELLER_GIFT_REWARD} scraps into Pip's paw, then turns away.`,
  }
}

// ── Generation ────────────────────────────────────────────────────────────────

export function generateVisitors(metaState: MetaState): VisitorInstance[] {
  const relationships = metaState.visitorRelationships ?? {}
  const count = drawVisitorCount()
  if (count === 0) return []

  const usedIds = new Set<string>()
  const result: VisitorInstance[] = []
  const types: VisitorType[] = ['tinker', 'wounded-traveller', 'trickster']

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]

    let candidates = ROSTER.filter(r => r.type === type && !usedIds.has(r.individualId))
    if (candidates.length === 0) {
      // Type pool exhausted — pick from any remaining individual
      candidates = ROSTER.filter(r => !usedIds.has(r.individualId))
    }
    if (candidates.length === 0) break

    const weights: Record<string, number> = {}
    for (const c of candidates) {
      weights[c.individualId] = 1 + (relationships[c.individualId] ?? 0)
    }
    const id      = pickWeighted(weights)
    const entry   = ROSTER.find(r => r.individualId === id)!
    usedIds.add(id)

    const rel       = relationships[id] ?? 0
    const tier      = tierFor(rel)
    const condition = CONDITION_BANK[Math.floor(Math.random() * CONDITION_BANK.length)]
    const offer     = resolveVisitorOffer(entry.type, tier, id, relationships)

    result.push({ individualId: id, type: entry.type, condition, offer, resolved: false })
  }

  return result
}
