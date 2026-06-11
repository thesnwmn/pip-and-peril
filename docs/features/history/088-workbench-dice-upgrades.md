# 088 · Workbench — Dice Upgrades

**Status:** READY
**Source idea:** Backlog item 088; concept in `docs/concept/meta-progression.md`
**Depends on:** 029 (MetaState schema, camp screen, workbench tap target, die visual language from feature 005)

---

## Summary

The workbench sub-screen makes Pip's permanent dice pool upgradeable between runs. Tapping the
workbench at camp opens a panel where Pip spends shiny scraps on three operations against his
physical dice: **Swap** a die for a larger face-count (higher ceiling, more variance), **Add** a
new die of a chosen colour (grows the pool), and **Engrave** a die's minimum face upward in
**sequential tiers** — each tier raising the floor by one pip and costing more than the last,
requiring the previous tier before the next can be purchased. Each operation deducts scraps and
persists immediately. Together with 029, this closes the full "Shiny Scraps & Dice Upgrades" loop:
earn scraps in a run, return to camp, make targeted choices about the dice Pip carries forward.

> **Note:** Feature 093 (Named Dice & Die Collection) will supersede the Swap and Add Die
> operations here and change the die acquisition model entirely. The engrave tier system in this
> spec is designed to survive that transition unchanged.

---

## Acceptance criteria

### Opening the panel

1. Tapping the **Workbench** at camp opens the workbench sub-screen panel, replacing the stub
   from feature 029. The panel rises from the bottom; the camp dims behind a scrim. The camp
   is not interactable while the panel is open.

2. The panel header shows: an **✕ close button** (top-right, 44×44 px tap area — per the sub-panel
   model introduced in feature 090), the label **"Pip's Dice"** (centred), and the **current scraps
   count** prefixed by a pouch icon (right-aligned, `--gold`, 16px, bold). The `← Back` affordance
   described in the original spec is superseded by the ✕ button (see feature 090, criterion 17).

3. The scraps count **updates live** as upgrades are purchased within the session. It never
   displays a negative value.

### Die display

4. Each die in `MetaState.permanentPool` is rendered as a **tappable die object** — a coloured
   square with its face-count label, matching the visual language from feature 005. Die objects
   are **at least 44×44 px** for thumb-scale tap targets.

5. Tapping a die **selects** it; an inline operation area appears directly below the die row.
   Tapping the same die again, tapping elsewhere in the panel, or completing any operation
   deselects it.

6. An **"+ Add Die"** CTA sits below the die row and is always visible regardless of die selection.

7. A **"Done"** button occupies the bottom strip, always visible. Tapping it returns to the camp
   screen. All mutations made during the session are already persisted — there is no undo.

### Swap operation

8. The inline area for a selected die shows a **Swap** option when `die.faces < 12`. The label
   reads **"Swap → d[N]"** where N is the next step in the upgrade path:
   `d4 → d6 → d8 → d10 → d12`. A die at d12 shows **"Max size"** (disabled, non-tappable).

9. Swap costs by step:

   | Upgrade | Cost |
   |---|---|
   | d4 → d6 | 20 scraps |
   | d6 → d8 | 30 scraps |
   | d8 → d10 | 45 scraps |
   | d10 → d12 | 60 scraps |

   The cost is displayed inline next to the Swap label. If the player cannot afford it, the
   option is **visually dimmed** and the tap does nothing.

10. Tapping an affordable Swap option presents an inline confirm: **"Swap to d[N] for [C]
    scraps?"** with a **Confirm** button and a cancel option. Tapping Confirm:
    - deducts the cost from `MetaState.scraps`
    - updates the die's `faces` field to the new value
    - persists `MetaState` to `localStorage`
    - closes the confirm state; the die object updates in-place to show the new face count

### Engrave operation

11. The inline area for a selected die shows an **Engrave** option when
    `(die.minFloor ?? 1) < Math.floor(die.faces / 2)` (i.e. at least one tier remains). The label
    reads **"Engrave — raise min to [nextVal]"** where `nextVal = (die.minFloor ?? 1) + 1`. Cost
    is determined by which tier this purchase represents (the target value):

    | Next min value | Tier | Cost |
    |---|---|---|
    | 2 | 1 | 30 scraps |
    | 3 | 2 | 50 scraps |
    | 4 | 3 | 75 scraps |
    | 5 | 4 | 100 scraps |
    | 6 | 5 | 125 scraps |

    The cost is displayed inline next to the Engrave label. A die at d4 can only ever reach tier 1
    (min 2). A die at d6 can reach tier 2 (min 3). Larger dice unlock higher tiers. If the player
    cannot afford the current tier cost, the option is **visually dimmed** and the tap does nothing.

12. Tapping an affordable Engrave option presents an inline confirm: **"Raise minimum face to
    [nextVal] for [C] scraps?"** with a **Confirm** button and a cancel option. Tapping Confirm:
    - deducts C from `MetaState.scraps`
    - sets `die.minFloor` to `nextVal` on the `PermanentDie` record
    - persists `MetaState`
    - closes the confirm state; the die object's engrave marker updates (see Visual design)

13. A die at maximum engrave tier (`die.minFloor === Math.floor(die.faces / 2)`) shows
    **"Min: [V] — max tier"** (11px, `--text-muted`) in the inline area. No further Engrave
    option is displayed.

14. A die with `die.minFloor > 1` but below max tier shows **"Min: [V]"** (11px, `--text-muted`)
    above the Engrave option for the next tier. Both the current floor status and the next-tier
    option are visible simultaneously — the player can see where the die is and what the next
    investment costs in one glance.

### Swap + Engrave interaction

15. Swapping an engraved die **preserves `minFloor`**. A d6 with `minFloor: 3` (tier 2) swapped
    to d8 becomes a d8 with `minFloor: 3` — the tier-2 engrave carries. The next available tier
    on the d8 is tier 3 (raise min to 4, 75 scraps). The inline area shows the carried floor status
    and the tier-3 option immediately after the swap. *Note: feature 093 will change die acquisition
    so that Swap is replaced by earning dice through achievements; at that point this carry-through
    rule may be revisited.*

### Add Die operation

16. Tapping **"+ Add Die"** opens an inline colour picker showing available colour options. Each
    option is presented as a d4 die object (newly added dice always start at d4) with a cost
    label below.

17. Colours shown and their costs:

    | Colour | Cost | Condition |
    |---|---|---|
    | Red | 50 scraps | always shown |
    | Green | 50 scraps | always shown |
    | Yellow | 50 scraps | always shown |
    | Blue | 50 scraps | **only shown if `permanentPool` already contains ≥ 1 Blue die** |

    Blue is not shown and cannot be added via this screen until at least one Blue die already
    exists in the permanent pool. The first Blue die arrives via a Mark of Descent (feature 052).

18. Colour options the player cannot afford are **dimmed and disabled**.

19. Tapping an affordable colour presents an inline confirm: **"Add d4 [Colour] for 50
    scraps?"** with a **Confirm** button and a cancel option. Tapping Confirm:
    - deducts 50 from `MetaState.scraps`
    - appends a new `PermanentDie` to `MetaState.permanentPool` with: a stable sequential ID
      (e.g. `r2` for the second Red die), the chosen colour, `faces: 4`, no `minFloor`
    - persists `MetaState`
    - closes the colour picker; the new die appears in the die row immediately

### MetaState schema extension

20. `PermanentDie` gains one optional field: `minFloor?: number`. When absent or `1`, the die
    has no engrave. When present and `> 1`, rolls on this die are clamped: result =
    `Math.max(rawRoll, minFloor)`. The `MetaState` version key remains `pip-meta-v1`; this
    change is additive and backwards-compatible — existing saves without `minFloor` remain valid.

21. The `minFloor` field, when set, is always an integer satisfying
    `2 ≤ minFloor ≤ Math.floor(faces / 2)`. Validation is enforced at write time; invalid stored
    values are silently clamped to the valid range on load.

### Combat rolling update

22. All rolls of permanent dice must apply the floor: `result = Math.max(rawRoll, die.minFloor ?? 1)`.
    This is enforced in the dice-rolling logic, not at the display layer — the face shown to the
    player is the clamped result.

### Pool preview consistency

23. The weapon-selection pool preview (feature 029) shows engraved permanent dice with their
    engrave marker (see Visual design) — same visual language as the workbench panel. Weapon-added
    dice carry no marker (they are never engraved).

---

## Scope / non-goals

- **Blue's first die**: cannot be added via Add until it is already in the permanent pool. That
  arrival is feature 052's responsibility.
- **Named dice / die provenance / die collection / per-run loadout** (Idea 050): captured as
  feature **093** (Named Dice & Die Collection). When 093 ships, Swap and Add Die operations in
  this spec become obsolete; engrave tiers survive unchanged.
- **Downward swap / die removal**: A die cannot be swapped to a smaller face count or removed
  from the pool. Once added, a die is permanent.
- **Engrave any face**: this spec locks only the minimum face. Arbitrary-face engraving is a more
  complex UI and a less legible operation; defer unless playtesting reveals a strong need.
- **Dice gambling / Tempering** (Idea 074): a separate, risk-carrying mechanic; different feature.
- **Pool size hard cap**: no enforcement here. The engineer should implement row-wrapping for pools
  larger than ~7 dice from the start to avoid a later refactor.
- **Scraps economy fine-tuning**: the costs specified above are starting estimates. Cross-testing
  against the actual gold-drop model (features 019, 026) is required before finalising.
- **Visitor-mediated free modification** (the Tinker in feature 051): ships with the visitor system,
  not here.
- **Skill loadout**: unrelated; feature 052.

---

## Design detail

### MetaState data shape

```
PermanentDie {
  id:        string        // stable, e.g. 'r1', 'g2'
  colour:    DiceColour    // 'red' | 'green' | 'blue' | 'yellow'
  faces:     DiceFaces     // 4 | 6 | 8 | 10 | 12
  minFloor?: number        // absent = 1; present = 2..floor(faces/2)
}
```

### Workbench screen states

```
[Camp]
  │ tap Workbench
  ▼
[Panel open — die row, no selection]
  │
  ├─ tap a die ──────────────────────────────────────────────────────────────┐
  │                                                                          ▼
  │                                                               [Die selected]
  │                                                        Swap + Engrave options shown
  │                                                                          │
  │                                        ┌─────────────────────────────────┤
  │                                        │                                 │
  │                                tap Swap                           tap Engrave
  │                                (affordable)                       (affordable,
  │                                        │                          not engraved)
  │                                        ▼                                 ▼
  │                               [Swap confirm]                    [Engrave confirm]
  │                               "Swap to dN for C scraps?"        "Raise min to V for C?"
  │                               [Confirm] / cancel                [Confirm] / cancel
  │                                        │                                  │
  │                               Confirm: scraps update            Confirm: scraps update
  │                                        die.faces updated                  die.minFloor = nextVal
  │                                        persist                            persist
  │                                        deselect                           deselect
  │
  ├─ tap "+ Add Die" ────────────────────────────────────────────────────────┐
  │                                                                          ▼
  │                                                               [Colour picker]
  │                                                               d4 objects for each
  │                                                               available colour + cost
  │                                                                          │
  │                                                              tap colour (affordable)
  │                                                                          ▼
  │                                                              [Add confirm]
  │                                                              "Add d4 [C] for 50?"
  │                                                              [Confirm] / cancel
  │                                                                          │
  │                                                              Confirm: scraps update
  │                                                                    new die appended
  │                                                                    persist
  │                                                                    return to die row
  │
  └─ tap Done ──────────────────────────────────────────────────────────► [Camp]
```

### Engrave: why minimum face only, and why sequential

Locking the minimum face is the only operation where the value is always legible: "this die can
never roll below V." It tames the worst outcome without touching the ceiling — the die is calmer
but not weaker. The cap at `floor(faces / 2)` prevents trivialising the die (a d6 engraved to
min 4 would have an expected value of 4.3, nearly matching a d8; the cap holds it to min 3,
expected 3.8).

Sequential tiers rather than a free pick exist for two reasons. First, skipping to min 3 on a
d6 is a stronger operation than min 2 — it should cost more. A flat 15sc one-shot purchase
obscured this. Second, sequential tiers create an investment relationship with a specific die over
multiple runs: the player who has put 80sc into a d6 (30 + 50) has a *history* with it. This
aligns with feature 093's direction of named, personally-owned dice.

The engrave costs are deliberately expensive relative to swap costs — tier 2 (50sc) equals the
Add Die cost. Deep engraving is a late-meta choice, not an early-run habit.

### Engrave persistence through swap

When a die is swapped, `minFloor` copies to the upgraded die unchanged. A d6 engraved to min 3
(tier 2), swapped to d8, is a d8 with min 3 — tier 2 carried. The d8's tier-3 option (min 4,
75sc) becomes available immediately. The player who engraved before swapping gets the benefit on
the new die and can continue the investment there.

### Costs rationale

The target calibration (from `docs/concept/meta-progression.md`): one meaningful upgrade roughly
every two or three runs. Assuming approximately 15–30 scraps from a shallow run and 30–60 from a
run reaching floor 2 (based on the gold model in feature 019):

| Operation | Cost | Feels like |
|---|---|---|
| Swap d4 → d6 | 20 | Achievable in 1 run with floor-2 reach |
| Swap d6 → d8 | 30 | 2 runs; a deliberate save |
| Swap d8 → d10 | 45 | Mid-meta; requires consistent floor-2 runs |
| Swap d10 → d12 | 60 | Late-meta; 2–3 deep runs |
| Add Die | 50 | High-impact; appropriately expensive |
| Engrave tier 1 (min 2) | 30 | Meaningful but approachable; 1–2 runs |
| Engrave tier 2 (min 3) | 50 | Rivals Add Die; a genuine commitment |
| Engrave tier 3 (min 4) | 75 | Mid-late meta; reserved for dice you trust |
| Engrave tier 4 (min 5) | 100 | Late-meta; 3–4 deep runs |
| Engrave tier 5 (min 6) | 125 | d12 only; endgame investment |

Engrave costs are intentionally heavy — the old 15sc flat cost made engraving a throwaway. At 30sc
for tier 1, engraving a die is a real choice that competes with a Swap. At 50sc for tier 2, it
rivals adding a new die entirely. This creates meaningful tension: "do I deepen this die or get
a new one?" The cost ladder also means tier-1 engrave remains accessible while late tiers are
visibly late-meta investments.

### Edge cases

- **0 scraps at camp (e.g. died on floor 1)**: all operations are dimmed; the panel is browsable
  but nothing is purchasable. The player can still open the workbench and see their pool.
- **Add Die with max pool**: no hard enforcement, but the die row should wrap at ~7 dice. The
  engineer implements wrapping; the spec does not define a cap.
- **Swap an engraved d12**: d12 is max size; Swap is disabled. The inline area shows the current
  engrave tier status and the next tier option (if any), or "max tier" if fully engraved.
- **localStorage write failure mid-session**: same handling as feature 029 — fire-and-forget
  write; in-memory state continues. No mid-session failure crashes the session.

---

## Visual design

### Workbench panel wireframe

```
                     ↑ camp dims (scrim)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel rises
│← Back    Pip's Dice    ◈ 42  │  ← back · title · scraps (--gold, 16px bold)
├─────────────────────────────┤
│                             │
│  [d6🔴]  [d6🟢]  [d4🟡]  │  ← die row; at least 44×44px each
│                             │     (engraved dice show notch marker on one edge)
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  ← inline operation area (hidden when no selection)
│                             │
│        [ + Add Die ]        │
│                             │
├─────────────────────────────┤
│           [ Done ]          │
└─────────────────────────────┘
```

#### Die selected (d4 Yellow — unengraved, showing Swap + Engrave tier 1):

```
│  [d6🔴]  [d6🟢]  ╔[d4🟡]╗  │  ← selected die: thin gold highlight ring
│                             │
│    Swap → d6   20 scraps    │  ← operation row; cost right-aligned
│    Engrave → min 2  30 sc   │
│                             │
```

#### Die selected (d6 Green — at tier 1, min 2, showing tier 2 option):

```
│  [d6🔴]  ╔[d6🟢]╗  [d4🟡]  │
│                             │
│    Swap → d8   30 scraps    │
│    Min: 2                   │  ← current floor status, --text-muted
│    Engrave → min 3  50 sc   │  ← next tier; cost right-aligned
│                             │
```

#### After tapping Engrave → confirm (no picker; next value is always +1):

```
│    Raise minimum face to 3  │
│    for 50 scraps?           │
│    [Confirm]  Cancel        │
```

#### Die at max tier (d6 at min 3):

```
│  [d6🔴]  ╔[d6🟢]╗  [d4🟡]  │
│                             │
│    Swap → d8   30 scraps    │
│    Min: 3 — max tier        │  ← --text-muted; no further engrave
│                             │
```

#### Add Die colour picker:

```
│  Add a d4 die to your pool  │
│                             │
│  [d4🔴]  [d4🟢]  [d4🟡]   │  ← colour die objects with cost below
│   50sc    50sc    50sc      │
│  ([d4🔵] shown only if      │
│    Blue already in pool)    │
│                             │
│          Cancel             │
```

### Colour tokens

No new tokens required. Reuse from feature 029:

| Need | Token used |
|---|---|
| Panel background | `--camp-surface` |
| Panel borders / dividers | `--camp-border` |
| Confirm button | `--camp-accent` |
| Scraps counter | `--gold` |
| Cannot-afford state | `--text-muted` at 50% opacity |

The **engrave notch marker** on a die object is a small (4–6px) filled bar drawn on the bottom
edge of the die face square, in the die's own colour at 60% opacity. No new token.

### Typography / sizing

No new font sizes. New elements mapped to the established scale:

| Element | Size | Weight | Colour |
|---|---|---|---|
| Panel title "Pip's Dice" | 16px | bold | `--text-primary` |
| Scraps counter | 16px | bold | `--gold` |
| Die face-count label | 14px | bold | die colour token |
| Operation label (e.g. "Swap → d8") | 13px | regular | `--text-primary` |
| Operation cost | 12px | regular | `--gold` |
| Value picker buttons | 14px | bold | `--text-primary` |
| Confirm text | 13px | regular | `--text-primary` |
| "Min: N" current tier status | 11px | regular | `--text-muted` |
| "Min: N — max tier" status | 11px | regular | `--text-muted` |

---

## Open questions

No blocking questions — the spec is **READY**.

Calibration questions to watch during playtesting:

- **Engrave tier costs**: the 30/50/75/100/125sc ladder is a proposal. Cross-check against
  scraps-drop rates from features 019 and 026. The key tension to test: does tier 2 (50sc) feel
  like a real sacrifice, or is it trivial once the player is running floor 2 consistently?
- **Engrave value range**: is `floor(faces/2)` the right ceiling? A d6 at min 3 has expected
  value ~3.8 versus un-engraved ~3.5; monitor for early-meta impact.
- **Add Die cost**: does 50 scraps still feel weighty enough for pool expansion (3→4 dice) now
  that tier-2 engrave costs the same? The "more pool vs. deeper die" tradeoff should feel genuine.
- **Scraps economy cross-check**: all costs above must be tested against actual gold-drop rates.
  Adjust conversion rate in feature 029 if the economy runs dry, not costs here.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** 2026-06-11 · **PR:** pending

### What was built

**MetaState schema extension** (`src/meta/state.ts`):
- `PermanentDie` gains optional `minFloor?: number` field
- Additive, backwards-compatible — existing saves remain valid (pip-meta-v1 unchanged)
- `loadMetaState` clamps loaded minFloor to valid range `[2, floor(faces/2)]` on every load

**Dice rolling update** (`src/dice/pool.ts`, `src/screens/game.ts`):
- `Die` interface gains `minFloor?: number`; `rollPool` applies `Math.max(raw, minFloor ?? 1)` for all dice
- `createRunPool` in game.ts spreads `minFloor` onto Die objects when `> 1`

**Workbench helpers** (`src/camp/workbench.ts`):
- `getNextFaces`: d4→d6→d8→d10→d12 upgrade path; null at d12
- `getSwapCost`: 20/30/45/60 scraps by step
- `getEngraveValues`: returns integers 2..floor(faces/2)
- `makeNewDieId`: generates stable sequential IDs (e.g. `r2` for second red die)

**Workbench panel** (`src/screens/camp.ts`):
- Full `WorkbenchMode` state machine: idle → die-selected → swap-confirm / engrave-picker → engrave-confirm / add-picker → add-confirm
- Die row displays permanent pool with selection ring, engrave notch marker, tap targets ≥52px
- Swap operation: confirm flow, deducts scraps, updates die.faces, preserves minFloor through swap
- Engrave operation: value picker (2..floor(faces/2)), confirm flow, sets die.minFloor
- Add Die operation: colour picker (Blue gated on pool having ≥1 Blue), confirm flow, appends d4
- All mutations persist immediately via `saveMetaState`; scraps counter updates live
- `getWbDieRect`, `getWbOpsTop`, `getWbDoneRect`, `getWbAddBtnRect` exported for geometry tests
- Engrave notch marker reused in weapon-selection pool preview (criterion 23)

### Evidence

- 551 tests passing (28 test files) including:
  - `src/camp/workbench.test.ts`: helper functions (getNextFaces, getSwapCost, getEngraveValues, makeNewDieId, costs)
  - `src/dice/pool.test.ts`: 5 minFloor tests (clamp below floor, no-clamp above, marker preserved, no-floor baseline, totals accuracy)
  - `src/screens/camp.test.ts`: workbench geometry tests (WB_DIE_SIZE ≥44, die rect sizing, ops top, done rect, add button)
- `npm run typecheck` clean, `npm run build` clean

### Play-test

**Opening the workbench**
1. Load game, arrive at camp screen
2. Tap the **Workbench** button in the activity bar → panel rises from bottom; camp dims behind scrim
3. Panel header shows "Pip's Dice" centred; scraps count (◈ N) right-aligned in gold; ✕ top-right
4. Permanent dice displayed as coloured squares with face counts (default: d6🔴, d6🟢, d4🟡)
5. "+ Add Die" button visible below dice row; "Done" strip at bottom

**Swap a die**
1. Tap the d6🔴 (Red die) → gold selection ring appears; "Swap → d8 · 30 sc" and "Engrave minimum face · 15 sc" appear below die row (requires ≥30 scraps for Swap)
2. With insufficient scraps: Swap row is dimmed and non-interactive; tap does nothing
3. With sufficient scraps: tap Swap row → confirm: "Swap to d8 for 30 scraps?" + Confirm button + Cancel
4. Tap Confirm → die updates to d8🔴; scraps counter decreases by 30; back to idle

**Engrave a die**
1. Select a d6🟢 die; tap "Engrave minimum face" → value picker shows [2] [3]; Cancel below
2. Tap [2] → confirm: "Lock minimum face to 2 for 15 scraps?" + Confirm + Cancel
3. Tap Confirm → die shows engrave notch marker; scraps decreases by 15; idle
4. Re-select same die → shows "Engraved: min 2" (no Engrave option); Swap still available

**Engrave preserves through Swap**
1. Engrave d6🟢 to min 2; then Swap it to d8
2. Re-select d8🟢 → shows "Engraved: min 2"; engrave notch marker still present

**Add Die**
1. With ≥50 scraps, tap "+ Add Die" → colour picker shows d4🔴, d4🟢, d4🟡 (no d4🔵 since no Blue in pool)
2. Tap d4🔴 → confirm "Add d4 red for 50 scraps?"; tap Confirm → new d4🔴 appears in die row; scraps −50
3. Verify pool now has 4 dice

**Done / Close**
1. Tap Done → panel sinks; camp returns to normal
2. Tap ✕ or scene area above panel → same result; state resets

**Persistence**
1. After upgrading a die, reload page (F5) → upgraded die persists with correct faces and minFloor
2. Engrave notch visible on reloaded engraved die

**Edge cases**
- 0 scraps: all operations dimmed; panel is browsable; tap dimmed option does nothing
- d12 die: "Max size" shown (non-interactive) instead of Swap; Engrave available if unengraved
- After Add Die with ≥7 dice: die row wraps to second row
