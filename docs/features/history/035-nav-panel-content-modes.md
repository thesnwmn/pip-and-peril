# 035 · Navigation Panel Content Modes & Direction Buttons

**Status:** SHIPPED
**Source idea:** Manager request
**Depends on:** 033 (navigation panel module)

## Summary

The navigation panel becomes a permanent, always-visible layer below the map — it never hides.
It cycles through three content modes as play progresses: **IDLE** (a cross of four directional
buttons), **CHOOSING** (room selection cards), and **WHISPER** (situated room text). Direction
input moves from the map-zone tap arrows into touch-friendly buttons in the panel, bringing the
primary input target closer to the player's thumb on a portrait screen. The map zone sheds its
directional arrows; fog exits are marked instead with a low-contrast "?" glyph. Room selection
cards are vertically centred in the panel. The situated whisper moves from the map zone into the
top of the panel zone, positioning it to be covered last when an encounter panel rises over the
navigation layer (per feature 034).

## Acceptance criteria

1. The navigation panel is always rendered at a fixed vertical position (`PANEL_TOP` to
   `LOGICAL_H`). It is never hidden. The map zone height is permanently the constrained height
   it has today during room selection.

2. **IDLE mode** — the panel zone shows a cross of four directional buttons (N, S, E, W)
   centred horizontally and vertically within the panel zone. Each button is large enough for
   a comfortable one-handed thumb tap.

3. Each direction button reflects the exit state for that direction:
   - **No exit** — rendered in muted grey (`navDirNone`); non-interactive.
   - **Fog exit** (room not yet placed) — rendered in gold (`navDirFog`); tappable.
   - **Backtrack exit** (room already visited) — rendered in darker amber (`navDirBack`);
     tappable.

4. Tapping a fog or backtrack button transitions the panel to **CHOOSING mode**: direction
   buttons cross-fade out rapidly, room selection cards cross-fade in.

5. Room selection cards are vertically centred within the panel zone height.

6. There is no way to cancel room selection once cards are showing — the player must tap a card.

7. After a card is tapped, the panel transitions to **WHISPER mode**: cards cross-fade out
   rapidly, the situated whisper text for the entered room cross-fades in near the top of the
   panel zone.

8. Tapping a backtrack button skips CHOOSING mode (the room is already placed; no card
   selection is needed) and transitions directly to WHISPER mode for the entered room.

9. From WHISPER mode:
   - If an encounter triggers: the encounter panel rises as a separate layer over the nav panel
     per feature 034. The whisper remains visible near the top of the nav panel until the
     encounter panel covers it.
   - If no encounter: after the whisper duration the panel cross-fades back to IDLE mode,
     showing the new room's available exits.

10. The situated whisper renders in the panel zone, not the map zone. No whisper content
    appears in the map zone.

11. Map-zone directional arrows are removed. In their place, a low-contrast "?" glyph is
    rendered at the same viewport-edge position for **fog exits only**. Backtrack exits and
    impassable directions have no map-zone indicator.

12. After an encounter ends (victory outcome, per 034), the nav panel resets to IDLE mode —
    no cards, no whisper — showing the cleared room's available exits.

13. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

## Scope / non-goals

- No new encounter types.
- No ancillary content in IDLE mode — the direction cross is the anchor; additional idle
  content is a future spec. Space around the cross is intentionally left empty for now.
- Transition timing (cross-fade duration, whisper hold duration) is the Engineer's call,
  consistent with the game's existing animation pacing.
- No changes to encounter panel behaviour — that is spec 034's territory.

## Dependencies

- 033 — navigation panel module (`createNavigationPanel` factory and internal state)

## Design detail

### Content mode state machine

```
        game starts / pip in room
                │
                ▼
      ┌──────────────────┐
      │      IDLE        │◄─────────────────────────────────┐
      │  Direction cross  │                                  │
      └──┬───────────┬───┘                                  │
         │ fog       │ backtrack                            │
         ▼           │                                      │
      ┌──────────────────┐                    whisper ends  │
      │    CHOOSING      │                    (no encounter) │
      │  Room cards      │                                  │
      └────────┬─────────┘                                  │
               │ card tapped         ┌─────────────────┐   │
               └────────────────────►│    WHISPER       │   │
                  (backtrack also    │  Room text, top  │───┘
                   arrives here,     │  of panel zone   │
                   skipping choosing)└────────┬─────────┘
                                              │ encounter
                                              │ triggers
                                              ▼
                                     encounter panel rises
                                     over nav (spec 034)
```

### Direction button layout

```
┌──────────────────────────────────────────┐  ← PANEL_TOP (430)
│                                          │
│               ┌──────┐                  │
│               │  N   │                  │
│          ┌────┐└──────┘┌────┐           │
│          │ W  │        │ E  │           │
│          └────┘┌──────┐└────┘           │
│               │  S   │                  │
│               └──────┘                  │
│                                         │
│   (space around cross reserved for      │
│    future idle content)                 │
│                                         │
└──────────────────────────────────────────┘  ← LOGICAL_H (844)
```

Cross centered horizontally at `LOGICAL_W / 2` and vertically within the panel zone
(`PANEL_TOP + panelHeight / 2`, where `panelHeight = LOGICAL_H − PANEL_TOP = 414`).
Button size and inter-button gap chosen by the Engineer for comfortable thumb reach;
44 logical px touch target minimum per button is the floor.

### Room selection cards

Cards are vertically centred within the panel zone (same horizontal layout as today).
This keeps the player's focal point consistent across mode transitions — the cross and
the cards share the same vertical centre.

### Whisper positioning

The whisper text sits near the top of the panel zone, a short margin below `PANEL_TOP`.
This ensures it is the last nav-panel element to be covered as the encounter panel rises
from `LOGICAL_H`. The encounter panel's bottom edge reaches `PANEL_TOP` only at the end
of the RISING animation, so the whisper remains readable throughout most of the rise.

### Mode transitions

All transitions are rapid cross-fades. The duration is the Engineer's call; 100–200 ms
is consistent with the game's existing quick state changes. The direction buttons, cards,
and whisper text each fade independently — there is no intermediate blank frame.

### Map-zone "?" markers

```
┌──────────────────────────────────────────┐  ← STATUS_BAR_H
│                                          │
│                  [?]  ← fog N            │
│                                          │
│          [?]   Pip   [?]                 │
│          ← W         E →                 │
│                                          │
│                  [?]  ← fog S            │
│                                          │
└──────────────────────────────────────────┘
```

One glyph per fog exit, at the same viewport-edge position the current directional arrow
occupies. Backtrack exits and impassable directions: no map marker. The "?" is rendered
in `navFogMark` — a dark, muted blue chosen for low contrast against the dungeon canvas
so it reads as ambient texture rather than a primary UI element.

### Backtrack: no room selection

When a backtrack direction is tapped, the adjacent tile is already placed — no room
choice is needed. The panel goes directly to WHISPER mode as Pip enters the room.
The whisper content (if any) is the same as it would be on first entry — the room
type determines the text, not the direction of travel.

### Reset after encounter (interface with 034)

When the encounter registry signals a victory outcome and the FALLING animation
completes, the nav panel is notified to return to IDLE mode. At that point the room
is cleared, Pip is standing in it, and navigation resumes from a fresh IDLE state.
The exact signal mechanism (callback, method call) is the Engineer's call.

## Visual design

### Layout wireframe — full panel height

```
┌─────────────────────────────────────────┐  430 = PANEL_TOP
│                                         │
│  IDLE           CHOOSING    WHISPER     │
│                                         │
│     [N]         ┌──┬──┬──┐  "Something  │
│  [W]  [E]       │  │  │  │   stirs in   │
│     [S]         └──┴──┴──┘   the dark…" │
│                   ▲cards                │
│  (one mode        centred               │
│   at a time)      vertically            │
│                                         │
└─────────────────────────────────────────┘  844 = LOGICAL_H
```

### Color tokens

| Token | Value | Role |
|---|---|---|
| `navDirNone` | `#3a3a50` | Direction button — no exit (muted, non-interactive) |
| `navDirFog` | `#c8941e` | Direction button — fog exit (reuses existing `gold`) |
| `navDirBack` | `#7a5010` | Direction button — backtrack exit (darker amber) |
| `navFogMark` | `#1e2b54` | Map-zone "?" glyph — fog exit (low-contrast muted blue) |

`navDirFog` deliberately reuses the established `gold` token — fog directions are the
primary action affordance and should carry the same visual weight as other CTAs in the
game. `navDirBack` is approximately half the luminosity of gold, warm enough to read as
amber but clearly subordinate. `navFogMark` sits well above the canvas background
(`#0d0d1a`) in hue but close in luminosity, producing a dim blue "ghost" that is
perceptible but not distracting.

### Direction button appearance

Rounded-rectangle buttons. Fill: the state colour at low opacity (~15–20%) with the
state colour as the border. Label: N / S / E / W in a small, legible typeface.
No-exit buttons use `navDirNone` at the same opacity; they carry no tap affordance
(no active state, no hover change).

### Whisper typography

Same treatment as the current situated whisper: italic, `textMuted` colour, horizontally
centred. Margin from `PANEL_TOP` and font size are the Engineer's call, consistent with
how the existing whisper reads in the map zone.

## Open questions

None that block this item.

## Shipped

**Date:** 2026-06-04
**PR:** (link added after merge)
**Branch:** `claude/nav-panel-content-modes-Vk2NM`

### What was built

All 13 acceptance criteria met:

- **`src/navigation/dungeon-state.ts`** — `uiState` union extended with `'whisper'`.
- **`src/colors.ts`** — 4 new colour tokens: `navDirNone`, `navDirFog`, `navDirBack`, `navFogMark`.
- **`src/navigation/movement.ts`** — new exported `exitState(state, dir)` utility; classifies a direction as `'none' | 'fog' | 'back'`. Extracted to make it testable and eliminate duplication between panel and game logic.
- **`src/navigation/movement.test.ts`** — 5 new tests for `exitState` covering all branches (fog, no exit, backtrack, no reciprocal, OOB).
- **`src/navigation/panel.ts`** — complete rewrite:
  - `drawFogMarkers` replaces `drawNavArrows`; renders low-contrast "?" glyph for fog exits only.
  - `drawPanelBackground` always draws surface + separator so panel is always visible.
  - `drawDirectionCross` renders 4×64 px rounded-rect buttons (IDLE mode).
  - `drawPanelWhisper` renders italic centred text near top of panel zone (WHISPER mode).
  - `drawRoomPanel` cards vertically centred at `PANEL_CENTER_Y` (CHOOSING mode).
  - Cross-fade: 150 ms `inAlpha`/`outAlpha` between all three modes via `globalAlpha`.
  - `onDirButton(dir, dirState)` and `onWhisperEnd()` callbacks added.
  - **Bug fixed (Reviewer):** stale card hit-rects guarded by `uiState !== 'choosing'` check to prevent double-tap crash with null `pendingDir`.
  - **Bug fixed (Reviewer):** removed early `return` after `onWhisperEnd()` so cross-fade starts the same frame the whisper expires.
- **`src/screens/game.ts`** — `handleClick` idle map-zone navigation block removed; `onDirButton` handler drives fog/backtrack movement; `onWhisperEnd` resets to idle.

### Test evidence

```
Test Files  14 passed (14)
     Tests  206 passed (206)
```

`npm run typecheck` — clean.  
`npm run build` — clean (45.96 kB bundle).

### Play-test steps

1. Start a new run (`npm run dev` → tap **New Run**).
2. **IDLE mode** — confirm a cross of four directional buttons appears in the nav panel. All four should be gold (fog), as the start tile has all four exits leading into unexplored dungeon.
3. **Fog marker** — confirm faint "?" glyphs appear at the edge of the map zone for each available fog exit.
4. **Tap a direction button** — panel cross-fades to CHOOSING mode; three room-selection cards appear vertically centred. Buttons disappear.
5. **Tap a card** — panel cross-fades to WHISPER mode; room text appears near the top of the panel.
6. Wait ~2.5 s — panel cross-fades back to IDLE, showing the new room's exits.
7. **Backtrack** — move into an unexplored room, then tap the direction back to the start tile. The button should be amber (`navDirBack`). Tapping it should skip CHOOSING and go directly to WHISPER.
8. **No-exit buttons** — directions with no exit should render in muted grey and be non-interactive.
9. **Encounter** — enter an enemy room. The encounter panel should rise over the nav panel; the whisper text should remain visible until the encounter panel covers it.
