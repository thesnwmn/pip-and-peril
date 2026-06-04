# 021 · Item Room Encounter

**Status:** READY
**Source idea:** manager request (backlog item 021)
**Depends on:** 020 (item catalog, `acquireItem`), 034 (encounter registry)

## Summary

The green Item room is Pip's simplest reward: enter, find a single item on a stone pedestal, tap
to take it. An encounter panel rises briefly — showing the item's icon, name, and description —
with a "Take" CTA and a secondary "Leave" option. Taking it calls `acquireItem` and marks the
room cleared; leaving returns to navigation without touching the room state. The selected item is
fixed to the tile at placement time, so leaving and re-entering always shows the same item on the
same pedestal. This is the lightest encounter in the game and the first source of items in a
normal run.

## Acceptance criteria

### Tile placement

1. When an Item room tile is placed (during room selection, feature 004/035), a random item is
   selected from the catalog with equal weight across all five items defined in feature 020
   (Crumb of Cheese, Wedge of Gouda, Lucky Acorn, Smoke Pellet, Glowstone Dust), and stored as
   `itemId` on the `TileCell`. This selection is fixed for the life of the tile.

2. `TileCell` gains an optional `itemId?: string` field. No other room type sets this field.

### Trigger and lifecycle

3. When Pip enters a room where `roomType === 'item'` and `cleared !== true`, the encounter
   registry triggers the item room panel. The encounter panel rises using the standard normal-speed
   200–350 ms ease animation.

4. Entering a room where `roomType === 'item'` and `cleared === true` does not trigger any
   encounter. Navigation passes through normally.

### Panel

5. The panel rises to approximately 35% of available canvas height. The camera gently centres on
   the active room tile at ~1.2× base tile zoom; both transitions use the standard normal-speed
   ease.

6. The panel displays:
   - A small header label: `"Found!"` (`--text-muted`, small)
   - The item's icon centred horizontally (~64 × 64 px canvas area)
   - The item's name (bold, `--text-primary`, display-weight, centred)
   - The item's one-line description (italic, `--text-muted`, centred)
   - A prominent "Take" CTA button
   - A secondary "Leave" option (text-link weight)

7. Tapping **Take**: `acquireItem(inventory, item)` is called using the item identified by
   `tile.itemId`. `tile.cleared` is set to `true`. The encounter signals the `taken` outcome; the
   panel falls and navigation resumes in IDLE mode.

8. Tapping **Leave**: the encounter signals the `left` outcome; the panel falls and navigation
   resumes in IDLE mode. `tile.cleared` is **not** changed — re-entering the room triggers the
   encounter again with the same item.

### Whisper

9. When Pip enters an uncleared item room, the situated whisper shown in the nav panel WHISPER
   mode reads: `"Something glints on a stone pedestal."` This is the item room's entry whisper
   in the room-whisper configuration.

### Quality

10. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

11. New unit tests cover at minimum:
    - **Tile placement**: item rooms receive a non-null `itemId`; the assigned `itemId` is one of
      the five catalog item IDs.
    - **Take outcome**: `acquireItem` is called with the correct item; `tile.cleared` is set to
      `true`; outcome `'taken'` is signalled.
    - **Leave outcome**: `acquireItem` is not called; `tile.cleared` remains `false`; outcome
      `'left'` is signalled.
    - **Re-entry after Leave**: triggering the encounter a second time on the same uncleared tile
      shows the same `itemId` (fixed at placement).

## Scope / non-goals

- **Bare pedestal surprise (Idea 001)** — an "already taken" empty room. Deferred; the cleared
  state already handles re-entry after taking.
- **Depth-weighted item selection** — item weighting by dungeon depth is feature 022's concern.
- **Item inspect / detail view** — tapping the icon for extended lore. Deferred (noted in 020).
- **Equipment / passive gear** — no worn-slot items here; consumables only.
- **Stack-size feedback** — the panel does not indicate whether the item will stack in the satchel.
  The satchel is the source of truth.

## Design detail

### Encounter flow

```
Pip enters Item room (not cleared)
        │
        ▼
Registry triggers item room encounter
  panel reads tile.itemId to resolve the item
        │
        ▼
  ┌── RISING (200–350 ms) ──────────────────────────────────────┐
  │  Nav panel: WHISPER mode                                     │
  │  "Something glints on a stone pedestal."                     │
  │  Item room panel rises to ~35% height                        │
  │  Camera centres gently on active room tile, ~1.2× zoom       │
  └─────────────────────────────────────────────────────────────┘
        │
        ▼
  ┌── ACTIVE ───────────────────────────┐
  │  Panel shows item (icon/name/desc)   │
  │  "Take" + "Leave" available          │
  │                                      │
  │  Take → acquireItem                  │
  │          tile.cleared = true         │
  │          signal 'taken'              │
  │                                      │
  │  Leave → signal 'left'               │
  │           (no state change)          │
  └─────────────────────────────────────┘
        │
        ▼
  ┌── FALLING (200–350 ms) ─────────────────────────────────────┐
  │  Panel descends; camera returns to nav framing (1×)          │
  │  Nav panel: IDLE mode, showing room exits                    │
  └─────────────────────────────────────────────────────────────┘
        │
        ▼
Navigation resumes
```

### Data model addition

`TileCell` gains one optional field:

| Field | Type | Set by | Notes |
|---|---|---|---|
| `itemId?` | `string \| undefined` | Room placement (004/035) | Item rooms only; `undefined` for all other room types |

At tile placement time, if `roomType === 'item'`, a random item `id` from the catalog is assigned.
The encounter panel looks up the full item by `id` at render time.

### Encounter panel state

The panel is stateless beyond what it reads from the tile:
- `tile.itemId` → resolved to an `Item` on creation
- `onComplete` callback from the registry

No dice, no multi-beat flow, no HP. The simplest possible encounter panel.

### Camera configuration

| State | Zoom | Target | Curve |
|---|---|---|---|
| Item room (rising) | ~1.2× base tile size | Room-lock on active tile | ease-out |
| Item room (falling) | 1× base tile size | Pip → soft-follow resumes | ease-in |

The zoom is deliberately light — less than half of combat's 2.3×. The room should feel
welcoming and readable, not dramatic.

### Edge cases

- **Re-entry after Leave**: The same `itemId` is on the tile; the same item is presented again.
  Pip can take it on a later visit with no logic change required.
- **Re-entry after Take**: Room is cleared; encounter does not trigger (AC 4). Pip walks through.
- **Stacking**: `acquireItem` handles stacking (020 AC 5). The panel does not need to know.
- **Nav input during transition**: Blocked during the 200–350 ms rise/fall per registry behaviour
  (034 AC — transition gating).

## Visual design

### Panel layout wireframe

```
┌─────────────────────────────────────────┐  ← panel top (~35% of canvas height)
│  Found!                                 │  ← small header, --text-muted
│                                         │
│             ┌──────────┐               │
│             │          │               │
│             │   ICON   │               │  ← ~64 × 64 px, centred
│             │          │               │
│             └──────────┘               │
│                                         │
│          Crumb of Cheese                │  ← item name, bold, --text-primary
│       A mouthful for a mouse.           │  ← description, italic, --text-muted
│                                         │
│  ┌──────────────────────────────────┐  │
│  │             Take                 │  │  ← primary CTA, --room-item border/fill
│  └──────────────────────────────────┘  │
│                  Leave                  │  ← secondary, --text-muted, text-link weight
└─────────────────────────────────────────┘
```

The panel surface is `--surface` (`#14142a`) — dungeon-dark, not parchment. The only warmth
is the green accent: the panel's top border and the "Take" button draw from `--room-item`.
This reads as "reward in the dungeon" rather than "safe camp" or "merchant stall."

### Color tokens

No new tokens. This feature reuses established values:

| Token | Value | Used for |
|---|---|---|
| `--surface` | `#14142a` | Panel background |
| `--room-item` | `#1a6a2a` | Top border accent; Take button border + fill tint |
| `--text-primary` | `#e8d5b0` | Item name |
| `--text-muted` | `#8b7355` | "Found!" header, description, Leave label |
| `--gold` | `#c8941e` | Take button label text |

### Typography / sizing

| Element | Size / weight | Color |
|---|---|---|
| "Found!" header | `11px monospace` | `--text-muted` |
| Item name | `bold 16px monospace` | `--text-primary` |
| Item description | `italic 12px monospace` | `--text-muted` |
| "Take" button label | `bold 14px monospace` | `--gold` |
| "Leave" label | `12px monospace` | `--text-muted` |
| Item icon | 64 × 64 px canvas area | — (drawn by existing icon renderer) |

Take button: wide (60–70% panel width), min 48 px height, `--room-item` fill at 20% opacity,
1 px `--room-item` border. Leave: full-width tappable row below Take (min 44 px), no fill.

## Open questions

None — all blocking questions resolved. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** · **PR:** #

### What was built

### Evidence

### Play-test
