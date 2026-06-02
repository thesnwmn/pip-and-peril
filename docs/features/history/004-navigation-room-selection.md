# 004 · Navigation & Room Selection

**Status:** READY
**Source idea:** manager request
**Depends on:** 003 (Tile Map Core), 002 (Game Bootstrap)

## Summary

Brings the dungeon to life: the Game screen becomes a fully interactive, player-built dungeon
exploration loop. Pip begins on a Start tile at the map centre; the player taps directional exits —
shown as gold arrows on adjacent unknown tiles — to explore. Moving toward an unknown tile opens a
room selection panel in the lower screen showing three playing-card-style choice cards, each with
the room's name, a rendered tile preview, and a one-line atmospheric tease. Choosing a card places
the tile and moves Pip there. A compact event log below the map records notable moments — enemy
snarls, distant coin-clinking, a whispered warning — but stays silent for corridors and backtracking.
The status bar at the top shows the floor label and current depth; map and log remain visible at
all times.

## Acceptance criteria

1. The status bar zone at the top of the Game screen (same pixel height as the "← Quit Run" link
   zone from 002) contains three elements drawn at the same vertical centre: "← Quit Run" back
   link (left), a floor label "FLOOR 1" (centre), and a depth counter "Depth N" (right) where N is
   the Chebyshev distance of Pip's current grid position from the start tile.

2. Tapping "← Quit Run" navigates to the Home screen (unchanged from 002).

3. The dungeon initialises with a 13 × 13 `GameMap` (same grid dimensions as 003), a single Start
   tile at `(col=6, row=6)` with exits `N|E|S|W`, all other cells null. Pip starts at `(6, 6)`.
   Fog is computed from that position. One log entry appears on init: a system-coloured message
   "Pip descends into the dungeon…".

4. In **IDLE** state: a gold directional nav arrow is drawn on each adjacent null tile that is
   reachable from Pip's tile — i.e. Pip's tile has an exit bit set in that direction and the
   neighbour grid position is in bounds.

5. In IDLE state, tapping a tile that has a nav arrow transitions to **CHOOSING** state for that
   direction. The room selection panel appears.

6. In IDLE state, tapping an adjacent tile that is already placed, where Pip's tile has an exit in
   that direction and the neighbour has the reciprocal exit, moves Pip there silently (no log
   entry). Fog is recomputed. `stepCount` is incremented.

7. Tapping a tile that has no nav arrow and is not a valid backtrack destination has no effect.

8. In CHOOSING state the map viewport and log strip are both fully visible. The room selection
   panel occupies the lower zone of the screen, below the log strip.

9. The room selection panel shows three choice cards. Each card:
   - Has playing-card proportions (width : height ≈ 0.71).
   - Displays the room type name at the top in small caps, styled in the room type's text colour.
   - Displays a rendered tile preview in the centre, drawn with the offering's exit mask and
     room-type floor-edge marker at the card's tile area size.
   - Displays a one-line atmospheric flavour tease at the bottom in an italic, muted style.
   - Uses the room type's border colour as the card border (~2.5 px) and the room type's
     background colour as the card fill.
   - Has a hover state (background lightens to `surfaceRaised`) consistent with 002's button pattern.

10. The three cards' room types are drawn from the depth-weighted pool for the target tile's
    Chebyshev distance from the start tile (see Design detail). Three distinct types are preferred;
    repeats are acceptable when the pool is small. Each card's exit configuration is drawn from
    `validExitConfigs` for that grid position, with distinct configs preferred across the three cards.

11. Tapping a choice card: places the `TileCell` at the target grid position, moves Pip there,
    recomputes fog, adds a log entry if the room type warrants one (see AC 13), increments
    `stepCount`, and returns to IDLE state.

12. There is no way to cancel CHOOSING state. The player must pick one of the three cards.

13. A flavour log entry is added **only** when Pip is placed into a **newly placed** tile of type
    Enemy, Boss, Shop, NPC, Item, or Chest. Corridor placement, Start, backtrack moves, and
    re-entering already-visited tiles never add a log entry.

14. Log entries carry no `[Label]` prefix.

15. The log strip shows the 3 most recent entries, newest first. Opacity: most recent 1.0,
    previous 0.7, oldest 0.45.

16. Exit alignment is always preserved: the chosen tile's exits must include the entry direction
    (the direction Pip approached from). Any already-placed adjacent tile whose exits open toward
    the new tile forces a matching exit on the new tile. No orphaned doorways are ever created.

17. The dungeon grid is bounded: Pip cannot move to or offer a cell outside `col 0–12, row 0–12`.
    Out-of-bounds directions are never shown as nav arrows and are excluded from exit configurations.

18. The tile render used for choice cards calls the same tile-drawing logic as `drawMap`. If
    `drawCell` is not currently exported from `src/map/renderer.ts`, the Engineer should export or
    extract a `drawSingleTile(ctx, cell, x, y, size, biome)` function as part of this feature.

19. `npm run typecheck` exits with zero errors.

20. `npm run test` continues to pass with no new failures introduced.

## Scope / non-goals

- **No encounter resolution.** Entering any room type triggers a log entry only; there is no combat
  loop, shop menu, or NPC dialogue. Those are 006 and later.
- **No Pip HP.** The status bar has no HP display in this feature.
- **No floor transitions.** "FLOOR 1" is a static label. The mechanic to end and begin a floor is
  a later feature.
- **No movement or placement animation.** All transitions are instant.
- **No room-selection cancellation.** Once in CHOOSING state the player must pick a card.
- **No Pip facial expressions** changing on room type.
- **No audio.**
- The **static hardcoded test map** from 003's `game.ts` is removed and replaced by the interactive
  dungeon state.

## Design detail

### Dungeon state

```ts
interface DungeonState {
  grid:        GameMap           // 13×13; cells null until placed by player
  fog:         FogState[][]
  pip:         GridPos           // Pip's current grid position
  startPos:    GridPos           // always (6,6); used for depth calculation
  uiState:     'idle' | 'choosing'
  pendingDir:  ExitMask | null   // direction under resolution (single bit: N/E/S/W)
  offerings:   RoomOffering[]   // 3 entries when uiState === 'choosing'
  log:         LogEntry[]        // newest-first; max 8 stored, 3 rendered
  stepCount:   number
}

interface RoomOffering {
  roomType: RoomType
  exits:    ExitMask
}

interface LogEntry {
  message: string
  style:   LogStyle
}

type LogStyle = 'system' | 'enemy' | 'boss' | 'shop' | 'npc' | 'item' | 'chest' | 'normal'
```

`DungeonState` is created fresh each time the Game screen starts. It is not persisted.

### State machine

```
IDLE ──[tap null neighbour with nav arrow]──────► CHOOSING
     ──[tap placed neighbour with reciprocal exit]► move → fog → IDLE

CHOOSING ──[tap card i]──► place tile → move → fog → log → IDLE
```

No transition from CHOOSING back to IDLE without choosing a card.

### Rendering layers (game.ts draw function)

Each frame, `game.ts` renders in order:

1. `drawMap(ctx, state.grid, state.fog, state.pip, DUNGEON)` — map viewport centred on Pip.
2. If IDLE: `drawNavArrows(ctx, availableDirs(state), mapOrigin)` — gold arrows on null exits.
3. Status bar — drawn over the top zone (same zone as 002's "← Quit Run", now sharing with
   floor label and depth counter).
4. Log strip — drawn below the map.
5. If CHOOSING: room selection panel — drawn below the log strip.

Hit-test rects for nav arrows and choice cards are recorded during the draw pass and used by
`handleClick`.

### Movement

`availableDirs(state): ExitMask[]`
Returns every direction bit (N, E, S, W) where:
- Pip's current tile has that exit set.
- The neighbour is in bounds.
- The neighbour is **null** (not yet placed). (Backtrack to placed tiles is handled separately.)

`isBacktrackable(state, dir): boolean`
Returns true if Pip's tile has `dir` set, the neighbour is placed, and the neighbour has
`OPP[dir]` set. Used to allow silent backtrack moves.

### Room offering generation

`generateOfferings(state, targetPos, entryDir): RoomOffering[3]`

**Room types:** sample from the depth-weighted pool for `chebyshev(targetPos, state.startPos)`.
Draw 3 types, preferring distinct values; repeat from pool if needed.

**Depth bands:**

| Chebyshev distance from start | Pool skew |
|---|---|
| ≤ 2 | Corridor, Shop, NPC, Item (corridor appears twice to increase weight) |
| 3–4 | Enemy, Enemy, Shop, Chest, NPC, Item |
| ≥ 5 | Enemy, Enemy, Enemy, Chest, Item, Shop, Boss |

**Exit configurations:** `validExitConfigs(state.grid, targetPos, entryDir)` (see below).
Pick up to 3 distinct configs from the returned list; fall back to repeating the first if fewer
than 3 are available.

**Pairing:** `offerings[i] = { roomType: types[i], exits: configs[i] }`.

`validExitConfigs(grid, targetPos, entryDir): ExitMask[]`

Compute forced and forbidden exit bits for a tile placed at `targetPos`:
- **Forced:** `entryDir` is always forced. Any already-placed adjacent tile that has an exit
  toward `targetPos` also forces the matching bit.
- **Forbidden:** any already-placed adjacent tile that does **not** have an exit toward `targetPos`
  forbids that bit. Out-of-bounds directions are forbidden.

Filter the full exit configuration set
`[N, E, S, W, N|S, E|W, N|E, N|W, S|E, S|W, N|E|S, N|W|S, E|S|W, N|E|W, N|E|S|W]`
to those satisfying `(config & forced) === forced` and `(config & forbidden) === 0`.
If the filtered set is empty, return `[forced]` (dead end with only entry direction).

### Log rules

| Move type | Log entry? |
|---|---|
| Place a Corridor tile | No |
| Place a Start tile | No |
| Place Enemy / Boss / Shop / NPC / Item / Chest | Yes — flavour message ± surprise |
| Backtrack to already-placed tile (any type) | No |
| Re-enter any already-placed tile | No |

### Flavour strings

All strings live in `src/navigation/room-pool.ts`.

**Log messages on entry** (pick one at random):

| Room | Messages |
|---|---|
| Enemy | "Something snarls in the dark." · "Claws scrape on stone." · "An enemy bars the way." · "A low growl. Close." |
| Boss | "THE FLOOR SHAKES." · "A terrible presence fills this place." |
| Shop | "A merchant grins at your coin pouch." · "Strange wares in the torchlight." · "Coins clink." |
| NPC | "A stranger whispers a warning." · "Someone slumps against the far wall." · "A robed figure stares." |
| Item | "Something glints in the rubble." · "Discarded by a previous delver." · "Left here for a reason." |
| Chest | "A locked chest catches your eye." · "Gold light under the lid." · "Heavy iron lock. Weak hinges." |

**Card flavour teases** (shown on choice cards before committing, pick one per card at random):

| Room | Teases |
|---|---|
| Enemy | "A distant growl…" · "Scratching on stone." · "Iron smell of old blood." |
| Boss | "Something immense stirs." · "Cold dread seeps through the door." · "The ground trembles faintly." |
| Shop | "Coins clink faintly." · "The smell of pipe smoke." · "A low, cheerful whistle." |
| NPC | "A whispered voice." · "Shuffling. Breathing." · "Soft candlelight under the door." |
| Item | "A faint gleam in the dark." · "Something shiny, half-buried." · "Discarded and forgotten." |
| Chest | "The dull gleam of iron." · "Someone locked this for a reason." · "Heavy. Promising." |
| Corridor | "Quiet. Just dust." · "A draft from ahead." · "Footsteps, long silent." |

### Edge cases

- **Dead-end offering:** a tile with only the entry exit (forced dead end) is valid. The player
  accepts it and must backtrack from there.
- **All three cards same room type:** acceptable when the depth pool is narrow.
- **Re-entering a placed room:** Pip moves there, fog recomputes, no log entry, no encounter.
- **Start tile borders:** the start tile has all four exits, so all four adjacent cells start as
  reachable unknowns.
- **Grid edge:** nav arrows and exit bits are suppressed for directions that would leave the grid.

### File structure

New files:

```
src/
├── navigation/
│   ├── dungeon-state.ts    ← DungeonState, RoomOffering, LogEntry, LogStyle; init factory
│   ├── movement.ts         ← availableDirs, isBacktrackable, attemptMove
│   ├── room-selection.ts   ← generateOfferings, validExitConfigs, placeRoom
│   └── room-pool.ts        ← depth pools, log messages, surprise texts, card teases
```

Updated files:

```
src/
├── colors.ts               ← extended with log colour constants (see Colour tokens)
├── map/
│   └── renderer.ts         ← export drawSingleTile if not already available
└── screens/
    └── game.ts             ← replaces static test map with interactive DungeonState;
                               renders status bar additions, nav arrows, log strip,
                               room selection panel; handles all click/hover events
```

## Visual design

### Layout wireframe — IDLE state

```
┌──────────────────────────────────────┐  y = 0
│ ← Quit Run    FLOOR 1     Depth 3   │  status bar zone (~50 px, unchanged height from 002)
├──────────────────────────────────────┤  y = 50
│                                      │
│  ·   ·   ↑   ·   ·                  │  row 1  (↑ = gold nav arrow, tile is null)
│  ←   ·  [P]  ·   →                  │  row 2  (Pip centre; W and E arrows on null tiles)
│  ·   ·   ↓   ·   ·                  │  row 3
│  ·   ·   ·   ·   ·                  │  row 4
│                                      │
├──────────────────────────────────────┤  y = 420  (map bottom edge, unchanged from 003)
│                                      │  4 px gap
│  "Something snarls in the dark."     │  log line 1 — full opacity, enemy colour
│  "A quiet passage…"                   │  log line 2 — 0.7 opacity
│  (third entry or empty)              │  log line 3 — 0.45 opacity
├──────────────────────────────────────┤  y ≈ 494
│                                      │
│  (lower zone — empty in IDLE;        │
│   small hint "Tap an exit to move."  │
│   shown until the first move)        │
│                                      │
└──────────────────────────────────────┘  y = 844
```

### Layout wireframe — CHOOSING state

```
┌──────────────────────────────────────┐  y = 0
│ ← Quit Run    FLOOR 1     Depth 3   │  status bar
├──────────────────────────────────────┤  y = 50
│       (map — fully visible,          │
│        no nav arrows drawn)          │
├──────────────────────────────────────┤  y = 420
│  "Something snarls in the dark."     │  log strip — always visible, never covered
│  (older entries…)                    │
├──────────────────────────────────────┤  y ≈ 494
│  WHERE DOES THIS LEAD?               │  panel header
│                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────┐  │
│  │  ENEMY   │ │   SHOP   │ │ CORR │  │  card row
│  │──────────│ │──────────│ │──────│  │
│  │          │ │          │ │      │  │
│  │ [tile]   │ │ [tile]   │ │[tile]│  │  tile preview
│  │          │ │          │ │      │  │
│  │──────────│ │──────────│ │──────│  │
│  │"A growl  │ │"Coins    │ │"Just │  │  flavour tease
│  │ in dark."│ │ clink…"  │ │ dust"│  │
│  └──────────┘ └──────────┘ └──────┘  │
│                                      │
└──────────────────────────────────────┘  y = 844
```

### Card anatomy

Each card: **116 px wide × 163 px tall** (ratio 0.71, playing-card proportions).
Internal layout, top to bottom:

```
┌──────────────────────────────────────┐  ← card border: room type border colour, 2.5 px
│  ENEMY                               │  room type title: bold 11px monospace, room text colour
│  ─────────────────────────────────   │  1 px separator at 0.4 opacity
│                                      │
│      ┌─────────────────────────┐     │
│      │     [tile render]       │     │  ~88 × 88 px, centred horizontally
│      └─────────────────────────┘     │  drawn with drawSingleTile at 88 px
│                                      │
│  ─────────────────────────────────   │  1 px separator
│  "A growl in the dark…"              │  italic 11px system-ui, textMuted; up to 2 lines
└──────────────────────────────────────┘
```

Card background: room type wall colour (same dark values as POC 5 card backgrounds).
Hover state: background → `surfaceRaised`; slight brightness lift.

### Room selection panel

Panel background: `surface` (#14142a), rounded top corners 8 px, full canvas width.
Top edge: 1 px stroke in `border` colour.
Panel header "WHERE DOES THIS LEAD?": 12px monospace, uppercase, `textMuted`.
Cards are arranged in a row with 12 px side margins and 8 px gaps between cards.

### Nav arrows

Filled gold triangle centred on the target null tile, pointing in the relevant direction.
Fill: `rgba(200, 148, 30, 0.9)`. Shadow: `rgba(200, 148, 30, 0.5)`, blur 6 px.
Triangle half-size ≈ 13 px. Only drawn in IDLE state.
Matches the arrow style in POC 5.

### Status bar additions

Laid out within the existing top zone (same vertical range as 002's "← Quit Run"):

```
← Quit Run        FLOOR 1        Depth 3
(left, unchanged)  (centre)       (right)
```

| Element | Font | Colour |
|---|---|---|
| Floor label "FLOOR 1" | `bold 12px monospace, uppercase` | `textMuted` |
| "Depth " prefix | `12px monospace` | `textMuted` |
| Depth number N | `12px monospace` | `gold` |

### Color tokens

New constants added to `src/colors.ts`:

| Constant | Hex | Used for |
|---|---|---|
| `logSystem` | `#c8941e` | System log entries (same value as existing `gold`) |
| `logEnemy` | `#ff8070` | Enemy room log entries |
| `logBoss` | `#ff4040` | Boss room log entries |
| `logShop` | `#f0c060` | Shop room log entries |
| `logNpc` | `#70b8f0` | NPC room log entries |
| `logItem` | `#60d080` | Item room log entries |
| `logChest` | `#f0a060` | Chest room log entries |
| `logNormal` | `#6b5a45` | Fallback / normal entries |

Card border and background colours reuse existing room accent constants from 003's `colors.ts`
and `biome.ts` — no new room colour constants needed beyond the log set above.

### Typography / sizing

| Element | Font | Colour | Notes |
|---|---|---|---|
| Floor label | `bold 12px monospace` | `textMuted` | Uppercase; centred in status zone |
| Depth counter | `12px monospace` | `textMuted` / `gold` for N | "Depth " muted; number in gold |
| Log entry | `11px monospace` | per `LogStyle` | Opacity per recency (1.0 / 0.7 / 0.45) |
| Panel header | `12px monospace` | `textMuted` | Uppercase |
| Card room type title | `bold 11px monospace` | Room text colour | Small caps if supported |
| Card flavour tease | `italic 11px system-ui` | `textMuted` | Up to 2 lines |

## Open questions

*(none — all choices above can be acted on immediately)*

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** 2026-06-02 · **PR:** [#21](https://github.com/thesnwmn/pip-and-peril/pull/21)

### What was built

- `src/navigation/dungeon-state.ts` — `DungeonState`, `RoomOffering`, `LogEntry`, `LogStyle` types; `initDungeon()` factory; `chebyshev()`, `OPP`, `DIR_DELTA` helpers
- `src/navigation/movement.ts` — `availableDirs()`, `isBacktrackable()`, `dirFromPipToNeighbour()`, `movePip()`
- `src/navigation/room-pool.ts` — depth-weighted pools, log messages, card tease strings, `poolForDepth()`, `logStyleForRoom()`, `pickRandom()`
- `src/navigation/room-selection.ts` — `validExitConfigs()`, `generateOfferings()`, `placeRoom()`; exit configs shuffled for per-card variety
- `src/map/renderer.ts` — exported `drawSingleTile()` for card preview rendering
- `src/colors.ts` — added 8 `log*` colour tokens and 21 `card*` colour tokens
- `src/screens/game.ts` — replaced static test map with full interactive `DungeonState`; status bar (floor label + depth counter), log strip, nav arrows, room selection panel with three playing-card choices

Inline Reviewer pass completed. Two findings fixed: exit-config assignment randomised (was deterministic); card side margins corrected to 12 px (was 13 px by centring formula).

### Evidence

**Tests:** 8 test files, 72 tests, all passing (`npm run test`).

New test files cover all ACs via unit tests:
- `src/navigation/dungeon-state.test.ts` (15 tests) — init state, chebyshev, OPP, DIR_DELTA
- `src/navigation/movement.test.ts` (14 tests) — availableDirs, isBacktrackable, movePip
- `src/navigation/room-selection.test.ts` (19 tests) — validExitConfigs, generateOfferings, placeRoom
- `src/navigation/room-pool.test.ts` (6 tests) — poolForDepth, logStyleForRoom, LOG_MESSAGES, CARD_TEASES

**Typecheck:** `npm run typecheck` exits clean (0 errors).

### Play-test

1. Start a run from the home screen — you land on the Game screen with Pip centred on a single stone-floor start tile. Status bar shows "← Quit Run" (left), "FLOOR 1" (centre), "Depth 0" (right). Log shows "Pip descends into the dungeon…"
2. Four gold arrow triangles appear on the four adjacent void cells — N, E, S, W.
3. Tap a gold arrow. The room selection panel appears below the log strip showing "WHERE DOES THIS LEAD?" and three playing-card choices, each with a room-type title in small caps, a rendered tile preview, and a flavour tease.
4. Tap a card. The tile is placed, Pip moves there, fog updates. If the room was Enemy/Boss/Shop/NPC/Item/Chest a coloured log entry appears. Depth counter updates.
5. From the new tile, new arrows appear on any null adjacent exit. Tap the tile behind you — Pip backtracks silently (no log entry).
6. Move deeper: depth counter increments. Cards at distance ≤2 draw from the shallow pool (corridor, shop, npc, item). Cards at distance ≥5 surface enemies and bosses.
7. Tap "← Quit Run" at any point — returns to the home screen.
