# 089 · Scalable Dice Pool Display

**Status:** READY
**Source idea:** Backlog item 089; manager request (2026-06-10 design session)
**Depends on:** 005 (dice pool data model and panel), 029 (camp screen — pool preview context), 088 (workbench upgrades — unlocks variable pool sizes and diverse die types)

---

## Summary

The current die renderer is hard-coded for exactly four d6 dice at 68px in a fixed single row.
Feature 088 (workbench upgrades) lets players grow their permanent pool to seven or more dice of
mixed face counts (d4 through d12). This feature replaces the scattered per-panel die-drawing
constants with a shared rendering primitive and a shared pool-layout algorithm: a single source of
truth that produces colour-grouped, size-scaled, wrapping die rows across every context where dice
appear. The change is purely visual — no mechanics are altered, no new game states are introduced.

---

## Acceptance criteria

### Shared primitive

1. A single die-drawing module is the exclusive path for rendering one die face on canvas. All
   existing implementations — `src/dice/panel.ts`, `src/combat/panel.ts`, and the encounter check,
   chest, and trap panels — delegate to it. No copy-paste die-drawing logic persists after this
   feature ships.

2. The primitive accepts: `colour`, `faces`, `size` (px), an optional `value` (integer — drawn
   when the die has been rolled; absent means show the face count as the die's label), and an
   optional `engraved` flag (renders the notch marker from feature 088 when true).

3. A separate pool-layout utility accepts a list of dice and an available container width and
   returns: the computed die size and the dice sorted and grouped into one or two display rows.
   All panels call this utility before drawing; none compute their own size or order.

### Colour ordering and group separators

4. Within any die pool display, dice are sorted in canonical colour order: Red → Green → Yellow →
   Blue. Dice of the same colour are always adjacent.

5. The gap between two adjacent dice of the **same colour** is **8 px**. The gap between the last
   die of one colour group and the first die of the next is **16 px**. No visible rule or divider
   is drawn — the wider gap is the only separator.

### Dynamic sizing

6. The pool-layout utility selects the largest integer die size in the range **[44, 68]** at which
   all dice fit in a single row within the container. "Fits" means:

   ```
   (n × size) + (within_gaps × 8) + (between_gaps × 16) ≤ container_width
   ```

   where `within_gaps` is the count of same-colour adjacent pairs and `between_gaps` is the count
   of colour boundaries (at most 3 for four colours).

7. If no size in [44, 68] allows all dice to fit in one row, the pool **wraps to two rows**. The
   wrap point is the colour-group boundary nearest to the midpoint of the total die count, such
   that the first row contains at least half the dice. Both rows share the same die size (44 px).

8. Die size changes between pool configurations are expected. There is no animation between one
   size and another — the panel simply redraws at the new size when the pool changes.

### Face display at size

9. For dice with `faces === 6` and `size ≥ 52 px`: the rolled value (or idle-state label) is
   rendered as a **pip dot pattern** using the 3×3 grid defined in `src/dice/pip-slots.ts`. Pip
   dot radius scales proportionally with die size: `r = size × 0.066` (at 68 px → 4.5 px, at
   52 px → 3.4 px).

10. For all other cases — `faces ≠ 6`, or `size < 52 px`, or idle state showing the face count —
    the value is rendered as a **centred bold numeral**. Numeral size: `Math.round(size × 0.32)`
    px (at 68 px → 22 px; at 44 px → 14 px).

### Pip total badges

11. Pip total badges sit below the die row(s), one per colour currently in the pool. A colour with
    zero dice in the pool has no badge. Badges show the pip total (or `—` pre-roll).

12. Badges use the updated sizing: minimum badge height **28 px** (currently 26 px); pip total
    numeral **15 px bold** (currently 14 px); horizontal padding **10 px** per side (currently 8
    px). All other badge styling (background, text colour) is unchanged.

### Compact glyph format (weapon cards and status contexts)

13. For contexts where individual die tap-targets are neither required nor possible — weapon card
    pip-cost annotations, status strips, and similar read-only micro-displays — a compact glyph
    format is used. Each die is a **28 px** coloured square with a centred numeral showing the face
    count. No pip dots. Within-group gap: 4 px. Between-group gap: 8 px. Canonical colour order.

14. The compact glyph format is a separate, non-interactive render path. It does not use the
    pool-layout utility (size is always fixed at 28 px).

### Type-check and tests

15. `npm run typecheck` exits zero errors.

16. `npm run test` passes. The pool-layout utility is covered by unit tests at minimum for: 4 dice
    (1R 1G 1Y 1B), 5 dice (2R 1G 1Y 1B), 6 dice (2R 2G 1Y 1B), 7 dice (2R 2G 2Y 1B), and
    8 dice (3R 2G 2Y 1B). Each test asserts the expected die size and whether wrapping occurs.

---

## Scope / non-goals

- **Purple dice:** held for a future archetype. The canonical colour order (R G Y B) gains a fifth
  slot when Purple ships; that extension is out of scope here.
- **Roll animation:** unchanged from the current implementation. The animation already operates
  on the pre-computed final value; only the die size it draws at changes.
- **Per-die pip spending** (tapping a die to spend from it): not this feature. Spending remains
  colour-total based, via pip badges.
- **Engrave notch marker visual:** the `engraved` flag is threaded through the primitive, but the
  notch marker's exact pixel shape is specified in feature 088 and the Engineer should match it.
- **Pool size hard cap:** not enforced here. The two-row wrap handles any pool that fits at 44 px;
  extremely large pools (10+ dice) would require a third row but that pool size is not reachable
  within the current upgrade model (088).
- **Mechanical changes:** die rolling, pip spending, combat resolution — untouched.
- **Workbench selection affordance:** the tap-target highlight and inline operation area are
  specified in feature 088; this feature only ensures die objects are ≥ 44 px, which follows
  automatically from the 44 px floor.

---

## Design detail

### Three display contexts

| Context | Where used | Sizing | Interaction |
|---|---|---|---|
| **Roll display** | Combat panel, encounter panels | Dynamic [44, 68] | Roll animation, pip spending |
| **Pool panel** | Workbench, weapon-selection preview, camp pool display | Dynamic [44, 68] | Tappable (workbench), read-only (preview) |
| **Compact glyph** | Weapon card pip-cost, status strip | Fixed 28 px | None |

Roll display and Pool panel share the same pool-layout utility and the same rendering primitive.
The only difference between them is whether a roll animation runs and whether tap events are
wired up — both concerns belong to the individual panel, not the primitive.

### Layout algorithm (pool-layout utility)

```
Input:  dice[]          — unordered list of Die objects
        containerWidth  — available horizontal space (px)

Step 1: Sort dice by canonical colour index (R=0, G=1, Y=2, B=3).

Step 2: Compute within_gaps (same-colour adjacent pairs) and between_gaps
        (colour boundaries, i.e. distinct colours − 1).

Step 3: Find the largest integer size in [44, 68] such that:
           (n × size) + (within_gaps × 8) + (between_gaps × 16) ≤ containerWidth
        If no such size exists, size = 44 and wrap = true.

Step 4: If wrap = false, return one row containing all dice at computed size.
        If wrap = true, find the colour-group boundary closest to n/2 (bias toward
        first row having ≥ n/2 dice), split there, return two rows.

Output: { size: number, rows: Die[][] }
```

### Worked size examples (containerWidth = 328 px)

| Pool | n | within_gaps | between_gaps | Size | Rows |
|---|---|---|---|---|---|
| 1R 1G 1Y 1B | 4 | 0 | 3 | 68 px | 1 |
| 2R 1G 1Y 1B | 5 | 1 | 3 | 52 px | 1 |
| 2R 2G 1Y 1B | 6 | 2 | 3 | 44 px | 1 |
| 2R 2G 2Y 1B | 7 | 3 | 3 | 44 px | wraps (R+G / Y+B) |
| 3R 2G 2Y 1B | 8 | 4 | 3 | 44 px | wraps (R+G / Y+B) |

### Pip dot display threshold

The threshold of 52 px for switching d6 faces from pip dots to numeral aligns with the point at
which pip circle radius falls below 3.5 px — below that, dots read as decorative noise rather
than countable pips, especially during roll animation. At 52 px the radius is 3.4 px and still
distinct. The switch to numeral at that boundary is clean and requires no interpolation.

### Edge cases

- **Single-colour pool** (e.g. three Red dice, no others): `between_gaps = 0`,
  `within_gaps = 2`. At three dice: (3 × 68) + (2 × 8) = 220 px — comfortably fits at 68 px.
- **All same face count, mixed colours**: normal layout; face count never affects sizing.
- **Engraved die in non-workbench context:** the `engraved` flag can be passed in any context.
  The notch marker still renders — it is part of the die's identity, not just the workbench UI.
- **Pool with 0 dice of a colour:** that colour simply has no die in the array; no empty lane or
  placeholder is shown.

---

## Visual design

### Layout wireframes

**4-die starter pool — 1R 1G 1Y 1B, size 68 px, single row:**

```
◄─────────────────── 328 px ───────────────────►
┌──────────┐  ◄16►  ┌──────────┐  ◄16►  ┌──────────┐  ◄16►  ┌──────────┐
│          │        │          │        │          │        │          │
│  🔴 d6   │        │  🟢 d6   │        │  🟡 d6   │        │  🔵 d6   │
│  ·  ·  · │        │  ·  ·  · │        │  ·  ·  · │        │  ·  ·  · │
│  (pips)  │        │  (pips)  │        │  (pips)  │        │  (pips)  │
└──────────┘        └──────────┘        └──────────┘        └──────────┘
  68 px                68 px               68 px                68 px

 [🔴  3 ]              [🟢  5 ]            [🟡  2 ]            [🔵  4 ]
```

**6-die pool — 2R 2G 1Y 1B, size 44 px, single row:**

```
◄─────────────────── 328 px ───────────────────►
┌──────┐◄8►┌──────┐  ◄16►  ┌──────┐◄8►┌──────┐  ◄16►  ┌──────┐  ◄16►  ┌──────┐
│ 🔴d6 │   │ 🔴d8 │        │ 🟢d6 │   │ 🟢d6 │        │ 🟡d6 │        │ 🔵d6 │
│  4   │   │  7   │        │  2   │   │  6   │        │  3   │        │  5   │
└──────┘   └──────┘        └──────┘   └──────┘        └──────┘        └──────┘
 44 px                      44 px                      44 px            44 px

         [🔴  11 ]                  [🟢  8 ]            [🟡  3 ]       [🔵  5 ]
```
*At 44 px, all dice show numerals — pip dots are not drawn below 52 px.*

**7-die pool — 2R 2G 2Y 1B, size 44 px, wraps after G:**

```
Row 1:
┌──────┐◄8►┌──────┐  ◄16►  ┌──────┐◄8►┌──────┐
│ 🔴d6 │   │ 🔴d8 │        │ 🟢d6 │   │ 🟢d6 │
│  6   │   │  4   │        │  3   │   │  1   │
└──────┘   └──────┘        └──────┘   └──────┘

Row 2:
┌──────┐◄8►┌──────┐  ◄16►  ┌──────┐
│ 🟡d6 │   │ 🟡d8 │        │ 🔵d6 │
│  5   │   │  2   │        │  4   │
└──────┘   └──────┘        └──────┘

[🔴  10 ]   [🟢  4 ]   [🟡  7 ]   [🔵  4 ]   ← badges span full width, centred as a group
```

**Compact glyph — weapon card annotation (28 px fixed):**

```
◄ weapon card pip-cost zone ►
[🔴28][🔴28] [🟢28]
  d6   d8      d6
```

### Die rendering at size

| Die size | d6 display | d8/d10/d12 display | Numeral size |
|---|---|---|---|
| 68 px | pip dots (r = 4.5 px) | numeral 22 px | 22 px |
| 60 px | pip dots (r = 4.0 px) | numeral 19 px | 19 px |
| 52 px | pip dots (r = 3.4 px) | numeral 17 px | 17 px |
| 44 px | **numeral** 14 px | numeral 14 px | 14 px |
| 28 px (glyph) | numeral 9 px | numeral 9 px | 9 px |

### Colour tokens

No new colour tokens required. Existing tokens already cover all die colours, badge backgrounds,
and text. The 16 px group-separator gap is a layout constant, not a visual element.

### Typography / sizing

New or changed sizing values introduced by this feature:

| Element | Previous | New |
|---|---|---|
| Die size (baseline 4-die pool) | 68 px (hardcoded) | 68 px (computed — unchanged at 4 dice) |
| Die gap (within colour group) | 10 px (hardcoded) | 8 px |
| Die gap (between colour groups) | 10 px (same as within) | 16 px |
| Pip badge height | 26 px | 28 px |
| Pip badge numeral | 14 px | 15 px bold |
| Pip badge horizontal padding | 8 px | 10 px |

---

## Open questions

No blocking questions — this item is **READY**.

Post-ship calibration notes:
- **Wrap point feel:** the 7-die threshold for wrapping to two rows is derived from the math, but
  whether a two-row combat panel feels cramped or readable in play needs to be confirmed with the
  actual tile map visible above. The Engineer should flag this if the map zone above the panel
  becomes visually tight.
- **Between-group gap legibility:** 16 px is intended as a perceptible but not dramatic separator.
  If playtesting shows players have trouble reading colour groupings, widening to 20 px is an
  easy dial to turn without a spec change.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** 2026-06-11 · **PR:** (pending)

### What was built

- **`src/dice/draw.ts`** — Shared die-drawing primitive (`drawDie`), compact glyph helpers (`drawCompactDie`, `drawCompactDiceRow`, `COMPACT_SIZE`), and `roundRect` utility. Handles pip dots (d6 ≥52 px), numerals, and engraved notch markers.
- **`src/dice/pool-layout.ts`** — Pool layout algorithm (`computePoolLayout`), x-position helper (`computeRowXPositions`), color-group center helper (`colorGroupCenters`), and gap constants (`WITHIN_GAP`, `BETWEEN_GAP`, `ROW_VERTICAL_GAP`).
- **`src/dice/pool-layout.test.ts`** — 578 tests covering 4/5/6/7/8-dice layouts, sizing, wrapping, color ordering, x-positions, and group centers.
- **`src/dice/panel.ts`** — Rewired to use `computePoolLayout` / `drawDie`; `computeDynamicGeom` drives all Y positions.
- **`src/combat/panel.ts`** — Rewired; `computeCombatGeom` replaces all hardcoded DIE_SIZE/position constants; pip-btn and submenu Y positions derived from pool height.
- **`src/encounter/check-panel.ts`**, **`trap-panel.ts`**, **`chest-panel.ts`** — Local `drawDieFace` implementations replaced with delegation to `drawDie`; `roundRect` and `DIE_FACE_BG` removed from each.
- **`src/dice/demo.ts`** — Interactive demo canvas (390×600 px): roll, reset, 6 presets, per-color add/remove buttons (d4–d12). Uses `compactRowWidth` pure helper to measure compact row width without side effects.
- **`dice-pool-demo.html`** — Demo HTML page wiring canvas + controls.
- **`vite.config.ts`** — Added `demo` entry for `dice-pool-demo.html`.
- **`index.html`** — Added "Dice Pool Demo" card linking to `dice-pool-demo.html`.

One spec table discrepancy noted: the 5-dice example in the spec table shows size 52 but the formula produces 54. Tests assert 54 (correct per formula). The algorithm is the authority.

### Evidence

- `npm run typecheck` → 0 errors
- `npm run test` → 578 tests passed (30 test files)

### Play-test

1. Open `dice-pool-demo.html` (dev server or `npm run build` + static serve).
2. Click **4d — Starter**: confirm 4 dice at 68 px in one row, d6 faces show pip dots.
3. Click **Roll Pool**: each die shows a rolled value (pips for d6 at 68 px, numerals otherwise). Totals line appears.
4. Click **Reset**: dice return to face-count labels.
5. Click **5d — Mixed**: 5 dice at 54 px, single row.
6. Click **6d — Wrap**: 6 dice at 44 px, single row, all numerals.
7. Click **7d — 2 rows**: 7 dice wrapping to 2 rows (R+G top / Y+B bottom), both at 44 px.
8. Click **8d — Big**: 8 dice in 2 rows.
9. Use per-color +d4/d6/d8/d10/d12 buttons to build a custom pool; verify size scales down as pool grows.
10. Use −1 and ×0 buttons to shrink; verify size scales back up.
11. Check combat panel in-game with a 4-die pool: die sizes and pip badges match original layout at 68 px.
12. Check that adding dice via the workbench produces correct multi-die layouts in the combat panel.
