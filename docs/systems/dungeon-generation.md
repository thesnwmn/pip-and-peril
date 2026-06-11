# Dungeon Generation — As Implemented

**Source:** `src/dungeon/`, `src/map/`  
**Key files:** `src/dungeon/tuning.ts`, `src/map/` (tile model), `src/screens/game.ts` (placement logic)  
**Last updated:** 2026-06-11 (features 003, 004, 022)

---

## Overview

The dungeon is a **procedurally placed tile map** across three floors. Tiles are placed
lazily — when Pip approaches an unvisited exit, three room options are offered and the player
chooses one. There is no pre-generated floor layout; the dungeon grows as Pip explores it.

---

## Run Structure

A run spans three floors. Pip descends one-way — there is no returning to a previous floor.

| Floor | Character | Exit |
|---|---|---|
| 1 | Entry; simple intent enemies; shops guaranteed | Stairwell tile (unlocks at tile threshold) |
| 2 | Mid-game; escalating threats; second shop | Stairwell tile |
| 3 | Final gauntlet; Tier-3 enemies; boss gate | Boss room (only exit) |

**Stairwell unlock**: once `floorTilesPlaced` reaches the stairwell threshold (defined in
`DUNGEON_TUNING`), Stairwell becomes eligible as a room offer. Descending is a one-way
commitment — the card tease reads *"You won't come back up."*

**Boss gate**: on Floor 3, the Boss room's offer weight is the only available exit weight once
the exploration factor triggers. The boss lurks far from where Pip entered — the Manhattan
distance factor in `tuning.ts` ensures this.

---

## Tile Types

| Type | Colour | Encounter | Notes |
|---|---|---|---|
| Corridor | — | None | Silent passage; no log entry |
| Enemy | Red tint | Combat encounter | `enemyId` assigned at placement; respawns on re-entry unless fled |
| Item | Green tint | Item room encounter | Item fixed at placement; cleared after taking |
| Chest | Amber tint | Chest encounter | Variant (basic/locked/trapped) assigned at placement |
| Trap | — | Forced trap check | `trapDifficulty` assigned at placement; spent after first trigger |
| Shop | Gold tint | Shop encounter | One shop guaranteed per floor via debt mechanism |
| NPC | Blue tint | NPC encounter | Archetype assigned at placement |
| Stairwell | — | Floor transition | No encounter panel; handled directly by navigation |
| Boss | Dark red | Boss encounter | Floor 3 only; only available exit on floor 3 |

---

## Room Offer System

When Pip approaches an unvisited exit, three offers are drawn from the room type pool.

### Base weights

Base weights are looked up from a `(floor, depthPhase)` table in `DUNGEON_TUNING`. `depthPhase`
is `'early' | 'mid' | 'late'` computed from `floorTilesPlaced`:

- **Early**: shallow exploration — corridors and shops have higher weight
- **Mid**: mid-floor — enemy and item weight increases
- **Late**: deep — enemies, chests, traps are heaviest; shop weight drops to zero

### Runtime overrides (applied after base lookup, before normalisation)

Three overrides modify the weight table at draw time:

1. **Stairwell**: weight forced to 0 until `floorTilesPlaced >= stairwellThreshold`; thereafter
   its base weight applies.
2. **Shop debt**: shop weight forced to 0 after one shop is placed this floor; forced to
   `SHOP_DEBT_WEIGHT` (a high value) when the debt threshold is reached — guaranteeing exactly
   one shop per floor.
3. **Boss distance factor**: on Floor 3, Boss weight is multiplied by a factor combining tiles
   explored and Manhattan distance from the floor entry point. Near the entry point, boss weight
   is near zero. Far away and deep, it dominates.

After overrides are applied, weights are normalised and a weighted-random draw produces three
distinct offers.

### All constants live in `DUNGEON_TUNING`

`src/dungeon/tuning.ts` is the single source of truth for:
- Phase thresholds (early→mid, mid→late tile counts)
- Base weight tables by floor and phase
- Stairwell threshold
- Shop debt threshold and forced weight
- Trap difficulty ranges per floor and phase
- Enemy tier weight tables
- Boss distance factor parameters

No magic numbers should exist in placement or offer-generation logic outside this file.

---

## Tile Data Model

Each placed tile is a `TileCell`:

| Field | Type | Purpose |
|---|---|---|
| `type` | `TileType` | Room category (corridor, enemy, item, chest, trap, shop, npc, stairwell, boss) |
| `fogState` | `'hidden' \| 'revealed' \| 'visited'` | Fog of war state |
| `cleared` | `boolean` | Whether the encounter has been completed |
| `fled` | `boolean` | Whether Pip fled a combat here (prevents immediate re-entry encounter) |
| `enemyId` | `string?` | Enemy spec ID assigned at placement (enemy tiles only) |
| `trapDifficulty` | `number?` | Trap check difficulty assigned at placement |
| `itemId` | `string?` | Item spec ID assigned at placement (item room tiles) |
| `chestVariant` | `'basic' \| 'locked' \| 'trapped'?` | Chest type assigned at placement |
| `npcArchetypeId` | `string?` | NPC archetype ID assigned at placement |
| `shopItems` | `string[]?` | Item spec IDs stocked at placement; removes purchased entries |

The map is a sparse `GameMap` (a `Map<string, TileCell>` keyed by `"x,y"`). Only placed tiles
exist in the map; unexplored cells are absent.

---

## Fog of War

Three fog states:
- **Hidden**: tile not yet offered; not rendered on map
- **Revealed**: tile has been offered (player chose it or saw it as a non-chosen offer); tile
  type accent visible; room marker visible
- **Visited**: Pip has stepped on the tile; full rendering

Exit directions from Pip's current tile are always visible. Exits in fog (from unvisited adjacent
tiles) show a low-contrast "?" glyph on the map to indicate a navigable but unknown direction.

---

## Floor Transition

When Pip steps onto a Stairwell tile:
1. Floor counter increments (`floor: 1 | 2 | 3`)
2. Tile map is cleared (new sparse map)
3. A fresh corridor tile is placed at the map centre as the entry point
4. `floorEntryPosition` is updated
5. `shopPlacedThisFloor` flag resets to false
6. `floorTilesPlaced` resets to 0
7. A brief fade (~300ms) marks the transition visually

`totalTilesPlaced` continues to accumulate across floors (used by run-summary stats and as one
factor in the boss distance calculation on Floor 3).

---

## Depth Display

The status bar shows *"Floor N — Depth D"* where depth is the **Chebyshev distance** from the
floor entry position, not the absolute tile count or Manhattan distance. Chebyshev distance
(max of horizontal and vertical displacement) feels more natural on a grid — it matches the
player's intuitive sense of "how far from the stairs".
