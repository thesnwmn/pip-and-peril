import { describe, it, expect } from 'vitest'
import { generateNotices } from './notices'
import type { MetaState } from '../meta/state'
import { getDefaultMetaState } from '../meta/state'

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return { ...getDefaultMetaState(), ...overrides }
}

describe('generateNotices', () => {
  it('generates exactly two notices', () => {
    const result = generateNotices(makeMeta())
    expect(result.notices).toHaveLength(2)
  })

  it('atmosphericLine equals notices[0].text', () => {
    const result = generateNotices(makeMeta())
    expect(result.atmosphericLine).toBe(result.notices[0].text)
  })

  it('both notices have a non-empty text and valid category', () => {
    const result = generateNotices(makeMeta())
    const validCategories = ['enemy-activity', 'merchant-sighting', 'atmosphere', 'past-run-echo']
    for (const notice of result.notices) {
      expect(typeof notice.text).toBe('string')
      expect(notice.text.length).toBeGreaterThan(0)
      expect(validCategories).toContain(notice.category)
    }
  })

  it('the two notices are always from different categories', () => {
    for (let i = 0; i < 30; i++) {
      const result = generateNotices(makeMeta({ runCount: 5 }))
      expect(result.notices[0].category).not.toBe(result.notices[1].category)
    }
  })

  it('past-run-echo is never selected when runCount is 0', () => {
    for (let i = 0; i < 60; i++) {
      const result = generateNotices(makeMeta({ runCount: 0 }))
      expect(result.notices[0].category).not.toBe('past-run-echo')
      expect(result.notices[1].category).not.toBe('past-run-echo')
    }
  })

  it('past-run-echo can be selected when runCount > 0', () => {
    let found = false
    for (let i = 0; i < 200; i++) {
      const result = generateNotices(makeMeta({ runCount: 1 }))
      if (
        result.notices[0].category === 'past-run-echo' ||
        result.notices[1].category === 'past-run-echo'
      ) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('no notice text contains unfilled {variable} slots after resolution', () => {
    for (let i = 0; i < 40; i++) {
      const result = generateNotices(makeMeta({ runCount: i }))
      for (const notice of result.notices) {
        expect(notice.text).not.toMatch(/\{[a-z_]+\}/)
      }
    }
  })

  it('resolves {run_count} with the actual run count', () => {
    // Run many times to hit the template containing {run_count}
    let hitTemplate = false
    for (let i = 0; i < 200; i++) {
      const result = generateNotices(makeMeta({ runCount: 7 }))
      for (const notice of result.notices) {
        if (notice.text.includes('7')) hitTemplate = true
        expect(notice.text).not.toMatch(/\{run_count\}/)
      }
    }
    // We can't guarantee hitting a specific template, but at minimum no raw slots
    expect(hitTemplate).toBe(true)
  })

  it('treats undefined runCount as 0 — backward compatible migration', () => {
    const meta = makeMeta()
    ;(meta as unknown as Record<string, unknown>).runCount = undefined
    for (let i = 0; i < 40; i++) {
      const result = generateNotices(meta)
      expect(result.notices[0].category).not.toBe('past-run-echo')
      expect(result.notices[1].category).not.toBe('past-run-echo')
      for (const notice of result.notices) {
        expect(notice.text).not.toMatch(/\{[a-z_]+\}/)
      }
    }
  })

  it('treats NaN runCount as 0 — fallback for corrupted state', () => {
    const meta = makeMeta({ runCount: NaN })
    for (let i = 0; i < 40; i++) {
      const result = generateNotices(meta)
      expect(result.notices[0].category).not.toBe('past-run-echo')
      expect(result.notices[1].category).not.toBe('past-run-echo')
      for (const notice of result.notices) {
        expect(notice.text).not.toMatch(/\{[a-z_]+\}/)
      }
    }
  })

  it('exposes atmosphericLine as the first notice text for future run-start use', () => {
    for (let i = 0; i < 10; i++) {
      const result = generateNotices(makeMeta({ runCount: i }))
      expect(result.atmosphericLine).toBe(result.notices[0].text)
      expect(typeof result.atmosphericLine).toBe('string')
      expect(result.atmosphericLine.length).toBeGreaterThan(0)
    }
  })
})
