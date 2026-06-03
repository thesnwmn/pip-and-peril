# 032 · Map Zone Stability

**Status:** READY
**Source idea:** Manager request (2026-06-03)
**Depends on:** 030 (elastic canvas — established the clipping behaviour this fixes), 031 (log view
redesign — whisper anchored within the map zone)

## Summary

The map canvas clip region is currently inconsistent in both dimensions between navigation and
combat. In height: navigation idle clips the map at full screen height (~794 px); once the
encounter panel rises, the map is clipped to the upper ~380 px — the dungeon stage shrinks when
the stakes go up. In width: the horizontal clip has always been the full logical canvas width
(390 px), but at navigation zoom (1×) the 5-tile grid (5 × 72 = 360 px, starting at `MAP_X = 10`)
leaves 10 px of background on the left and 20 px on the right, whereas at combat zoom (2.3×) the
scaled tiles overflow those margins and fill the full 390 px — the map appears wider in combat.

This feature fixes both: the map zone is a **fixed rectangle** at all times — always `MAP_X` to
`MAP_X + (5 × TILE_SIZE)` horizontally (10–370 px, 360 px wide) and `MAP_Y` to `LOGICAL_H`
vertically. Encounter panels overlay the lower portion of the map rather than compressing it.
Camera zoom is unchanged — the dungeon zooms in within the same fixed area, so the player's
spatial anchor never moves in either axis.

## Acceptance criteria

1. The map canvas clip rectangle is constant in every game state — navigation idle, navigation
   choosing, encounter transition, and active encounter. Both axes are fixed:
   - **Horizontal:** always `MAP_X` to `MAP_X + (VIEWPORT_COLS × TILE_SIZE)` (10 px – 370 px,
     360 px wide).
   - **Vertical:** always `MAP_Y` to `LOGICAL_H` (50 px – 844 px, 794 px tall).
2. In navigation idle state the tile grid occupies the same horizontal extent (10–370 px) as it
   does today. The 10 px left strip and 20 px right strip outside the tile grid show background
   colour, as they do now.
3. In stable combat state the tile grid is still clipped at x = 10 and x = 370 despite the
   2.3× zoom. The zoomed tiles overflow those boundaries and are clipped; the left and right
   background strips remain visible at the same width as in navigation. The combat view is no
   longer wider than the navigation view.
4. In navigation choosing state the room-selection panel renders on top of the map, overlaying
   it from `PANEL_TOP` downward. The map tile rendering extends to full screen height; the
   panel's solid background covers the tiles below `PANEL_TOP`. The panel's appearance is
   visually unchanged from the current implementation.
5. When combat begins the encounter panel rises from the screen bottom and overlays the lower
   portion of the map. The map canvas clip does not change during the transition — only the
   panel position changes.
6. In stable combat state the combat panel occupies approximately the lower 50 % of the screen.
   The map fills the full height behind it; the panel's solid background hides the dungeon tiles
   beneath it. The panel's appearance is visually unchanged from the current implementation.
7. The camera zoom behaviour during combat is unchanged from feature 030: the camera still
   transitions to centre the active room tile in the visible area above the panel, at the same
   zoom level. `COMBAT_MAP_CENTER_Y` remains the vertical midpoint of the area from `MAP_Y` to
   `COMBAT_PANEL_TOP`.
8. All transition animations (panel rise/fall, camera zoom in/out) are smooth and visually
   identical to the current behaviour, except that the map no longer clips to follow the rising
   or falling panel edge.
9. The situated whisper (031) continues to appear and fade correctly during navigation idle; it
   is not visible during any encounter state (unchanged guard conditions).
10. `npm run typecheck` exits zero errors.
11. `npm run test` passes. All existing tests continue to pass without modification.

## Scope / non-goals

- **No change to encounter panel content or layout.** The combat panel, room-selection panel,
  and their sizing, colours, and typography are untouched.
- **No change to camera zoom values or transition timing.** `COMBAT_CONFIG.cameraZoom`,
  `COMBAT_MAP_CENTER_Y`, and `TRANSITION_DURATION` are left at their current calibrated values.
- **No change to floating UI elements.** Nav arrows, satchel button, and menu button positions
  are unchanged.
- **No change to status bar or whisper behaviour.**
- **No new encounter types or camera configurations.** Those ship with their own feature items
  (021, 023, 025–028).

## Design detail

### The root causes

**Height:** In `src/screens/game.ts`, the draw loop computes:

```
mapAreaH = max(0, currentPanelTop − MAP_Y)
```

`currentPanelTop` animates from `LOGICAL_H` (nav idle) down to `COMBAT_PANEL_TOP` (~430 px)
as the encounter panel rises. The clip rectangle shrinks with it: the map literally gets smaller
on screen.

**Width:** The clip rectangle has always been `ctx.rect(0, MAP_Y, LOGICAL_W, mapAreaH)` — the
full 390 px logical width. At 1× navigation zoom the 5 tiles occupy only 360 px (10–370 px),
leaving two background-colour strips outside the tile grid. At 2.3× combat zoom the tiles scale
up and overflow the full 390 px, so those strips disappear — the map appears to change width.

### The fix

Replace the dynamic clip with a single fixed rectangle covering the tile grid exactly:

```
ctx.rect(MAP_X, MAP_Y, VIEWPORT_COLS × TILE_SIZE, LOGICAL_H − MAP_Y)
     ↑ 10px        ↑ 50px    ↑ 360px wide                ↑ 794px tall
     never changes            never changes
```

The panels draw after the map (they already do), so they naturally overlay the map canvas. The
map renders at full height within a fixed-width boundary; the panel's solid `--surface`
background hides everything beneath it. The draw order (map → panels → floating UI) is
unchanged.

### Two registers — after the fix

In all three states the map clip rectangle is identical: x = 10–370, y = 50–844.

```
←10px→←─────── 360 px tile grid ────────→←20px→
      ┌─────────────────────────────────┐
      │        [status bar ~50px]       │        ← y = 0–50 (outside clip)
      ├─────────────────────────────────┤
      │                                 │        ↑
      │          DUNGEON MAP            │        │ fixed clip region
      │    (soft-follow cam; 1× zoom)   │        │ y = 50–844
      │                                 │        ↓
      └─────────────────────────────────┘
            NAVIGATION REGISTER (idle)

      ┌─────────────────────────────────┐
      │        [status bar ~50px]       │
      ├─────────────────────────────────┤
      │          DUNGEON MAP            │        ← same fixed clip region
      │    (soft-follow cam; 1× zoom)   │
      ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄
      │     [room selection cards]      │        ← panel overlays from PANEL_TOP
      └─────────────────────────────────┘
            NAVIGATION REGISTER (choosing)

      ┌─────────────────────────────────┐
      │        [status bar ~50px]       │
      ├─────────────────────────────────┤
      │          DUNGEON MAP            │        ← same fixed clip region
      │    (zoomed; room centred in     │          tiles clipped at x=10 and x=370
      │     visible area above panel)   │          same bg strips as nav
      ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄
      │  PIP ████     GOBLIN ████      │        ← panel overlays from COMBAT_PANEL_TOP
      │  [dice] [actions]               │
      └─────────────────────────────────┘
            ENCOUNTER REGISTER (combat)
```

### Camera target is unchanged

`COMBAT_MAP_CENTER_Y = MAP_Y + (COMBAT_PANEL_TOP − MAP_Y) / 2 ≈ 240`

This is the vertical midpoint of the area the player can *see* above the panel — unchanged
regardless of whether the full canvas extends below. The camera still zooms to put the active
room tile at that point.

### Edge case: panel rounded corners

The room-selection panel and encounter panels use rounded top corners. With the overlay approach,
map tiles extend to the screen edge and the corners of the panel round against the background
`--bg` colour. Because `--bg` fills the whole canvas before the map is drawn, the corner arc
will show `--bg` rather than a map tile — identical to the current behaviour. No visual change.

### Edge case: transition mid-flight

During a rising or falling transition `currentPanelTop` animates between positions. Currently the
map clip follows this value, meaning the map visibly shrinks or grows. After the fix, only the
panel moves; the map is static. The panel rises over a static dungeon, which is both correct and
reads more clearly as "the panel is a surface that slides in front of the world."

## Visual design

No new visual elements. The change is structural (clip region) rather than aesthetic.

**Before vs. after — width at stable states:**

```
BEFORE (current)                        AFTER (this feature)

Navigation (1× zoom)                    Navigation (1× zoom)
┌──────────────────────────┐            ┌──────────────────────────┐
│      [status bar]        │            │      [status bar]        │
├──────────────────────────┤            ├──────────────────────────┤
│·│                    │···│  ← bg gap  │·│                    │···│  ← same gaps
│·│   tile grid 360px  │···│            │·│   tile grid 360px  │···│
└──────────────────────────┘            └──────────────────────────┘

Combat (2.3× zoom)                      Combat (2.3× zoom)
┌──────────────────────────┐            ┌──────────────────────────┐
│      [status bar]        │            │      [status bar]        │
├──────────────────────────┤            ├──────────────────────────┤
│    tiles fill 390px      │ ← wider!   │·│   tiles clipped    │···│  ← same gaps
│   (no side bg strips)    │            │·│   at same boundary │···│    as nav
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄            ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
│      [combat panel]      │            │      [combat panel]      │
└──────────────────────────┘            └──────────────────────────┘
```

**Before vs. after — height during combat transition:**

```
BEFORE (current)               AFTER (this feature)

 t = 0 ms (nav idle)            t = 0 ms (nav idle)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │ MAP (794 px)    │            │ MAP (794 px)    │
 └─────────────────┘            └─────────────────┘

 t = 150 ms (mid-transition)    t = 150 ms (mid-transition)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │ MAP (587 px)    │ ← shrinks  │ MAP (794 px)    │ ← unchanged
 │ ┌─────────────┐ │            │ ┌─────────────┐ │
 │ │(panel mid)  │ │            │ │(panel mid)  │ │
 └─┴─────────────┴─┘            └─┴─────────────┴─┘

 t = 300 ms (combat)            t = 300 ms (combat)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │ MAP (380 px)    │ ← small    │ MAP (794 px)    │ ← unchanged
 ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤            ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
 │ [combat panel]  │            │ [combat panel]  │
 └─────────────────┘            └─────────────────┘
```

**Color tokens:** None. No new tokens required.

**Typography / sizing:** No changes.

## Open questions

None. This is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** · **PR:**

### What was built

### Evidence

### Play-test
