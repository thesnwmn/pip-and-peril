# 003 · Tile Map Core

**Status:** READY
**Source idea:** manager request
**Depends on:** 002

## Summary

Establishes the tile-map data model and canvas renderer that all navigation and gameplay features
will build on. Provides a `TileCell` type (room type + exit bitmask), a sparse `GameMap` grid
(cells are null until placed by the player), and `FogState` per grid position. The renderer draws
a 5×7-tile viewport centred on a given position, using the **Dungeon biome**: staggered stone
brickwork for walls, flagstone floors with per-stone tonal variation, and room-type accent overlays.
A `BiomePalette` type is introduced so future biomes (cave, jungle, town) are a palette swap, not
a code change. The Game screen is updated to render a hardcoded test map rather than a blank canvas.

---

## Acceptance criteria

1. A `TileCell` interface is defined: `{ roomType: RoomType; exits: ExitMask }`.
2. A `GameMap` type is defined: a `(TileCell | null)[][]` grid with `width` and `height`; a `null`
   cell means that position has not yet been placed by the player.
3. A `FogState` type is defined: `'hidden' | 'seen' | 'visible'`. Fog is stored as a separate
   `FogState[][]` grid, parallel to the cell grid.
4. `ExitMask` is a bitmask: `N = 1, E = 2, S = 4, W = 8`. All four compass values are exported
   constants.
5. `RoomType` covers all seven room categories: `'start' | 'corridor' | 'enemy' | 'shop' | 'npc'
   | 'item' | 'chest' | 'boss'`.
6. A `BiomePalette` interface is defined (colours for wall/floor/corridor/void/fog). A single
   `DUNGEON` constant implements it. No other biomes are required in this feature.
7. A `drawMap(ctx, map, fog, viewCenter, biome)` function renders the 5×7-tile viewport at the
   correct canvas position (see Layout below). `viewCenter` is a `GridPos`
   (`{ col: number; row: number }`).
8. **Wall rendering (Dungeon biome):** staggered brick bond — horizontal mortar courses every ~6 px,
   with vertical joint lines alternating offset each row (even rows: joints at 0, ⅓ width,
   ⅔ width; odd rows: joints at ⅙, ½, ⅚ width). Mortar lines use `DUNGEON.wallJoint`; stone
   faces use `DUNGEON.wallBase` with the topmost course using `DUNGEON.wallHighlight`.
9. **Floor rendering (Dungeon biome):** a 3×3 flagstone grid inside the wall border. Each flag's
   fill colour alternates between `DUNGEON.floorFlagHi` and `DUNGEON.floorFlagLo` based on a
   deterministic function of `(col * 7 + row * 13 + flagIndex)`, so the variation is consistent
   across frames but looks organic. Mortar lines are drawn at `DUNGEON.floorMortar`.
10. **Exit corridors:** wherever `exits` has a bit set, the wall area on that side is punched
    through with a floor-coloured rectangle. Corridor width is `38%` of tile size; positioned
    centred on the tile edge. Adjacent tiles whose exits align will produce a seamless passage
    across the tile boundary.
11. **Room-type accent:** after drawing walls and floor, a semi-transparent colour overlay is
    composited over the entire tile for non-corridor, non-start rooms. Overlay values are defined
    as constants (see Color tokens below). Corridors and start rooms receive no overlay.
12. **Fog states:**
    - `'hidden'`: fill with `DUNGEON.voidFill`; no tile art.
    - `'seen'`: draw full tile art, then composite `DUNGEON.fogOverlay` on top.
    - `'visible'`: draw full tile art; no overlay.
13. **Unknown (null) cells:** regardless of fog state, a null cell is rendered as a dark void
    (`DUNGEON.voidFill`) with a very faint horizontal brick hint (two to three scanlines at
    `DUNGEON.wallCourse` opacity 0.2), giving the impression of unexplored stone beyond.
14. **Pip token:** drawn at the viewport centre when `fog[viewCenter.row][viewCenter.col] ===
    'visible'`. The token is the same canvas-primitive mouse figure from the POCs (body arc, two
    ear arcs with inner pink, single eye dot, nose dot). No external asset.
15. The **Game screen** (`src/screens/game.ts`) is updated: instead of a blank canvas fill, it
    creates a hardcoded `GameMap` and fog grid and calls `drawMap` each frame. The test map must
    contain at least one of each room type and demonstrate all four exit directions.
16. `npm run typecheck` exits with zero errors.
17. `npm run test` continues to pass with no new failures.

---

## Scope / non-goals

- **No movement logic.** Pip's position is hardcoded in the test map; `viewCenter` never changes
  in this feature.
- **No procedural map generation.** The test map is hand-crafted.
- **No navigation arrows.** Gold directional arrows on adjacent unplaced tiles are part of 004.
- **No room selection UI.** That is 004.
- **No biomes beyond `DUNGEON`.** The `BiomePalette` type exists; only one value is implemented.
- **No sprite / image tileset support.** All drawing is canvas primitives.
- **No lighting effects** beyond fog-of-war (torch glow, dynamic shadows, etc. are future).
- **No Pip animation.** The token is a static draw.
- **No room icons** drawn on map tiles. Icons (⚔ ⚖ etc.) appear in choice cards (004) not on
  the map itself, to keep the map readable at small tile size.

---

## Design detail

### Types and constants

```ts
// src/map/types.ts

export type RoomType = 'start' | 'corridor' | 'enemy' | 'shop' | 'npc' | 'item' | 'chest' | 'boss'

export type ExitMask = number
export const N: ExitMask = 1
export const E: ExitMask = 2
export const S: ExitMask = 4
export const W: ExitMask = 8

export type FogState = 'hidden' | 'seen' | 'visible'

export interface GridPos {
  col: number
  row: number
}

export interface TileCell {
  roomType: RoomType
  exits: ExitMask
}

// The map is a 2-D grid; null = tile not yet placed by the player
export interface GameMap {
  cells: (TileCell | null)[][]
  width: number
  height: number
}
```

### Biome palette

```ts
// src/map/biome.ts

export interface BiomePalette {
  wallBase: string       // stone face colour
  wallCourse: string     // brick course (slightly lighter band)
  wallJoint: string      // mortar / joint lines
  wallHighlight: string  // top-edge bevel (topmost course of tile)
  floorBase: string      // floor fill before flag variation
  floorMortar: string    // lines between flagstones
  floorFlagHi: string    // lighter flagstone variant
  floorFlagLo: string    // darker flagstone variant
  corridorFloor: string  // floor colour used inside exit corridors
  voidFill: string       // unexplored / outside-bounds
  fogOverlay: string     // rgba string composited over 'seen' tiles
}

export const DUNGEON: BiomePalette = { … }   // values in Color tokens below
```

### Room accent overlays

Stored alongside the biome, keyed by `RoomType`. Applied after the wall/floor draw as a
`ctx.fillStyle = accentColor; ctx.fillRect(tile bounds)` pass. Corridors and start have no
overlay entry (skip the pass entirely).

### Renderer

```ts
// src/map/renderer.ts

export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  fog: FogState[][],
  viewCenter: GridPos,
  biome: BiomePalette
): void
```

Implementation notes:
- Compute the top-left map cell from `viewCenter` and the viewport constants (5 wide, 7 tall).
- For each of the 35 viewport slots, call an internal `drawCell(ctx, cell, fogState, col, row, biome)`
  helper that handles the full drawing stack for one tile.
- `drawCell` is not exported (internal), but should be unit-testable via a canvas mock if needed.
- After all tiles are drawn, if the view-centre cell's fog is `'visible'`, call `drawPip(ctx,
  pipCanvasX, pipCanvasY, tileSize)`.

### Tile drawing algorithm (single tile)

Given canvas top-left `(px, py)`, tile size `s = TILE_SIZE`:

```
Wall thickness:  wt = round(s × 0.20)
Corridor width:  cw = round(s × 0.38)
Corridor offset: co = round((s − cw) / 2)
Floor inner dim: fi = s − wt × 2
```

**Step 1 — wall base:** `fillRect(px, py, s, s)` with `biome.wallBase`.

**Step 2 — brick bond pattern** (within the full tile square):
- For each horizontal course row `r` from 0 to `s` in steps of `courseHeight ≈ 6px`:
  - Draw a mortar line: `fillRect(px, py + r, s, 1)` with `biome.wallJoint`.
  - The topmost course row additionally draws the entire band at `biome.wallHighlight`.
  - Determine `offset = (r / courseHeight % 2 === 0) ? 0 : jointSpacing / 2` where
    `jointSpacing ≈ s / 3`.
  - Draw vertical joints at `px + offset`, `px + offset + jointSpacing`,
    `px + offset + 2 × jointSpacing` (and so on across width), each 1 px wide,
    `courseHeight` tall, with `biome.wallJoint`.

**Step 3 — inner floor:** `fillRect(px + wt, py + wt, fi, fi)` with `biome.floorBase`.

**Step 4 — 3×3 flagstone grid** (within the inner floor):
- `fs = floor(fi / 3)`
- For each flag at grid position `(fc, fr)` in `0..2 × 0..2`:
  - `idx = fc + fr × 3 + col × 7 + row × 13` (where `col, row` are the grid coordinates)
  - `flagColor = (idx % 2 === 0) ? biome.floorFlagHi : biome.floorFlagLo`
  - `fillRect(px + wt + fc × fs, py + wt + fr × fs, fs, fs)` with `flagColor`
  - `strokeRect` with `biome.floorMortar`, `lineWidth = 0.6`

**Step 5 — exit corridors** (punch floor colour through wall):
- For each exit bit set in `cell.exits`:
  - North: `fillRect(px + co, py, cw, wt + 1)` with `biome.corridorFloor`
  - South: `fillRect(px + co, py + s − wt, cw, wt + 1)` with `biome.corridorFloor`
  - East: `fillRect(px + s − wt, py + co, wt + 1, cw)` with `biome.corridorFloor`
  - West: `fillRect(px, py + co, wt + 1, cw)` with `biome.corridorFloor`

**Step 6 — room accent overlay** (skip for corridor / start):
- Look up `rgba(…)` for the cell's `roomType`.
- `ctx.fillStyle = accent; ctx.fillRect(px, py, s, s)`.

**Step 7 — fog overlay** (skip for 'visible'):
- If `'seen'`: `ctx.fillStyle = biome.fogOverlay; ctx.fillRect(px, py, s, s)`.
- If `'hidden'` or cell is null: `fillRect(px, py, s, s)` with `biome.voidFill`, then draw faint
  brick hint (2–3 horizontal lines at `biome.wallCourse` with global alpha 0.18).

### Fog computation helper

```ts
// src/map/fog.ts

export function computeFog(
  fog: FogState[][],
  center: GridPos,
  radius: number        // in tiles; suggest 3 for the test map
): FogState[][]
```

- Sets all previously `'visible'` cells to `'seen'`.
- Within a Chebyshev (square) or Euclidean (circle) radius of `center`, sets cells with a non-null
  tile entry to `'visible'` (and cells with a null entry to `'seen'` — they have been "looked
  toward" even if not yet placed).
- For 003's test map, `computeFog` is called once at initialisation (static map, no movement).

### Static test map (for the Game screen)

A 13 × 13 grid with the following hand-crafted layout (all fog initialised to `'hidden'`, then
`computeFog` called with the start position at grid centre `(6, 6)` and `radius = 3`):

- `(6, 6)` — Start, exits N|E|S|W
- `(6, 5)` — Corridor, exits N|S
- `(6, 4)` — Enemy, exits S|E
- `(7, 4)` — Shop, exits W|S
- `(7, 5)` — NPC, exits N|W
- `(6, 7)` — Corridor, exits N|S
- `(6, 8)` — Item, exits N|E
- `(7, 8)` — Chest, exits W|S
- `(7, 9)` — Boss, exits N

This covers all seven non-null room types and exercises all four exit directions. Tiles outside the
initial fog radius start `'hidden'`; tiles at distance 2–3 are `'seen'`; the centre and its
immediate neighbours are `'visible'`.

### File structure

```
src/
├── colors.ts             ← extended: add room accent rgba constants + Pip token colors
├── map/
│   ├── types.ts          ← TileCell, GameMap, FogState, ExitMask, RoomType, GridPos
│   ├── biome.ts          ← BiomePalette interface, DUNGEON constant, ROOM_ACCENTS map
│   ├── renderer.ts       ← drawMap, drawPip (exported); drawCell (internal)
│   └── fog.ts            ← computeFog
└── screens/
    └── game.ts           ← updated: builds test GameMap + fog, calls drawMap each frame
```

---

## Visual design

### Layout wireframe — Game screen with map

```
┌──────────────────────────────┐  390 × 844 logical px
│ ← Quit Run          y=16–48  │  existing back link (unchanged from 002)
├──────────────────────────────┤  y = 50  ← map top edge
│ ░░░░░ │░░░░░│░░░░░│░░░░░│░░░│  row 0  (hidden tiles = void)
│ ░░░░░ │▓▓▓▓▓│▓▓▓▓▓│░░░░░│░░░│  row 1  (seen tiles = art + fog)
│ ░░░░░ │▓▓▓▓▓│▓▓▓▓▓│░░░░░│░░░│  row 2
│ ░░░░░ │▓▓▓▓▓│▓▓▓▓▓│░░░░░│░░░│  row 3  (centre row = Pip here)
│ ░░░░░ │▓▓▓▓▓│█PIP█│▓▓▓▓▓│░░░│
│ ░░░░░ │▓▓▓▓▓│▓▓▓▓▓│░░░░░│░░░│  rows 4–6
│ ░░░░░ │░░░░░│░░░░░│░░░░░│░░░│
├──────────────────────────────┤  y = 526 ← map bottom edge
│                              │
│   [future dice / action UI]  │  318 px remaining
│                              │
└──────────────────────────────┘

Map area: x=25, y=50, w=340, h=476
Tile size: 68 px  ·  5 cols × 7 rows  ·  no gaps
Pip is always at viewport column 2, row 3 (0-indexed centre)
```

### Color tokens

All new tokens are defined as constants in `src/map/biome.ts` and `src/colors.ts`. None of these
require CSS custom properties — they are canvas draw values only.

#### DUNGEON biome palette

| Constant | Hex / rgba | Used for |
|---|---|---|
| `wallBase` | `#1c1714` | Stone face fill |
| `wallCourse` | `#241e18` | Brick course bands (lighter) |
| `wallJoint` | `#120e0a` | Mortar lines and vertical joints |
| `wallHighlight` | `#2e2822` | Top-edge bevel (first course) |
| `floorBase` | `#322b22` | Floor fill before flagstone variation |
| `floorMortar` | `#221c16` | Lines between flagstones |
| `floorFlagHi` | `#3c3028` | Lighter flagstone variant |
| `floorFlagLo` | `#2a241c` | Darker flagstone variant |
| `corridorFloor` | `#2e281e` | Exit corridor fill (matches floor tonality) |
| `voidFill` | `#080810` | Hidden/unknown cells and out-of-bounds |
| `fogOverlay` | `rgba(8,8,16,0.65)` | 'seen' tile overlay |

#### Room accent overlays (added to `src/colors.ts`)

These extend the existing palette and match the room-type border values from `docs/concept.md`.

| Constant | Hex accent | rgba overlay | Room |
|---|---|---|---|
| `roomEnemy` | `#7a1a1a` | `rgba(122,26,26,0.28)` | Enemy tile tint |
| `roomShop` | `#7a6a00` | `rgba(122,106,0,0.22)` | Shop tile tint |
| `roomNpc` | `#1a2a7a` | `rgba(26,42,122,0.22)` | NPC tile tint |
| `roomItem` | `#1a6a2a` | `rgba(26,106,42,0.18)` | Item tile tint |
| `roomChest` | `#c87820` | `rgba(120,72,0,0.22)` | Chest tile tint |
| `roomBoss` | `#3a0a0a` | `rgba(122,10,10,0.42)` | Boss tile tint |
| `roomStart` | — | no overlay | Start tile |
| `roomCorridor` | — | no overlay | Corridor tile |

#### Pip token colors (already in POC — formalise in `src/colors.ts`)

| Constant | Hex | Used for |
|---|---|---|
| `pipBody` | `#f5e6c8` | Mouse body fill |
| `pipEar` | `#e0c8a0` | Outer ear fill |
| `pipEarInner` | `rgba(200,100,80,0.5)` | Inner ear tint |
| `pipEye` | `#3d2b1f` | Eye dot |
| `pipNose` | `#c87060` | Nose dot |

### Tile drawing proportions

All values are ratios of `TILE_SIZE` (68 px). The Engineer should define these as derived
constants so changing `TILE_SIZE` automatically adjusts everything.

| Part | Formula | Value at 68 px |
|---|---|---|
| Wall thickness (`wt`) | `round(s × 0.20)` | 14 px |
| Corridor width (`cw`) | `round(s × 0.38)` | 26 px |
| Corridor offset (`co`) | `round((s − cw) / 2)` | 21 px |
| Floor inner dim (`fi`) | `s − wt × 2` | 40 px |
| Flagstone cell (`fs`) | `floor(fi / 3)` | 13 px |
| Brick course height | `6 px` (fixed) | 6 px |
| Brick joint spacing | `round(s / 3)` | 23 px |
| Brick joint offset (odd) | `round(s / 6)` | 11 px |

### Typography / sizing

No new text elements introduced in this feature. The existing "← Quit Run" back link from 002 is
unchanged. Future HUD elements (floor depth, steps, etc.) are out of scope here.

---

## Open questions

*(none — all choices below can be acted on immediately)*

---

### Design notes for the record

**Art approach decision (resolves open question from `docs/concept.md`):**
The art approach is **procedural canvas drawing with a BiomePalette abstraction**, categorised as
the "Hybrid" option from concept.md. Sprites and external assets are explicitly not introduced
here. The `drawCell` function takes a `BiomePalette` parameter; to support hand-crafted art later,
the Engineer can add an optional `tileset?: ImageBitmap` field to `BiomePalette` and branch inside
`drawCell` to use `ctx.drawImage` instead of the procedural path — the rest of the codebase is
unchanged. This keeps the data model and fog logic stable while making the visual layer swappable.
A decision record entry should be added to `DECISION_REGISTER.md` when this ships.

**Why no gaps between tiles:**
POC 5 used 5 px gaps to visually separate tiles during prototyping. The actual game renders tiles
edge-to-edge for dungeon immersion: adjacent floor areas read as connected rooms, and exit
corridors meet at tile boundaries to form seamless passages. The outer margin (25 px each side)
provides sufficient breathing room.

**Why staggered brick over horizontal courses only:**
POC 1 and POC 5 draw only horizontal bands (stone courses). Adding staggered vertical joints
produces genuine brick bond — it reads immediately as masonry rather than just "dark stripes." The
extra draw calls are minimal (a handful of 1×6 px rectangles per tile).

**Why per-stone flagstone variation:**
A 3×3 flagstone grid where all nine flags are the same colour reads as a single square with a
grid drawn over it. Alternating between `floorFlagHi` and `floorFlagLo` seeded by grid position
makes each stone look individually set, which is the "paved floor" feeling the manager asked for.
The seed formula `(col × 7 + row × 13 + flagIndex)` is deterministic — no `Math.random()` in the
render path.
