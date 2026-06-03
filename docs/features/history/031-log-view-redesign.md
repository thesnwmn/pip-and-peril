# 031 · Log View Redesign

**Status:** READY
**Source idea:** manager request; direction established in `docs/concept/screen-layout-and-transitions.md` (§ "The Narrative Voice — World Narration vs Action Feedback"); deliberately deferred by feature 030
**Depends on:** 004 (log strip, replaced here), 006 (combat panel, extended here), 030 (elastic canvas, panel heights)

## Summary

Replace the three-line log strip (feature 004) with two purpose-built layers, each serving exactly one communication job. World narration — "Something snarls in the dark," "The shelves are bare" — becomes an ephemeral **situated whisper**: a single line overlaid on the map canvas that fades in ~2.5 s and leaves no footprint. Mechanical action feedback — the round-by-round record of a fight — moves into a named **encounter log zone** at the base of the encounter panel, with combat showing the last 3 events in fading order so the player can read what they did, what the enemy did, and what happened before. The navigation map gains the ~40–50 px the log strip occupied; the combat panel grows by two log lines' worth of height. Both changes put information where it belongs: narration lives in the dungeon, action feedback lives inside the encounter.

## Acceptance criteria

1. The three-line log strip from feature 004 is removed from the navigation register. No permanent log element exists at the bottom of the screen.
2. In the navigation register the dungeon map canvas fills the full space from the status strip to the screen bottom, reclaiming the strip's former height.
3. When Pip enters a room that has narration text, a single line appears at the bottom of the map canvas (the "situated whisper"), supported by a subtle gradient scrim. It is visible for ~2.5 s then fades out; no trace remains.
4. If a new room-entry narration fires while a whisper is still fading, the previous text is immediately replaced (no queue, no overlap).
5. The whisper is hidden immediately if room-selection cards begin to appear or if an encounter panel begins to rise. The whisper and either of those elements never appear on screen at the same time.
6. Rooms without narration text (corridors, backtrack moves) produce no whisper — consistent with feature 004's existing silence for those room types.
7. The combat encounter panel contains a defined **encounter log zone** at its base, separated from the action buttons by a hairline rule.
8. The log zone holds up to 3 entries, displayed oldest-to-newest (top to bottom). Opacity: oldest 0.45, middle 0.70, newest 1.00.
9. Each combat event (player action, enemy action, roll outcome) appends a new entry to the bottom of the zone; if a fourth entry would be added, the oldest is dropped. The list updates in place with no animation required.
10. The log zone is cleared on encounter resolution (victory banner or defeat banner appearing).
11. The combat panel is taller than in feature 030 by the height of two additional log lines (~24 px), preserving all existing panel regions (HP bars, dice pool, action buttons) without shrinking them.

## Scope / non-goals

- **Satchel Journal** is a future spec. This feature does not accumulate entries in the Journal, does not wire any log data to the Journal tab, and does not change the Journal stub content.
- **Encounter log zones for shop, NPC, chest, trap** are defined in their respective encounter specs (025–028). This spec establishes combat as the reference implementation of the pattern; future specs choose their own log zone behavior (1 line, nothing, or a different pattern).
- **Boss combat** follows the same 3-line log zone pattern as regular combat by convention; the boss encounter spec (023) confirms or adjusts this in its own detail.
- **Narration content** — no new narration strings are added or changed here. This spec changes only where and how existing narration is rendered.
- **Log zone scrolling** — the zone is not scrollable. Three lines is the full scope.

## Design detail

### The two layers

| Layer | What it communicates | Where it lives | Lifetime |
|---|---|---|---|
| Situated whisper | World narration — atmosphere, room voice, flavour | Map canvas overlay | ~2.5 s, then gone |
| Encounter log zone | Mechanical feedback — action results, HP changes | Base of encounter panel | Duration of encounter |

These two layers never appear simultaneously. Room-entry narration fades before any encounter interaction is possible, so the sequencing is structurally safe.

### Situated whisper — lifecycle

```
Pip enters room (narration text available)
    │
    ▼ fade in ~200 ms
Text visible at full opacity
    │
    ├─ room-selection cards appear ─────→ whisper hidden immediately
    ├─ encounter panel begins rising ───→ whisper hidden immediately
    ├─ new room narration fires ────────→ text replaced immediately
    │
    ▼ ~2.5 s total visible
Fade out ~500 ms
    │
    ▼
No element. Map is unobstructed.
```

### Situated whisper — rendering

The whisper is an overlay at the bottom of the map canvas — not a separate element below it. Beneath the text is a gradient scrim: transparent at the top, ~25% of `--bg` at the bottom, spanning ~60 px. The tile art reads through the scrim; it is not a solid band. When silent the scrim is fully transparent and leaves no gap or trace in the layout.

Text is one line only. Whisper copy should be authored to fit a single line at the type size; truncation is a copy problem, not a layout one.

### Encounter log zone — structure

The log zone occupies the lowest section of the encounter panel, below a 1 px hairline rule. Up to 3 entries, each a single plain-text line. Entries are appended at the bottom (chronological reading top-to-bottom). When a new entry arrives the list shifts: entry 2 → entry 1, entry 3 → entry 2, new → entry 3.

```
│ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ │  ← hairline rule
│  "Strike — 2 damage"   │  ← entry 1 (oldest), opacity 0.45
│  "Goblin hits — 1 dmg" │  ← entry 2, opacity 0.70
│  "Evade — no damage"   │  ← entry 3 (newest), opacity 1.00
└─────────────────────────┘
```

### Per-encounter-type log zone as a design primitive

The encounter log zone is a named slot at the base of any encounter panel. Combat uses it with 3 fading lines. Other encounter types (shop, NPC, chest, trap) each decide in their own spec whether to use the slot — and if so, how many lines, what content, and what opacity behaviour. Using nothing is a valid choice where the visual action speaks for itself (a chest opening, an item appearing). Combat is the reference implementation; future specs adapt or opt out.

## Visual design

### Navigation register — updated layout

```
┌─────────────────────────┐
│  [status strip — thin]  │  ← ~40–50 px, unchanged
├─────────────────────────┤
│                         │
│                         │
│       DUNGEON MAP       │  ← fills to screen bottom; larger tile viewport
│                         │
│░░░░░░░░░░░░░░░░░░░░░░░░░│  ← gradient scrim (visible only when whisper is active)
│  "A distant drip..."    │  ← situated whisper (absent when silent; no reserved space)
└──[≡ menu]───────[bag]───┘  ← floating corner buttons, unchanged
```

When the whisper is silent the scrim is invisible and the map canvas runs to the screen edge uninterrupted. The floating buttons continue to sit in the bottom corners above the map as before.

### Encounter register — combat layout (updated)

```
┌─────────────────────────┐
│  [status strip — thin]  │
├─────────────────────────┤
│                         │
│  Pip ←→ Enemy in room   │  ← map canvas at medium-close; unchanged camera
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel edge (slightly higher than feature 030)
│ PIP  ████████░ 7/10     │  ← HP bars
│ GOBLIN  ████░░ 3/6      │
│ [d6🔴] [d4🟢] [d8🟡]   │  ← dice pool
│ [Attack 2🔴] [Dodge 1🟢]│  ← action buttons (thumb country)
│ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ │  ← hairline rule
│  "Strike — 2 damage"   │  0.45 opacity
│  "Goblin hits — 1 dmg" │  0.70 opacity
│  "Evade — no damage"   │  1.00 opacity
└─────────────────────────┘
```

### Color tokens

No new color tokens. The whisper scrim uses `--bg` at ~25% opacity as its opaque terminus (existing token). Log zone text uses the existing dungeon text color; the hairline rule uses `--surface-raised` or equivalent.

### Typography / sizing

| Element | Style | Notes |
|---|---|---|
| Situated whisper | `11 px` regular, dungeon text color | Single line; matches existing log entry type size |
| Log zone entries | `11 px` regular, dungeon text color | Opacity per recency (0.45 / 0.70 / 1.00) |
| Hairline rule | `1 px`, `--surface-raised` | Subtle breath, not a strong divider |
| Scrim | Gradient, transparent → ~25% `--bg`, ~60 px tall | Invisible when no whisper active |

## Open questions

None blocking — this spec is READY.

## Shipped

**Date:** 2026-06-03
**PR:** [#45](https://github.com/thesnwmn/pip-and-peril/pull/45)

### What was built

- **Log strip removed:** `drawLogStrip` and all `LOG_*` constants deleted from `game.ts`; `log: LogEntry[]` removed from `DungeonState`; `placeRoom()` no longer appends to a log array.
- **Situated whisper** (`src/log/whisper.ts` + `src/screens/game.ts`): ephemeral single-line overlay at the bottom of the map canvas. Triggered by `triggerWhisper(roomType)` on card selection, using existing `LOG_MESSAGES` strings. Fade-in 200 ms → hold → fade-out 500 ms (total ~2.5 s). Scrim: transparent-to-25%-bg gradient, 60 px tall. Cleared immediately when room cards appear (`whisper = null` before entering `uiState: 'choosing'`) or when combat trigger fires.
- **Encounter log zone** (`src/dice/panel.ts`): up to 3 plain-text lines at base of combat panel, oldest→newest top→bottom, opacities 0.45 / 0.70 / 1.00, separated by a 1 px hairline rule. Combat events append via `addLogEntry` → `combatLog` array in `game.ts` closure. Cleared (`combatLog = []`) when victory or defeat banner appears.
- **Panel layout:** `PANEL_TOP` moved 416 (from 472), `PANEL_TOP` in `dice/panel.ts` likewise 416. Map canvas now clips to `LOGICAL_H` (screen bottom) in idle navigation state — room selection panel still appears at 416 when choosing.
- **Nav hint removed:** `drawNavHint` deleted; map fills unobstructed to screen bottom when idle.
- **New module:** `src/log/whisper.ts` exports `whisperAlpha(elapsed)` and timing constants, tested in `src/log/whisper.test.ts` (8 tests).

### Test evidence

```
Test Files  14 passed (14)
Tests       201 passed (201)
```

`src/log/whisper.test.ts` covers: alpha=0 at t=0, reaches 1 by fade-in end, holds 1 throughout hold window, linear fade-out to 0, expired at TOTAL_MS, monotone in both ramp directions.

### Play-test instructions

1. Run `npm run dev` and open `http://localhost:5173`.
2. Start a new run. Confirm **no log strip** appears between the map and the bottom of the screen — the map fills down to the room-selection panel.
3. In idle state (not choosing), confirm the **map fills to the screen bottom** with no panel below it.
4. Select a direction arrow to open room cards. Confirm cards appear; whisper is not visible at the same time.
5. Choose an **Enemy, Shop, NPC, Item, or Chest** room card. On entering, a narration line should appear overlaid at the bottom of the map (e.g. "Something snarls in the dark.") with a subtle gradient beneath it, then fade out after ~2.5 s.
6. Choose a **Corridor** room — no whisper should appear.
7. While a whisper is visible, choose another direction immediately. Confirm the whisper disappears at once when the room cards appear.
8. Enter an **Enemy** room. Confirm the encounter panel rises and the whisper is gone.
9. In combat, **Roll Dice** and use **Strike, Evade, Focus** actions. Confirm log entries appear at the base of the combat panel below the action buttons, with the hairline rule above them. Oldest entry is faintest (top), newest is fully opaque (bottom). After 3 entries, the oldest drops when a new one arrives.
10. Win or lose the combat. Confirm the log zone is empty (cleared) when the victory/defeat banner appears.
