# 022 · Dungeon Structure: Multi-Floor, Pacing & Boss Gate

**Status:** READY
**Source idea:** Manager request; `docs/concept.md` (Dungeon Structure)
**Depends on:** 004 (room offer logic). *(Note: 025 and 038 depend on this spec — 025 reads the `trapDifficulty` values set here; 038 fills the enemy tier slots defined in tuning. This item can ship with Goblin as the sole tier-1 entry and trap tiles placed but not yet triggering an encounter.)*

---

## Summary

Gives the dungeon a vertical structure and a sense of earned descent. Three floors replace the
current endless map. Each floor has a **depth-weighted room offer pool** that skews toward friendly
encounters near the start and hostile ones deeper in. Reaching the next floor requires finding a
**Stairwell** tile — a new room type that enters the offer pool once a per-floor exploration
minimum is met. Descending is one-way. On the final floor, the **Boss room** is the only exit:
it emerges past an exploration minimum and is weighted by Manhattan distance from the floor's
entry point, so it lurks far from where Pip arrived. A shop-debt mechanism guarantees exactly one
Shop per floor. All numeric constants — weight tables, thresholds, boss probability parameters,
trap difficulty ranges — live in a single `src/dungeon/tuning.ts` module; no magic numbers
elsewhere.

---

## Acceptance criteria

1. The dungeon always has exactly 3 floors. Floor 1 is the entry floor; Floor 3 is the final floor.

2. A **Stairwell** room type enters the offer pool on Floors 1 and 2 once `floorTilesPlaced` reaches
   `stairwellThreshold[floor]` (tuning). Stairwell is never offered on Floor 3 and never offered
   before that threshold.

3. Entering a Stairwell advances Pip to the next floor. Floor number increments; `floorTilesPlaced`
   resets to 0; the previous floor's map is discarded; Pip spawns on a fresh Corridor tile placed at
   the centre of the new map. Pip's HP, inventory, and gold carry over unchanged.

4. The player cannot return to a previous floor — there is no "stairs up" tile.

5. On Floor 3, there is no Stairwell. The Boss room is the only end trigger.

6. Room offers are drawn from a weight table keyed by `(floor, depthPhase)` (see tuning config).
   Across floors and phases: corridor weight decreases, enemy weight increases, trap weight
   increases. NPC and Shop base weights are low throughout.

7. The Boss room does not enter the offer pool on Floor 3 until
   `floorTilesPlaced ≥ BOSS_MIN_EXPLORATION` (tuning).

8. Once the exploration minimum is met, the Boss room weight for a candidate tile is:
   ```
   BASE_BOSS_WEIGHT × explorationFactor × distanceTierFactor
   ```
   where `explorationFactor` scales linearly from 0 at `BOSS_MIN_EXPLORATION` to 1.0 at
   `BOSS_MIN_EXPLORATION + BOSS_EXPLORATION_SCALE` (tuning), and `distanceTierFactor` is
   determined by the candidate tile's Manhattan distance from the Floor 3 entry position (where
   Pip descended from Floor 2).

9. Three distance tiers apply (all thresholds in tuning):
   - Distance < `BOSS_DIST_MIN`: factor 0 — boss impossible here.
   - `BOSS_DIST_MIN` ≤ distance < `BOSS_DIST_MID`: factor 0.10 — very unlikely.
   - `BOSS_DIST_MID` ≤ distance < `BOSS_DIST_OUTER`: factor 0.35 — somewhat likely.
   - distance ≥ `BOSS_DIST_OUTER`: factor 1.00 — most likely.

10. Each floor guarantees exactly one Shop: once a Shop tile is placed on the current floor, Shop
    weight drops to 0 for that floor. If no Shop has appeared by `SHOP_DEBT_THRESHOLD[floor]` tiles
    placed (tuning), Shop weight spikes to `SHOP_DEBT_WEIGHT` (tuning) until one is placed.

11. When a Trap tile is placed, a `trapDifficulty` integer is assigned from the range
    `trapDifficultyRange[floor][depthPhase]` (tuning). This value is stored on the tile and passed
    to the Trap encounter handler (feature 025).

12. A dedicated module `src/dungeon/tuning.ts` exports a single `DUNGEON_TUNING` constant
    containing all numeric values listed in the Design detail. No dungeon-pacing number appears
    outside this module.

13. The status bar displays floor number and per-floor depth: e.g. **"Floor 2 — Depth 7"** where
    depth is Pip's Chebyshev distance from the current floor's entry tile.

---

## Scope / non-goals

- **No new enemy types.** Weight tables reference enemy tiers (tier-1, tier-2, tier-3) but the
  specific creatures and stats are defined in feature 038.
- **No floor-transition screen or ceremony.** Descending a Stairwell is a quiet navigation event;
  the run-summary screen (024) is the payoff moment at the end.
- **No cross-floor map.** The Satchel Map tab remains a stub.
- **No other end triggers.** Boss room is the only exit from Floor 3 for now; the architecture
  supports future additions (see Design detail).
- **No difficulty modes.** All tuning values are fixed per the config; no runtime slider.
- **Run state is not persisted to disk.** In-memory only, as today.

---

## Design detail

### Run state additions

The following fields are added to (or replace fields in) the run's mutable state:

```
floor: 1 | 2 | 3            — current floor, starts at 1
floorTilesPlaced: number     — tiles placed on this floor since descent, starts at 0
totalTilesPlaced: number     — cumulative across all floors (for run summary / 024)
floorEntryPosition: {x, y}  — map coords of the tile Pip landed on when descending
                               (floor 1: the starting Corridor; floors 2–3: the tile
                               below the Stairwell Pip just descended)
shopPlacedThisFloor: boolean — resets to false on descent
```

The existing `depth` display (Chebyshev distance from start — AC 1 of feature 004) continues but
now measures from `floorEntryPosition` instead of the absolute map origin.

### Stairwell tile type

`RoomType.Stairwell` is added alongside the existing types. It behaves as follows:

- **Availability:** enters the offer pool when `floorTilesPlaced ≥ TUNING.stairwellThreshold[floor]`. Before that, its weight is forced to 0.
- **Offer weight:** drawn from the weight table; modest, comparable to Item.
- **On entry:** no encounter panel. Navigation logic handles it directly:
  1. `floor++`; `floorTilesPlaced = 0`; `shopPlacedThisFloor = false`.
  2. Clear all placed tiles. Place a single fresh Corridor tile at map centre as the new floor's entry tile.
  3. Record `floorEntryPosition` = new Corridor's coords.
  4. Move Pip to that tile.
  5. Log entry: *"Pip descends deeper…"* (floor 1→2) or *"The third floor. The air is wrong."* (floor 2→3).

Floor 3 has no Stairwell. The weight is forced to 0 if `floor === 3`.

### Room offer weight system

Room offer weights are a function of `(floor, depthPhase)` plus runtime overrides.

**Depth phase** is computed from `floorTilesPlaced`:

```
depthPhase:
  'early'  if floorTilesPlaced < TUNING.phaseThresholds[floor].mid
  'mid'    if floorTilesPlaced < TUNING.phaseThresholds[floor].late
  'late'   otherwise
```

The base weight for each room type is looked up from `TUNING.roomWeights[floor][depthPhase]`.
Three runtime overrides are then applied before the pool is normalised:

| Override | Rule |
|---|---|
| **Stairwell** | Force weight 0 if below stairwell threshold or on Floor 3 |
| **Shop** | Force weight 0 if `shopPlacedThisFloor`; spike to `SHOP_DEBT_WEIGHT` if `floorTilesPlaced ≥ SHOP_DEBT_THRESHOLD[floor]` |
| **Boss** | Force weight 0 until conditions met; compute dynamically per AC 8–9 when conditions are met |

The weights are then normalised and used for the pick-3 draw. The pick-3 logic from feature 004 is
otherwise unchanged.

### Boss placement algorithm (Floor 3 only)

The boss weight for a given candidate tile direction is computed at draw time:

```
bossTileWeight(candidateCoords):
  if floor ≠ 3  → 0
  if floorTilesPlaced < BOSS_MIN_EXPLORATION  → 0

  d = manhattanDistance(candidateCoords, floorEntryPosition)
  if d < BOSS_DIST_MIN  → 0

  tierFactor =
    0.10  if d < BOSS_DIST_MID
    0.35  if d < BOSS_DIST_OUTER
    1.00  otherwise

  explorationFactor =
    clamp((floorTilesPlaced - BOSS_MIN_EXPLORATION) / BOSS_EXPLORATION_SCALE, 0, 1)

  → BASE_BOSS_WEIGHT × explorationFactor × tierFactor
```

Because each of the three offered directions targets a different candidate tile, their boss weights
differ — a direction that would push farther from the entry has a higher chance of producing a Boss
card than a direction that doubles back.

**Expected run variation on Floor 3:** A player who explores moderately (18–25 tiles) and pushes
outward will typically encounter the first Boss offer somewhere between tiles 15 and 22, at a
distance of 5–9 from the entry stairwell. A speed-run (beelining outward) can trigger it at
~tiles 12–15 but only in the outer distance band; a thorough explorer (30+ tiles) sees Boss offers
at nearly every outer tile. The parameters below produce this spread.

### Shop guarantee

On each floor descent:
1. `shopPlacedThisFloor` resets to `false`.
2. Shop offers draw their base weight from the weight table as normal.
3. Once a Shop is placed: `shopPlacedThisFloor = true`; Shop weight is forced to 0 for the rest of the floor.
4. If `floorTilesPlaced` reaches `SHOP_DEBT_THRESHOLD[floor]` with no shop placed, Shop weight is
   overridden to `SHOP_DEBT_WEIGHT` (a high value that dominates the pool), guaranteeing a Shop
   offer on the next tile draw.

### Trap difficulty

When a Trap tile is placed, assign:
```
trapDifficulty = randomInt(
  TUNING.trapDifficultyRange[floor][depthPhase].min,
  TUNING.trapDifficultyRange[floor][depthPhase].max   // inclusive
)
```

Store `trapDifficulty` on the `TileCell`. When Pip enters the tile, pass it to the trap encounter
handler (feature 025) as the check difficulty. The trap type/flavour is fixed per the encounter
handler; only this difficulty value scales with depth.

### End trigger extensibility

The Boss room is today's only end trigger on Floor 3. The weight-override architecture intentionally
leaves room for others: a new end trigger is added by registering a new room type, writing its
weight-override function (mirroring `bossTileWeight`), and adding it to the normalisation step.
Nothing else in the pacing system changes.

---

## Tuning config

All values live in `src/dungeon/tuning.ts`, exported as a single `const DUNGEON_TUNING` object.
The Engineer must not place dungeon pacing numbers anywhere else.

### Phase thresholds (tiles placed on floor before phase advances)

| Floor | Early → Mid | Mid → Late | Stairwell available |
|---|---|---|---|
| 1 | 8 | 15 | 8 |
| 2 | 8 | 16 | 10 |
| 3 | 10 | 20 | n/a |

### Room weight tables

Weights are relative integers; the engine normalises the pool before drawing.
`*` = governed by runtime override, not this table.

**Floor 1**

| Room type | Early | Mid | Late |
|---|---|---|---|
| Corridor | 50 | 42 | 35 |
| Enemy (tier 1) | 18 | 24 | 30 |
| NPC | 8 | 5 | 3 |
| Item | 10 | 10 | 10 |
| Chest | 3 | 5 | 7 |
| Trap | 3 | 7 | 10 |
| Shop | 8 | 7 | 5 |
| Stairwell | 0* | 8 | 7 |
| Boss | 0 | 0 | 0 |

**Floor 2**

| Room type | Early | Mid | Late |
|---|---|---|---|
| Corridor | 40 | 35 | 28 |
| Enemy (tier 1–2) | 28 | 35 | 42 |
| NPC | 5 | 4 | 3 |
| Item | 10 | 10 | 9 |
| Chest | 5 | 7 | 9 |
| Trap | 5 | 8 | 12 |
| Shop | 7 | 6 | 5 |
| Stairwell | 0* | 7 | 6 |
| Boss | 0 | 0 | 0 |

**Floor 3**

| Room type | Early | Mid | Late |
|---|---|---|---|
| Corridor | 30 | 25 | 20 |
| Enemy (tier 2–3) | 38 | 44 | 50 |
| NPC | 4 | 3 | 2 |
| Item | 10 | 9 | 7 |
| Chest | 7 | 9 | 10 |
| Trap | 8 | 12 | 15 |
| Shop | 6 | 5 | 4 |
| Stairwell | 0 | 0 | 0 |
| Boss | 0* | algorithm* | algorithm* |

### Boss placement parameters

| Parameter | Value | Meaning |
|---|---|---|
| `BOSS_MIN_EXPLORATION` | 12 | Floor 3 tiles placed before boss enters pool |
| `BOSS_EXPLORATION_SCALE` | 15 | Tiles beyond minimum to reach `explorationFactor = 1.0` (full weight at tile 27) |
| `BASE_BOSS_WEIGHT` | 30 | Weight ceiling when both factors are 1.0 |
| `BOSS_DIST_MIN` | 4 | Min Manhattan distance from floor-3 entry — below this, boss weight is 0 |
| `BOSS_DIST_MID` | 6 | Start of mid-tier (factor 0.35) |
| `BOSS_DIST_OUTER` | 8 | Start of outer tier (factor 1.00) |

### Shop guarantee parameters

| Parameter | Value |
|---|---|
| `SHOP_DEBT_THRESHOLD` | [14, 12, 10] (floors 1, 2, 3) |
| `SHOP_DEBT_WEIGHT` | 60 |

Lower debt thresholds on higher floors ensure the shop feels accessible even on shorter floors.

### Trap difficulty ranges (min–max, inclusive)

| | Early | Mid | Late |
|---|---|---|---|
| Floor 1 | 1–2 | 1–3 | 2–4 |
| Floor 2 | 2–4 | 3–5 | 4–6 |
| Floor 3 | 4–6 | 5–7 | 6–9 |

---

## Visual design

### New color tokens

These tokens formalise room types that existed in the concept but lacked hex values, and add
Stairwell.

| Token | Value | Used for |
|---|---|---|
| `--room-chest` | `#7a5510` | Chest room border / tint (amber, matching concept description) |
| `--room-trap` | `#6a2c10` | Trap room border / tint (rust-orange — dangerous, distinct from enemy red) |
| `--room-stairwell` | `#0a2a3a` | Stairwell room border / tint (deep teal — transitional, downward feeling) |

### Stairwell tile appearance

The tile uses the dungeon biome palette with `--room-stairwell` as its border/tint. The interior
depicts stone steps descending into shadow — a downward staircase motif. The room selection card
label reads **"Stairwell"** with the tease: *"Descend to floor N+1. You won't come back up."*
(where N is the current floor number).

No encounter panel is needed. The floor transition resolves entirely as a navigation event
(see Design detail — Stairwell tile type).

### Status bar update

Format: **"Floor N — Depth D"** where N is the floor number (1–3) and D is Pip's Chebyshev
distance from `floorEntryPosition`. This replaces the previous "FLOOR 1 — Depth N" layout from
feature 004, preserving the same two-part format with updated origin point.

---

## Open questions

No blocking questions. Two minor implementation choices left to the Engineer:

- **Floor transition visual:** a brief fade-to-black and fade-in (~300 ms, matching encounter panel
  timing) is recommended; a snap cut is also acceptable.
- **New floor starting tile position:** recommend map canvas centre, consistent with Floor 1 start.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
