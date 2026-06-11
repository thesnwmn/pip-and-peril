import { describe, it, expect } from 'vitest'
import { evaluateMarks, applyMarkUnlocks, MARK_SPECS } from './marks'
import type { RunRecord } from './marks'
import type { MetaState } from './state'

function baseMeta(overrides: Partial<MetaState> = {}): MetaState {
  return {
    version: 1,
    scraps: 0,
    permanentPool: [{ id: 'r1', colour: 'red', faces: 6 }],
    activeWeaponId: 'shortsword',
    unlockedWeaponIds: ['shortsword'],
    runCount: 0,
    visitorRelationships: {},
    currentVisitors: [],
    visitorEpoch: -1,
    pendingRunBoons: [],
    marksEarned: [],
    ...overrides,
  }
}

function baseRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    floorsReached: 1,
    victory: false,
    healingItemsUsed: 0,
    rattledKillingBlow: false,
    weaponId: 'shortsword',
    ...overrides,
  }
}

// ── mark-floor-2 ───────────────────────────────────────────────────────────────

describe('evaluateMarks — mark-floor-2 (floor-reached ≥ 2)', () => {
  it('returns mark-floor-2 when floorsReached >= 2 and not yet earned', () => {
    const result = evaluateMarks(baseRun({ floorsReached: 2 }), baseMeta())
    expect(result).toContain('mark-floor-2')
  })

  it('does not return mark-floor-2 when already earned', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 2 }),
      baseMeta({ marksEarned: ['mark-floor-2'] }),
    )
    expect(result).not.toContain('mark-floor-2')
  })

  it('does not return mark-floor-2 when floorsReached < 2', () => {
    const result = evaluateMarks(baseRun({ floorsReached: 1 }), baseMeta())
    expect(result).not.toContain('mark-floor-2')
  })
})

// ── mark-floor-3 ───────────────────────────────────────────────────────────────

describe('evaluateMarks — mark-floor-3 (floor-reached ≥ 3)', () => {
  it('returns mark-floor-3 when floorsReached >= 3 and not yet earned', () => {
    const result = evaluateMarks(baseRun({ floorsReached: 3 }), baseMeta())
    expect(result).toContain('mark-floor-3')
  })

  it('does not return mark-floor-3 when already earned', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 3 }),
      baseMeta({ marksEarned: ['mark-floor-3'] }),
    )
    expect(result).not.toContain('mark-floor-3')
  })

  it('does not return mark-floor-3 when floorsReached < 3', () => {
    const result = evaluateMarks(baseRun({ floorsReached: 2 }), baseMeta())
    expect(result).not.toContain('mark-floor-3')
  })
})

// ── mark-first-boss ────────────────────────────────────────────────────────────

describe('evaluateMarks — mark-first-boss (boss-killed)', () => {
  it('returns mark-first-boss when victory=true and not yet earned', () => {
    const result = evaluateMarks(baseRun({ victory: true }), baseMeta())
    expect(result).toContain('mark-first-boss')
  })

  it('does not return mark-first-boss when already earned', () => {
    const result = evaluateMarks(
      baseRun({ victory: true }),
      baseMeta({ marksEarned: ['mark-first-boss'] }),
    )
    expect(result).not.toContain('mark-first-boss')
  })

  it('does not return mark-first-boss when victory=false', () => {
    const result = evaluateMarks(baseRun({ victory: false }), baseMeta())
    expect(result).not.toContain('mark-first-boss')
  })
})

// ── mark-no-healing ────────────────────────────────────────────────────────────

describe('evaluateMarks — mark-no-healing (floor-no-healing ≥ 2, healingItemsUsed=0)', () => {
  it('returns mark-no-healing when floorsReached>=2 and healingItemsUsed=0 and not yet earned', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 2, healingItemsUsed: 0 }),
      baseMeta(),
    )
    expect(result).toContain('mark-no-healing')
  })

  it('does not return mark-no-healing when already earned', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 2, healingItemsUsed: 0 }),
      baseMeta({ marksEarned: ['mark-no-healing'] }),
    )
    expect(result).not.toContain('mark-no-healing')
  })

  it('does not return mark-no-healing when healingItemsUsed > 0', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 2, healingItemsUsed: 1 }),
      baseMeta(),
    )
    expect(result).not.toContain('mark-no-healing')
  })

  it('does not return mark-no-healing when floorsReached < 2', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 1, healingItemsUsed: 0 }),
      baseMeta(),
    )
    expect(result).not.toContain('mark-no-healing')
  })
})

// ── mark-whisker-run ───────────────────────────────────────────────────────────

describe('evaluateMarks — mark-whisker-run (weapon-and-floor: whiskerStaff, ≥ 2)', () => {
  it('returns mark-whisker-run when weaponId=whiskerStaff, floorsReached>=2, not yet earned', () => {
    const result = evaluateMarks(
      baseRun({ weaponId: 'whiskerStaff', floorsReached: 2 }),
      baseMeta(),
    )
    expect(result).toContain('mark-whisker-run')
  })

  it('does not return mark-whisker-run when already earned', () => {
    const result = evaluateMarks(
      baseRun({ weaponId: 'whiskerStaff', floorsReached: 2 }),
      baseMeta({ marksEarned: ['mark-whisker-run'] }),
    )
    expect(result).not.toContain('mark-whisker-run')
  })

  it('does not return mark-whisker-run when wrong weapon', () => {
    const result = evaluateMarks(
      baseRun({ weaponId: 'shortsword', floorsReached: 2 }),
      baseMeta(),
    )
    expect(result).not.toContain('mark-whisker-run')
  })

  it('does not return mark-whisker-run when floorsReached < 2', () => {
    const result = evaluateMarks(
      baseRun({ weaponId: 'whiskerStaff', floorsReached: 1 }),
      baseMeta(),
    )
    expect(result).not.toContain('mark-whisker-run')
  })
})

// ── mark-rattled-kill ──────────────────────────────────────────────────────────

describe('evaluateMarks — mark-rattled-kill (rattled-kill)', () => {
  it('returns mark-rattled-kill when rattledKillingBlow=true and not yet earned', () => {
    const result = evaluateMarks(baseRun({ rattledKillingBlow: true }), baseMeta())
    expect(result).toContain('mark-rattled-kill')
  })

  it('does not return mark-rattled-kill when already earned', () => {
    const result = evaluateMarks(
      baseRun({ rattledKillingBlow: true }),
      baseMeta({ marksEarned: ['mark-rattled-kill'] }),
    )
    expect(result).not.toContain('mark-rattled-kill')
  })

  it('does not return mark-rattled-kill when rattledKillingBlow=false', () => {
    const result = evaluateMarks(baseRun({ rattledKillingBlow: false }), baseMeta())
    expect(result).not.toContain('mark-rattled-kill')
  })
})

// ── evaluateMarks general ──────────────────────────────────────────────────────

describe('evaluateMarks general', () => {
  it('returns empty array when no conditions met', () => {
    const result = evaluateMarks(baseRun(), baseMeta())
    expect(result).toHaveLength(0)
  })

  it('can return multiple marks in a single run', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 2, victory: true }),
      baseMeta(),
    )
    expect(result).toContain('mark-floor-2')
    expect(result).toContain('mark-first-boss')
  })

  it('returns marks in definition order (MARK_SPECS order)', () => {
    const result = evaluateMarks(
      baseRun({ floorsReached: 3, victory: true }),
      baseMeta(),
    )
    const floorIdx = result.indexOf('mark-floor-2')
    const bossIdx = result.indexOf('mark-first-boss')
    expect(floorIdx).toBeLessThan(bossIdx)
  })

  it('handles marksEarned absent (legacy fallback)', () => {
    const meta = baseMeta()
    // Simulate legacy state where marksEarned might be undefined
    const legacyMeta = { ...meta, marksEarned: undefined } as unknown as MetaState
    const result = evaluateMarks(baseRun({ floorsReached: 2 }), legacyMeta)
    expect(result).toContain('mark-floor-2')
  })
})

// ── applyMarkUnlocks ───────────────────────────────────────────────────────────

describe('applyMarkUnlocks', () => {
  it('appends mark IDs to marksEarned', () => {
    const meta = baseMeta()
    const result = applyMarkUnlocks(['mark-floor-2'], meta)
    expect(result.marksEarned).toContain('mark-floor-2')
  })

  it('adds a Blue d4 to permanentPool for mark-floor-2 unlock', () => {
    const meta = baseMeta()
    const result = applyMarkUnlocks(['mark-floor-2'], meta)
    const blueDice = result.permanentPool.filter(d => d.colour === 'blue')
    expect(blueDice).toHaveLength(1)
    expect(blueDice[0].faces).toBe(4)
  })

  it('does not modify permanentPool for stub unlocks', () => {
    const meta = baseMeta()
    const before = meta.permanentPool.length
    const result = applyMarkUnlocks(['mark-floor-3'], meta)
    expect(result.permanentPool).toHaveLength(before)
  })

  it('preserves existing marksEarned when appending', () => {
    const meta = baseMeta({ marksEarned: ['mark-floor-2'] })
    const result = applyMarkUnlocks(['mark-floor-3'], meta)
    expect(result.marksEarned).toContain('mark-floor-2')
    expect(result.marksEarned).toContain('mark-floor-3')
  })

  it('returns unchanged meta when markIds is empty', () => {
    const meta = baseMeta()
    const result = applyMarkUnlocks([], meta)
    expect(result.marksEarned).toHaveLength(0)
    expect(result.permanentPool).toEqual(meta.permanentPool)
  })

  it('all 6 marks are defined in MARK_SPECS', () => {
    expect(MARK_SPECS).toHaveLength(6)
    const ids = MARK_SPECS.map(m => m.id)
    expect(ids).toContain('mark-floor-2')
    expect(ids).toContain('mark-floor-3')
    expect(ids).toContain('mark-first-boss')
    expect(ids).toContain('mark-no-healing')
    expect(ids).toContain('mark-whisker-run')
    expect(ids).toContain('mark-rattled-kill')
  })
})
