# 016 · Pip's Satchel

**Status:** READY
**Source idea:** Idea 013 (`IDEAS.md`)
**Depends on:** Feature 002 (Game Bootstrap — screen architecture), Feature 006 (Combat Encounter — `combat` state for blocking); soft ordering dependency on Feature 008 (Menu Button — establishes overlay patterns, but no hard code dependency)

## Summary

Pip's Satchel is the in-world context hub for the run: a full-screen overlay styled as the interior of a worn leather explorer's satchel, opened by a persistent icon button in the bottom-right of the Game screen. It contains four compartments — Pouch (inventory + gold), Journal (quest notes), Tally (run stats), Map (dungeon sketch) — navigated by a tab strip along the base. Opening plays a short ≈300 ms buckle-unfasten animation. The overlay pauses navigation completely; during combat the button is greyed and non-interactive. This feature establishes the satchel shell, the gold and inventory data model, and real Tally stats; Journal and Map tabs are in-character stubs ready for future specs to fill.

## Acceptance criteria

1. A satchel icon button is rendered in the bottom-right corner of the Game screen at all times during a run (both navigation and combat states).
2. During navigation (non-combat), tapping the satchel button opens the satchel overlay.
3. Opening the overlay plays a ≈300 ms expand animation (the overlay scales from closed to full-screen with ease-out). Tapping anywhere during the animation skips immediately to the fully-open state.
4. While the overlay is open, the game canvas beneath is frozen: navigation arrows, room-choice cards, and log interactions are inactive.
5. The overlay header displays "Pip's Satchel" and a close button (`×`).
6. A tab strip at the base of the overlay shows four tabs in order: Pouch · Journal · Tally · Map.
7. The Pouch tab is active by default when the overlay opens.
8. Tapping any tab switches the content area to that compartment without closing the overlay.
9. **Pouch tab:** shows a gold amount (label + number; starts at 0), a visual divider, and an item grid (3-column, rows as needed). When `items` is empty, an in-character empty-state message is shown in place of the grid.
10. **Journal tab:** shows an in-character stub message (Pip's voice; she hasn't written anything yet).
11. **Tally tab:** shows the current run's depth, rooms entered, and enemies defeated as labelled values formatted as tally marks or scribbled numerals. All three values reflect live run state.
12. **Map tab:** shows an in-character stub message (the sketch hasn't been drawn yet).
13. Tapping the close button (`×`) dismisses the overlay and restores the navigation state exactly as it was before opening (including any mid-selection room-choice panel, if one was active).
14. During combat (`combat !== null`), the satchel icon renders greyed and tapping it has no effect.
15. `npm run typecheck` and `npm run test` pass.

## Scope / non-goals

- **Item acquisition** — no item rooms, drops, or shop purchases in this spec. The Pouch always starts empty. A separate Item System spec will wire acquisition.
- **Gold acquisition** — gold is always 0 in this spec. A future spec wires earning gold during a run.
- **In-combat item use** — blocked entirely; a future spec designs the in-combat interaction.
- **Journal content** — quest/objective system is a future spec; stub only here.
- **Full dungeon map** — Idea 014 designs the Map tab; stub only here.
- **Pips-spent tracking** — deferred; requires instrumenting every pip-spend call. Tally shows depth, rooms, enemies only.
- **Animation implementation style** — CSS transition or canvas animation; Engineer's call. The spec defines what the motion communicates, not how it is produced.
- **Item detail / inspect** — tapping an item in the Pouch does nothing in this spec.

## Design detail

### Data / state

Two additions to run state (owned by `game.ts`):

**Inventory** — a new data group holding everything Pip carries:
```
gold:  number          // starts at 0
items: Item[]          // starts empty; ordered list
```

An `Item` has the minimum shape needed for display:
- a unique string id
- a display name
- an icon type (a short discriminated string used by the renderer to draw the item shape)
- a quantity (stackable items share one slot)
- a short in-world description (one sentence)

**Satchel UI state:**
- `satchelOpen: boolean` — whether the overlay is currently visible
- `activeSatchelTab: 'pouch' | 'journal' | 'tally' | 'map'` — which compartment is shown; resets to `'pouch'` on each open

**New run-stat counters** (needed for Tally):
- `roomsEntered: number` — increments each time Pip moves into any non-null tile (already happens on each successful move; add the counter there)
- `enemiesDefeated: number` — increments each time a combat encounter resolves with a player victory

### Behaviour

**Opening:**
1. Player taps the satchel button during navigation.
2. `satchelOpen` → `true`; `activeSatchelTab` → `'pouch'`.
3. The ≈300 ms animation plays (the overlay expands from a small scale to full-screen). Any tap during animation jumps to fully open.
4. Navigation inputs are suspended for the duration the overlay is open.

**Tab switching:**
Tapping a tab label sets `activeSatchelTab` and re-renders the content area. No close/re-open.

**Closing:**
- Tapping `×` sets `satchelOpen` → `false`.
- Navigation state is unchanged; if a room-choice panel was showing before the satchel was opened, it is still showing after close.

**Combat blocking:**
- The button renders with a greyed/desaturated style when `combat !== null`.
- Tap events on the button are ignored during combat.
- The satchel cannot be open during combat (combat can only start from navigation; opening the satchel blocks navigation; therefore the two states are mutually exclusive in normal play).

### Pouch tab — detail

```
┌─ content area ──────────────────────────┐
│                                          │
│  Gold  ◈ 0                               │  ← gold row; number in --gold colour
│  ────────────────────────────────────    │  ← divider
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐           │  ← item grid, 3 columns
│  │      │  │      │  │      │           │    each cell ~64 × 64 px canvas area
│  └──────┘  └──────┘  └──────┘           │
│  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │      │  │      │  │      │           │
│  └──────┘  └──────┘  └──────┘           │
│                                          │
│  (if items is empty, grid is hidden      │
│   and replaced with empty-state text)    │
│                                          │
└──────────────────────────────────────────┘
```

Empty-state message (in-character, Pip's voice):
> *"Nothing in here yet. Just crumbs and old string."*

Item cell: draws the item's icon type as a small canvas shape on aged canvas background; shows quantity badge (bottom-right of cell) if `quantity > 1`.

### Tally tab — detail

Displays values in a handwritten/scrawled style — tally marks for small integers, numerals otherwise.

```
┌─ content area ──────────────────────────┐
│                                          │
│  Depth          ✕✕✕ (3)                  │
│  Rooms entered  ✕✕✕✕✕ ✕✕ (7)            │
│  Enemies felled ✕ (1)                    │
│                                          │
└──────────────────────────────────────────┘
```

Values read directly from run state. Depth is the existing Chebyshev-distance field. The two new counters (`roomsEntered`, `enemiesDefeated`) are wired in this feature.

### Journal tab — stub

In-character message displayed on aged parchment background:

> *"Pip flips through the pages. Blank. She taps her pencil against her chin."*

### Map tab — stub

In-character message:

> *"The map pocket is empty. Pip makes a mental note to start sketching."*

### Edge cases

- **Satchel opened during room-choice panel:** room-choice panel is frozen (not dismissed). Closing the satchel restores it.
- **Zero gold, zero items:** both display cleanly. The gold row shows `◈ 0`; item grid is replaced by empty-state text.
- **Large item count:** item grid scrolls vertically within the content area; tab strip remains fixed at the base.
- **Tally at run start (all zeros):** all three values show `0` or a single tally; no empty-state needed — the numbers are the state.

## Visual design

### Full-screen overlay wireframe (Pouch tab active)

```
┌─────────────────────────────────┐
│ ╔═══════════════════════════╗   │
│ ║  Pip's Satchel       [×]  ║   │  ← leather header bar
│ ╠═══════════════════════════╣   │
│ ║                           ║   │
│ ║  Gold  ◈ 0                ║   │  ← gold row
│ ║  ─────────────────────    ║   │
│ ║  ┌────┐  ┌────┐  ┌────┐  ║   │
│ ║  │    │  │    │  │    │  ║   │  ← item grid (empty cells)
│ ║  └────┘  └────┘  └────┘  ║   │
│ ║  ┌────┐  ┌────┐  ┌────┐  ║   │
│ ║  │    │  │    │  │    │  ║   │
│ ║  └────┘  └────┘  └────┘  ║   │
│ ║                           ║   │
│ ║  Nothing in here yet.     ║   │  ← empty-state (shown when items is empty)
│ ║  Just crumbs and old      ║   │
│ ║  string.                  ║   │
│ ║                           ║   │
│ ╠═══════════════════════════╣   │
│ ║ [Pouch] Jrnl  Tally  Map  ║   │  ← tab strip; active tab highlighted
│ ╚═══════════════════════════╝   │
└─────────────────────────────────┘
```

### Satchel button (Game screen, navigation state)

```
                          ┌───────┐
 game canvas area         │       │  ← satchel icon; bottom-right
                          │  [S]  │    min 44 × 44 px tap target
                          └───────┘
```

During combat, the button renders at reduced opacity (~40%) and does not respond to taps.

### Colour tokens

| Token | Value | Used for |
|---|---|---|
| `--satchel-leather` | `#3d2010` | Overlay background and header bar |
| `--satchel-canvas` | `#c4a07a` | Content area interior (aged linen) |
| `--satchel-brass` | `#a07828` | Dividers, active-tab highlight, gold icon (◈), item cell borders |
| `--satchel-stitch` | `#6b4f2a` | Tab strip background, stitched seam borders |
| `--satchel-ink` | `#1a0f08` | Text drawn on the canvas interior |

The warm brown/amber palette directly contrasts the dungeon's cool `--bg: #0d0d1a`. The gold amount number reuses the existing `--gold: #c8941e` token.

### Typography / sizing

| Element | Size / weight | Colour | Notes |
|---|---|---|---|
| Overlay heading "Pip's Satchel" | `bold 14px monospace` | `--text-primary` | Left-aligned in header bar |
| Close button `×` | `bold 18px monospace` | `--text-primary` | Right-aligned, 44 px tap target |
| Gold label "Gold" | `12px monospace` | `--text-muted` | |
| Gold amount | `bold 16px monospace` | `--gold` | |
| Tab labels | `11px monospace` | inactive: `--text-muted` · active: `--satchel-brass` | Uppercase; active tab slightly raised (1 px top offset) |
| Stub / empty-state text | `italic 12px monospace` | `--satchel-ink` on canvas background | |
| Tally labels | `12px monospace` | `--satchel-ink` | Left column ~80 px wide |
| Tally values | `12px monospace` | `--satchel-ink` | Tally-mark rendering preferred for values ≤ 20 |

## Open questions

None — all blocking questions resolved before spec was written.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
