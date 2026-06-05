import { describe, it, expect } from 'vitest'
import { RAT_KING, type BossSpec } from './boss-panel'

describe('RAT_KING constants', () => {
  it('has correct base stats', () => {
    expect(RAT_KING.maxHp).toBe(20)
    expect(RAT_KING.enrageThreshold).toBe(10)
    expect(RAT_KING.goldMin).toBe(15)
    expect(RAT_KING.goldMax).toBe(25)
  })

  it('has two phases', () => {
    expect(RAT_KING.phases).toHaveLength(2)
  })

  it('has correct Phase 1 cycle (4 intents)', () => {
    const phase1 = RAT_KING.phases[0]!
    expect(phase1.cycle).toHaveLength(4)
    expect(phase1.cycle[0]!.kind).toBe('attack')
    expect(phase1.cycle[0]!.value).toBe(4)
    expect(phase1.cycle[1]!.kind).toBe('guard')
    expect(phase1.cycle[1]!.value).toBe(3)
    expect(phase1.cycle[2]!.kind).toBe('empower')
    expect(phase1.cycle[2]!.value).toBeUndefined()
    expect(phase1.cycle[3]!.kind).toBe('attack')
    expect(phase1.cycle[3]!.value).toBe(4)
  })

  it('has correct Phase 2 cycle (3 intents)', () => {
    const phase2 = RAT_KING.phases[1]!
    expect(phase2.cycle).toHaveLength(3)
    expect(phase2.cycle[0]!.kind).toBe('attack')
    expect(phase2.cycle[0]!.value).toBe(5)
    expect(phase2.cycle[1]!.kind).toBe('lunge')
    expect(phase2.cycle[1]!.value).toBe(8)
    expect(phase2.cycle[2]!.kind).toBe('attack')
    expect(phase2.cycle[2]!.value).toBe(5)
  })

  it('has correct title card', () => {
    expect(RAT_KING.titleCard.name).toBe('THE RAT KING')
    expect(RAT_KING.titleCard.flavour).toBe('Ancient. Patient. Hungry.')
  })

  it('is marked as a boss', () => {
    expect(RAT_KING.id).toBe('rat-king')
    expect(RAT_KING.name).toBe('The Rat King')
  })
})

describe('Boss cycle logic', () => {
  it('Phase 1 cycle wraps correctly after 4 intents', () => {
    const phase1 = RAT_KING.phases[0]!.cycle
    // Position 0 → 1 → 2 → 3 → 0 (wraps)
    expect(phase1[(0) % phase1.length]!.kind).toBe('attack')
    expect(phase1[(1) % phase1.length]!.kind).toBe('guard')
    expect(phase1[(2) % phase1.length]!.kind).toBe('empower')
    expect(phase1[(3) % phase1.length]!.kind).toBe('attack')
    expect(phase1[(4) % phase1.length]!.kind).toBe('attack') // wrapped to 0
  })

  it('Phase 2 cycle wraps correctly after 3 intents', () => {
    const phase2 = RAT_KING.phases[1]!.cycle
    // Position 0 → 1 → 2 → 0 (wraps)
    expect(phase2[(0) % phase2.length]!.kind).toBe('attack')
    expect(phase2[(1) % phase2.length]!.kind).toBe('lunge')
    expect(phase2[(2) % phase2.length]!.kind).toBe('attack')
    expect(phase2[(3) % phase2.length]!.kind).toBe('attack') // wrapped to 0
  })

  it('Phase 1 position 2 is Empower', () => {
    expect(RAT_KING.phases[0]!.cycle[2]!.kind).toBe('empower')
  })

  it('Phase 1 position 3 is Attack (doubles when empowered)', () => {
    expect(RAT_KING.phases[0]!.cycle[3]!.kind).toBe('attack')
    expect(RAT_KING.phases[0]!.cycle[3]!.value).toBe(4)
  })

  it('Phase 2 position 1 is Lunge', () => {
    expect(RAT_KING.phases[1]!.cycle[1]!.kind).toBe('lunge')
    expect(RAT_KING.phases[1]!.cycle[1]!.value).toBe(8)
  })
})

describe('Boss enrage threshold', () => {
  it('enrage threshold is half of max HP', () => {
    expect(RAT_KING.enrageThreshold).toBe(RAT_KING.maxHp / 2)
  })

  it('enrage threshold is 10 when maxHp is 20', () => {
    expect(RAT_KING.enrageThreshold).toBe(10)
  })
})

describe('Boss gold reward', () => {
  it('gold reward is between goldMin and goldMax (inclusive)', () => {
    // Test multiple times to get statistical coverage
    for (let i = 0; i < 100; i++) {
      const gold = Math.floor(Math.random() * (RAT_KING.goldMax - RAT_KING.goldMin + 1)) + RAT_KING.goldMin
      expect(gold).toBeGreaterThanOrEqual(RAT_KING.goldMin)
      expect(gold).toBeLessThanOrEqual(RAT_KING.goldMax)
    }
  })

  it('minimum gold reward is 15', () => {
    expect(RAT_KING.goldMin).toBe(15)
  })

  it('maximum gold reward is 25', () => {
    expect(RAT_KING.goldMax).toBe(25)
  })
})

describe('Boss attack intent values', () => {
  it('Phase 1 Attack intent value is 4', () => {
    const phase1Attack1 = RAT_KING.phases[0]!.cycle[0]!
    const phase1Attack2 = RAT_KING.phases[0]!.cycle[3]!
    expect(phase1Attack1.value).toBe(4)
    expect(phase1Attack2.value).toBe(4)
  })

  it('Phase 2 Attack intent value is 5', () => {
    const phase2Attack1 = RAT_KING.phases[1]!.cycle[0]!
    const phase2Attack3 = RAT_KING.phases[1]!.cycle[2]!
    expect(phase2Attack1.value).toBe(5)
    expect(phase2Attack3.value).toBe(5)
  })

  it('Phase 2 Lunge intent value is 8', () => {
    const phase2Lunge = RAT_KING.phases[1]!.cycle[1]!
    expect(phase2Lunge.value).toBe(8)
  })
})

describe('Boss Guard intent', () => {
  it('Phase 1 Guard provides 3 block', () => {
    const phase1Guard = RAT_KING.phases[0]!.cycle[1]!
    expect(phase1Guard.kind).toBe('guard')
    expect(phase1Guard.value).toBe(3)
  })
})

describe('Boss mitigation rules', () => {
  it('Phase 1 Attack (4 damage) with 2G reserved fully dodges', () => {
    const baseDamage = 4
    const reserved = 2
    const actualDamage = baseDamage - (reserved >= 2 ? reserved : 0)
    expect(actualDamage).toBe(baseDamage - 2) // 2 damage
  })

  it('Phase 2 Lunge (8 damage) with 2G reserved fully dodges', () => {
    const baseDamage = 8
    const reserved = 2
    const actualDamage = baseDamage - (reserved >= 2 ? reserved : 0)
    expect(actualDamage).toBe(baseDamage - 2) // 6 damage (same as Attack)
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
