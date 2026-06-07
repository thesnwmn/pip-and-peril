import { describe, it, expect } from 'vitest'
import {
  damageToPip,
  applyStrike,
  applyHeavyStrike,
  applyEnemyTurn,
  applyFlee,
  canFlee,
  rollGoldReward,
  applyAnalyse,
  applyExploit,
  applyResist,
  applyIdentify,
  applyLuckyShot,
  applyShove,
  applyFeint,
  applyDisengage,
  applyPoisonTick,
} from './encounter'
import { selectIntent } from './intents'
import { spawnEnemy, ENEMY_ROSTER } from './roster'
import type { CombatState } from './types'

function makeCombat(overrides: Partial<CombatState> = {}): CombatState {
  const enemy = spawnEnemy(ENEMY_ROSTER[1]) // goblin-runt
  return {
    enemy,
    phase: 'player-turn',
    intent: { kind: 'attack', value: 2 },
    reservedGreen: 0,
    entryFrom: { col: 5, row: 6 },
    goldAwarded: 0,
    itemUsedThisTurn: false,
    pipsSpentThisTurn: false,
    analysedThisCombat: false,
    analysedThisTurn: false,
    identified: false,
    pipPoison: null,
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
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    const combat = makeCombat({ enemy: { ...goblinRunt, block: 1 } })
    const result = applyStrike(combat)
    expect(result.absorbed).toBe(1)
    expect(result.damage).toBe(1)
    expect(result.combat.enemy.block).toBe(0)
    expect(result.combat.enemy.hp).toBe(5)
  })

  it('fully absorbs in block when block >= damage', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 3 } })
    const result = applyStrike(combat)
    expect(result.absorbed).toBe(2)
    expect(result.damage).toBe(0)
    expect(result.combat.enemy.block).toBe(1)
    expect(result.combat.enemy.hp).toBe(6)
  })

  it('sets victory when enemy hp reaches 0', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 2 } })
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
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 1 } })
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
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 2 } })
    const result = applyHeavyStrike(combat)
    expect(result.absorbed).toBe(2)
    expect(result.damage).toBe(2)
    expect(result.combat.enemy.block).toBe(0)
    expect(result.combat.enemy.hp).toBe(4)
  })

  it('kills the enemy with one Heavy Strike from 4 HP', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 4 } })
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
    expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(result.combat.intent.kind)
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
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 1 },
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
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    for (let i = 0; i < 100; i++) {
      const intent = selectIntent(goblinRunt.intents)
      expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(intent.kind)
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
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    expect(canFlee(goblinRunt)).toBe(true)
  })

  it('returns false for a boss enemy', () => {
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    expect(canFlee({ ...goblinRunt, isBoss: true })).toBe(false)
  })
})

// ── rollGoldReward ────────────────────────────────────────────────────────────

describe('rollGoldReward', () => {
  it('always returns an integer in [goldMin, goldMax]', () => {
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    for (let i = 0; i < 200; i++) {
      const result = rollGoldReward(goblinRunt)
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(goblinRunt.goldMin)
      expect(result).toBeLessThanOrEqual(goblinRunt.goldMax)
    }
  })

  it('returns the fixed value when goldMin === goldMax', () => {
    const enemy = { ...spawnEnemy(ENEMY_ROSTER[1]), goldMin: 5, goldMax: 5 }
    for (let i = 0; i < 50; i++) {
      expect(rollGoldReward(enemy)).toBe(5)
    }
  })
})

// ── Blue category — Analyse ───────────────────────────────────────────────────

describe('applyAnalyse', () => {
  it('reveals the next intent via nextIntent field', () => {
    const combat = makeCombat()
    const result = applyAnalyse(combat)
    expect(result.nextIntent).toBeDefined()
    expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(result.nextIntent?.kind)
  })

  it('sets analysedThisCombat to true', () => {
    const combat = makeCombat({ analysedThisCombat: false })
    const result = applyAnalyse(combat)
    expect(result.analysedThisCombat).toBe(true)
  })

  it('sets analysedThisTurn to true (button greying)', () => {
    const combat = makeCombat({ analysedThisTurn: false })
    const result = applyAnalyse(combat)
    expect(result.analysedThisTurn).toBe(true)
  })
})

// ── Blue category — Exploit ───────────────────────────────────────────────────

describe('applyExploit', () => {
  it('deals 3 damage bypassing block entirely', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 5 } })
    const result = applyExploit(combat)
    expect(result.damage).toBe(3)
    expect(result.combat.enemy.hp).toBe(3)  // 6 - 3
    expect(result.combat.enemy.block).toBe(5)  // block not affected by Exploit
  })

  it('reduces enemy hp even when block is very high', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 10 } })
    const result = applyExploit(combat)
    expect(result.combat.enemy.hp).toBe(3)  // 6 - 3, block doesn't matter
    expect(result.combat.enemy.block).toBe(10)  // Exploit doesn't reduce block
  })
})

// ── Blue category — Resist ────────────────────────────────────────────────────

describe('applyResist', () => {
  it('clears poison condition', () => {
    const combat = makeCombat({ pipPoison: { n: 1, remaining: 3 } })
    const result = applyResist(combat)
    expect(result.pipPoison).toBe(null)
  })

  it('does nothing when Pip is not poisoned', () => {
    const combat = makeCombat({ pipPoison: null })
    const result = applyResist(combat)
    expect(result.pipPoison).toBe(null)
  })
})

// ── Blue category — Identify ──────────────────────────────────────────────────

describe('applyIdentify', () => {
  it('sets identified flag to true', () => {
    const combat = makeCombat({ identified: false })
    const result = applyIdentify(combat)
    expect(result.identified).toBe(true)
  })

  it('persists even if called again', () => {
    const combat = makeCombat({ identified: true })
    const result = applyIdentify(combat)
    expect(result.identified).toBe(true)
  })
})

// ── Yellow category — Lucky Shot ──────────────────────────────────────────────

describe('applyLuckyShot', () => {
  it('deals 1-3 random damage bypassing block', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 3 } })
    const result = applyLuckyShot(combat)
    expect(result.damage).toBeGreaterThanOrEqual(1)
    expect(result.damage).toBeLessThanOrEqual(3)
    expect(result.combat.enemy.hp).toBe(6 - result.damage)
    expect(result.combat.enemy.block).toBe(3)  // block not reduced
  })

  it('kills the enemy if hp is low enough', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 1 } })
    const result = applyLuckyShot(combat)
    expect(result.victory).toBe(true)
    expect(result.combat.phase).toBe('victory')
  })
})

// ── Red spend — Shove ─────────────────────────────────────────────────────────

describe('applyShove', () => {
  it('draws a new intent from the pool', () => {
    const combat = makeCombat({ intent: { kind: 'guard', value: 2 } })
    const result = applyShove(combat)
    expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(result.intent.kind)
    expect(typeof result.intent.value).toBe('number')
  })
})

// ── Green spend — Feint ───────────────────────────────────────────────────────

describe('applyFeint', () => {
  it('reduces enemy block by 2', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 5 } })
    const result = applyFeint(combat)
    expect(result.enemy.block).toBe(3)
  })

  it('floors block at 0', () => {
    const goblinRunt = spawnEnemy(ENEMY_ROSTER[1])
    const combat = makeCombat({ enemy: { ...goblinRunt, block: 1 } })
    const result = applyFeint(combat)
    expect(result.enemy.block).toBe(0)
  })

  it('does nothing when block is already 0', () => {
    const combat = makeCombat({ enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), block: 0 } })
    const result = applyFeint(combat)
    expect(result.enemy.block).toBe(0)
  })
})

// ── Green spend — Disengage ───────────────────────────────────────────────────

describe('applyDisengage', () => {
  it('selects new intent and sets disengaged flag', () => {
    const combat = makeCombat({ intent: { kind: 'attack', value: 2 } })
    const result = applyDisengage(combat)
    expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(result.intent.kind)
    expect(result.enemy.disengaged).toBe(true)
  })
})

// ── Enemy intents — Empower ───────────────────────────────────────────────────

describe('applyEnemyTurn — Empower intent', () => {
  it('sets enemy.empowered flag, deals no damage', () => {
    const combat = makeCombat({ intent: { kind: 'empower', value: 2 } })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
    expect(result.combat.enemy.empowered).toBe(true)
  })

  it('resets reservedGreen', () => {
    const combat = makeCombat({ intent: { kind: 'empower', value: 2 }, reservedGreen: 2 })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.reservedGreen).toBe(0)
  })
})

// ── Enemy intents — Recover ───────────────────────────────────────────────────

describe('applyEnemyTurn — Recover intent', () => {
  it('heals enemy hp, deals no damage', () => {
    const combat = makeCombat({
      intent: { kind: 'recover', value: 3 },
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 2 },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
    expect(result.combat.enemy.hp).toBe(5)
  })

  it('caps healing at maxHp', () => {
    const combat = makeCombat({
      intent: { kind: 'recover', value: 10 },
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), hp: 5, maxHp: 6 },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.enemy.hp).toBe(6)
  })
})

// ── Enemy intents — Status/Poison ─────────────────────────────────────────────

describe('applyEnemyTurn — Status/Poison intent', () => {
  it('applies poison when reservedGreen < 2', () => {
    const combat = makeCombat({
      intent: { kind: 'status', value: 1, statusKind: 'poison' as const, ticks: 3 } as any,
      reservedGreen: 0,
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(1)
    expect(result.pipHp).toBe(9)
    expect(result.combat.pipPoison).toEqual({ n: 1, remaining: 3 })
  })

  it('avoids poison and damage when reservedGreen >= 2 (full dodge)', () => {
    const combat = makeCombat({
      intent: { kind: 'status', value: 1, statusKind: 'poison' as const, ticks: 3 } as any,
      reservedGreen: 2,
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
    expect(result.combat.pipPoison).toBe(null)
  })

  it('partial dodge (1G): reduces damage but applies poison', () => {
    const combat = makeCombat({
      intent: { kind: 'status', value: 2, statusKind: 'poison' as const, ticks: 3 } as any,
      reservedGreen: 1,
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(1)  // 2 - 1
    expect(result.pipHp).toBe(9)
    expect(result.combat.pipPoison).toEqual({ n: 2, remaining: 3 })
  })
})

// ── Enemy intents — Lunge ─────────────────────────────────────────────────────

describe('applyEnemyTurn — Lunge intent', () => {
  it('uses same mitigation as Attack', () => {
    const combat = makeCombat({ intent: { kind: 'lunge', value: 4 }, reservedGreen: 0 })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(4)
    expect(result.pipHp).toBe(6)
  })

  it('full dodge (2G) avoids lunge', () => {
    const combat = makeCombat({ intent: { kind: 'lunge', value: 4 }, reservedGreen: 2 })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
  })

  it('is doubled by empowered flag', () => {
    const combat = makeCombat({
      intent: { kind: 'lunge', value: 4 },
      reservedGreen: 0,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), empowered: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(8)  // 4 × 2
    expect(result.pipHp).toBe(2)
  })

  it('clears empowered flag after lunge', () => {
    const combat = makeCombat({
      intent: { kind: 'lunge', value: 4 },
      reservedGreen: 0,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), empowered: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.enemy.empowered).toBe(false)
  })

  it('kills Pip with lethal Lunge', () => {
    const combat = makeCombat({
      intent: { kind: 'lunge', value: 10 },
      reservedGreen: 0,
    })
    const result = applyEnemyTurn(combat, 5)
    expect(result.defeat).toBe(true)
    expect(result.combat.phase).toBe('defeat')
  })
})

// ── Poison ticking ────────────────────────────────────────────────────────────

describe('applyPoisonTick', () => {
  it('damages Pip and decrements remaining ticks', () => {
    const result = applyPoisonTick(10, { n: 2, remaining: 3 })
    expect(result.pipHp).toBe(8)
    expect(result.pipPoison).toEqual({ n: 2, remaining: 2 })
    expect(result.defeat).toBe(false)
  })

  it('clears poison when remaining hits 0', () => {
    const result = applyPoisonTick(10, { n: 2, remaining: 1 })
    expect(result.pipHp).toBe(8)
    expect(result.pipPoison).toBe(null)
  })

  it('kills Pip if poison damage is lethal', () => {
    const result = applyPoisonTick(2, { n: 3, remaining: 2 })
    expect(result.pipHp).toBe(0)
    expect(result.defeat).toBe(true)
  })

  it('returns unchanged state when not poisoned', () => {
    const result = applyPoisonTick(10, null)
    expect(result.pipHp).toBe(10)
    expect(result.pipPoison).toBe(null)
    expect(result.defeat).toBe(false)
  })
})

// ── Empowered attack doubling ─────────────────────────────────────────────────

describe('applyEnemyTurn — Empowered attacks', () => {
  it('doubles Attack damage when empowered', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 2 },
      reservedGreen: 0,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), empowered: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(4)  // 2 × 2
    expect(result.pipHp).toBe(6)
  })

  it('clears empowered after Attack fires', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 2 },
      reservedGreen: 0,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), empowered: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.enemy.empowered).toBe(false)
  })

  it('clears empowered even when full dodge prevents damage', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 2 },
      reservedGreen: 2,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), empowered: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.combat.enemy.empowered).toBe(false)
  })
})

// ── Disengaged intent suppression ──────────────────────────────────────────────

describe('applyEnemyTurn — Disengaged suppression', () => {
  it('suppresses intent execution when disengaged', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 5 },
      reservedGreen: 0,
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), disengaged: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.damage).toBe(0)
    expect(result.pipHp).toBe(10)
  })

  it('clears disengaged flag after suppressed turn', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 5 },
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), disengaged: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(result.combat.enemy.disengaged).toBe(false)
  })

  it('still reveals next intent even when suppressed', () => {
    const combat = makeCombat({
      intent: { kind: 'attack', value: 5 },
      enemy: { ...spawnEnemy(ENEMY_ROSTER[1]), disengaged: true },
    })
    const result = applyEnemyTurn(combat, 10)
    expect(['attack', 'guard', 'empower', 'recover', 'status', 'lunge']).toContain(result.combat.intent.kind)
  })
})
