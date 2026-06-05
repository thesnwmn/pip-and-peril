# 038 · Enemy Roster Expansion

**Status:** READY
**Source idea:** manager request; `docs/concept/enemies-and-bosses.md` (creature direction);
absorbs Idea 012 · Creature Personality Traits.
**Depends on:** 037 (combat overhaul — `Enemy`, `IntentSet`, `WeightedIntent` types and combat
loop); 046 (combat depth — `IntentKind` union extended to include `empower`, `recover`, `status`,
`lunge`; 046's TODO-038 placeholder intents on GOBLIN are removed here); 022 (dungeon structure —
tier-weighted room placement and `TileCell` the spec extends).

---

## Summary

Feature 006 shipped one enemy (the Goblin). Feature 022 built a floor-and-depth weighting system
for room placement but has nothing to vary within the enemy type — every enemy room still spawns
a Goblin. This feature fills the roster: twelve named creatures spread across three tiers, each
with HP, gold range, a weighted intent pool, and personality log-line strings that make every
creature feel distinct. Room placement is updated to select a tier-appropriate enemy from the
roster and store its ID on the tile; combat reads that ID on entry to spawn the correct enemy.
After this feature, the three floors each have their own emotional register in combat: Floor 1
teaches, Floor 2 pressures, Floor 3 tests.

---

## Acceptance criteria

### Data model

1. A new type `EnemySpec` exists in `src/combat/types.ts` (or a dedicated
   `src/combat/roster.ts`) containing the static fields:
   `id: string`, `name: string`, `tier: 1 | 2 | 3`, `maxHp: number`, `attack: number` (used only
   for the Flee free-hit, per 037), `goldMin: number`, `goldMax: number`,
   `intents: IntentSet`, `personality: EnemyPersonality`.

2. `EnemyPersonality` is a type with optional per-intent-kind log strings:
   `attackLine?: string`, `guardLine?: string`, `empowerLine?: string`, `recoverLine?: string`,
   `lungeLine?: string`, `statusLine?: string`. Only kinds present in that enemy's intent pool
   need a string — the combat log falls back to a generic line for absent kinds.

3. `TileCell` gains an optional field `enemyId?: string`. It is set when an enemy room tile is
   placed and is never `undefined` for a tile with `roomType === 'enemy'`.

4. `DUNGEON_TUNING` gains an `enemyTierWeights` field of type
   `Record<1|2|3, Record<'early'|'mid'|'late', { t1: number; t2: number; t3: number }>>`,
   populated with the tier-weight table from the Design detail section below.

5. `src/combat/roster.ts` exports `ENEMY_ROSTER: EnemySpec[]` containing all twelve entries
   from the Design detail section. It also exports `spawnEnemy(spec: EnemySpec): Enemy` which
   returns a fresh `Enemy` instance (`hp` = `maxHp`, `block` = 0, `empowered` = false,
   `disengaged` = false per 046).

6. A lookup helper `getEnemySpec(id: string): EnemySpec` (exported from roster.ts) returns
   the spec for a given ID; throws if not found.

### Room placement

7. When the dungeon places an enemy room tile (in the room-selection flow), it determines a tier
   (1, 2, or 3) using weighted random draw from `enemyTierWeights[floor][depthPhase]`, then
   picks a uniformly random `EnemySpec` from `ENEMY_ROSTER` with that tier, and writes
   `spec.id` into `tile.enemyId`.

8. The tier draw and enemy selection both use the same seeded-or-Math.random source used
   elsewhere in the dungeon (no new random infrastructure needed).

### Combat entry

9. When a combat encounter starts, it calls `getEnemySpec(tile.enemyId!)` to retrieve the spec
   and `spawnEnemy(spec)` to create the live `Enemy` instance. The existing GOBLIN constant in
   `intents.ts` is removed; `combat-panel.ts` and any other callers are updated to the new path.

10. The four TODO-038 placeholder intents added to GOBLIN in feature 046 (`empower`, `recover`,
    `status`, `lunge` with `// TODO 038: replace with tier-weighted sets` comments) are removed.
    The Goblin Runt entry in the new roster provides GOBLIN's replacement data.

### Personality log lines

11. The combat battle log uses the enemy's `personality` strings when narrating intent outcomes.
    When the enemy attacks: "The [name] [attackLine] — [N] damage." When the enemy guards:
    "The [name] [guardLine]." Equivalent for empower, recover, lunge, and status. If a
    personality string is absent for a given intent kind, the log falls back to a generic
    template ("The [name] attacks for [N]." etc.).

### Roster completeness

12. All twelve entries from the Design detail section are present with their specified tier, HP,
    gold range, intent pool (kinds and weights matching the table), and personality strings.

13. Tier 1 enemies use only `attack` and `guard` intent kinds. Tier 2 enemies use `attack`,
    `guard`, `empower`, and/or `recover`. Tier 3 enemies use the full set including `lunge`
    and/or `status`.

### Quality

14. `getEnemySpec` is unit-tested: all twelve IDs resolve correctly; an unknown ID throws.

15. `spawnEnemy` is unit-tested: the returned `Enemy` has `hp === maxHp`, `block === 0`,
    `empowered === false`, `disengaged === false` for at least one spec.

16. Tier weight draw is unit-tested against the `enemyTierWeights` table: for each (floor, phase)
    pair, the draw produces only valid tier values and the distribution over 1 000 draws is
    within ±10 pp of the specified weights.

17. `npm run typecheck` exits with zero new errors.

18. `npm run test` passes.

---

## Scope / non-goals

- **Run-depth window scaling** — the concept doc describes intent pools expanding across runs
  as the meta-progression counter climbs (e.g. a Tier-1 enemy gaining `guard` at window 4+).
  This cross-run escalation layer belongs to feature 029 (meta-progression). Feature 038 defines
  the fixed base roster only; 029 wires the window.

- **Status variants beyond Poison** — 046 scopes Status to Poison only; that holds here. `slow`
  and `stun` are future additions when a creature's personality warrants them.

- **Multi-enemy encounters (swarms)** — the concept doc notes that a swarm of three Dungeon Rats
  could replace a single Rat at deep windows. This is a future encounter-composition feature.

- **Boss enemies** — the boss roster (Rat King and future bosses) is entirely feature 023's
  concern. Boss enemies have fixed intent cycles, not weighted pools.

- **Art assets for enemy display** — enemy rendering in the combat overlay (sprite vs.
  canvas-drawn) is governed by decision D8 (geometric canvas). No new art is introduced here;
  the enemy name renders as text in the overlay as it does today.

- **New intent kinds** — 046 defines all six intent kinds. Feature 038 populates data only; it
  adds no new mechanics.

---

## Design detail

### `EnemySpec` and `EnemyPersonality` types

```
EnemySpec:
  id            string
  name          string
  tier          1 | 2 | 3
  maxHp         number
  attack        number         ← flee free-hit damage only (037)
  goldMin       number
  goldMax       number
  intents       IntentSet      ← WeightedIntent[]; selected at start of each enemy turn
  personality   EnemyPersonality

EnemyPersonality:
  attackLine?   string         ← e.g. "bites and scurries"
  guardLine?    string         ← e.g. "lowers its carapace"
  empowerLine?  string         ← e.g. "presses in close, eyes narrowing"
  recoverLine?  string         ← e.g. "draws a slow, steadying breath"
  lungeLine?    string         ← e.g. "lunges with full force"
  statusLine?   string         ← e.g. "coils and strikes silently"
```

`EnemySpec` is static data (no runtime state). `spawnEnemy` clones the relevant fields into the
mutable `Enemy` structure that 037/046 already defines, adding the runtime-only fields
(`hp = maxHp`, `block = 0`, `empowered = false`, `disengaged = false`). The existing `Enemy`
type needs no structural changes beyond what 046 already adds.

### Enemy tier weights in DUNGEON_TUNING

Added to `DungeonTuning` and `DUNGEON_TUNING`:

```
enemyTierWeights: Record<1|2|3, Record<'early'|'mid'|'late', { t1: number; t2: number; t3: number }>>
```

| Floor | Phase | Tier 1 | Tier 2 | Tier 3 | Design intent |
|-------|-------|--------|--------|--------|---------------|
| 1 | early | 9 | 1 | 0 | Nuisances dominate; one stray Threat possible |
| 1 | mid   | 7 | 3 | 0 | Threats starting to appear |
| 1 | late  | 5 | 4 | 1 | Ramp; a Horror is exceptional but possible |
| 2 | early | 3 | 6 | 1 | Tier 2 dominant; Tier 1 feels like relief |
| 2 | mid   | 1 | 6 | 3 | Horrors entering; real resource pressure |
| 2 | late  | 0 | 4 | 6 | Deep Floor 2 — Tier 3 majority |
| 3 | early | 0 | 3 | 7 | Heavy Tier 3; Tier 2 as occasional breather |
| 3 | mid   | 0 | 2 | 8 | Near-full Tier 3 |
| 3 | late  | 0 | 1 | 9 | The dungeon's full weight before the boss |

These are starting values for play-testing; balance tuning is expected after the Engineer ships
the feature. The Planner or Designer adjusts them in `tuning.ts` without a spec change.

### Tile placement flow (enemy rooms)

```
player picks enemy room tile
  │
  ├─ determine depthPhase = getDepthPhase(floor, floorTilesPlaced)  [existing]
  │
  ├─ draw tier t ← weighted random from enemyTierWeights[floor][depthPhase]
  │
  ├─ pick spec ← uniform random from ENEMY_ROSTER where spec.tier === t
  │
  └─ tile.enemyId = spec.id   (stored in TileCell, persists across re-entries)
```

On re-entry (e.g. after Flee), the same `enemyId` is still on the tile; combat picks up the
same spec. Enemy HP state is not persisted — the enemy is re-spawned at full health on re-entry.
This matches the current behaviour and is consistent with the existing `fled` tile flag (the fled
room shows no encounter on immediate re-entry per 037, so HP reset is invisible in practice).

### The twelve enemies

Intent notation: `Kind:Value (wN)` = a `WeightedIntent` with the given kind, value, and weight.
For Status: `Status(dmg/ticks)` = `{ kind:'status', value: dmg, statusKind:'poison', ticks }`.
Multiple entries with the same kind are valid — they increase that kind's draw probability.

---

#### TIER 1 — Nuisances

Enemies a veteran clears on autopilot; a new player uses to learn the system. Intent sets use
only `attack` and `guard`. Any fight lost to a Tier-1 enemy is a pip-spending mistake.

---

**Dungeon Rat** `id: dungeon-rat`

> *Larger than Pip, but only just. Fast, low health. The textbook fight.*

| Field | Value |
|-------|-------|
| HP | 5 |
| Attack (flee) | 1 |
| Gold | 1–2 |

| Intent | Weight | Share |
|--------|--------|-------|
| Attack 2 | 4 | 80 % |
| Guard 1 | 1 | 20 % |

Personality: mostly attacking, barely defending. The fight you expect.

```
attackLine: "bites and scurries"
guardLine:  "darts back, circling"
```

---

**Goblin Runt** `id: goblin-runt`  ← replaces the current hardcoded GOBLIN

> *Pip's approximate size. Clumsy, opportunistic, quick to flinch.*

| Field | Value |
|-------|-------|
| HP | 6 |
| Attack (flee) | 2 |
| Gold | 1–3 |

| Intent | Weight | Share |
|--------|--------|-------|
| Attack 2 | 2 | 40 % |
| Guard 2 | 3 | 60 % |

More defensively minded than the Rat — guards more than it attacks. Teaching: blocking enemies
need Green (Feint) or sustained Red pressure to get through.

```
attackLine: "swings clumsily"
guardLine:  "cowers behind raised arms"
```

---

**Cave Bat Pup** `id: cave-bat-pup`

> *Comparable to Pip. Young bat: swoops and misses often, fragile.*

| Field | Value |
|-------|-------|
| HP | 4 |
| Attack (flee) | 1 |
| Gold | 1–2 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 2 | 3 | 60 % |
| Attack 1 | 2 | 40 % |

Very evasive: spends most turns guarding (not attacking). Low HP means it dies quickly once
guard is broken. Teaching: some enemies need Feint or Yellow (Lucky Shot) to crack open, not
just raw Red.

```
attackLine: "swoops in from above"
guardLine:  "darts back into shadow"
```

---

**Dung Beetle** `id: dung-beetle`

> *Unsettlingly large for an insect. Armored, slow, hits in a straight line.*

| Field | Value |
|-------|-------|
| HP | 8 |
| Attack (flee) | 3 |
| Gold | 2–3 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 3 | 3 | 60 % |
| Attack 3 | 2 | 40 % |

Highest HP in Tier 1. Guard 3 means a solid block wall before every attack; Attack 3 means you
cannot ignore the hit when it comes. Teaching: pip conservation across multiple turns; you cannot
race this enemy and you cannot ignore its attacks.

```
attackLine: "charges in a straight line"
guardLine:  "lowers its carapace"
```

---

#### TIER 2 — Threats

Enemies that demand resource decisions. A sloppy turn costs HP. Adds `empower` and `recover`
to the intent pool — both require a response, not just reaction.

---

**Weasel Scout** `id: weasel-scout`

> *Notably larger than Pip. Quick. Aggressive and fast.*

| Field | Value |
|-------|-------|
| HP | 10 |
| Attack (flee) | 2 |
| Gold | 2–4 |

| Intent | Weight | Share |
|--------|--------|-------|
| Attack 3 | 3 | 50 % |
| Empower 3 | 2 | 33 % |
| Attack 2 | 1 | 17 % |

Mostly attacks (67% of turns); Empower turns (33%) are the danger signal — next attack value
doubles to 6. Teaching: recognise Empower and either kill before it fires or hold 2G. The first
enemy that punishes slow play.

```
attackLine:  "slashes without warning"
empowerLine: "presses in close, eyes narrowing"
```

---

**Toad Sentry** `id: toad-sentry`

> *Massive to Pip. Armored, slow, hits like a falling stone.*

| Field | Value |
|-------|-------|
| HP | 14 |
| Attack (flee) | 3 |
| Gold | 3–5 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 3 | 2 | 40 % |
| Attack 3 | 2 | 40 % |
| Recover 3 | 1 | 20 % |

High HP + Recover makes outlasting impossible without consistent damage. Guard turns demand
Red pressure or Feint. Teaching: you must stay on offence even while defending; a passive player
watches the toad heal back what it cost.

```
attackLine:  "crashes down with its bulk"
guardLine:   "plants its feet, immovable"
recoverLine: "draws a slow, steadying breath"
```

---

**Goblin Guard** `id: goblin-guard`

> *Still roughly Pip's scale, but better equipped. Shield-carrying, more patient.*

| Field | Value |
|-------|-------|
| HP | 11 |
| Attack (flee) | 2 |
| Gold | 3–5 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 3 | 3 | 43 % |
| Empower 2 | 2 | 29 % |
| Attack 2 | 2 | 29 % |

Pattern: Guard → Empower → Attack is common but not fixed. Empower turns the otherwise modest
Attack 2 into 4 damage. Teaching: aggression alone doesn't win; the Guard must be broken
*before* the empowered hit arrives.

```
attackLine:  "drives its weapon home"
guardLine:   "braces behind its shield"
empowerLine: "winds up, shield still raised"
```

---

**Cave Spider** `id: cave-spider`

> *About Pip's size but eight-legged. Patient, web-laying.*

| Field | Value |
|-------|-------|
| HP | 9 |
| Attack (flee) | 2 |
| Gold | 2–4 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 2 | 2 | 33 % |
| Empower 2 | 2 | 33 % |
| Attack 2 | 2 | 33 % |

Equal-weight intent pool: each turn is genuinely uncertain. The first enemy where Analyse (2B)
has immediate payoff — knowing whether Guard, Empower, or Attack is next makes every allocation
decision sharper. Teaching: Pip-as-prey; the first creature that rewards reading over reacting.

```
attackLine:  "darts from its web"
guardLine:   "retreats to the shadows"
empowerLine: "watches you, waiting"
```

---

#### TIER 3 — Horrors

Enemies that may not be winnable without good pip management and likely an item. Adds `lunge`
and `status` (Poison) to the intent pool. Coming out the other side is an achievement.

---

**Stoat Champion** `id: stoat-champion`

> *Considerably larger and stronger than Pip. Elite warrior — high HP, multiple threat vectors.*

| Field | Value |
|-------|-------|
| HP | 16 |
| Attack (flee) | 4 |
| Gold | 5–8 |

| Intent | Weight | Share |
|--------|--------|-------|
| Attack 4 | 2 | 29 % |
| Empower 4 | 2 | 29 % |
| Lunge 6  | 2 | 29 % |
| Recover 3 | 1 | 14 % |

Three distinct threat vectors — base attack, empowered attack (next hit ×2 = 8), and Lunge
(6 damage, same dodge rules as Attack per 046). Recover extends a fight the player may be
struggling to finish. Teaching: full pip management; no single strategy dominates.

```
attackLine:  "strikes with precision"
empowerLine: "levels its blade deliberately"
lungeLine:   "lunges with full force"
recoverLine: "steps back, drawing breath"
```

---

**Dungeon Adder** `id: dungeon-adder`

> *Enormous from Pip's perspective. A snake. Silent, poisonous.*

| Field | Value |
|-------|-------|
| HP | 14 |
| Attack (flee) | 2 |
| Gold | 4–7 |

| Intent | Weight | Share |
|--------|--------|-------|
| Status (1/3) | 3 | 50 % |
| Attack 2   | 2 | 33 % |
| Guard 2    | 1 | 17 % |

Status intent (Poison 1 direct damage / 3 ticks at 1/turn) is the fight's defining threat. A
poisoned Pip faces 4 total damage (1 now + 3 ticks) unless Resist (3B) is used. Teaching: time
pressure — the adder doesn't need to kill you directly; it lets the venom do it.

```
statusLine: "coils and strikes silently"
attackLine: "uncoils with sudden speed"
guardLine:  "holds still, watching"
```

---

**Shadow Raven** `id: shadow-raven`

> *Monstrous from Pip's eye. Intelligent, adapts. The first enemy that feels like it's reading you.*

| Field | Value |
|-------|-------|
| HP | 18 |
| Attack (flee) | 3 |
| Gold | 5–8 |

| Intent | Weight | Share |
|--------|--------|-------|
| Attack 3  | 2 | 29 % |
| Lunge 5   | 2 | 29 % |
| Empower 3 | 2 | 29 % |
| Recover 4 | 1 | 14 % |

Widest intent variety in the roster: four distinct intent kinds at near-equal probability.
Makes the fight feel genuinely unpredictable. Analyse (2B) is almost mandatory — knowing whether
a Lunge or Empower is coming changes the whole allocation. Recover 4 at 18 HP makes a long fight
very costly.

```
attackLine:  "swoops with outstretched talons"
lungeLine:   "dives with terrible purpose"
empowerLine: "tilts its head, studying you"
recoverLine: "rises to its perch, composing itself"
```

---

**Iron Beetle** `id: iron-beetle`

> *Huge, slow, nigh-impenetrable. Armored to the point of being a puzzle.*

| Field | Value |
|-------|-------|
| HP | 20 |
| Attack (flee) | 3 |
| Gold | 5–9 |

| Intent | Weight | Share |
|--------|--------|-------|
| Guard 5  | 4 | 67 % |
| Attack 3 | 1 | 17 % |
| Recover 4 | 1 | 17 % |

The dungeon's reminder that brute force has limits. Guard 5 two-thirds of the time means the
player is chipping through 5 block on most turns before dealing HP damage at all. Recover 4
compounds with the extreme HP. Teaching: Exploit (2B, bypasses Guard) and Lucky Shot (1Y,
bypasses Guard) are the efficient paths; pure Red fails here. The last fight before the boss
should feel like being asked to solve a puzzle with depleted resources.

```
guardLine:   "locks its carapace tight"
attackLine:  "drives forward like a battering ram"
recoverLine: "settles its weight, plates grinding"
```

---

### File structure

```
src/
├── combat/
│   ├── types.ts       ← modified: add EnemySpec, EnemyPersonality types
│   ├── roster.ts      ← new: ENEMY_ROSTER, spawnEnemy, getEnemySpec
│   ├── intents.ts     ← modified: remove GOBLIN, GOBLIN_INTENTS, and TODO-038 entries
│   └── encounter.ts   ← modified: combat entry reads tile.enemyId → getEnemySpec → spawnEnemy
├── map/
│   └── types.ts       ← modified: add enemyId?: string to TileCell
├── navigation/
│   └── room-selection.ts  ← modified: enemy tile placement writes enemyId
└── dungeon/
    └── tuning.ts      ← modified: add enemyTierWeights to DungeonTuning and DUNGEON_TUNING
```

`combat-panel.ts` (dev harness) currently hard-codes `{ ...GOBLIN }`. It should be updated to
use `spawnEnemy(ENEMY_ROSTER[0])` or similar so it still compiles after GOBLIN is removed.

---

## Open questions

*All blocking questions resolved — this item is READY.*

**Resolved for the record:**

- **Weighted random vs. fixed cycle for regular enemies.** Confirmed: weighted random (extending
  the existing `WeightedIntent` system). Fixed cycling is the boss's trick (feature 023); variety
  is the dungeon's. Longer pools on Tier-3 enemies make the fight hard to memorise without being
  scripted.

- **Full 12-creature roster or reduced starter set.** Confirmed: all 12 creatures from the
  concept doc. This is primarily a data feature — twelve `EnemySpec` entries plus one factory
  function. A reduced roster would halve the creature variety at launch for minimal implementation
  savings.

- **Enemy HP on re-entry after Flee.** Confirmed: enemy re-spawns at full HP. The Flee mechanic's
  `fled` tile flag already prevents an immediate re-entry fight per 037; by the time the player
  returns, a fresh encounter is appropriate and correct.

- **Run-depth window intent scaling.** Confirmed deferred to feature 029. Feature 038 defines the
  fixed base roster; 029 wires the cross-run escalation layer that unlocks harder intents for
  lower-tier enemies as the run counter climbs.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
