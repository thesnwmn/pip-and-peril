# 005 · Dice Pool System

**Status:** READY
**Source idea:** manager request (backlog item)
**Depends on:** 002 (Game Bootstrap), 003 (Tile Map Core), 004 (Navigation & Room Selection)

## Summary

Introduces the coloured dice pool — the core resolution mechanic of Pip & Peril. The feature has
two parts: (1) a pure `DicePool` data module that manages dice definitions, roll randomisation, pip
totals, and pip spending; (2) a dice panel UI component that renders the pool in the bottom panel
zone of the Game screen, providing a ROLL button and three placeholder action buttons to
demonstrate the full roll-to-spend flow. After 005 ships, the Engineer for 006 has a tested data
API and a ready panel renderer to integrate into the combat encounter loop.

## Acceptance criteria

1. A `DicePool` data type exists. Each die in the pool has a `color` (`DieColor`) and a `sides`
   count. The pool tracks `rolls` (values per die after rolling), `totals` (pips available per
   colour), and a `state` (`'idle' | 'rolling' | 'rolled'`).
2. `rollPool(pool)` generates a random integer in `[1..sides]` for each die, returns an updated
   pool with `state: 'rolling'` and the final roll values pre-computed. The roll animation is the
   UI's responsibility; the data function produces final values synchronously.
3. `spendPips(pool, cost)` returns `{ pool, success }`. If every colour in `cost` is affordable,
   it deducts the amounts and returns `success: true`. If any colour is unaffordable, it returns
   the pool unchanged and `success: false`. Partial deductions never happen.
4. `canAfford(pool, cost)` returns a boolean without mutating state.
5. `resetPool(pool)` returns the pool in `state: 'idle'` with zeroed totals and empty rolls.
6. The starter pool (used when a new run begins) is 4 dice: one Red d6, one Blue d6, one Green d6,
   one Yellow d6.
7. The dice panel renders in the Game screen's bottom panel zone (the same zone as the room
   selection panel, beginning around y ≈ 472) when `uiState === 'idle'`. The room selection panel
   still appears when `uiState === 'choosing'`.
8. The dice panel shows: one die face per die in the pool displaying the pip dot pattern for
   values 1–6 (standard pip grid; see Design detail); for dice with `sides > 6` it displays the
   numeral centred on the face instead of dots. Die faces use the per-colour background tokens.
9. A per-colour pip total badge row renders below the dice, showing the available count in its
   colour (e.g. `🔴 3`). Before rolling, badges show `—`.
10. The ROLL button is enabled when `state` is `'idle'` or `'rolled'`; disabled while `'rolling'`.
11. Clicking ROLL starts the roll animation (~500 ms): each die face scrambles through random
    values at ~50 ms ticks; after ~500 ms every die settles on its pre-computed final value.
    Pip total badges update when the animation ends. The animation is driven by the RAF loop
    (timestamp-based), not `setInterval`.
12. Three placeholder action buttons render below the ROLL button:
    - **Strike** — costs 2 🔴
    - **Evade** — costs 2 🟢
    - **Focus** — costs 1 🔵
    Each button shows the action name and its pip cost as a coloured pill.
13. Action buttons are enabled only when the current totals can afford their cost. An unaffordable
    action button is visually disabled (reduced opacity). Tapping it triggers a brief flash
    animation (border flashes red); pip totals do not change.
14. Tapping an affordable action deducts its cost from `totals`, re-evaluates all button enabled
    states, and adds a log entry in the style `"Strike used. (🔴2 → 🔴1)"` using the existing log
    strip (style: `'normal'`).
15. `npm run typecheck` exits zero errors.
16. `npm run test` passes; the pure pool functions (roll value generation, spend, canAfford,
    reset) are covered by unit tests.

## Scope / non-goals

- No combat loop, enemy HP, player HP, or turn resolution — those belong to 006.
- No encounter trigger — the dice panel appears during navigation `idle` state for demonstration;
  006 introduces encounter state and re-gates the panel behind it.
- No meta-progression — pool composition is hardcoded as the starter pool; upgrading dice (d8+,
  adding dice, engraving) is a future feature.
- No Purple die — Magic is a later expansion per `docs/concept.md`.
- No Yellow die special behaviour (wild pips, reroll) — deferred to encounter design in 006+.
- No dedicated "full combat" log format — the placeholder log entry is a simple stub.
- The room selection panel (`uiState === 'choosing'`) is unchanged.

## Design detail

### Data model

```
DieColor  = 'red' | 'blue' | 'green' | 'yellow'
PipCost   = Partial<Record<DieColor, number>>   // omitted colour = 0

Die       = { color: DieColor; sides: number }
RolledDie = Die & { value: number }             // value in [1..sides]
PoolState = 'idle' | 'rolling' | 'rolled'

DicePool = {
  dice:   Die[]
  rolls:  RolledDie[]                        // empty in 'idle'; populated from 'rolling' onward
  totals: Record<DieColor, number>           // zeroed in 'idle'
  state:  PoolState
}
```

`rollPool` generates all final values up-front and sets `state: 'rolling'`. The panel renderer
reads the pre-computed values and plays the animation; at animation end it calls a callback that
transitions state to `'rolled'`. This keeps randomness out of the renderer.

The pool is immutable-style: every function returns a new `DicePool` object rather than mutating.
This makes unit-testing straightforward and keeps the data layer free of side effects.

### Panel state machine

```
idle
  ROLL button enabled; die faces blank; totals blank; actions disabled
    │
    ▼  [ player taps ROLL ]
rolling  (~500 ms animation)
  ROLL disabled; faces scramble; totals blank; actions disabled
    │
    ▼  [ animation ends ]
rolled
  ROLL enabled; die faces show values; totals shown; actions enabled/disabled per cost
    │           │
    │           ▼  [ player taps affordable action ]
    │         (still rolled, updated totals → re-evaluate action states)
    │
    ▼  [ player taps ROLL again ]
rolling  (re-rolls; totals reset to zero mid-animation)
```

Calling `resetPool` (triggered externally by 006 at encounter end) returns to `idle`.

### Roll animation

- On ROLL tap: call `rollPool(pool)` to obtain final values; set local animation start timestamp.
- Each RAF tick while animating: show a random value on each die face (scramble).
- At `timestamp - startTime ≥ 500`, stop scrambling; show `rolls[i].value` on each die face;
  update pip totals; transition pool state to `'rolled'`.
- The scramble tick interval is ~50 ms — about 10 scrambles over 500 ms.

### Pip dot layout (d6)

Standard pip grid: 3×3 slots indexed 0–8 (left→right, top→bottom).

```
Slot positions:
  0  1  2
  3  4  5
  6  7  8

Active slots per face value:
  1: [4]
  2: [2, 6]
  3: [2, 4, 6]
  4: [0, 2, 6, 8]
  5: [0, 2, 4, 6, 8]
  6: [0, 2, 3, 5, 6, 8]
```

Each active slot renders a small circle (~9 px diameter) in `rgba(255,255,255,0.88)`.
For `sides > 6`, skip the pip grid and render the numeral in the same white, centred on the face.

### File structure

```
src/
├── dice/
│   ├── pool.ts         ← new: DicePool type + pure functions
│   ├── pool.test.ts    ← new: unit tests for pool functions
│   └── panel.ts        ← new: dice panel renderer (draw + handleClick + handlePointerMove)
├── screens/
│   └── game.ts         ← modified: import and integrate dice panel
└── colors.ts           ← modified: add die-face and pip-badge colour tokens
```

The dice panel module exports a factory function analogous to the room selection draw functions —
it receives the pool state and a set of callbacks (`onRoll`, `onAction`) and returns the elements
needed by `game.ts` (`draw`, `handleClick`, `handlePointerMove`). Layout constants are defined
at the top of `panel.ts` so they stay in sync with the draw calls (following the convention in
`game.ts`).

### Edge cases

- If the pool is in `'rolling'` state when ROLL is tapped (e.g. rapid double-tap), ignore the
  second tap — the ROLL button is disabled and its hit-test region is not registered.
- If all pips of a colour are spent, that colour's badge shows `0`, not `—`. `—` means "not yet
  rolled".
- If `sides` is 1 (degenerate die), `rollPool` always produces value 1; pip dot layout shows
  slot 4 (centre dot).

## Visual design

### Layout wireframe

The dice panel occupies the bottom panel zone (same position as the room selection panel).
Exact pixel constants are the Engineer's call; the proportions below are a guide.

```
┌──────────────────────────────┐  390 × 844 logical px
│  [status bar]                │  y 0–50
│  [tile map viewport]         │  y 50–410  (5×5 tiles × 72 px)
│  [log strip]                 │  y 414–466
│                              │
├──────────────────────────────┤  y ≈ 472  (PANEL_TOP, same as room panel)
│  surface background, rounded │
│  top corners                 │
│                              │
│       D I C E                │  12 px monospace, textMuted, centred
│                              │
│  ┌──────┐┌──────┐┌──────┐┌──────┐ │  die faces, 68×68 px, ~10 px gap, centred
│  │  R   ││  B   ││  G   ││  Y   │ │
│  │ ···  ││ ·   ││  ·   ││ ···  │ │  pip dots (or —)
│  │ ·   ││      ││ · ·  ││  ·   │ │
│  └──────┘└──────┘└──────┘└──────┘ │
│   RED    BLUE  GREEN  YELLOW        │  10 px labels, textMuted
│                              │
│  🔴 3   🔵 2   🟢 1   🟡 4   │  pip total badges, centred
│                              │
│  ┌──────────────────────────┐│
│  │       ROLL DICE          ││  gold border + label, surface bg, 44 px tall
│  └──────────────────────────┘│  horizontal margin 16 px each side
│                              │
│  ┌────────────┐┌────────────┐│  action buttons — 2-col grid
│  │ Strike     ││ Evade      ││  each ~165 px wide, ~46 px tall
│  │    2🔴     ││    2🟢     ││
│  └────────────┘└────────────┘│
│  ┌────────────┐              │
│  │ Focus      │              │
│  │    1🔵     │              │
│  └────────────┘              │
│                              │
└──────────────────────────────┘  y 844
```

### Color tokens

Add to `colors.ts`. Die face backgrounds are the canonical die colours from `docs/concept.md`:

| Token | Value | Used for |
|---|---|---|
| `dieFaceRed` | `#7a1a1a` | Red die face background |
| `dieFaceBlue` | `#1a2a7a` | Blue die face background |
| `dieFaceGreen` | `#1a6a2a` | Green die face background |
| `dieFaceYellow` | `#7a6a00` | Yellow die face background |
| `pipBadgeRedBg` | `#3a0a0a` | Red pip total badge background |
| `pipBadgeRedText` | `#ff9090` | Red pip total badge numeral |
| `pipBadgeBlueBg` | `#0a1040` | Blue pip badge background |
| `pipBadgeBlueText` | `#90aaff` | Blue pip badge numeral |
| `pipBadgeGreenBg` | `#0a2a0a` | Green pip badge background |
| `pipBadgeGreenText` | `#90ff90` | Green pip badge numeral |
| `pipBadgeYellowBg` | `#2a2000` | Yellow pip badge background |
| `pipBadgeYellowText` | `#ffe060` | Yellow pip badge numeral |

Badge borders: derive by lightening the badge background slightly — e.g. `Red border: #5a1a1a`.
The Engineer may define these inline or add them as tokens following the same convention.

Cost pills on action buttons follow the same badge palette — same background/text as the
corresponding pip badge.

### Typography / sizing

| Element | `ctx.font` | Colour |
|---|---|---|
| "DICE" panel label | `12px monospace` | `textMuted` |
| Die colour label (below face) | `10px monospace` | `textMuted` |
| Pip total value in badge | `bold 14px monospace` | per-colour badge text |
| Pip total colour symbol | `12px monospace` | per-colour badge text |
| ROLL button label | `bold 16px system-ui, …` | `gold` |
| Action button name | `14px system-ui, …` | `textPrimary` |
| Action cost pill text | `bold 11px monospace` | per-colour badge text |

Die face: rounded rectangle, `borderRadius: 12 px`. Corner radius on action buttons: 8 px.

## Open questions

_(none — approach is agreed, all choices above are actionable)_

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-02 · **PR:** #TBD

### What was built

- `src/dice/pool.ts` — `DicePool` type + `starterPool`, `rollPool`, `spendPips`, `canAfford`, `resetPool` pure functions. Immutable-style: every function returns a new object.
- `src/dice/pool.test.ts` — 19 unit tests covering all acceptance criteria for the data layer (roll values in range, totals computed, spend deducts/rejects/never-partial, reset zeroes state).
- `src/dice/panel.ts` — canvas dice panel renderer. Exports `createDicePanel` factory and `PANEL_TOP` layout constant. Handles the RAF-driven scramble animation (timestamp-based, ~50 ms ticks over 500 ms), per-colour pip badges, ROLL button, and three placeholder action buttons (Strike/Evade/Focus) with cost pills and flash-on-unaffordable.
- `src/colors.ts` — 12 new colour tokens for die faces and pip badges.
- `src/screens/game.ts` — integrates the dice panel: `dicePool` state lives alongside `DungeonState`; panel renders in the bottom zone when `uiState === 'idle'`; clicks and pointer moves routed through `DICE_PANEL_TOP` boundary (imported from panel.ts to keep the two constants in sync).

Reviewer fixes applied: C1 (no early-return in `draw()` — final rolled frame drawn synchronously on the animation-end tick), C3/C4 (`472` replaced by `DICE_PANEL_TOP` imported from `panel.ts`), C5 (dead null assignment removed from `handleClick`).

### Evidence

```
Test Files  9 passed (9)
Tests       93 passed (93)   (19 new pool tests)
Typecheck   0 errors
```

### Play-test

1. `npm run dev` → open `http://localhost:5173`.
2. Click **New Run** to enter the Game screen.
3. **Dice panel visible**: the bottom zone shows a "DICE" heading, four blank die faces (Red / Blue / Green / Yellow), dash badges for each colour, a gold-bordered ROLL DICE button, and three greyed-out action buttons (Strike 2🔴 / Evade 2🟢 / Focus 1🔵).
4. **Roll animation**: tap ROLL DICE — the die faces scramble for ~500 ms then settle on their values; pip total badges update with the rolled counts.
5. **Affordability**: if the rolled total for a colour meets an action's cost, that button lights up; if not, it stays dimmed.
6. **Spend pips**: tap an affordable action — its pip cost is deducted from the badge totals; a log entry appears (`Strike used. (🔴2 → 🔴1)` style); button enabled/disabled states update.
7. **Unaffordable flash**: tap a greyed-out action — its border briefly flashes red; totals unchanged.
8. **Re-roll**: tap ROLL DICE again at any point after the first roll — animation plays again, totals refresh.
9. **Panel hidden during room choice**: tap a nav arrow → room cards appear; the dice panel is not shown while `uiState === 'choosing'`. Choose a room → dice panel returns.
10. **Navigation unchanged**: nav arrows and backtracking still work normally when clicking above the panel zone.
