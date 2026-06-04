# 033 · Navigation Panel Extract

**Status:** READY
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
