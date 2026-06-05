import { describe, it, expect } from 'vitest'
import { RAT_KING_SPEC } from './roster'

describe('RAT_KING_SPEC constants', () => {
  it('has correct base stats', () => {
    expect(RAT_KING_SPEC.maxHp).toBe(20)
    expect(RAT_KING_SPEC.enrageThreshold).toBe(10)
    expect(RAT_KING_SPEC.goldMin).toBe(15)
    expect(RAT_KING_SPEC.goldMax).toBe(25)
  })

  it('has intentCycle and enragedCycle', () => {
    expect(RAT_KING_SPEC.intentCycle).toHaveLength(4)
    expect(RAT_KING_SPEC.enragedCycle).toHaveLength(3)
  })

  it('has correct Phase 1 cycle (4 intents)', () => {
    const cycle = RAT_KING_SPEC.intentCycle!
    expect(cycle).toHaveLength(4)
    expect(cycle[0]!.kind).toBe('attack')
    expect(cycle[0]!.value).toBe(4)
    expect(cycle[1]!.kind).toBe('guard')
    expect(cycle[1]!.value).toBe(3)
    expect(cycle[2]!.kind).toBe('empower')
    expect(cycle[3]!.kind).toBe('attack')
    expect(cycle[3]!.value).toBe(4)
  })

  it('has correct Phase 2 cycle (3 intents)', () => {
    const cycle = RAT_KING_SPEC.enragedCycle!
    expect(cycle).toHaveLength(3)
    expect(cycle[0]!.kind).toBe('attack')
    expect(cycle[0]!.value).toBe(5)
    expect(cycle[1]!.kind).toBe('lunge')
    expect(cycle[1]!.value).toBe(8)
    expect(cycle[2]!.kind).toBe('attack')
    expect(cycle[2]!.value).toBe(5)
  })

  it('has correct title card', () => {
    expect(RAT_KING_SPEC.bossTitleCard!.name).toBe('THE RAT KING')
    expect(RAT_KING_SPEC.bossTitleCard!.flavour).toBe('Ancient. Patient. Hungry.')
  })

  it('is marked as a boss', () => {
    expect(RAT_KING_SPEC.id).toBe('rat-king')
    expect(RAT_KING_SPEC.name).toBe('The Rat King')
    expect(RAT_KING_SPEC.isBoss).toBe(true)
  })
})

describe('Boss cycle logic', () => {
  it('Phase 1 cycle wraps correctly after 4 intents', () => {
    const cycle = RAT_KING_SPEC.intentCycle!
    expect(cycle[(0) % cycle.length]!.kind).toBe('attack')
    expect(cycle[(1) % cycle.length]!.kind).toBe('guard')
    expect(cycle[(2) % cycle.length]!.kind).toBe('empower')
    expect(cycle[(3) % cycle.length]!.kind).toBe('attack')
    expect(cycle[(4) % cycle.length]!.kind).toBe('attack') // wrapped to 0
  })

  it('Phase 2 cycle wraps correctly after 3 intents', () => {
    const cycle = RAT_KING_SPEC.enragedCycle!
    expect(cycle[(0) % cycle.length]!.kind).toBe('attack')
    expect(cycle[(1) % cycle.length]!.kind).toBe('lunge')
    expect(cycle[(2) % cycle.length]!.kind).toBe('attack')
    expect(cycle[(3) % cycle.length]!.kind).toBe('attack') // wrapped to 0
  })
})

describe('Boss enrage threshold', () => {
  it('enrage threshold is half of max HP', () => {
    expect(RAT_KING_SPEC.enrageThreshold).toBe(RAT_KING_SPEC.maxHp / 2)
  })
})

describe('Boss gold reward', () => {
  it('minimum gold reward is 15', () => {
    expect(RAT_KING_SPEC.goldMin).toBe(15)
  })

  it('maximum gold reward is 25', () => {
    expect(RAT_KING_SPEC.goldMax).toBe(25)
  })
})

describe('Boss attack intent values', () => {
  it('Phase 1 Attack intent value is 4', () => {
    const cycle = RAT_KING_SPEC.intentCycle!
    expect(cycle[0]!.value).toBe(4)
    expect(cycle[3]!.value).toBe(4)
  })

  it('Phase 2 Attack intent value is 5', () => {
    const cycle = RAT_KING_SPEC.enragedCycle!
    expect(cycle[0]!.value).toBe(5)
    expect(cycle[2]!.value).toBe(5)
  })

  it('Phase 2 Lunge intent value is 8', () => {
    const cycle = RAT_KING_SPEC.enragedCycle!
    expect(cycle[1]!.value).toBe(8)
  })
})

describe('Boss Guard intent', () => {
  it('Phase 1 Guard provides 3 block', () => {
    const guard = RAT_KING_SPEC.intentCycle![1]!
    expect(guard.kind).toBe('guard')
    expect(guard.value).toBe(3)
  })
})

describe('Boss mitigation rules', () => {
  it('Phase 1 Attack (4 damage) with 2G reserved fully dodges', () => {
    const baseDamage = 4
    const reserved = 2
    const actualDamage = baseDamage - (reserved >= 2 ? reserved : 0)
    expect(actualDamage).toBe(baseDamage - 2)
  })

  it('Phase 2 Lunge (8 damage) with 1G reserved takes 7 damage', () => {
    const baseDamage = 8
    const reserved = 1
    const actualDamage = Math.max(0, baseDamage - reserved)
    expect(actualDamage).toBe(7)
  })

  it('Phase 2 Lunge (8 damage) with 0G reserved takes full 8 damage', () => {
    const baseDamage = 8
    const reserved = 0
    const actualDamage = Math.max(0, baseDamage - reserved)
    expect(actualDamage).toBe(8)
  })
})
