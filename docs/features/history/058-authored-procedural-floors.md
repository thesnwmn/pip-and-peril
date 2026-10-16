# 058 · Authored-Procedural Floors

**Status:** READY
**Source idea:** Idea 058 (`IDEAS.md`); manager request (2026-06-11); `docs/concept/run-architecture.md`
**Depends on:** feature 003 (Tile Map Core — renderer/fog), feature 022 (multi-floor structure & boss gate). **Ratifies a new decision** (navigation model: tile-*drafting* → route-*reading*; next free register number, currently **D33**).

## Summary

Replace player tile-drafting (feature 004) with **floors generated complete and hidden under fog
before Pip enters**. Navigational agency moves from *conjuring tiles one card at a time* to *reading
and routing through a place that already exists*. A floor becomes a **generated object** — a shape,
a beat skeleton, and a depth-weighted population — produced up front by a seeded generator and
revealed progressively as Pip moves. The renderer, camera, snapping invariant, encounter registry,
and multi-floor descent all survive untouched; what retires is narrow — the room-selection card UI
and the on-choice placement logic.

This is the **foundation** every later floor feature stands on: shapes (059), living floors —
roamers & Sources (060), the Dungeon Stirs (061), squeeze tiles (083), and gates & keys (064) all
require a floor that exists ahead of Pip. 058 ships the **generator engine + the navigation/fog
migration + a validity contract**, with two contrasting shapes (Gauntlet, Hub) to prove the
pipeline. Everything richer is deferred to its own backlog item; 058 leaves the seams open for them.

The player value: the dungeon stops being a hallway that peels back in front of you and becomes a
**real branching place you outwit** — every junction a readable fork, every step forward a small
committed gamble about what the fog is hiding.

---

## The reveal model (the load-bearing decision)

Killing drafting removes the channel by which tiles used to become "seen" (a non-chosen offer card).
So the central design question of this feature is **what Pip sees through the fog of an authored
floor** — because the entire rationale for the change is that routing must be an *informed* choice,
not a blind walk down a corridor. The model, decided with the manager:

> **Geometry is glimpsed; type and contents are earned by entering; memory goes stale on leaving.**

A glimpse tells you *the shape of the choice* (does this branch fork? is it a likely dead end?) but
never *what's waiting* (it could be a trap, a shop, an ambush). You commit to a room to learn its
nature. And once you leave a room your knowledge of it is **stale** — rendered dimmed — because in a
living dungeon something may have moved into it since (the seam that 060 lights up).

### Four-tier knowledge model

| Tier | When | What Pip knows | Render treatment |
|---|---|---|---|
| **Hidden** | Never glimpsed | Nothing | Void / dark (unchanged) |
| **Glimpsed** | Adjacent (through an open exit) to a tile Pip has reached; never entered | *Partial geometry only:* the shared doorway and the **side exits** (perpendicular to approach). **Not** the far/straight-on exit, **not** the room type, **not** contents. | Tile drawn with a fog gradient fading from the shared doorway; side openings legible; far edge dissolves into fog; **no type accent, no props** |
| **Live** | Within Pip's current reveal radius | Everything — full layout, type accent, contents as encountered | Full bright render (unchanged) |
| **Remembered** | Entered before; now outside the radius | Full layout **and** type (you were there) — but the information is *stale* | Full render, **dimmed/desaturated** to signal "no longer live" |

The crisp rule the renderer obeys for a **Glimpsed** tile, given the approach direction (the side
facing the live tile that revealed it): **show the shared doorway and the two perpendicular (side)
exits; fog the collinear far exit and the interior.** This is the literal expression of the
manager's framing — *"you can see a corridor goes left and/or right, but not whether there's a
straight-on path."* Knowledge is **persistent**: a tile never regresses to a lower tier (glimpsed
stays at least glimpsed; entered stays at least remembered).

---

## Acceptance criteria

The contract. Grouped for clarity; all are testable.

**Generation — a floor is a complete object, made up front**

1. On entering a floor (floor 1 at run start via `initDungeon`; floors 2–3 via `descendFloor`), the
   **entire floor is generated before Pip can move** — every tile that will exist on that floor is
   placed, typed, and populated at generation time. No tile is created in response to player movement.
2. Generation is **seeded and deterministic**: the same `(runSeed, floorNumber)` produces the same
   floor. A floor's RNG is derived from the run seed, not global `Math.random`, so floors are
   reproducible (enables deterministic tests now, and the Scout visitor / shareable runs later).
3. The generator runs the **four-layer pipeline** in order — *shape → beat skeleton → population →
   motif/dressing* (see Design detail). Layers are orthogonal: changing the shape does not change how
   population is drawn, and vice-versa.
4. 058 ships **two contrasting shapes**: **Gauntlet** (mostly-linear spine; the boss-approach feel)
   and **Hub/Wheel** (central chamber + spokes; the routing showcase). Shapes are chosen by a
   depth/biome-weighted draw, never uniform-random. (The wider catalogue is feature 059.)
5. **Grid dimensions are a per-floor output of the generator**, sized to the chosen shape — not a
   fixed global. A tight Hub may use a small canvas; a sprawling shape a larger one. The 13×13
   constant in today's `initDungeon` is removed in favour of generator-chosen `width`/`height`.

**Fog — the four-tier knowledge model**

6. `FogState` extends to four tiers: `hidden | glimpsed | live | remembered` (replacing today's
   `hidden | seen | visible`). Knowledge is persistent and monotonic — a tile never drops to a lower
   tier.
7. On each Pip step, fog updates so that: Pip's tile and reveal radius become **live**; tiles that
   were live and are now outside the radius become **remembered**; every open-exit neighbour of a
   live tile that has not yet been entered becomes **glimpsed**.
8. A **glimpsed** tile renders *partial geometry only*: the shared doorway and perpendicular side
   exits are legible; the collinear far exit and the interior dissolve into fog. It shows **no room-
   type accent, no props, no contents** — the player cannot tell a glimpsed room's nature.
9. A **remembered** tile renders its full known layout and type, **dimmed** relative to live tiles,
   to signal the knowledge is stale. (No room *state* actually changes on revisit in 058; this is the
   visual language only, pre-wiring 060.)
10. Room **type and contents are revealed only on entry** — never by glimpsing. The encounter trigger
    fires on entry exactly as today.

**Migration — retire drafting, keep everything else**

11. The room-selection card UI, card teases, and the `uiState: 'choosing'` / `pendingDir` /
    `offerings` flow are **removed**. Picking a direction always *moves* Pip (there is no "choose a
    room type" step).
12. A direction control is **available iff the current tile has an open exit that way**, read from the
    generated tile. Moving into any adjacent existing tile (forward or backtracking) is a plain move.
13. The **renderer, camera, snapping invariant, fog-of-war machinery, encounter registry, all
    encounter panels, satchel, menu, and floor-transition fade are unchanged** in behaviour. Every
    existing encounter type (enemy, item, shop, chest, trap, NPC, boss) triggers on the entered tile
    exactly as before, because tile types are now assigned at generation instead of at placement.
14. Floor exits are **placed by the generator**, not weight-driven: floors 1–2 contain exactly one
    **stairwell** at the far end of the spine; floor 3 contains the **boss room** as its sole exit,
    placed at the spine terminus. The "boss lurks far from entry" guarantee becomes a placement rule.

**Validity contract — every generated floor is sound**

15. **Connected:** every placed tile is reachable from the entry tile through open exits.
16. **Snapping-correct:** every shared edge between two adjacent tiles has matching exits on both
    sides (no doorway facing a wall; no wall facing a doorway). Out-of-bounds edges are always walls.
17. **Solvable:** the floor exit (stairwell / boss room) is reachable from the entry tile. There are
    **no soft-locks** — no mandatory blocker without a guaranteed on-floor solution. (058 has no gates,
    so this is trivially met; the criterion is stated so the generator is built soft-lock-safe.)
18. **One shop per floor** is preserved (the existing guarantee), placed during population.
19. **Minimum meaningful choice:** a floor presents at least **two genuine forks** (a tile where Pip
    can go more than one un-backtracking way), so navigation never degenerates into a single hallway —
    except a deliberately linear boss-approach floor, which may waive this.
20. If a generated candidate violates any invariant, the generator **rejects and regenerates** (with a
    new sub-seed, bounded retries) rather than emitting an invalid floor. A generator unit test asserts
    invariants 15–19 hold across many seeds.

---

## Scope / non-goals

What 058 explicitly does **not** include — each is an existing, separately-tracked item, and 058
leaves its seam open:

- **The wider shape catalogue** (Spiral, Warren, Long Hall, Split Level, The Logical Place) — feature
  **059**. 058 ships Gauntlet + Hub and the template *mechanism* they plug into.
- **Living floors** — roaming enemies and Sources/spawners — feature **060**. 058 produces and retains
  the floor's **skeleton** (spine, spurs, beat slots, dead-end caps) on the floor state as named
  positions, but does **not** attach or move anything along it.
- **The Dungeon Stirs** (soft escalation by rooms-entered) — feature **061**.
- **Gates & keys** and any objective layer (errands, the Keystone, floor mutation) — features **064** /
  `floor-objectives.md`. The validity contract is built soft-lock-safe so gates can land without
  reworking it.
- **Squeeze tiles** (Pip-only shortcuts) — feature **083**.
- **Foreshadowing beyond the adjacent glimpse** — distant hints, the Overlook, the across-the-gap boss
  glimpse (Idea 011) — out. 058's read-ahead is exactly one tile deep.
- **A filled boss motif** (Idea 062). The generator takes a **motif parameter** that *can* bias shape,
  props, and population weights, but 058 ships a single neutral `dungeon` motif that biases nothing.
  Wiring only; no themed content.
- **Larger run-structure changes** — floor *count* stays at three (D16); per-biome floor count is a
  biome concern (084–087), not this item.

---

## Design detail

### The generation pipeline

```
  seed = hash(runSeed, floorNumber)          deterministic per floor
        │
        ▼
  1. SHAPE        pick a shape template (depth/biome/motif-weighted)
        │         → a skeleton GRAPH: spine (entry→exit path) + spur attach points
        ▼
  2. EMBED        lay the skeleton onto a generator-sized grid as snapping-correct
        │         tiles; place entry tile; place exit (stairwell / boss) at spine end
        ▼
  3. BEATS        mark each skeleton node as encounter-beat | connective-corridor |
        │         rest; spine ≈ 3–5 beats, spurs add ≈ 2–4 (the pacing budget)
        ▼
  4. POPULATE     fill each beat with a concrete room type + contents using the
        │         existing (floor, depthPhase) weight tables; honour one-shop & exit rules
        ▼
  5. DRESS        apply biome palette + motif (neutral in 058) → props/archetype bias
        │
        ▼
  6. VALIDATE     assert the contract (criteria 15–19); reject & re-seed on failure
```

- **Generation method.** *Shape-template + procedural population* (the `run-architecture.md`
  recommended model), because it reuses the existing weighting machinery (`room-pool.ts` /
  `DUNGEON_TUNING`) directly. Hand-authored set-piece rooms stitched by corridors (the Hades/Spelunky
  model) is a *later* layer, not 058.
- **Shape templates as data.** A shape is a small declarative description (a spine length range, spur
  count/attachment rules, a branch-factor target, a preferred grid envelope) — *not* hand-placed
  tiles. The Engineer chooses the representation, but new shapes should be **data, not new code paths**
  (the orthogonality that makes 059 cheap). Gauntlet ≈ a long spine with 0–1 short spurs; Hub ≈ a
  central chamber node with 3–4 spokes, one spoke carrying the exit.

### Depth phase comes from topology, not wandering

Today `depthPhase` (`early|mid|late`) is computed from `floorTilesPlaced` — i.e. how much the player
has wandered. With the whole floor authored, **phase is a property of position on the spine**: tiles
near the entry are `early`, mid-spine are `mid`, near the exit are `late`; a spur inherits the phase
of its attachment point. The existing weight semantics are unchanged (shallow → corridors/shops/NPCs;
deep → enemies/chests/traps; shop weight zero when late) — they're just anchored to *authored depth*
instead of *exploration count*, which makes difficulty fair and authored rather than emergent from how
much the player dawdled. This also honours the **Complication Curve** (`run-architecture.md`): the
generator should introduce at most one *new-this-run* threat kind per floor, biasing early beats toward
already-taught content. (Full one-new-thing budgeting is refined alongside 060/061; 058 respects it via
the depth-weighted pools it already uses.)

### The migration map (what changes, concretely)

| Module | Fate |
|---|---|
| `src/map/renderer.ts` | **Kept.** Extended only to render the two new fog treatments (glimpsed-edge gradient, remembered-dim). |
| `src/map/fog.ts` | **Reworked.** `computeFog` implements the four-tier monotonic model (criteria 6–9) instead of the radius-demote-to-`seen` model. |
| `src/map/types.ts` | `FogState` → `hidden | glimpsed | live | remembered`. `TileCell` unchanged (its fields are already assigned at placement; now assigned at generation). |
| `src/navigation/dungeon-state.ts` | `initDungeon` calls the generator. Remove `uiState:'choosing'`, `pendingDir`, `offerings`. `floorTilesPlaced` retires as a placement driver (phase now derives from spine position); `shopPlacedThisFloor` is satisfied at generation. Add `floorSeed`; retain the floor **skeleton** (spine/spurs/beats/caps) for later features. Grid dims become generator output. |
| `src/navigation/room-selection.ts` | **Mostly retired.** `generateOfferings`/`placeRoom`/card teases go. `validExitConfigs` snapping logic is **reused** by the generator's embed step. `descendFloor` keeps its responsibilities (increment floor, fade, reset per-floor flags) but now *generates* the next floor instead of seeding a single corridor. |
| `src/navigation/room-pool.ts` / `src/dungeon/tuning.ts` | **Kept and reused** at population time. Weight tables and `getDepthPhase` semantics survive; `getDepthPhase` is fed spine position instead of tiles-placed. |
| `src/navigation/panel.ts` | Card-offer UI + teases removed. Direction buttons + whisper log kept; dir buttons always *move* (no `fog`/`choosing` branch), lit only where an open exit exists. |
| `src/navigation/movement.ts` | **Kept.** Movement into adjacent existing tiles; triggers fog recompute + encounter check as today. |
| `src/screens/game.ts` | `onDirButton` collapses to "move" only (the `'fog'`→`'choosing'` branch and `onCardChosen` go). Everything else (encounter registration, satchel, menu, transition fade, run summary) untouched. |
| New: `src/dungeon/floor-generator.ts` (+ shape templates) | The pipeline above. Single source of a floor. |

### The positioning seam (for 060 / 064 / objectives)

The generator already *knows* the floor's structure — spine path, spur branches, beat slots, dead-end
caps. 058 should **retain that skeleton on the floor state** as named positions rather than discarding
it after population. 058 itself does not read it, but it is the attach surface later features need: a
Source wants a spur cap, a roamer wants a patrol path along the spine, a gate wants a spur entrance, an
Errand target wants a beat slot. Building the generator to *emit and keep* its skeleton (instead of
only the flat tile grid) is the difference between 060/064 being additive and being a rewrite. Keep it
lightweight — a list of typed positions, not a system.

### Edge cases

- **Tiny floors / degenerate shapes.** The branch-factor invariant (19) and bounded retries (20)
  prevent a single-hallway floor; if a shape cannot satisfy its own branch target after N retries, fall
  back to the other shipped shape rather than emit something invalid.
- **Backtracking.** Always allowed (every tile already exists). Re-entering a cleared room re-triggers
  nothing (existing `cleared`/`fled` semantics hold). A remembered tile stays remembered until Pip is
  back in radius, when it returns to live.
- **Floor 3 boss placement.** The boss room is the spine terminus and the only exit; the generator must
  guarantee no alternative exit exists and the boss is reachable.
- **Reveal radius at entry.** The entry tile and its glimpse ring are revealed immediately on floor
  start, so the player always has at least one readable choice on arrival.
- **Determinism vs. in-encounter randomness.** Only *floor layout/population* is seeded. Combat dice and
  in-encounter rolls stay live-random; seeding is for the map, not the fight.

---

## Visual design

The map screen layout, camera, and panel are unchanged. What's new is **three fog treatments** beyond
hidden. The wireframe shows Pip at a junction reading his options:

```
   MAP VIEWPORT (portrait)                Legend
  ┌───────────────────────────┐
  │  ░░░░░░   ╔═════╗          │   ╔═══╗  LIVE — full bright render,
  │  ░░░░░░   ║ ?   ║ ◄glimpsed│   ║   ║         type accent + contents
  │  ░░░░░░   ╚══╦══╝  (left   │   ╚═══╝
  │           ┌──╨──┐  fork    │
  │   remembered   │  visible, │   ┌─ ─┐  GLIMPSED — side exits legible,
  │  ┌╌╌╌╌┐  │ Pip │  far exit │   ╎ ? ╎          far exit + type fogged,
  │  ╎    ╎──┤ (P) ├── fogged) │   └╌ ╌┘          no accent
  │  └╌╌╌╌┘  └──┬──┘           │
  │  (dimmed,   │  ╔═════╗     │   ┌┄┄┄┐  REMEMBERED — full layout,
  │   stale)    └──║ ?   ║     │   ┆   ┆           dimmed/desaturated,
  │                ╚═════╝     │   └┄┄┄┘           "info is stale"
  │  ░░░░░  HIDDEN (void)      │
  └───────────────────────────┘   ░░░░  HIDDEN — void, never glimpsed
```

A glimpsed tile reads as a doorway you're peering through: the opening you'd enter by and the
left/right branches are drawn; the back of the room and any straight-on exit fade into fog. No colour
accent is shown, so the player learns the *shape* of the choice without its *nature*.

**Color / render tokens** (extend the palette in `docs/concept/overview.md`; values are starting
points for the Engineer to tune against the existing fog rendering):

| Token | Value | Used for |
|---|---|---|
| `--fog-glimpse-edge` | `rgba(13,13,26,0.55)` | The gradient that fades a glimpsed tile from doorway to fog (over `--bg`) |
| `--fog-glimpse-stroke` | `#3a3550` | Faint outline of legible glimpsed exits/walls |
| `--tile-remembered-dim` | `0.55` (alpha multiplier) | Brightness/saturation multiplier applied to a remembered tile's normal render |

No new typography. Room-type accent colours, props, and tile archetypes are the existing tokens —
the only change is *which fog tier permits them to draw* (live and remembered: yes; glimpsed: no).

---

## Open questions

None blocking — the spec is `READY`. Residual tuning items, all safe to resolve in build/play-test:

- **Reveal radius.** Today's fog uses a fixed radius; confirm it stays 1 (Pip's tile + orthogonal
  neighbours glimpsed) or widens. Recommend keeping today's radius for parity; tune in play-test.
- **Glimpse persistence brightness.** Whether a glimpsed tile that is *currently* adjacent reads
  slightly brighter than one glimpsed-then-walked-away-from. Recommend identical (one glimpsed
  treatment) for 058; a "currently-in-sight" brighten is a nice-to-have, not required.
- **Beat-budget numbers.** Spine 3–5 / spurs 2–4 and the per-shape grid envelopes are un-playtested
  arithmetic (acknowledged in `run-architecture.md`). They live in tuning data and are dials, not
  contract.
- **Shape weighting by floor.** Initial split between Gauntlet and Hub across floors 1–3 (e.g. Hub
  earlier for breathing room, Gauntlet for the floor-3 boss approach). A tuning-table choice.

---

## Shipped

**Date:** 2026-06-20
**Branch:** `claude/authored-procedural-floora-400hfc`
**PR:** #TBD

### What was built

- **`src/dungeon/floor-generator.ts`** (new): seeded deterministic floor generator with two shapes (Gauntlet: linear spine + 2 spurs; Hub: center chamber + 4 spokes). Uses xorshift32 RNG keyed on `(runSeed * 1000 + floor * 7 + attempt * 13)`. `validate()` enforces BFS connectivity, snapping correctness, stairwell/boss presence, exactly 1 shop, ≥1 fork. 5 attempts per floor with gauntlet fallback.
- **`src/map/types.ts`**: `FogState` changed from `'hidden' | 'seen' | 'visible'` to `'hidden' | 'glimpsed' | 'live' | 'remembered'`.
- **`src/map/fog.ts`**: Rewritten for 4-tier monotonic model — `live→remembered`, radius sets `live` on non-null cells, glimpses open-exit neighbors of live cells.
- **`src/map/renderer.ts`**: Added `'glimpsed'` rendering block (wall shell + exit corridors + 72% fog overlay, no archetype/accent). `'remembered'` uses `rgba(13,13,26,0.45)` dimming.
- **`src/navigation/dungeon-state.ts`**: `initDungeon` now calls `generateFloor`; `DungeonState` gains `runSeed` and `skeleton`; retires `uiState`, `pendingDir`, `offerings`, `floorTilesPlaced`, `totalTilesPlaced`, `shopPlacedThisFloor`, `RoomOffering`.
- **`src/navigation/room-selection.ts`**: `descendFloor` calls `generateFloor`; `generateOfferings` and `placeRoom` removed.
- **`src/navigation/movement.ts`**: `exitState` now uses fog state (live/remembered → back; hidden/glimpsed → fog; null neighbor → none). `availableDirs` removed.
- **`src/navigation/panel.ts`**: Card-drafting UI removed; always draws direction cross.
- **`src/screens/game.ts`**: `onDirButton` simplified; stairwell descend triggered by stepping, not card choice.

**Bug fixed during build:** `const W = 13` inside `buildGauntlet` shadowed the imported `W = 8` (West direction), causing `DELTA[13] = undefined` at runtime. Fixed by renaming to `GW/GH`.

### Tests

- All 706 tests pass (`npm run test`).
- Typecheck clean (`npm run typecheck`).
- Build clean (`npm run build`).
- Updated: `fog.test.ts`, `renderer.test.ts`, `dungeon-state.test.ts`, `movement.test.ts`, `room-selection.test.ts`, `items.test.ts`.

### Play-test steps

1. Start a new run — the floor should be pre-generated (multiple rooms visible as glimpsed via exit corridors from start).
2. Navigate in any valid direction — new rooms reveal as live on entry, departed rooms dim to remembered.
3. Walk into a fog exit — the button should show as amber (fog state); enter it and the room reveals.
4. Descend via stairwell — floor 2 generates immediately with Pip at its start room.
5. Confirm fog panel: only the direction cross appears (no card tray), regardless of where Pip is.
