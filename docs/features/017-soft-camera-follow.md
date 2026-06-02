# 017 · Soft Camera Follow

**Status:** READY
**Source idea:** Idea 002 (`IDEAS.md`)
**Depends on:** feature 003 (tile map core), feature 004 (navigation & room selection)

## Summary

Instead of hard-pinning Pip to the centre of the 5×5 viewport, the camera tracks her through a
"dead zone" — a central band of tiles where Pip can move freely without the camera scrolling.
The camera only catches up when Pip steps beyond the dead zone edge, shifting the minimum amount to
bring her back to the boundary. Near the dungeon grid edge, the camera clamps, allowing Pip to
walk toward the visible wall of the screen. The result is that each move leaves the tiles behind
Pip visible a little longer and reveals more in the direction of travel — making navigation feel
more alive and less like a locked crosshair.

## Acceptance criteria

1. A named constant `DEAD_ZONE` (initial value `3`) sets the size of the dead zone in tiles (both
   axes). The Engineer may split into `DEAD_ZONE_COLS` / `DEAD_ZONE_ROWS` if the viewport is
   rectangular.
2. `DungeonState` holds a `camera: GridPos` field, independent of `pip`.
3. On `initDungeon`, `camera` equals `pip`'s starting position.
4. After each confirmed move (`movePip`), `camera` is updated by the dead zone rule (see Design
   detail). During the `choosing` UI state, during combat, and during `initDungeon` before the
   first move, `camera` does not change.
5. `camera` is clamped so `camera.col ∈ [0, grid.width−1]` and `camera.row ∈ [0, grid.height−1]`
   after every update.
6. `drawMap` receives `camera` as the view-centre argument (not `pip`).
7. Pip is drawn at her correct pixel position relative to the camera — which may not be the
   viewport's centre tile. The pip draw call uses a position derived from
   `pip.col − camera.col` and `pip.row − camera.row` offsets.
8. Nav arrow positions and their tap hit-rects are computed relative to `camera`, not `pip`,
   so arrows always appear on the correct adjacent tiles in the viewport.
9. The click-to-move coordinate mapping in the Game screen uses `camera` as the viewport origin
   (currently uses `state.pip` — that reference must be updated).

## Scope / non-goals

- **No sub-tile animation.** Camera shifts are discrete, tile-aligned, and instant. Smooth lerp
  is a later enhancement and belongs in a separate feature once move animation exists.
- **No camera preview during room selection.** Camera is frozen from the moment a direction is
  chosen until Pip actually lands on the new tile.
- **No camera shift on room reveal.** The camera does not pan to show the target tile before
  Pip moves.
- **Dead zone size is a build-time constant.** It is not a player setting or a runtime option.

## Design detail

### Dead zone rule

After `movePip` places Pip at `(pip.col, pip.row)`:

```
hz = floor(DEAD_ZONE / 2)           // e.g. 1 for DEAD_ZONE = 3

if pip.col > camera.col + hz → camera.col = pip.col − hz
if pip.col < camera.col − hz → camera.col = pip.col + hz
if pip.row > camera.row + hz → camera.row = pip.row − hz
if pip.row < camera.row − hz → camera.row = pip.row + hz

camera.col = clamp(camera.col, 0, grid.width − 1)
camera.row = clamp(camera.row, 0, grid.height − 1)
```

With DEAD_ZONE = 3 and a 5×5 viewport, Pip has 1 tile of slack in each direction. The first step
from the starting tile does not scroll the camera; the second consecutive step in the same direction
pushes Pip to the dead zone edge and the camera moves 1 tile to compensate.

Backtracking toward the camera centre contracts the offset; no camera update is needed until Pip
exits the dead zone in the opposite direction.

### Pip draw position

```
vpCol = floor(VIEWPORT_COLS / 2) + (pip.col − camera.col)
vpRow = floor(VIEWPORT_ROWS / 2) + (pip.row − camera.row)

pipPixelX = MAP_X + vpCol * TILE_SIZE + TILE_SIZE / 2
pipPixelY = MAP_Y + vpRow * TILE_SIZE + TILE_SIZE / 2
```

`vpCol` and `vpRow` will be in [0, VIEWPORT_COLS−1] / [0, VIEWPORT_ROWS−1] under normal play
(the dead zone rule ensures Pip stays within the viewport). No bounds guard is needed in the draw
path, but a defensive clamp is acceptable.

### Viewport origin for hit-testing and arrow placement

The Game screen currently derives the viewport's top-left grid position as
`pip.col − floor(VIEWPORT_COLS / 2)`. Every such reference must become
`camera.col − floor(VIEWPORT_COLS / 2)` (and the same for rows). Two call sites:

- `vpPixel()` — used to position nav arrows
- `handleClick()` — used to map a tap coordinate back to a grid cell

### Boundary behaviour

When `camera` is clamped at the dungeon edge (e.g. `camera.col = 0`), subsequent eastward moves
by Pip shift her pixel position eastward within the fixed viewport. Pip can walk toward the right
edge of the on-screen map. This is correct and expected — the dungeon wall is at the grid boundary.

The 13×13 grid and (6,6) start position mean Pip must explore 4 tiles from centre before the
camera reaches its clamp range; in a typical run this may occur but is not the common case.

### Edge cases

| Case | Behaviour |
|---|---|
| Backtrack one step | Pip moves toward camera centre. Offset shrinks by 1. No camera update. |
| Backtrack past dead zone | Pip exits the opposite dead zone edge. Camera shifts 1 tile to follow. |
| At dungeon corner | Camera clamps on both axes. Pip can approach the corner of the screen. |
| Combat begins | `camera` frozen. Pip sprite still draws at her correct (non-centre) viewport position. |
| Combat ends | No camera update. `camera` stays where it was; Pip hasn't moved. |
| Run starts | `camera == pip`. Pip drawn at viewport centre. Identical to current behaviour. |

## Visual design

Purely behavioural — no new screen elements, colour tokens, or typography. The map zone pixel
rectangle (`MAP_X / MAP_Y / 360×360 px`) is unchanged.

The diagram below illustrates the state after Pip has moved two tiles East from start. Camera has
shifted 1 tile East (Pip's first step stayed inside the dead zone; the second pushed her to the
edge and the camera caught up). Pip now sits at viewport column 3, one tile right of centre.

```
viewport columns (0–4) →
     0      1      2      3      4
   ┌──────┬──────┬──────┬──────┬──────┐
 0 │      │      │      │      │      │
   ├──────┼──────┼──────┼──────┼──────┤
 1 │      │ ╔══════════════╗   │      │  dead zone (3×3):
   ├──────┼─║────┼──────┼─║───┼──────┤  viewport cols 1–3, rows 1–3
 2 │      │ ║    │  ☆   │Pip  ║      │  ☆ = camera centre (not drawn)
   ├──────┼─║────┼──────┼─║───┼──────┤  Pip at col 3 = east edge of dead zone
 3 │      │ ╚══════════════╝   │      │  next eastward step → camera scrolls
   ├──────┼──────┼──────┼──────┼──────┤
 4 │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┘
```

**Colour tokens:** none new.
**Typography / sizing:** none new.

## Open questions

*(none — spec is READY)*

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** · **PR:**

### What was built

### Evidence

### Play-test
