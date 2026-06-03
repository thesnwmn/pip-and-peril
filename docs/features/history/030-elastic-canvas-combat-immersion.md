# 030 · Elastic Canvas & Combat Immersion

**Status:** READY
**Source idea:** Idea 019 (Elastic Canvas Infrastructure), Idea 012 (Immersive Combat Overlay)
**Depends on:** 006 (combat encounter + panel), 017 (soft camera follow)

## Summary

Establishes the **elastic canvas** as the game's structural architecture: the dungeon map is always
present and never disappears — encounters happen *in* the dungeon, not in a separate space. Two
registers organise every game state. The **navigation register** fills the canvas with the map.
The **encounter register** compresses the map into the upper portion while a context panel **rises
from the screen bottom** and the camera adjusts above; both motions arrive simultaneously in
200–350ms.

Combat is retrofitted as the first encounter consumer. When Pip enters an enemy room the combat
panel now **animates into view** (rises from the screen edge) while the camera **smoothly zooms to
medium-close** — the room tile fills the visible map area with Pip and the enemy readable inside it.
On victory or defeat the panel sinks and the camera returns to navigation framing.

The infrastructure delivered here is the foundation all subsequent encounter features (021, 023,
025, 026, 027, 028) depend on. Each will supply its own panel height and camera configuration;
none will need to build the animation plumbing from scratch.

## Acceptance criteria

### Navigation register

1. In any navigation state (idle, choosing), no encounter panel is present. The map canvas
   occupies the full height between the status bar and the screen edge.
2. The navigation camera soft-follows Pip using the 017 dead-zone and boundary-clamping
   behaviour, at the base (1×) tile size. Navigation camera behaviour is unchanged from 017.
3. Floating UI elements (satchel button, navigation arrows) remain at their current positions
   and are fully visible in the navigation register.

### Encounter register — panel

4. When a combat encounter begins, the encounter panel rises from below the screen edge to its
   target position. The full rise completes in 200–350ms with an ease-out curve.
5. When combat ends (victory or defeat dismissal), the panel sinks from its target position back
   below the screen edge in 200–350ms with an ease-in curve.
6. Panel height is configurable per encounter type. The combat panel height is approximately 50%
   of the available canvas height (canvas height minus status bar height).
7. During a panel rise or fall the map canvas seamlessly fills the space above the panel edge —
   no gap, overlap, or hard-cut artifact between map and panel.

### Encounter register — camera

8. When combat begins, the camera simultaneously transitions to the **combat camera**: centred on
   the active room tile, at a zoom level where the room tile occupies approximately 40–60% of the
   available map height above the panel. The transition uses the same ease-out curve as the panel
   rise and completes within the same 200–350ms window.
9. During combat the soft-follow dead zone is suspended. The camera stays locked on the active
   room tile; it does not drift as Pip's notional position updates.
10. When the combat panel is dismissed, the camera simultaneously transitions back to the
    navigation framing: zoom returns to base tile size and soft-follow resumes from Pip's current
    position. The transition completes in 200–350ms with an ease-in curve.
11. All camera transitions are smooth — no snap, no jump — including the return to navigation
    where the camera centre has not changed (combat locked on Pip's tile, nav begins following
    the same tile).

### Combat retrofit

12. All combat panel content from 006 — HP bars in the status bar, dice pool, action buttons,
    log line, victory and defeat banners — is visually and functionally preserved. No combat
    mechanic is changed by this feature.
13. All acceptance criteria from 006 (AC 1–21) continue to pass after the retrofit.
14. The combat panel rises with an animation when the encounter begins (per AC 4), rather than
    appearing instantly as in the 006 implementation.
15. The satchel button is covered by the raised combat panel during encounters, preserving the
    existing behaviour from 016.

### Infrastructure API

16. The encounter panel system is driven by a configuration object supplied per encounter type.
    The configuration specifies at minimum: panel height fraction (0.0–1.0 of available canvas
    height), camera zoom multiplier, camera target mode (room-lock or follow-Pip), and transition
    speed (normal or snap). The combat configuration is the only consumer in this feature; the
    configuration shape is designed to accommodate any future encounter type without API changes.
17. The navigation camera behaviour and the encounter camera behaviour are cleanly separated in
    code. Switching between them requires only swapping the active camera configuration, not
    restructuring the renderer.

### Quality

18. `npm run typecheck` exits zero errors.
19. `npm run test` passes. All existing tests — including the full 006 combat suite — pass
    without modification after the retrofit.
20. New unit tests cover the animation interpolation functions: given start value, end value,
    elapsed time, and total duration, each easing function returns the correct value at t=0,
    t=half-duration, and t=full-duration.

## Scope / non-goals

- **No new encounter panel content.** This feature only retrofits the combat panel. Shop, NPC,
  chest, trap, and boss panels are each specced and built in their own features (027, 028, 026,
  025, 023).
- **No non-combat camera configurations.** Camera behaviours for shop, NPC, chest, trap, and boss
  encounters (detailed in `docs/concept/screen-layout-and-transitions.md`) are specified and
  implemented per encounter feature. This feature defines the combat configuration only.
- **No situated whisper.** The world narration map-canvas overlay described in
  `screen-layout-and-transitions.md` is a separate design; the existing log strip (004) is
  unchanged.
- **No log strip replacement.** The three-line log strip from 004 is left in place. During
  encounters the panel covers it naturally; no structural change needed.
- **No status bar redesign.** HP bars in combat mode (006) and floor/depth in nav mode are
  unchanged.
- **No boss camera drama.** The boss-specific camera sequence (wide pull, title card, tight zoom)
  belongs to feature 023.
- **No room selection card changes.** The room selection cards (004) rise from the bottom in the
  nav register and continue to use their existing layout; they are not part of the encounter panel
  system.
- **No floating button repositioning.** Menu and satchel button positions are not changed by
  this feature.

## Design detail

### The two registers

```
NAVIGATION REGISTER
─────────────────────────────
 [status bar ~50px]
─────────────────────────────


      DUNGEON MAP              full height below status bar
 (camera soft-follows Pip;
   base tile size / 1× zoom)

─────────────────────────────
 [≡ menu]          [bag]       existing floating buttons


ENCOUNTER REGISTER (combat example)
─────────────────────────────
 [status bar ~50px]
─────────────────────────────

   DUNGEON MAP                ~50% of available height
   camera locked on           zoom ~1.5–2× base tile size
   active room tile

┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄    panel edge; rises to here
 PIP ████    GOBLIN ████      ~50% of available height
 [d6🔴][d4🟢][d8🟡]
 [Strike 2🔴] [Dodge 1🟢]
 [ log line ]
─────────────────────────────
```

### Transition choreography

```
[NAVIGATION — idle]
      │
      │  Pip moves into enemy room (not cleared)
      ▼
[TRANSITION — 200–350ms, simultaneous]
  Panel: rises from y=screen_bottom → y=panel_top        ease-out ↑
  Camera zoom: base_tile_size → combat_tile_size          ease-out ↑
  Camera centre: soft-follow position → active room       ease-out ↑
      │
      ▼
[COMBAT — panel stable, camera stable]
  Combat proceeds per 006 state machine.
      │
      │  Victory or defeat; player taps or timeout
      ▼
[TRANSITION — 200–350ms, simultaneous]
  Panel: sinks from y=panel_top → y=screen_bottom         ease-in ↓
  Camera zoom: combat_tile_size → base_tile_size           ease-in ↓
  Camera centre: active room → Pip (re-enables soft-follow) ease-in ↓
      │
      ▼
[NAVIGATION — idle resumed]
  Log strip uncovered. Nav arrows restored. Soft-follow active.
```

### Panel configuration shape

Each encounter type provides a configuration that the panel system uses. Naming and shape are a
boundary the Engineer should stay close to; the field set must not grow beyond these four concerns
for the encounters specced so far:

- **Height fraction** — share of available canvas height the panel occupies. Combat: ≈ 0.50.
- **Camera zoom** — multiplier on base tile size. Combat: ≈ 1.5–2× (Engineer calibrates on
  device). Navigation: 1.0×.
- **Camera target** — `'room'`: lock camera on active tile centre, suspend soft-follow.
  `'pip'`: maintain soft-follow. Combat uses `'room'`.
- **Transition speed** — `'normal'`: 200–350ms eased (most encounters). `'snap'`: near-instant,
  reserved for traps (025). Included now so feature 025 does not need to extend the API.

### Camera configuration summary

| State | Zoom | Target | Curve |
|---|---|---|---|
| Navigation | 1× base tile size | Soft-follow Pip (017) | — |
| Combat (rising) | ~1.5–2× | Room-lock on active tile | ease-out |
| Combat (falling) | 1× | Pip current position → soft-follow | ease-in |

The exact zoom multiplier is a tuning value the Engineer sets after rendering on a target screen
size. Aim: the active room tile occupies 40–60% of the map area height above the panel.

### Edge cases

- **Nav input during transition.** Navigation inputs (tap an exit, room selection) are ignored
  while a panel rise or fall is in flight. The 200–350ms window is short enough that no
  debounce message is required.
- **Camera at map boundary during combat.** If the active room is in a corner the camera clamps
  per 017 boundary behaviour. The zoom level is unchanged; clamping may offset the room from
  centre. This is acceptable.
- **Return to nav after combat.** The camera was locked on the active room tile — which is Pip's
  current tile. The return transition re-enables soft-follow at that position. Because Pip has not
  moved, no positional jump occurs.
- **Multiple combats in sequence.** Each combat is a clean enter/exit cycle. Panel fully descends
  before the nav register restores; the next enemy room can be entered normally.

## Visual design

### Panel rise sketch (three moments)

```
t = 0ms (nav)       t = 150ms (mid)      t = 300ms (combat)

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ [status bar] │    │ [status bar] │    │ [status bar] │
├──────────────┤    ├──────────────┤    ├──────────────┤
│              │    │              │    │              │
│  MAP (nav    │    │  MAP         │    │  MAP (combat │
│   zoom)      │    │  (zooming)   │    │   zoom)      │
│              │    │              │    │              │
│              │    │              │    ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│              │    │ ┌──────────┐ │    │ [HP bars]    │
│              │    │ │ (partial)│ │    │ [dice]       │
└──────────────┘    └─┴──────────┴─┘    │ [actions]    │
                                         └──────────────┘
```

The map portion above the panel edge shrinks smoothly as the panel rises. The panel clips at the
screen edge — no visible letterbox or background bleed below it.

### Color tokens

No new tokens. The combat panel surface uses `--surface` (`#14142a`) as established in 006. The
panel edge (the top border of the combat panel) uses the existing gold border line from 006.

### Typography / sizing

No typography changes. All combat panel content (HP bars, dice, actions, log, banners) is
unchanged from 006 in size, weight, and colour.

## Open questions

None. The zoom multiplier is intentionally left for the Engineer to calibrate on a real device
within the intent stated above. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-03 · **PR:** #TBD

### What was built

- **`src/animation/easing.ts`** — `easeOut`, `easeIn`, `lerp` pure math functions (cubic easing).
- **`src/encounter/config.ts`** — `EncounterConfig` interface + `COMBAT_CONFIG` (panelHeightFraction 0.50, cameraZoom 2.3×, cameraTarget `'room'`, transitionSpeed `'normal'`). Zoom of 2.3× calibrated so the active room tile occupies ~42% of map area height (within the 40–60% target).
- **`src/screens/game.ts`** — Elastic canvas state machine: `EncounterTransition` discriminated union, `computeCanvasState()` interpolator, full draw-loop orchestration. Rising uses ease-out; falling uses ease-in; both complete in 300 ms. Canvas transform (clip + scale anchored at pip-canvas centre → map-area centre) handles camera zoom without modifying `renderer.ts`. Nav input and dice interaction are blocked during transitions.
- **`src/dice/panel.ts`** — `getPanelTop: () => number` getter added to factory; draw applies `ctx.translate(0, offset)` and hit rects shift by the same offset so click/hover stay aligned.
- **`src/combat/panel.ts`** — `drawCombatBanner` accepts required `panelTopOverride: number` and applies the same translate pattern.

All 006 combat AC (1–21) continue to pass unchanged. New animation math tests in `src/animation/easing.test.ts`.

### Evidence

- `npm run test` — 197 tests pass (13 test files), including the full 006 combat suite and new easing unit tests.
- `npm run typecheck` — zero errors on source files.
- New tests: `easeOut` at t=0/0.5/1; `easeIn` at t=0/0.5/1; `lerp` at t=0/0.5/1 and descending range.

### Play-test

1. Open the game (`npm run dev` → http://localhost:5173). Start a new run.
2. Confirm the map fills the full canvas below the status bar and nav arrows work as before.
3. Navigate to an **enemy** room (enter via room-selection card, or backtrack into a cleared enemy room).
4. **Rise animation**: combat panel slides up from screen bottom in ~300 ms with ease-out. Map simultaneously zooms in; active room tile fills ~40–50% of map area above panel. Confirm no snap or jump.
5. Play combat: roll dice, use Strike/Evade/Focus. Confirm HP bars, dice, and action buttons work.
6. **Win**: observe victory banner. Wait ~1.5 s or tap — panel sinks in ~300 ms with ease-in, map zooms back to 1×, soft-follow resumes. Nav arrows reappear.
7. Enter a second enemy room — confirm each combat is a clean enter/exit cycle.
8. **Lose** (let Pip reach 0 HP): observe defeat banner, panel sinks, game transitions to home screen.
