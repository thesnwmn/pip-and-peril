import type { EnemySpec, Enemy } from './types'

// ── TIER 1: Nuisances ────────────────────────────────────────────────────

const DUNGEON_RAT: EnemySpec = {
  id: 'dungeon-rat',
  name: 'Dungeon Rat',
  tier: 1,
  maxHp: 5,
  attack: 1,
  goldMin: 1,
  goldMax: 2,
  intents: [
    { intent: { kind: 'attack', value: 2 }, weight: 4 },
    { intent: { kind: 'guard', value: 1 }, weight: 1 },
  ],
  personality: {
    attackLine: 'bites and scurries',
    guardLine: 'darts back, circling',
  },
}

const GOBLIN_RUNT: EnemySpec = {
  id: 'goblin-runt',
  name: 'Goblin Runt',
  tier: 1,
  maxHp: 6,
  attack: 2,
  goldMin: 1,
  goldMax: 3,
  intents: [
    { intent: { kind: 'attack', value: 2 }, weight: 2 },
    { intent: { kind: 'guard', value: 2 }, weight: 3 },
  ],
  personality: {
    attackLine: 'swings clumsily',
    guardLine: 'cowers behind raised arms',
  },
}

const CAVE_BAT_PUP: EnemySpec = {
  id: 'cave-bat-pup',
  name: 'Cave Bat Pup',
  tier: 1,
  maxHp: 4,
  attack: 1,
  goldMin: 1,
  goldMax: 2,
  intents: [
    { intent: { kind: 'guard', value: 2 }, weight: 3 },
    { intent: { kind: 'attack', value: 1 }, weight: 2 },
  ],
  personality: {
    attackLine: 'swoops in from above',
    guardLine: 'darts back into shadow',
  },
}

const DUNG_BEETLE: EnemySpec = {
  id: 'dung-beetle',
  name: 'Dung Beetle',
  tier: 1,
  maxHp: 8,
  attack: 3,
  goldMin: 2,
  goldMax: 3,
  intents: [
    { intent: { kind: 'guard', value: 3 }, weight: 3 },
    { intent: { kind: 'attack', value: 3 }, weight: 2 },
  ],
  personality: {
    attackLine: 'charges in a straight line',
    guardLine: 'lowers its carapace',
  },
}

// ── TIER 2: Threats ──────────────────────────────────────────────────────

const WEASEL_SCOUT: EnemySpec = {
  id: 'weasel-scout',
  name: 'Weasel Scout',
  tier: 2,
  maxHp: 10,
  attack: 2,
  goldMin: 2,
  goldMax: 4,
  intents: [
    { intent: { kind: 'attack', value: 3 }, weight: 3 },
    { intent: { kind: 'empower', value: 3 }, weight: 2 },
    { intent: { kind: 'attack', value: 2 }, weight: 1 },
  ],
  personality: {
    attackLine: 'slashes without warning',
    empowerLine: 'presses in close, eyes narrowing',
  },
}

const TOAD_SENTRY: EnemySpec = {
  id: 'toad-sentry',
  name: 'Toad Sentry',
  tier: 2,
  maxHp: 14,
  attack: 3,
  goldMin: 3,
  goldMax: 5,
  intents: [
    { intent: { kind: 'guard', value: 3 }, weight: 2 },
    { intent: { kind: 'attack', value: 3 }, weight: 2 },
    { intent: { kind: 'recover', value: 3 }, weight: 1 },
  ],
  personality: {
    attackLine: 'crashes down with its bulk',
    guardLine: 'plants its feet, immovable',
    recoverLine: 'draws a slow, steadying breath',
  },
}

const GOBLIN_GUARD: EnemySpec = {
  id: 'goblin-guard',
  name: 'Goblin Guard',
  tier: 2,
  maxHp: 11,
  attack: 2,
  goldMin: 3,
  goldMax: 5,
  intents: [
    { intent: { kind: 'guard', value: 3 }, weight: 3 },
    { intent: { kind: 'empower', value: 2 }, weight: 2 },
    { intent: { kind: 'attack', value: 2 }, weight: 2 },
  ],
  personality: {
    attackLine: 'drives its weapon home',
    guardLine: 'braces behind its shield',
    empowerLine: 'winds up, shield still raised',
  },
}

const CAVE_SPIDER: EnemySpec = {
  id: 'cave-spider',
  name: 'Cave Spider',
  tier: 2,
  maxHp: 9,
  attack: 2,
  goldMin: 2,
  goldMax: 4,
  intents: [
    { intent: { kind: 'guard', value: 2 }, weight: 2 },
    { intent: { kind: 'empower', value: 2 }, weight: 2 },
    { intent: { kind: 'attack', value: 2 }, weight: 2 },
  ],
  personality: {
    attackLine: 'darts from its web',
    guardLine: 'retreats to the shadows',
    empowerLine: 'watches you, waiting',
  },
}

// ── TIER 3: Horrors ──────────────────────────────────────────────────────

const STOAT_CHAMPION: EnemySpec = {
  id: 'stoat-champion',
  name: 'Stoat Champion',
  tier: 3,
  maxHp: 16,
  attack: 4,
  goldMin: 5,
  goldMax: 8,
  intents: [
    { intent: { kind: 'attack', value: 4 }, weight: 2 },
    { intent: { kind: 'empower', value: 4 }, weight: 2 },
    { intent: { kind: 'lunge', value: 6 }, weight: 2 },
    { intent: { kind: 'recover', value: 3 }, weight: 1 },
  ],
  personality: {
    attackLine: 'strikes with precision',
    empowerLine: 'levels its blade deliberately',
    lungeLine: 'lunges with full force',
    recoverLine: 'steps back, drawing breath',
  },
}

const DUNGEON_ADDER: EnemySpec = {
  id: 'dungeon-adder',
  name: 'Dungeon Adder',
  tier: 3,
  maxHp: 14,
  attack: 2,
  goldMin: 4,
  goldMax: 7,
  intents: [
    { intent: { kind: 'status', value: 1, statusKind: 'poison', ticks: 3 } as any, weight: 3 },
    { intent: { kind: 'attack', value: 2 }, weight: 2 },
    { intent: { kind: 'guard', value: 2 }, weight: 1 },
  ],
  personality: {
    statusLine: 'coils and strikes silently',
    attackLine: 'uncoils with sudden speed',
    guardLine: 'holds still, watching',
  },
}

const SHADOW_RAVEN: EnemySpec = {
  id: 'shadow-raven',
  name: 'Shadow Raven',
  tier: 3,
  maxHp: 18,
  attack: 3,
  goldMin: 5,
  goldMax: 8,
  intents: [
    { intent: { kind: 'attack', value: 3 }, weight: 2 },
    { intent: { kind: 'lunge', value: 5 }, weight: 2 },
    { intent: { kind: 'empower', value: 3 }, weight: 2 },
    { intent: { kind: 'recover', value: 4 }, weight: 1 },
  ],
  personality: {
    attackLine: 'swoops with outstretched talons',
    lungeLine: 'dives with terrible purpose',
    empowerLine: 'tilts its head, studying you',
    recoverLine: 'rises to its perch, composing itself',
  },
}

const IRON_BEETLE: EnemySpec = {
  id: 'iron-beetle',
  name: 'Iron Beetle',
  tier: 3,
  maxHp: 20,
  attack: 3,
  goldMin: 5,
  goldMax: 9,
  intents: [
    { intent: { kind: 'guard', value: 5 }, weight: 4 },
    { intent: { kind: 'attack', value: 3 }, weight: 1 },
    { intent: { kind: 'recover', value: 4 }, weight: 1 },
  ],
  personality: {
    guardLine: 'locks its carapace tight',
    attackLine: 'drives forward like a battering ram',
    recoverLine: 'settles its weight, plates grinding',
  },
}

// ── BOSS ─────────────────────────────────────────────────────────────────────

export const RAT_KING_SPEC: EnemySpec = {
  id: 'rat-king',
  name: 'The Rat King',
  tier: 3,
  maxHp: 20,
  attack: 0,
  goldMin: 15,
  goldMax: 25,
  intents: [],  // not used — intentCycle drives all intent selection
  isBoss: true,
  intentCycle: [
    { kind: 'attack', value: 4 },
    { kind: 'guard', value: 3 },
    { kind: 'empower', value: 0 },
    { kind: 'attack', value: 4 },
  ],
  enrageThreshold: 10,
  enragedCycle: [
    { kind: 'attack', value: 5 },
    { kind: 'lunge', value: 8 },
    { kind: 'attack', value: 5 },
  ],
  bossTitleCard: { name: 'THE RAT KING', flavour: 'Ancient. Patient. Hungry.' },
  personality: {
    attackLine: 'surges forward',
    guardLine: 'coils defensively',
    empowerLine: 'swells with dark energy',
    lungeLine: 'leaps with terrible speed',
  },
}

export const ENEMY_ROSTER: EnemySpec[] = [
  DUNGEON_RAT,
  GOBLIN_RUNT,
  CAVE_BAT_PUP,
  DUNG_BEETLE,
  WEASEL_SCOUT,
  TOAD_SENTRY,
  GOBLIN_GUARD,
  CAVE_SPIDER,
  STOAT_CHAMPION,
  DUNGEON_ADDER,
  SHADOW_RAVEN,
  IRON_BEETLE,
  RAT_KING_SPEC,
]

export function spawnEnemy(spec: EnemySpec): Enemy {
  const base: Enemy = {
    id: spec.id,
    name: spec.name,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    attack: spec.attack,
    block: 0,
    empowered: false,
    disengaged: false,
    isBoss: spec.isBoss ?? false,
    goldMin: spec.goldMin,
    goldMax: spec.goldMax,
    intents: spec.intents,
  }
  if (spec.intentCycle) {
    base.intentCycle = spec.intentCycle
    base.cyclePosition = 0
  }
  if (spec.enrageThreshold !== undefined) base.enrageThreshold = spec.enrageThreshold
  if (spec.enragedCycle) base.enragedCycle = spec.enragedCycle
  return base
}

export function getEnemySpec(id: string): EnemySpec {
  const spec = ENEMY_ROSTER.find(e => e.id === id)
  if (!spec) throw new Error(`Unknown enemy ID: ${id}`)
  return spec
}
