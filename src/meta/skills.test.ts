import { describe, it, expect } from 'vitest'
import {
  SKILL_LIBRARY,
  getSkill,
  skillSlotCount,
  unlockSkill,
  sanitiseLoadout,
} from './skills'
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
    unlockedSkillIds: [],
    activeLoadout: [],
    ...overrides,
  }
}

// ── SKILL_LIBRARY ──────────────────────────────────────────────────────────────

describe('SKILL_LIBRARY', () => {
  it('contains exactly five skills', () => {
    expect(SKILL_LIBRARY).toHaveLength(5)
  })

  it('has the five expected skill IDs in order', () => {
    const ids = SKILL_LIBRARY.map(s => s.id)
    expect(ids).toEqual([
      'careful-eye',
      'counter-strike',
      'desperate-swing',
      'battle-cry',
      'stout-heart',
    ])
  })

  it('every skill has a non-empty name and effectLine', () => {
    for (const skill of SKILL_LIBRARY) {
      expect(skill.name.length).toBeGreaterThan(0)
      expect(skill.effectLine.length).toBeGreaterThan(0)
    }
  })
})

// ── getSkill ───────────────────────────────────────────────────────────────────

describe('getSkill', () => {
  it('returns the spec for a known ID', () => {
    const spec = getSkill('careful-eye')
    expect(spec).toBeDefined()
    expect(spec?.name).toBe('Careful Eye')
  })

  it('returns undefined for an unknown ID', () => {
    expect(getSkill('nonexistent')).toBeUndefined()
  })
})

// ── skillSlotCount ─────────────────────────────────────────────────────────────

describe('skillSlotCount', () => {
  it('returns 1 for runCount 0', () => {
    expect(skillSlotCount(0)).toBe(1)
  })

  it('returns 1 for runCount 4', () => {
    expect(skillSlotCount(4)).toBe(1)
  })

  it('returns 2 for runCount 5', () => {
    expect(skillSlotCount(5)).toBe(2)
  })

  it('returns 2 for runCount 10', () => {
    expect(skillSlotCount(10)).toBe(2)
  })

  it('returns 2 for all runCount >= 5', () => {
    for (let n = 5; n <= 20; n++) {
      expect(skillSlotCount(n)).toBe(2)
    }
  })

  it('returns 1 for all runCount < 5', () => {
    for (let n = 0; n < 5; n++) {
      expect(skillSlotCount(n)).toBe(1)
    }
  })
})

// ── unlockSkill ────────────────────────────────────────────────────────────────

describe('unlockSkill', () => {
  it('adds skillId to unlockedSkillIds', () => {
    const meta = baseMeta()
    const result = unlockSkill(meta, 'careful-eye')
    expect(result.unlockedSkillIds).toContain('careful-eye')
  })

  it('is idempotent — does not duplicate an already-unlocked skill', () => {
    const meta = baseMeta({ unlockedSkillIds: ['careful-eye'] })
    const result = unlockSkill(meta, 'careful-eye')
    expect(result.unlockedSkillIds.filter(id => id === 'careful-eye')).toHaveLength(1)
  })

  it('preserves existing unlocked skills', () => {
    const meta = baseMeta({ unlockedSkillIds: ['careful-eye'] })
    const result = unlockSkill(meta, 'counter-strike')
    expect(result.unlockedSkillIds).toContain('careful-eye')
    expect(result.unlockedSkillIds).toContain('counter-strike')
  })

  it('returns the same meta reference when skill already unlocked', () => {
    const meta = baseMeta({ unlockedSkillIds: ['careful-eye'] })
    const result = unlockSkill(meta, 'careful-eye')
    expect(result).toBe(meta)
  })

  it('does not mutate the original meta', () => {
    const meta = baseMeta()
    unlockSkill(meta, 'careful-eye')
    expect(meta.unlockedSkillIds).toHaveLength(0)
  })
})

// ── sanitiseLoadout ────────────────────────────────────────────────────────────

describe('sanitiseLoadout', () => {
  it('removes stale IDs from activeLoadout (not in unlockedSkillIds)', () => {
    const meta = baseMeta({
      unlockedSkillIds: ['careful-eye'],
      activeLoadout: ['careful-eye', 'stale-id'],
    })
    const result = sanitiseLoadout(meta)
    expect(result.activeLoadout).not.toContain('stale-id')
    expect(result.activeLoadout).toContain('careful-eye')
  })

  it('trims activeLoadout to skillSlotCount(runCount) when over-length', () => {
    const meta = baseMeta({
      runCount: 0,  // slotCount = 1
      unlockedSkillIds: ['careful-eye', 'counter-strike'],
      activeLoadout: ['careful-eye', 'counter-strike'],
    })
    const result = sanitiseLoadout(meta)
    expect(result.activeLoadout).toHaveLength(1)
  })

  it('does not trim when within cap', () => {
    const meta = baseMeta({
      runCount: 5,  // slotCount = 2
      unlockedSkillIds: ['careful-eye', 'counter-strike'],
      activeLoadout: ['careful-eye', 'counter-strike'],
    })
    const result = sanitiseLoadout(meta)
    expect(result.activeLoadout).toHaveLength(2)
  })

  it('defaults unlockedSkillIds to [] when absent', () => {
    const meta = baseMeta()
    const legacyMeta = { ...meta, unlockedSkillIds: undefined } as unknown as MetaState
    const result = sanitiseLoadout(legacyMeta)
    expect(result.unlockedSkillIds).toEqual([])
  })

  it('defaults activeLoadout to [] when absent', () => {
    const meta = baseMeta()
    const legacyMeta = { ...meta, activeLoadout: undefined } as unknown as MetaState
    const result = sanitiseLoadout(legacyMeta)
    expect(result.activeLoadout).toEqual([])
  })

  it('is a no-op for clean state', () => {
    const meta = baseMeta({
      unlockedSkillIds: ['careful-eye'],
      activeLoadout: ['careful-eye'],
    })
    const result = sanitiseLoadout(meta)
    expect(result.activeLoadout).toEqual(['careful-eye'])
    expect(result.unlockedSkillIds).toEqual(['careful-eye'])
  })
})
