# 008 · Menu Button & Pause Modal

**Status:** READY
**Source idea:** Idea 015 (primary), Idea 003 (absorbed — meta-action intent)
**Depends on:** 002 (screen state machine, button draw spec), 004 (status bar layout)

## Summary

Replaces the raw text back-links on the Home and Game screens with a compact MENU button that is
a proper member of the status bar row rather than a floating text label. Tapping it opens a
centred modal with meta (player-facing, not Pip-facing) actions: Settings and a context-labelled
quit/back action. On the Game screen, quitting a run requires a confirmation step to prevent
accidents. The modal pauses the screen while open. This is the permanent home for administrative
actions that sit outside Pip's in-world experience — everything in-world (run stats, map, quests,
inventory) will live in the future Pip's Satchel (Idea 013), and that division is intentional: the
menu button's contents should never grow to include in-game information.

## Acceptance criteria

### Button placement

1. The "← Main Menu" text link on the Home screen is removed. A MENU button drawn as a filled rect
   with a border and label replaces it: positioned top-left, vertically centred within the status
   bar zone (y 0–50), x ≈ 12 from the left edge.
2. The "← Quit Run" text link on the Game screen is removed. The identical MENU button appears at
   the same position and size, flush with the floor label and depth counter drawn by feature 004.
3. The MENU button has a hover state consistent with the button draw spec from feature 002
   (background lightens to `surfaceRaised`). The hit area is thumb-safe (≥ 44 × 44 px logical).
4. The Main Menu screen has no MENU button (the player is not yet in a session).

### Modal — open / dismiss

5. Tapping the MENU button on either screen opens a centred modal overlay drawn over a
   semi-transparent scrim that covers the full canvas. The underlying screen stops accepting input
   (clicks and pointer moves outside the modal are ignored) while the modal is open.
6. The modal has a close affordance: a "×" drawn top-right of the modal card (hit area ≥ 44 × 44 px).
7. Tapping the scrim area outside the modal card also dismisses the modal.
8. Dismissing the modal via × or scrim-tap returns the screen to its prior state with no changes.

### Modal — Home screen contents

9. On the Home screen the modal shows two rows: **Settings** and **Back to Menu**.
10. Tapping **Back to Menu** dismisses the modal and transitions immediately to the Main Menu
    screen (no confirmation required).

### Modal — Game screen contents

11. On the Game screen the modal shows two rows: **Settings** and **End Run**.
12. **End Run** is visually distinguished as a destructive action (text in `danger` colour).
13. Tapping **End Run** replaces the modal body with a confirmation view: a heading "End this run?"
    and a sub-line "Your progress will be lost." with two buttons: **Cancel** and **Confirm**.
14. Tapping **Cancel** on the confirmation view returns to the modal's main list.
15. Tapping **Confirm** dismisses the modal and transitions to the Home screen, discarding all
    current run state.

### Settings sub-view

16. Tapping **Settings** on either screen replaces the modal body with a Settings sub-view. In this
    feature the sub-view body is empty and shows a single muted placeholder line:
    "No settings yet — more coming soon."
17. The Settings sub-view has a back affordance ("← " or a back button) that returns to the
    modal's main list.
18. The Settings sub-view does not have its own × close button; dismissing is via ← back or the
    scrim tap (scrim tap dismisses the whole modal, not just the sub-view).

### Quality

19. `npm run typecheck` exits with zero errors.
20. `npm run test` passes with no new failures.

## Scope / non-goals

- **No actual settings content** — the Settings sub-view is a structural stub in this feature;
  its items are added by later features (audio, display).
- **No Save / Load** — deferred entirely; not even stubbed as a disabled item (disabled items
  create false affordances).
- **No satchel items in this menu** — run stats, dungeon map, inventory, and quests belong to
  Pip's Satchel (Idea 013) and must not appear here. The menu is intentionally limited to
  administrative actions so the division stays clean as both systems grow.
- **No "inspect tile" action** — deferred; likely a tap-on-tile interaction, not a menu item.
- **No backtrack / retreat shortcut** — remains an in-map gesture per Idea 013.
- **No transition animations** for the modal opening or closing.
- **No combat-specific modal blocking** — combat is currently turn-based and not a running
  simulation; the modal pausing input is sufficient. A future feature may need to disable the
  MENU button mid-roll animation; defer that concern.

## Design detail

### State machine

```
Screen active (Home or Game)
│
├─[tap MENU]──────────────────────────────────────────────────────────┐
│                                                                      ▼
│                                              Modal open — list view
│                                              │
│                                              ├─[tap Settings]──────────────────────┐
│                                              │                                     ▼
│                                              │                         Modal open — Settings sub-view
│                                              │                         │
│                                              │                         └─[tap ← back]──► list view
│                                              │
│                                              ├─[tap Back to Menu]  ──► Main Menu (Home screen only)
│                                              │
│                                              ├─[tap End Run]──────────────────────┐ (Game only)
│                                              │                                    ▼
│                                              │                        Modal open — confirmation view
│                                              │                        │
│                                              │                        ├─[tap Cancel]──► list view
│                                              │                        └─[tap Confirm]──► Home screen
│                                              │
│                                              └─[tap × or scrim]──► Screen resumes (no state change)
```

### Rendering approach

Everything is drawn with the existing canvas 2D API — no new DOM elements. The modal is a new
draw layer on top of the current screen's draw output. The RAF loop continues running; the modal's
draw function is called after the screen's draw function when the modal is open. Screen draw
functions should receive a flag or callback indicating the modal state so they can skip expensive
rendering if desired (optional optimisation, not required).

### Button vs link

The MENU button uses the same pattern as the 002 button draw spec (filled rect, stroked border,
centred label) but compact-sized. This is the key polish fix: the current text links are drawn as
raw `fillText` calls and sit outside the visual rhythm of the status bar. The button form gives
a clear tap target, hover state, and visual weight matching the other interactive elements.

### Status bar layout — after this feature

The Game screen status bar (y 0–50) will contain three aligned elements:

```
[≡ MENU]          FLOOR 1          Depth: 3
 left              centre            right
```

The MENU button occupies the left zone. Floor label and depth counter (from 004) remain centred
and right-aligned. The button must not overlap those elements; the Engineer should measure the
button width and leave adequate clearance. A compact button (≈ 68 px wide, ≈ 32 px tall) fits
comfortably.

The Home screen status bar has only the MENU button (no floor label or depth); it sits at the
same top-left position for visual consistency.

### Modal shell

- Full-canvas semi-transparent scrim: `menuScrim` colour (see Visual design), drawn as a filled
  rect covering the full 390 × 844 canvas before the card is drawn.
- Modal card: centred horizontally, positioned in the upper-middle vertical range (~200–440 px
  from top for the list view). Width ≈ 260 px. Height auto-fits content with ≈ 20 px vertical
  padding.
- Card background: `surface` (`#14142a`).
- Card border: 1 px stroke, `gold` (`#c8941e`), 4 px corner radius (matching 002 button spec).
- The × close button is drawn inside the card's top-right corner as `textMuted`-coloured text
  with a generous hit area.

### Modal rows (list view)

Each option is a full-width row inside the card:
- Row height ≈ 44 px (meets thumb-safe minimum, no extra hit-area expansion needed).
- Default: `surface` background, `textPrimary` text, 14 px.
- Hover: `surfaceRaised` background.
- A 1 px separator line (`border` colour, `#2a1f15`) between rows.
- "End Run" row text is rendered in `danger` colour (`#c0392b`) — same weight and size as other
  rows, colour alone signals the destructive nature.

### Confirmation view

The confirmation view replaces the card body in-place (the card shell stays the same):
- Heading: "End this run?" — 16 px bold, `textPrimary`.
- Sub-text: "Your progress will be lost." — 13 px, `textMuted`.
- Two side-by-side buttons at the card bottom: **Cancel** (left, standard gold style) and
  **Confirm** (right, `danger` border and label). Each button ≈ 100 px wide.

### Settings sub-view

The sub-view replaces the card body:
- A "← Settings" label at the top-left of the card body acts as the back affordance (drawn as a
  muted text link, same style as the former back links — this is appropriate here since it is
  inside a contained modal and not a status bar element).
- Body text: "No settings yet — more coming soon." centred in `textMuted`, 13 px.

### Hit testing

All modal elements use named constant rects for both draw and hit-test, following the pattern
established in 002. Tapping outside the card (on the scrim) is detected by checking that the
click coordinate falls outside the card rect.

## Visual design

### Layout wireframe — status bar with MENU button (Game screen)

```
┌──────────────────────────────┐  390 px wide, y 0–50
│ ┌────────┐                   │
│ │≡ MENU  │    FLOOR 1   D:3  │  button left, floor label centre, depth right
│ └────────┘                   │
├──────────────────────────────┤
│                              │
│        [ dungeon map ]       │
│                              │
└──────────────────────────────┘
```

### Layout wireframe — modal, list view (Game screen)

```
┌──────────────────────────────┐
│  ░░░░░░ scrim ░░░░░░░░░░░░  │  full-canvas semi-transparent overlay
│  ░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░  ┌──────────────┐  ░░  │
│  ░░░  │          [×] │  ░░  │  close button, top-right of card
│  ░░░  │──────────────│  ░░  │  separator
│  ░░░  │  Settings    │  ░░  │  row — textPrimary
│  ░░░  │──────────────│  ░░  │
│  ░░░  │  End Run     │  ░░  │  row — danger colour
│  ░░░  └──────────────┘  ░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────┘
```

### Layout wireframe — confirmation view

```
│  ░░░  ┌──────────────┐  ░░  │
│  ░░░  │          [×] │  ░░  │
│  ░░░  │  End this    │  ░░  │  16 px bold, textPrimary
│  ░░░  │   run?       │  ░░  │
│  ░░░  │  Progress    │  ░░  │  13 px, textMuted
│  ░░░  │  will be     │  ░░  │
│  ░░░  │  lost.       │  ░░  │
│  ░░░  │──────────────│  ░░  │
│  ░░░  │[Cancel][Cnfm]│  ░░  │  Cancel = gold, Confirm = danger
│  ░░░  └──────────────┘  ░░  │
```

### Layout wireframe — Settings sub-view

```
│  ░░░  ┌──────────────┐  ░░  │
│  ░░░  │← Settings    │  ░░  │  back affordance, textMuted
│  ░░░  │──────────────│  ░░  │
│  ░░░  │  No settings │  ░░  │
│  ░░░  │  yet —more   │  ░░  │  13 px, textMuted, centred
│  ░░░  │  coming soon.│  ░░  │
│  ░░░  └──────────────┘  ░░  │
```

### Color tokens

New named constants added to `src/colors.ts` (canvas draw values, not CSS custom properties):

| Constant | Hex | Used for |
|---|---|---|
| `menuScrim` | `rgba(13, 13, 26, 0.65)` | Semi-transparent modal backdrop |
| `danger` | `#c0392b` | "End Run" text and Confirm button border/label |

`danger` is a warm, readable red — noticeably lighter than `roomEnemy` (`#7a1a1a`) so it reads
clearly on the dark `surface` background.

### Typography / sizing

| Element | `ctx.font` | `fillStyle` |
|---|---|---|
| MENU button label | `bold 11px system-ui, …` | `gold` |
| Modal row text | `14px system-ui, …` | `textPrimary` |
| "End Run" row text | `14px system-ui, …` | `danger` |
| Confirmation heading | `bold 16px system-ui, …` | `textPrimary` |
| Confirmation sub-text | `13px system-ui, …` | `textMuted` |
| Settings placeholder | `13px system-ui, …` | `textMuted` |
| Back affordance ("← Settings") | `12px system-ui, …` | `textMuted` |
| × close button | `16px system-ui, …` | `textMuted` |

### MENU button draw spec

Follows the 002 shared button draw spec with compact dimensions:

```
width  ≈ 68 px
height ≈ 32 px
x      ≈ 12 px from left edge
y      = (50 − 32) / 2 = 9 px from top   →  centres in the 50 px status bar zone

label  = "≡ MENU"   (U+2261 identical-to as a stand-in for hamburger, + space + MENU)
         Engineer may substitute three drawn horizontal lines if the glyph renders poorly
```

## Open questions

_(none)_
