import { describe, it, expect } from 'vitest'
import {
  damageToPip,
  applyStrike,
  applyHeavyStrike,
  applyEnemyTurn,
  applyFlee,
  canFlee,
  rollGoldReward,
} from './encounter'
import { selectIntent, GOBLIN, GOBLIN_INTENTS } from './intents'
import type { CombatState } from './types'

function makeCombat(overrides: Partial<CombatState> = {}): CombatState {
  return {
    enemy: { ...GOBLIN },
    phase: 'player-turn',
    intent: { kind: 'attack', value: 2 },
    reservedGreen: 0,
    entryFrom: { col: 5, row: 6 },
    goldAwarded: 0,
    itemUsedThisTurn: false,
    ...overrides,
  }
}

// ── damageToPip ────────────────────────────────────────────────────────────────

describe('damageToPip', () => {
  it('returns 0 when reservedGreen >= 2 (full dodge)', () => {
    expect(damageToPip(2, 2)).toBe(0)
    expect(damageToPip(5, 3)).toBe(0)
  })

  it('reduces by 1 when reservedGreen == 1', () => {
    expect(damageToPip(2, 1)).toBe(1)
    expect(damageToPip(3, 1)).toBe(2)
  })

  it('returns full intentValue when reservedGreen == 0', () => {
    expect(damageToPip(2, 0)).toBe(2)
    expect(damageToPip(5, 0)).toBe(5)
  })

  it('never returns a negative value', () => {
    expect(damageToPip(1, 1)).toBe(0)
  })
})

// ── applyStrike ────────────────────────────────────────────────────────────────

describe('applyStrike', () => {
  it('deals 2 damage when enemy has no block', () => {
    const result = applyStrike(makeCombat())
    expect(result.damage).toBe(2)
    expect(result.absorbed).toBe(0)
    expect(result.combat.enemy.hp).toBe(4)
  })

  it('depletes block before HP', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, block: 1 } })
    const result = applyStrike(combat)
    expect(result.absorbed).toBe(1)
    expect(result.damage).toBe(1)
    expect(result.combat.enemy.block).toBe(0)
    expect(result.combat.enemy.hp).toBe(5)
  })

  it('fully absorbs in block when block >= damage', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, block: 3 } })
    const result = applyStrike(combat)
    expect(result.absorbed).toBe(2)
    expect(result.damage).toBe(0)
    expect(result.combat.enemy.block).toBe(1)
    expect(result.combat.enemy.hp).toBe(6)
  })

  it('sets victory when enemy hp reaches 0', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 2 } })
    const result = applyStrike(combat)
    expect(result.victory).toBe(true)
    expect(result.combat.phase).toBe('victory')
    expect(result.combat.enemy.hp).toBe(0)
  })

  it('does not set victory when enemy survives', () => {
    const result = applyStrike(makeCombat())
    expect(result.victory).toBe(false)
    expect(result.combat.phase).toBe('player-turn')
  })

  it('hp cannot go below 0', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 1 } })
    const result = applyStrike(combat)
    expect(result.combat.enemy.hp).toBe(0)
  })
})

// ── applyHeavyStrike ──────────────────────────────────────────────────────────

describe('applyHeavyStrike', () => {
  it('deals 4 damage when enemy has no block', () => {
    const result = applyHeavyStrike(makeCombat())
    expect(result.damage).toBe(4)
    expect(result.absorbed).toBe(0)
    expect(result.combat.enemy.hp).toBe(2)
  })

  it('depletes block, then damages HP with remainder', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, block: 2 } })
    const result = applyHeavyStrike(combat)
    expect(result.absorbed).toBe(2)
    expect(result.damage).toBe(2)
    expect(result.combat.enemy.block).toBe(0)
    expect(result.combat.enemy.hp).toBe(4)
  })

  it('kills the enemy with one Heavy Strike from 4 HP', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 4 } })
    const result = applyHeavyStrike(combat)
    expect(result.victory).toBe(true)
    expect(result.combat.enemy.hp).toBe(0)
  })
})

// ── applyEnemyTurn — Attack ────────────────────────────────────────────────────

describe('applyEnemyTurn — Attack intent', () => {
  it('deals full intent damage when reservedGreen == 0', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 0 }), 10)
    expect(result.damage).toBe(2)
    expect(result.pipHp).toBe(8)
    expect(result.defeat).toBe(false)
  })

  it('reduces damage by 1 when reservedGreen == 1', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 1 }), 10)
    expect(result.damage).toBe(1)
    expect(result.pipHp).toBe(9)
  })

  it('fully dodges when reservedGreen >= 2', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 2 }), 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
  })

  it('resets reservedGreen to 0 after firing', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 2 }), 10)
    expect(result.combat.reservedGreen).toBe(0)
  })

  it('sets defeat and phase when Pip hp reaches 0', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 0 }), 2)
    expect(result.defeat).toBe(true)
    expect(result.pipHp).toBe(0)
    expect(result.combat.phase).toBe('defeat')
  })

  it('Pip hp is floored at 0 on a lethal hit', () => {
    const result = applyEnemyTurn(makeCombat({ reservedGreen: 0 }), 1)
    expect(result.pipHp).toBe(0)
  })

  it('selects a next intent from the enemy intent set', () => {
    const result = applyEnemyTurn(makeCombat(), 10)
    expect(['attack', 'guard']).toContain(result.combat.intent.kind)
    expect(typeof result.combat.intent.value).toBe('number')
  })
})

// ── applyEnemyTurn — Guard ────────────────────────────────────────────────────

describe('applyEnemyTurn — Guard intent', () => {
  it('adds block value to enemy block, no damage to Pip', () => {
    const combat = makeCombat({ intent: { kind: 'guard', value: 2 } })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
    expect(result.defeat).toBe(false)
    expect(result.combat.enemy.block).toBe(2)
  })

  it('accumulates block across successive Guard intents', () => {
    const combat = makeCombat({
      intent: { kind: 'guard', value: 2 },
      enemy: { ...GOBLIN, block: 1 },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.enemy.block).toBe(3)
  })

  it('resets reservedGreen to 0 even on Guard turns', () => {
    const combat = makeCombat({ intent: { kind: 'guard', value: 2 }, reservedGreen: 2 })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.reservedGreen).toBe(0)
  })
})

// ── applyFlee ─────────────────────────────────────────────────────────────────

describe('applyFlee', () => {
  it('deals enemy.attack damage ignoring reservedGreen', () => {
    const combat = makeCombat({ reservedGreen: 2 })  // would normally dodge
    const result = applyFlee(combat, 10)
    expect(result.damage).toBe(2)     // full base attack, no mitigation
    expect(result.pipHp).toBe(8)
  })

  it('sets defeat when flee hit reduces pipHp to 0', () => {
    const result = applyFlee(makeCombat(), 2)
    expect(result.defeat).toBe(true)
    expect(result.pipHp).toBe(0)
  })

  it('does not set defeat when Pip survives the flee hit', () => {
    const result = applyFlee(makeCombat(), 10)
    expect(result.defeat).toBe(false)
  })

  it('floors pipHp at 0 on a lethal flee hit', () => {
    const result = applyFlee(makeCombat(), 1)
    expect(result.pipHp).toBe(0)
  })
})

// ── selectIntent ──────────────────────────────────────────────────────────────

describe('selectIntent', () => {
  it('always returns an intent from the set', () => {
    for (let i = 0; i < 100; i++) {
      const intent = selectIntent(GOBLIN_INTENTS)
      expect(['attack', 'guard']).toContain(intent.kind)
      expect(typeof intent.value).toBe('number')
    }
  })

  it('returns the only option when the set has one entry', () => {
    const intents = [{ intent: { kind: 'attack' as const, value: 3 }, weight: 1 }]
    for (let i = 0; i < 20; i++) {
      const intent = selectIntent(intents)
      expect(intent.kind).toBe('attack')
      expect(intent.value).toBe(3)
    }
  })

  it('strongly favours the higher-weight option', () => {
    const intents = [
      { intent: { kind: 'attack' as const, value: 2 }, weight: 100 },
      { intent: { kind: 'guard'  as const, value: 2 }, weight: 1 },
    ]
    let attackCount = 0
    for (let i = 0; i < 500; i++) {
      if (selectIntent(intents).kind === 'attack') attackCount++
    }
    expect(attackCount).toBeGreaterThan(450)
  })
})

// ── canFlee ───────────────────────────────────────────────────────────────────

describe('canFlee', () => {
  it('returns true for a non-boss enemy', () => {
    expect(canFlee(GOBLIN)).toBe(true)
  })

  it('returns false for a boss enemy', () => {
    expect(canFlee({ ...GOBLIN, isBoss: true })).toBe(false)
  })
})

// ── rollGoldReward ────────────────────────────────────────────────────────────

describe('rollGoldReward', () => {
  it('always returns an integer in [goldMin, goldMax]', () => {
    for (let i = 0; i < 200; i++) {
      const result = rollGoldReward(GOBLIN)
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(GOBLIN.goldMin)
      expect(result).toBeLessThanOrEqual(GOBLIN.goldMax)
    }
  })

  it('returns the fixed value when goldMin === goldMax', () => {
    const enemy = { ...GOBLIN, goldMin: 5, goldMax: 5 }
    for (let i = 0; i < 50; i++) {
      expect(rollGoldReward(enemy)).toBe(5)
    }
  })
})
