import { describe, it, expect } from 'vitest'
import {
  tierFor,
  getDisplayName,
  getVisitorTint,
  resolveVisitorOffer,
  generateVisitors,
  evaluateTricksterBand,
  applyTricksterWager,
  canAffordTricksterWager,
  TIER_THRESHOLDS,
  TINKER_COSTS,
  TINKER_FACES,
  TRAVELLER_HELP_COST,
  TRAVELLER_GIFT_REWARD,
  VISITOR_TINKER_TINT,
  VISITOR_TRAVELLER_TINT,
  VISITOR_TRICKSTER_TINT,
} from './visitors'
import type { MetaState } from '../meta/state'
import { getDefaultMetaState } from '../meta/state'

// ── tierFor ───────────────────────────────────────────────────────────────────

describe('tierFor', () => {
  it('returns stranger for count 0', () => {
    expect(tierFor(0)).toBe('stranger')
  })
  it('returns stranger for count 1', () => {
    expect(tierFor(1)).toBe('stranger')
  })
  it('returns familiar at the familiar threshold', () => {
    expect(tierFor(TIER_THRESHOLDS.familiar)).toBe('familiar')
  })
  it('returns familiar for count 4', () => {
    expect(tierFor(4)).toBe('familiar')
  })
  it('returns regular at the regular threshold', () => {
    expect(tierFor(TIER_THRESHOLDS.regular)).toBe('regular')
  })
  it('returns regular for high counts', () => {
    expect(tierFor(20)).toBe('regular')
  })
})

// ── getDisplayName ────────────────────────────────────────────────────────────

describe('getDisplayName', () => {
  it('returns generic tinker label for stranger', () => {
    expect(getDisplayName('tinker-tussock', 'stranger')).toBe('A wandering tinker')
  })
  it('returns generic traveller label for stranger', () => {
    expect(getDisplayName('traveller-marl', 'stranger')).toBe('A wounded traveller')
  })
  it('returns the individual name at familiar tier', () => {
    expect(getDisplayName('tinker-tussock', 'familiar')).toBe('Tussock')
    expect(getDisplayName('tinker-pellam', 'familiar')).toBe('Pellam')
    expect(getDisplayName('traveller-marl', 'familiar')).toBe('Marl')
    expect(getDisplayName('traveller-finch', 'familiar')).toBe('Finch')
  })
  it('returns the individual name at regular tier', () => {
    expect(getDisplayName('tinker-tussock', 'regular')).toBe('Tussock')
  })
})

// ── getVisitorTint ────────────────────────────────────────────────────────────

describe('getVisitorTint', () => {
  it('returns tinker tint for tinker type', () => {
    expect(getVisitorTint('tinker')).toBe(VISITOR_TINKER_TINT)
  })
  it('returns traveller tint for wounded-traveller type', () => {
    expect(getVisitorTint('wounded-traveller')).toBe(VISITOR_TRAVELLER_TINT)
  })
  it('returns trickster tint for trickster type', () => {
    expect(getVisitorTint('trickster')).toBe(VISITOR_TRICKSTER_TINT)
  })
})

// ── resolveVisitorOffer — Tinker ──────────────────────────────────────────────

describe('Tinker offer at stranger tier', () => {
  const offer = resolveVisitorOffer('tinker', 'stranger', 'tinker-tussock', {})

  it('has kind tinker-boon', () => {
    expect(offer.kind).toBe('tinker-boon')
  })
  it('has the stranger scraps cost', () => {
    expect(offer.costScraps).toBe(TINKER_COSTS.stranger)
  })
  it('has a d4 boon die', () => {
    expect(offer.boonDie?.faces).toBe(TINKER_FACES.stranger)
  })
  it('has a valid die colour', () => {
    expect(['red', 'green', 'blue', 'yellow']).toContain(offer.boonDie?.colour)
  })
  it('has non-empty offerLine and acceptLine', () => {
    expect(offer.offerLine.length).toBeGreaterThan(0)
    expect(offer.acceptLine.length).toBeGreaterThan(0)
  })
})

describe('Tinker offer at familiar tier', () => {
  const offer = resolveVisitorOffer('tinker', 'familiar', 'tinker-tussock', {})

  it('has the familiar scraps cost', () => {
    expect(offer.costScraps).toBe(TINKER_COSTS.familiar)
  })
  it('has a d6 boon die', () => {
    expect(offer.boonDie?.faces).toBe(TINKER_FACES.familiar)
  })
})

describe('Tinker offer at regular tier', () => {
  const offer = resolveVisitorOffer('tinker', 'regular', 'tinker-tussock', {})

  it('is free', () => {
    expect(offer.costScraps).toBe(0)
  })
  it('has a d6 boon die', () => {
    expect(offer.boonDie?.faces).toBe(TINKER_FACES.regular)
  })
})

// ── resolveVisitorOffer — Wounded Traveller ───────────────────────────────────

describe('Wounded Traveller Act 1 (not yet helped)', () => {
  const offer = resolveVisitorOffer('wounded-traveller', 'stranger', 'traveller-marl', {})

  it('has kind traveller-help', () => {
    expect(offer.kind).toBe('traveller-help')
  })
  it('has the help cost', () => {
    expect(offer.costScraps).toBe(TRAVELLER_HELP_COST)
  })
  it('has no boon die', () => {
    expect(offer.boonDie).toBeUndefined()
  })
  it('has no reward scraps', () => {
    expect(offer.rewardScraps).toBeUndefined()
  })
})

describe('Wounded Traveller Act 2 (already helped, relationship ≥ 1)', () => {
  const offer = resolveVisitorOffer(
    'wounded-traveller', 'familiar', 'traveller-marl',
    { 'traveller-marl': 2 },
  )

  it('has kind traveller-gift', () => {
    expect(offer.kind).toBe('traveller-gift')
  })
  it('is free', () => {
    expect(offer.costScraps).toBe(0)
  })
  it('has scraps reward', () => {
    expect(offer.rewardScraps).toBe(TRAVELLER_GIFT_REWARD)
  })
})

describe('Wounded Traveller with exactly relationship 1 (boundary)', () => {
  const offer = resolveVisitorOffer(
    'wounded-traveller', 'stranger', 'traveller-finch',
    { 'traveller-finch': 1 },
  )
  it('transitions to Act 2 at relationship 1', () => {
    expect(offer.kind).toBe('traveller-gift')
  })
})

// ── generateVisitors ──────────────────────────────────────────────────────────

function makeState(overrides: Partial<MetaState> = {}): MetaState {
  return { ...getDefaultMetaState(), ...overrides }
}

describe('generateVisitors structure', () => {
  it('returns an array', () => {
    const visitors = generateVisitors(makeState())
    expect(Array.isArray(visitors)).toBe(true)
  })

  it('returns at most 3 visitors', () => {
    for (let i = 0; i < 50; i++) {
      const visitors = generateVisitors(makeState())
      expect(visitors.length).toBeLessThanOrEqual(3)
    }
  })

  it('all visitors start with resolved = false', () => {
    for (let i = 0; i < 20; i++) {
      const visitors = generateVisitors(makeState())
      for (const v of visitors) {
        expect(v.resolved).toBe(false)
      }
    }
  })

  it('each visitor has all required fields', () => {
    for (let i = 0; i < 20; i++) {
      const visitors = generateVisitors(makeState())
      for (const v of visitors) {
        expect(v.individualId).toBeTruthy()
        expect(['tinker', 'wounded-traveller', 'trickster']).toContain(v.type)
        expect(v.condition.length).toBeGreaterThan(0)
        expect(v.offer).toBeDefined()
        expect(typeof v.offer.costScraps).toBe('number')
        expect(v.offer.offerLine.length).toBeGreaterThan(0)
        // trickster-wager sets acceptLine dynamically at resolve time; others must be non-empty
        if (v.offer.kind !== 'trickster-wager') {
          expect(v.offer.acceptLine.length).toBeGreaterThan(0)
        }
        expect(typeof v.resolved).toBe('boolean')
      }
    }
  })
})

describe('generateVisitors — no duplicate individuals', () => {
  it('never produces two visitors with the same individualId', () => {
    for (let i = 0; i < 200; i++) {
      const visitors = generateVisitors(makeState())
      const ids = visitors.map(v => v.individualId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('generateVisitors — count distribution', () => {
  it('produces count 0 sets (smoke test across 200 runs)', () => {
    let zeroCount = 0
    for (let i = 0; i < 200; i++) {
      if (generateVisitors(makeState()).length === 0) zeroCount++
    }
    // Expect at least one zero-count set in 200 runs (25% weight)
    expect(zeroCount).toBeGreaterThan(0)
  })

  it('produces non-empty sets (smoke test across 200 runs)', () => {
    let nonEmpty = 0
    for (let i = 0; i < 200; i++) {
      if (generateVisitors(makeState()).length > 0) nonEmpty++
    }
    // 75% expected to be non-empty
    expect(nonEmpty).toBeGreaterThan(0)
  })
})

describe('generateVisitors — relationship influences offers', () => {
  it('wounded traveller with relationship 0 produces traveller-help', () => {
    const state = makeState({ visitorRelationships: { 'traveller-marl': 0 } })
    let foundHelp = false
    for (let i = 0; i < 100; i++) {
      const visitors = generateVisitors(state)
      for (const v of visitors) {
        if (v.type === 'wounded-traveller' && v.offer.kind === 'traveller-help') {
          foundHelp = true
        }
      }
    }
    expect(foundHelp).toBe(true)
  })

  it('wounded traveller with relationship ≥ 1 produces traveller-gift', () => {
    const state = makeState({
      visitorRelationships: { 'traveller-marl': 2, 'traveller-finch': 3 },
    })
    let foundGift = false
    for (let i = 0; i < 100; i++) {
      const visitors = generateVisitors(state)
      for (const v of visitors) {
        if (v.type === 'wounded-traveller' && v.offer.kind === 'traveller-gift') {
          foundGift = true
        }
      }
    }
    expect(foundGift).toBe(true)
  })
})

describe('generateVisitors — epoch reuse (checked externally)', () => {
  it('generates consistent offer types per individual based on relationship', () => {
    // A state where one tinker is well known (familiar) and one traveller is helped
    const state = makeState({
      visitorRelationships: {
        'tinker-tussock': 3,     // familiar → d6, cost 2
        'traveller-marl': 1,     // helped → gift
      },
    })
    for (let i = 0; i < 50; i++) {
      const visitors = generateVisitors(state)
      for (const v of visitors) {
        if (v.individualId === 'tinker-tussock') {
          expect(v.offer.costScraps).toBe(TINKER_COSTS.familiar)
          expect(v.offer.boonDie?.faces).toBe(TINKER_FACES.familiar)
        }
        if (v.individualId === 'traveller-marl') {
          expect(v.offer.kind).toBe('traveller-gift')
        }
      }
    }
  })
})

// ── AC 12: Trickster tests ────────────────────────────────────────────────────

describe('Trickster offer — resolveVisitorOffer (AC 12.1)', () => {
  for (const tier of ['stranger', 'familiar', 'regular'] as const) {
    describe(`tier: ${tier}`, () => {
      const offer = resolveVisitorOffer('trickster', tier, 'trickster-sloke', {})

      it('yields trickster-wager', () => {
        expect(offer.kind).toBe('trickster-wager')
      })
      it('penaltyFailure ≤ 4', () => {
        expect(offer.penaltyFailure).toBeLessThanOrEqual(4)
      })
      it('non-negative expected value across four equal-weight bands', () => {
        const ev = (
          (offer.rewardCritical ?? 0) +
          (offer.rewardSuccess  ?? 0) +
          (offer.rewardPartial  ?? 0) -
          (offer.penaltyFailure ?? 0)
        ) / 4
        expect(ev).toBeGreaterThanOrEqual(0)
      })
      it('has all four reward/penalty fields defined', () => {
        expect(offer.rewardCritical).toBeDefined()
        expect(offer.rewardSuccess).toBeDefined()
        expect(offer.rewardPartial).toBeDefined()
        expect(offer.penaltyFailure).toBeDefined()
      })
      it('checkColour is yellow', () => {
        expect(offer.checkColour).toBe('yellow')
      })
      it('has a non-empty offerLine', () => {
        expect(offer.offerLine.length).toBeGreaterThan(0)
      })
    })
  }

  it('Regular tier has reduced penaltyFailure (2) vs Stranger (4)', () => {
    const stranger = resolveVisitorOffer('trickster', 'stranger', 'trickster-sloke', {})
    const regular  = resolveVisitorOffer('trickster', 'regular',  'trickster-sloke', {})
    expect(regular.penaltyFailure).toBeLessThan(stranger.penaltyFailure!)
  })
})

describe('Trickster wager — failure floor (AC 12.2)', () => {
  const offer = resolveVisitorOffer('trickster', 'stranger', 'trickster-sloke', {})

  it('penalty applied to scraps=1 does not produce negative balance', () => {
    expect(applyTricksterWager(1, 'failure', offer)).toBeGreaterThanOrEqual(0)
  })
  it('penalty applied to scraps=0 yields 0', () => {
    expect(applyTricksterWager(0, 'failure', offer)).toBe(0)
  })
  it('critical reward adds correctly', () => {
    const result = applyTricksterWager(5, 'critical', offer)
    expect(result).toBe(5 + (offer.rewardCritical ?? 0))
  })
  it('success reward adds correctly', () => {
    const result = applyTricksterWager(5, 'success', offer)
    expect(result).toBe(5 + (offer.rewardSuccess ?? 0))
  })
  it('partial (cost) reward adds correctly', () => {
    const result = applyTricksterWager(5, 'cost', offer)
    expect(result).toBe(5 + (offer.rewardPartial ?? 0))
  })
})

describe('Trickster wager — accept-disabled condition (AC 12.3)', () => {
  it('canAffordTricksterWager is false when scraps < penaltyFailure', () => {
    expect(canAffordTricksterWager(3, 4)).toBe(false)
  })
  it('canAffordTricksterWager is true when scraps === penaltyFailure', () => {
    expect(canAffordTricksterWager(4, 4)).toBe(true)
  })
  it('canAffordTricksterWager is true when scraps > penaltyFailure', () => {
    expect(canAffordTricksterWager(10, 4)).toBe(true)
  })
  it('accepts at scraps=2 for Regular tier penalty (2)', () => {
    const offer = resolveVisitorOffer('trickster', 'regular', 'trickster-sloke', {})
    expect(canAffordTricksterWager(2, offer.penaltyFailure!)).toBe(true)
  })
  it('blocks at scraps=1 for Regular tier penalty (2)', () => {
    const offer = resolveVisitorOffer('trickster', 'regular', 'trickster-sloke', {})
    expect(canAffordTricksterWager(1, offer.penaltyFailure!)).toBe(false)
  })
})

describe('Trickster wager — accept-disabled blocks check (AC 12.4)', () => {
  it('canAffordTricksterWager returning false means no check fires', () => {
    // The click handler in camp.ts only starts the check when canAffordTricksterWager is true.
    // Verify the guard function correctly rejects insufficient scraps.
    const offer = resolveVisitorOffer('trickster', 'stranger', 'trickster-sloke', {})
    const penaltyFailure = offer.penaltyFailure!
    // With 0 scraps, cannot afford
    expect(canAffordTricksterWager(0, penaltyFailure)).toBe(false)
    // With penaltyFailure - 1 scraps, cannot afford
    expect(canAffordTricksterWager(penaltyFailure - 1, penaltyFailure)).toBe(false)
  })
})

describe('evaluateTricksterBand', () => {
  it('0 yellow pips → failure', () => {
    expect(evaluateTricksterBand(0)).toBe('failure')
  })
  it('1 yellow pip → cost (partial)', () => {
    expect(evaluateTricksterBand(1)).toBe('cost')
  })
  it('2 yellow pips → success', () => {
    expect(evaluateTricksterBand(2)).toBe('success')
  })
  it('3 yellow pips → success', () => {
    expect(evaluateTricksterBand(3)).toBe('success')
  })
  it('4 yellow pips → critical', () => {
    expect(evaluateTricksterBand(4)).toBe('critical')
  })
  it('10 yellow pips → critical', () => {
    expect(evaluateTricksterBand(10)).toBe('critical')
  })
})

describe('getDisplayName — trickster', () => {
  it('returns "A shady traveller" for stranger tier', () => {
    expect(getDisplayName('trickster-sloke', 'stranger')).toBe('A shady traveller')
  })
  it('returns individual name at familiar tier', () => {
    expect(getDisplayName('trickster-sloke', 'familiar')).toBe('Sloke')
    expect(getDisplayName('trickster-fenwick', 'familiar')).toBe('Fenwick')
  })
})
