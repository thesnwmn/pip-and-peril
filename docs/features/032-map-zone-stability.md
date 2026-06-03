# 032 · Map Zone Stability

**Status:** READY
**Source idea:** Manager request (2026-06-03)
**Depends on:** 030 (elastic canvas — established the clipping behaviour this fixes), 031 (log view
redesign — whisper anchored within the map zone)

## Summary

Right now the map canvas clip region shrinks when combat begins: navigation idle draws the map at
full height (~794 px); once the encounter panel rises, the map is clipped to the upper ~380 px.
This makes the dungeon feel spatially unstable — the stage itself shrinks when the stakes go up.
This feature fixes that: the map zone is a **fixed constant** at all times. Encounter panels (and
the room-selection panel) render on top of the map, overlaying its lower portion rather than
compressing it. Camera zoom is unchanged — the dungeon zooms in within the same physical area,
so the player's spatial anchor never moves.

## Acceptance criteria

1. The map canvas clip region is constant in every game state: navigation idle, navigation
   choosing, encounter transition, and active encounter (combat or otherwise). It is always
   `MAP_Y` to `LOGICAL_H` — the full height below the status bar.
2. In navigation idle state the visual result is unchanged: the map fills the full screen below
   the status bar. No encounter panel is visible.
3. In navigation choosing state the room-selection panel renders on top of the map, overlaying
   the map from `PANEL_TOP` downward. The map tile rendering extends to full screen height; the
   panel's solid background covers the tiles below `PANEL_TOP`. The panel's appearance is
   visually unchanged from the current implementation.
4. When combat begins the encounter panel rises from the screen bottom and overlays the lower
   portion of the map. The map canvas clip does not change during the transition — only the
   panel position changes.
5. In stable combat state the combat panel occupies approximately the lower 50 % of the screen.
   The map fills the full height behind it; the panel's solid background hides the dungeon tiles
   beneath it. The panel's appearance is visually unchanged from the current implementation.
6. The camera zoom behaviour during combat is unchanged from feature 030: the camera still
   transitions to centre the active room tile in the visible area above the panel, at the same
   zoom level. `COMBAT_MAP_CENTER_Y` remains the vertical midpoint of the area from `MAP_Y` to
   `COMBAT_PANEL_TOP`.
7. All transition animations (panel rise/fall, camera zoom in/out) are smooth and visually
   identical to the current behaviour, except that the map no longer clips to follow the rising
   or falling panel edge.
8. The situated whisper (031) continues to appear and fade correctly during navigation idle; it
   is not visible during any encounter state (unchanged guard conditions).
9. `npm run typecheck` exits zero errors.
10. `npm run test` passes. All existing tests continue to pass without modification.

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

### The root cause

In `src/screens/game.ts`, the draw loop computes:

```
mapAreaH = max(0, currentPanelTop − MAP_Y)
```

`currentPanelTop` animates from `LOGICAL_H` (nav idle) down to `COMBAT_PANEL_TOP` (~430 px)
as the encounter panel rises. The clip rectangle shrinks with it: the map literally gets smaller
on screen.

### The fix

Replace the dynamic clip with a fixed one:

```
mapAreaH = LOGICAL_H − MAP_Y   ← constant; never changes
```

The panels draw after the map (they already do), so they naturally overlay the map canvas. The
map renders at full height; the panel's solid `--surface` background hides everything beneath it.
The draw order (map → panels → floating UI) is unchanged.

### Two registers — after the fix

```
NAVIGATION REGISTER (idle)
─────────────────────────────
 [status bar ~50px]
─────────────────────────────

      DUNGEON MAP              full height (MAP_Y → LOGICAL_H)
 (soft-follow cam; 1× zoom)


─────────────────────────────
 [≡ menu]          [bag]

NAVIGATION REGISTER (choosing)
─────────────────────────────
 [status bar ~50px]
─────────────────────────────

      DUNGEON MAP              same full-height canvas
 (soft-follow cam; 1× zoom)
                               ← map renders here too, hidden by panel below
┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄    panel edge (PANEL_TOP); overlays map from here
 [room selection cards]        solid panel background hides map below edge
─────────────────────────────

ENCOUNTER REGISTER (combat)
─────────────────────────────
 [status bar ~50px]
─────────────────────────────

      DUNGEON MAP              same full-height canvas
   (zoomed; room centred in    ← camera still targets upper visible zone
    area above panel edge)
                               ← map renders here too, hidden by panel below
┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄    panel edge (~50 %); overlays map from here
 PIP ████    GOBLIN ████       solid panel background hides map below edge
 [dice] [actions]
─────────────────────────────
```

The critical property: the map clip rectangle in all three diagrams above is **identical**. Only
the panel overlay changes between them.

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

**Before vs. after — map height during combat transition:**

```
BEFORE (current)               AFTER (this feature)

 t = 0 ms (nav idle)            t = 0 ms (nav idle)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │                 │            │                 │
 │ MAP (794 px)    │            │ MAP (794 px)    │
 │                 │            │                 │
 │                 │            │                 │
 └─────────────────┘            └─────────────────┘

 t = 150 ms (mid-transition)    t = 150 ms (mid-transition)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │                 │            │                 │
 │ MAP (587 px)    │ ← shrinks  │ MAP (794 px)    │ ← unchanged
 │                 │            │                 │
 │ ┌─────────────┐ │            │ ┌─────────────┐ │
 │ │(panel mid)  │ │            │ │(panel mid)  │ │
 └─┴─────────────┴─┘            └─┴─────────────┴─┘

 t = 300 ms (combat)            t = 300 ms (combat)
 ┌─────────────────┐            ┌─────────────────┐
 │ [status bar]    │            │ [status bar]     │
 ├─────────────────┤            ├─────────────────┤
 │                 │            │                 │
 │ MAP (380 px)    │ ← small    │ MAP (794 px)    │ ← unchanged
 │                 │            │                 │
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
