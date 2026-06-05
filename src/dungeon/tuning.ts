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
        corridor: 50,
        enemy: 18,
        npc: 8,
        item: 10,
        chest: 3,
        trap: 3,
        shop: 8,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 42,
        enemy: 24,
        npc: 5,
        item: 10,
        chest: 5,
        trap: 7,
        shop: 7,
        stairwell: 8,
        boss: 0,
      },
      late: {
        corridor: 35,
        enemy: 30,
        npc: 3,
        item: 10,
        chest: 7,
        trap: 10,
        shop: 5,
        stairwell: 7,
        boss: 0,
      },
    },
    2: {
      early: {
        corridor: 40,
        enemy: 28,
        npc: 5,
        item: 10,
        chest: 5,
        trap: 5,
        shop: 7,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 35,
        enemy: 35,
        npc: 4,
        item: 10,
        chest: 7,
        trap: 8,
        shop: 6,
        stairwell: 7,
        boss: 0,
      },
      late: {
        corridor: 28,
        enemy: 42,
        npc: 3,
        item: 9,
        chest: 9,
        trap: 12,
        shop: 5,
        stairwell: 6,
        boss: 0,
      },
    },
    3: {
      early: {
        corridor: 30,
        enemy: 38,
        npc: 4,
        item: 10,
        chest: 7,
        trap: 8,
        shop: 6,
        stairwell: 0,
        boss: 0,
      },
      mid: {
        corridor: 25,
        enemy: 44,
        npc: 3,
        item: 9,
        chest: 9,
        trap: 12,
        shop: 5,
        stairwell: 0,
        boss: 0,
      },
      late: {
        corridor: 20,
        enemy: 50,
        npc: 2,
        item: 7,
        chest: 10,
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
}
