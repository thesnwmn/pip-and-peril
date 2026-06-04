# 033 · Navigation Panel Extract

**Status:** SHIPPED
**Source idea:** Manager request
**Depends on:** none

## Summary

`screens/game.ts` has grown to 822 lines by accumulating layout constants, drawing utilities,
and UI panel code alongside the game loop and encounter wiring. This feature is a pure
**file-organisation refactor** — no behaviour changes, no new functionality. It extracts two
distinct concerns out of `game.ts`: canvas layout constants move to a dedicated layout module,
and all navigation-mode UI (status bar, nav arrows, whisper overlay, room selection cards and
panel) moves to a new `navigation/panel.ts` module that follows the established panel factory
pattern. `game.ts` drops below 500 lines and becomes an orchestrator rather than a monolith.

## Acceptance criteria

1. All canvas layout constants (`LOGICAL_W`, `LOGICAL_H`, `STATUS_BAR_H`, `MAP_BOTTOM`,
   `PANEL_TOP`, `CARD_W`, `CARD_H`, `VIEWPORT_COLS`, `VIEWPORT_ROWS`, the encounter geometry
   constants, `TRANSITION_DURATION`, etc.) are defined in a single dedicated module and imported
   wherever they are needed. No layout constant is duplicated across files.

2. A `createNavigationPanel()` factory function lives in `navigation/panel.ts` and returns an
   object with at minimum `draw`, `handleClick`, and `handlePointerMove` methods — the same
   shape as `dice/panel.ts`, `menu/modal.ts`, and `satchel/overlay.ts`.

3. The navigation panel module owns and internally manages:
   - the status bar (floor label, depth display)
   - navigation arrows on the map area (including their hit detection)
   - the situated whisper overlay
   - the room selection panel header, cards, card hover state, and card teases

4. `screens/game.ts` contains no direct drawing code for any of the elements listed in
   criterion 3. It delegates to the navigation panel for all navigation-mode rendering and
   hit-testing.

5. `screens/game.ts` line count is below 500 lines.

6. All behaviour is identical to before: navigation, room selection, card hover, combat,
   overlays, menus, and satchel all work exactly as they did.

7. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

## Scope / non-goals

- No changes to the encounter register or transition logic (`EncounterTransition`,
  `computeCanvasState`, `checkCombatTrigger`, `startFallingTransition`). Those remain in
  `game.ts` until feature 034.
- No changes to the dice panel, combat panel, menu modal, or satchel overlay.
- No new player-facing functionality.
- No changes to existing test files beyond import path updates if constants move.

## Dependencies

None. This is the prerequisite for 034.

## Design detail

### What moves and where

```
screens/game.ts  (before: 822 lines)
│
├── layout constants ──────────────► screens/game-layout.ts  (new)
│   LOGICAL_W, LOGICAL_H,              Flat named exports.
│   STATUS_BAR_H, MAP_BOTTOM,          Imported by game.ts, navigation/panel.ts,
│   PANEL_TOP, CARD_*, VIEWPORT_*,     and any other file that currently needs them.
│   ARROW_HALF, ENCOUNTER_PANEL_GAP,
│   COMBAT_PANEL_TOP, TRANSITION_DURATION,
│   COMBAT_MAP_CENTER_Y
│
├── navigation UI ─────────────────► navigation/panel.ts  (new)
│   cardColors()                        Factory: createNavigationPanel(...)
│   drawNavArrows()                     Returns { draw, handleClick, handlePointerMove }
│   drawStatusBar()
│   drawSituatedWhisper()              Internal state the panel owns:
│   wrapText()                           - cardTeases[]
│   drawCard()                           - hoveredElement
│   drawRoomPanel()
│   WhisperState interface
│   cardTeases / hoveredElement state
│
└── game.ts  (after: <500 lines)
    Owns: dungeon state, combat state, pip HP,
    transition state, lifecycle, and the
    orchestrating draw/click/pointer loop.
```

### Navigation panel: intent and boundaries

The factory is called once when the game screen is created, in the same way as
`createDicePanel`, `createMenuModal`, and `createSatchelOverlay`. It receives any getters or
callbacks it needs to read game state (dungeon state, whisper timing) and to signal player
actions (card chosen, direction tapped) back to the game screen. The game screen owns all
state updates that follow from those signals.

The panel draws over the map area as well as the panel zone below it — nav arrows and the
whisper sit on top of the dungeon tiles. This is consistent with how the satchel overlay and
menu modal draw over the whole canvas. The navigation panel is simply the first panel-shaped
module that draws into the map zone as a normal part of its job.

### Communication pattern

The navigation panel signals choices upward (card selected at index N, direction tile tapped)
rather than mutating game state itself. The game screen listens and applies the resulting state
changes. The specific mechanism — callbacks at creation time, return values from handleClick,
or an event-like object — is the Engineer's call; the intent is one-way data flow: game state
down into the panel for rendering, player actions up from the panel as signals.

## Open questions

None. This is a file reorganisation; all behaviour is already decided.

## Shipped

**Shipped:** 2026-06-04

### What was built

- **`src/screens/game-layout.ts`** (new, 33 lines) — all canvas layout constants extracted from `game.ts` as flat named exports: `LOGICAL_W`, `LOGICAL_H`, `STATUS_BAR_H`, `MAP_BOTTOM`, `PANEL_TOP` and all card/viewport/encounter constants.
- **`src/navigation/panel.ts`** (new, 381 lines) — `createNavigationPanel()` factory returning `{ draw, handleClick, handlePointerMove, setTeases, clearTeases, triggerWhisper, clearWhisper }`. Owns internal state: `cardTeases`, `hoveredElement`, `whisper`, `hitRects`. Draws status bar, nav arrows, situated whisper, and room selection panel. Signals card choices upward via `onCardChosen` callback.
- **`src/screens/game.ts`** reduced from 829 → 480 lines. Now imports layout constants from `game-layout.ts` and delegates all navigation-mode rendering and card hit-testing to `navPanel`. Whisper state fully moved to the panel (trigger/clear via panel methods).

### Test evidence

All 14 test files, 201 tests pass. `npm run typecheck` clean. `npm run build` succeeds (30 modules, 44.88 kB bundle). `bash init.sh` passes end-to-end.

### Inline Reviewer pass

Reviewer raised: unused imports (`E`, `N`, `S`, `W`, `ExitMask`, `RoomOffering`, `chebyshev`, `availableDirs`) left in `game.ts` after the refactor. Fixed before push. All other candidates (room-panel guard during encounter register, hitRects initialisation race, draw-order z-layering) were refuted as either unreachable via the current state machine or pre-existing non-regressions.

### Play-test instructions

1. `npm run dev` → open http://localhost:5173
2. From Main Menu → New Game. Verify status bar shows "FLOOR 1" and "Depth 0".
3. Tap a map tile adjacent to Pip. Three room-selection cards should appear in the panel. Hover each card (mouse) to confirm hover highlight. Tap a card to place the room and move Pip.
4. The whisper overlay should appear briefly after entering a new room (fades in ~2.5 s).
5. Enter an enemy room — the combat tray should rise with the elastic animation. Play through combat (Roll → Strike/Evade/Focus). Victory/defeat should work as before.
6. Open the Menu (top-left) and open the Satchel (bottom-right) — both overlays should behave normally.
7. Navigate several rooms and confirm depth counter increments correctly.

All of the above is pure behaviour verification — the refactor introduces no new player-facing features.

### PR

PR link to be added after push.
