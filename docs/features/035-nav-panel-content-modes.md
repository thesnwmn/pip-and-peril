# 035 · Navigation Panel Content Modes & Direction Buttons

**Status:** READY
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
