import { describe, expect, it } from 'vitest'
import { ARCHETYPE_VARIANT_COUNTS, variantFor } from './renderer'
import type { Archetype } from './types'
import { pickArchetype } from '../navigation/room-selection'

describe('variantFor', () => {
  it('returns 0 for single-variant archetypes regardless of position', () => {
    const singleVariant: Archetype[] = ['bridge', 'well', 'pool', 'squeeze']
    for (const arch of singleVariant) {
      expect(variantFor(arch, 0, 0)).toBe(0)
      expect(variantFor(arch, 7, 3)).toBe(0)
      expect(variantFor(arch, 99, 99)).toBe(0)
    }
  })

  it('is deterministic — same inputs produce same output', () => {
    const arch: Archetype = 'chamber'
    const v1 = variantFor(arch, 3, 7)
    const v2 = variantFor(arch, 3, 7)
    expect(v1).toBe(v2)
  })

  it('returns values within [0, variantCount)', () => {
    const archetypes = Object.keys(ARCHETYPE_VARIANT_COUNTS) as Archetype[]
    for (const arch of archetypes) {
      const count = ARCHETYPE_VARIANT_COUNTS[arch]
      for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
          const v = variantFor(arch, col, row)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThan(count)
        }
      }
    }
  })

  it('distributes variants across positions for multi-variant archetypes', () => {
    const arch: Archetype = 'chamber'
    const count = ARCHETYPE_VARIANT_COUNTS[arch]
    const seen = new Set<number>()
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 10; row++) {
        seen.add(variantFor(arch, col, row))
      }
    }
    // All variants should appear in a 10×10 grid
    expect(seen.size).toBe(count)
  })

  it('distributes variants for cavern (3 variants)', () => {
    const arch: Archetype = 'cavern'
    const seen = new Set<number>()
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 10; row++) {
        seen.add(variantFor(arch, col, row))
      }
    }
    expect(seen.size).toBe(3)
  })

  it('does not depend on Math.random', () => {
    // Calling variantFor multiple times gives consistent results
    const results1 = Array.from({ length: 5 }, (_, i) => variantFor('chamber', i, i))
    const results2 = Array.from({ length: 5 }, (_, i) => variantFor('chamber', i, i))
    expect(results1).toEqual(results2)
  })
})

describe('ARCHETYPE_VARIANT_COUNTS', () => {
  it('core atmosphere archetypes have ≥ 2 variants', () => {
    const core: Archetype[] = ['chamber', 'passage', 'cavern', 'pillared', 'rubble']
    for (const arch of core) {
      expect(ARCHETYPE_VARIANT_COUNTS[arch]).toBeGreaterThanOrEqual(2)
    }
  })

  it('landmark archetypes may ship with 1 variant', () => {
    const landmark: Archetype[] = ['bridge', 'well', 'pool', 'squeeze']
    for (const arch of landmark) {
      expect(ARCHETYPE_VARIANT_COUNTS[arch]).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('pickArchetype', () => {
  it('returns a valid Archetype string', () => {
    const validArchetypes = new Set(Object.keys(ARCHETYPE_VARIANT_COUNTS))
    for (let i = 0; i < 20; i++) {
      const arch = pickArchetype('corridor', 1, 0)
      expect(validArchetypes.has(arch)).toBe(true)
    }
  })

  it('defaults to chamber for room types without a weight table', () => {
    // 'start' has no archetype weights entry
    expect(pickArchetype('start', 1, 0)).toBe('chamber')
  })

  it('returns passage or cavern heavily for corridor rooms', () => {
    const results: Record<string, number> = {}
    const iterations = 200
    for (let i = 0; i < iterations; i++) {
      const arch = pickArchetype('corridor', 1, 0)
      results[arch] = (results[arch] ?? 0) + 1
    }
    // passage should be the most common for corridor/early
    const passageCount = results['passage'] ?? 0
    expect(passageCount).toBeGreaterThan(iterations * 0.35)
  })

  it('returns pillared frequently for boss rooms', () => {
    const results: Record<string, number> = {}
    const iterations = 200
    for (let i = 0; i < iterations; i++) {
      const arch = pickArchetype('boss', 1, 0)
      results[arch] = (results[arch] ?? 0) + 1
    }
    const pillaredCount = results['pillared'] ?? 0
    expect(pillaredCount).toBeGreaterThan(iterations * 0.5)
  })

  it('works across all three floors and depth phases', () => {
    const validArchetypes = new Set(Object.keys(ARCHETYPE_VARIANT_COUNTS))
    const floors: (1 | 2 | 3)[] = [1, 2, 3]
    const tilesPlaced = [0, 10, 20]
    for (const floor of floors) {
      for (const placed of tilesPlaced) {
        const arch = pickArchetype('enemy', floor, placed)
        expect(validArchetypes.has(arch)).toBe(true)
      }
    }
  })
})
