import { describe, it, expect } from 'vitest'
import { applyStrike, applyEvade, applyFocus, applyEnemyAttack } from './encounter'
import type { CombatState } from './types'
import { GOBLIN } from './types'

function makeCombat(overrides: Partial<CombatState> = {}): CombatState {
  return {
    enemy: { ...GOBLIN },
    phase: 'player-turn',
    evadeBuffer: 0,
    ...overrides,
  }
}

describe('applyStrike', () => {
  it('deals 2 damage to the enemy', () => {
    const result = applyStrike(makeCombat())
    expect(result.combat.enemy.hp).toBe(4)
    expect(result.damage).toBe(2)
    expect(result.victory).toBe(false)
  })

  it('does not set victory when enemy survives', () => {
    const result = applyStrike(makeCombat())
    expect(result.combat.phase).toBe('player-turn')
  })

  it('sets victory when enemy hp drops to exactly 0', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 2 } })
    const result = applyStrike(combat)
    expect(result.combat.enemy.hp).toBe(0)
    expect(result.victory).toBe(true)
    expect(result.combat.phase).toBe('victory')
  })

  it('kills enemy in one hit (1 HP enemy)', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 1 } })
    const result = applyStrike(combat)
    expect(result.combat.enemy.hp).toBe(0)
    expect(result.victory).toBe(true)
  })

  it('handles over-damage — hp does not go negative', () => {
    const combat = makeCombat({ enemy: { ...GOBLIN, hp: 1 } })
    const result = applyStrike(combat)
    expect(result.combat.enemy.hp).toBe(0)
  })
})

describe('applyEvade', () => {
  it('sets evadeBuffer to 2 from 0', () => {
    const result = applyEvade(makeCombat())
    expect(result.evadeBuffer).toBe(2)
  })

  it('second use does not stack — buffer stays at 2', () => {
    const combat = makeCombat({ evadeBuffer: 2 })
    const result = applyEvade(combat)
    expect(result.evadeBuffer).toBe(2)
  })

  it('takes the maximum of current buffer and 2', () => {
    const combat = makeCombat({ evadeBuffer: 1 })
    const result = applyEvade(combat)
    expect(result.evadeBuffer).toBe(2)
  })
})

describe('applyFocus', () => {
  it('restores 1 HP to Pip', () => {
    const result = applyFocus(7, 10)
    expect(result.pipHp).toBe(8)
    expect(result.heal).toBe(1)
  })

  it('caps HP at pipMaxHp when already at max', () => {
    const result = applyFocus(10, 10)
    expect(result.pipHp).toBe(10)
    expect(result.heal).toBe(0)
  })

  it('heals to exactly max when 1 below max', () => {
    const result = applyFocus(9, 10)
    expect(result.pipHp).toBe(10)
    expect(result.heal).toBe(1)
  })
})

describe('applyEnemyAttack', () => {
  it('deals enemy.attack damage to Pip', () => {
    const result = applyEnemyAttack(makeCombat(), 10)
    expect(result.pipHp).toBe(8)
    expect(result.damage).toBe(2)
    expect(result.defeat).toBe(false)
  })

  it('does not set defeat when Pip HP > 0 after attack', () => {
    const result = applyEnemyAttack(makeCombat(), 10)
    expect(result.defeat).toBe(false)
    expect(result.combat.phase).toBe('player-turn')
  })

  it('evadeBuffer reduces incoming damage', () => {
    const combat = makeCombat({ evadeBuffer: 2 })
    const result = applyEnemyAttack(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
  })

  it('evadeBuffer fully blocks attack — damage cannot go negative', () => {
    const combat = makeCombat({ evadeBuffer: 2 })
    const result = applyEnemyAttack(combat, 5)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(5)
  })

  it('resets evadeBuffer to 0 after the attack', () => {
    const combat = makeCombat({ evadeBuffer: 2 })
    const result = applyEnemyAttack(combat, 10)
    expect(result.combat.evadeBuffer).toBe(0)
  })

  it('sets defeat when Pip HP reaches exactly 0', () => {
    const result = applyEnemyAttack(makeCombat(), 2)
    expect(result.pipHp).toBe(0)
    expect(result.defeat).toBe(true)
    expect(result.combat.phase).toBe('defeat')
  })

  it('sets defeat when Pip HP would go below 0', () => {
    const result = applyEnemyAttack(makeCombat(), 1)
    expect(result.pipHp).toBe(0)
    expect(result.defeat).toBe(true)
  })

  it('Pip HP is floored at 0 on lethal hit', () => {
    const result = applyEnemyAttack(makeCombat(), 1)
    expect(result.pipHp).toBe(0)
  })
})
