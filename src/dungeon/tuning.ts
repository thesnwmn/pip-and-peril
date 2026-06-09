export interface DungeonTuning {
  // Phase thresholds (tiles placed on floor before phase advances)
  phaseThresholds: Record<1 | 2 | 3, { mid: number; late: number }>

  // Room weight tables: keyed by (floor, depthPhase)
  roomWeights: Record<1 | 2 | 3, Record<'early' | 'mid' | 'late', Record<string, number>>>

  // Stairwell availability threshold (tiles placed on floor before offering)
  stairwellThreshold: Record<1 | 2, number>

  // Boss placement parameters (Floor 3 only)
  BOSS_MIN_EXPLORATION: number
  BOSS_EXPLORATION_SCALE: number
  BASE_BOSS_WEIGHT: number
  BOSS_DIST_MIN: number
  BOSS_DIST_MID: number
  BOSS_DIST_OUTER: number

  // Shop guarantee parameters
  SHOP_DEBT_THRESHOLD: Record<1 | 2 | 3, number>
  SHOP_DEBT_WEIGHT: number

  // Trap difficulty ranges (min–max, inclusive)
  trapDifficultyRange: Record<1 | 2 | 3, Record<'early' | 'mid' | 'late', { min: number; max: number }>>

  // Enemy tier weights for weighted random selection by floor and depth phase
  enemyTierWeights: Record<1 | 2 | 3, Record<'early' | 'mid' | 'late', { t1: number; t2: number; t3: number }>>

  // Chest variant weights
  chestVariantWeights: Record<'basic' | 'locked' | 'trapped', number>

  // Lock difficulty thresholds
  lockDifficultyThresholds: Record<'easy' | 'medium' | 'hard', number>

  // Chest loot table item weights
  chestLootWeights: Record<string, number>

  // Gold range per floor
  chestGoldRange: Record<1 | 2 | 3, { min: number; max: number }>

  // Chance of empty chest (basic variant only)
  emptyChestChance: number

  // Chance of item in chest loot
  chestHasItemChance: number

  // NPC archetype weights
  npcArchetypeWeights: Record<'rat-scavenger' | 'frightened-mouse' | 'old-hermit', number>

  // NPC item reward pool weights
  npcItemPoolWeights: Record<string, number>
}

export const DUNGEON_TUNING: DungeonTuning = {
  phaseThresholds: {
    1: { mid: 8, late: 15 },
    2: { mid: 8, late: 16 },
    3: { mid: 10, late: 20 },
  },

  stairwellThreshold: {
    1: 8,
    2: 10,
  },

  roomWeights: {
    1: {
      early: {
        corridor: 52,
        enemy: 18,
        npc: 8,
        item: 10,
        chest: 1,
        trap: 3,
        shop: 8,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 45,
        enemy: 24,
        npc: 5,
        item: 10,
        chest: 2,
        trap: 7,
        shop: 7,
        stairwell: 8,
        boss: 0,
      },
      late: {
        corridor: 38,
        enemy: 30,
        npc: 3,
        item: 10,
        chest: 3,
        trap: 10,
        shop: 5,
        stairwell: 7,
        boss: 0,
      },
    },
    2: {
      early: {
        corridor: 42,
        enemy: 28,
        npc: 5,
        item: 10,
        chest: 2,
        trap: 5,
        shop: 8,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 38,
        enemy: 35,
        npc: 4,
        item: 10,
        chest: 3,
        trap: 8,
        shop: 6,
        stairwell: 7,
        boss: 0,
      },
      late: {
        corridor: 31,
        enemy: 42,
        npc: 3,
        item: 9,
        chest: 4,
        trap: 12,
        shop: 5,
        stairwell: 6,
        boss: 0,
      },
    },
    3: {
      early: {
        corridor: 32,
        enemy: 38,
        npc: 4,
        item: 10,
        chest: 3,
        trap: 8,
        shop: 5,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 28,
        enemy: 44,
        npc: 3,
        item: 9,
        chest: 4,
        trap: 12,
        shop: 5,
        stairwell: 0,
        boss: 0,
      },
      late: {
        corridor: 23,
        enemy: 50,
        npc: 2,
        item: 7,
        chest: 5,
        trap: 15,
        shop: 4,
        stairwell: 0,
        boss: 0,
      },
    },
  },

  BOSS_MIN_EXPLORATION: 12,
  BOSS_EXPLORATION_SCALE: 15,
  BASE_BOSS_WEIGHT: 30,
  BOSS_DIST_MIN: 4,
  BOSS_DIST_MID: 6,
  BOSS_DIST_OUTER: 8,

  SHOP_DEBT_THRESHOLD: {
    1: 14,
    2: 12,
    3: 10,
  },
  SHOP_DEBT_WEIGHT: 60,

  trapDifficultyRange: {
    1: {
      early: { min: 1, max: 2 },
      mid: { min: 1, max: 3 },
      late: { min: 2, max: 4 },
    },
    2: {
      early: { min: 2, max: 4 },
      mid: { min: 3, max: 5 },
      late: { min: 4, max: 6 },
    },
    3: {
      early: { min: 4, max: 6 },
      mid: { min: 5, max: 7 },
      late: { min: 6, max: 9 },
    },
  },

  enemyTierWeights: {
    1: {
      early: { t1: 9, t2: 1, t3: 0 },
      mid: { t1: 7, t2: 3, t3: 0 },
      late: { t1: 5, t2: 4, t3: 1 },
    },
    2: {
      early: { t1: 3, t2: 6, t3: 1 },
      mid: { t1: 1, t2: 6, t3: 3 },
      late: { t1: 0, t2: 4, t3: 6 },
    },
    3: {
      early: { t1: 0, t2: 3, t3: 7 },
      mid: { t1: 0, t2: 2, t3: 8 },
      late: { t1: 0, t2: 1, t3: 9 },
    },
  },

  chestVariantWeights: {
    basic: 6,
    locked: 3,
    trapped: 1,
  },

  lockDifficultyThresholds: {
    easy: 2,
    medium: 3,
    hard: 5,
  },

  chestLootWeights: {
    'cheese-crumb': 3,
    'lucky-acorn': 3,
    'smoke-pellet': 3,
    'glowstone-dust': 3,
    'gouda-wedge': 4,
    'stout-flask': 5,
    'rabbits-foot': 5,
    'iron-thimble': 5,
  },

  chestGoldRange: {
    1: { min: 3, max: 6 },
    2: { min: 5, max: 9 },
    3: { min: 7, max: 12 },
  },

  emptyChestChance: 0,
  chestHasItemChance: 0.60,

  npcArchetypeWeights: {
    'rat-scavenger': 5,
    'frightened-mouse': 4,
    'old-hermit': 3,
  },

  npcItemPoolWeights: {
    'cheese-crumb': 4,
    'lucky-acorn': 3,
    'smoke-pellet': 3,
    'glowstone-dust': 2,
  },
}
