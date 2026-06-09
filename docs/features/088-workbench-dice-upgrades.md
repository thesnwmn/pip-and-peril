# 088 · Workbench — Dice Upgrades

**Status:** READY
**Source idea:** Backlog item 088; concept in `docs/concept/meta-progression.md`
**Depends on:** 029 (MetaState schema, camp screen, workbench tap target, die visual language from feature 005)

---

## Summary

The workbench sub-screen makes Pip's permanent dice pool upgradeable between runs. Tapping the
workbench at camp opens a panel where Pip spends shiny scraps on three operations against his
physical dice: **Swap** a die for a larger face-count (higher ceiling, more variance), **Add** a
new die of a chosen colour (grows the pool), and **Engrave** a die's minimum face upward (cheaply
tames worst-case outcomes). Each operation deducts scraps and persists immediately. Together with
029, this closes the full "Shiny Scraps & Dice Upgrades" loop: earn scraps in a run, return to
camp, make targeted choices about the dice Pip carries forward.

---

## Acceptance criteria

### Opening the panel

1. Tapping the **Workbench** at camp opens the workbench sub-screen panel, replacing the stub
   from feature 029. The panel rises from the bottom; the camp dims behind a scrim. The camp
   is not interactable while the panel is open.

2. The panel header shows: a **← Back** affordance (top-left), the label **"Pip's Dice"**
   (centred), and the **current scraps count** prefixed by a pouch icon (right-aligned, `--gold`,
   16px, bold).

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

11. The inline area for a selected die shows an **Engrave** option when `die.minFloor` is absent
    or equals 1 (i.e. not yet engraved). Label: **"Engrave minimum face"**. Cost: **15 scraps**
    for any die at any size. If the player cannot afford it, the option is dimmed and disabled.

12. Tapping an affordable Engrave option opens an inline **value picker** showing available locked
    values as distinct tap buttons. Available values are the integers from **2** through
    **`Math.floor(die.faces / 2)`** inclusive:

    | Die | Available values |
    |---|---|
    | d4 | 2 |
    | d6 | 2, 3 |
    | d8 | 2, 3, 4 |
    | d10 | 2, 3, 4, 5 |
    | d12 | 2, 3, 4, 5, 6 |

13. Tapping a value presents an inline confirm: **"Lock minimum face to [V] for 15 scraps?"**
    with a **Confirm** button and a cancel option. Tapping Confirm:
    - deducts 15 from `MetaState.scraps`
    - sets `die.minFloor` to the chosen value on the `PermanentDie` record
    - persists `MetaState`
    - closes the confirm state; the die object receives a visual engrave marker (see Visual design)

14. A die with `minFloor > 1` shows **"Engraved: min [V]"** (11px, `--text-muted`) in the
    inline area instead of the Engrave option. Engraving is **one-time and permanent** — the
    option is not shown again for that die.

### Swap + Engrave interaction

15. Swapping an engraved die **preserves `minFloor`**. A d6 with `minFloor: 3` swapped to d8
    becomes a d8 with `minFloor: 3`. The engraved status label updates to reflect the (now
    potentially different) fraction of max, but the locked value is unchanged.

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
- **Named dice / die provenance** (Idea 050): deferred as a polish pass after the base workbench
  ships and is playtested.
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
  │                               [Swap confirm]                    [Value picker]
  │                               "Swap to dN for C scraps?"         tap value V
  │                               [Confirm] / cancel                          ▼
  │                                        │                        [Engrave confirm]
  │                               Confirm: scraps update            "Lock min to V?"
  │                                        die.faces updated        [Confirm] / cancel
  │                                        persist                            │
  │                                        deselect                  Confirm: scraps update
  │                                                                  die.minFloor = V
  │                                                                  persist / deselect
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

### Engrave: why minimum face only

The meta doc describes engraving as "taming variance" — fixing the worst outcome. Locking the
minimum face delivers exactly this: the die still reaches its full ceiling, but bottoms out less
badly. The alternative — letting the player fix any face — requires showing the full face grid and
choosing a target value for each, which is a 5+-tap flow with hard-to-reason outcomes (fixing a
middle face has unclear value). Locking the minimum is the only operation where the value is
always legible: "this die can never roll below V." The value picker cap at `floor(faces / 2)`
prevents trivialising the die (a d6 engraved to 4 would have an expected value of 4.3, nearly
matching a d8; the cap limits this to min 3, expected 3.8).

### Engrave persistence through swap

When a die is swapped, `minFloor` copies to the upgraded die unchanged. A d6 engraved to min 3,
swapped to d8, is a d8 with min floor 3. The player paid for both decisions separately; both
stand. The engrave becomes a smaller fraction of the new max but remains active — the player who
engraved before swapping accepted this trade.

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
| Engrave | 15 | Cheap reward for owning a die worth locking |

Engrave is intentionally cheap — it requires already having a die with a face count worth
engraving, which is itself a gating factor.

### Edge cases

- **0 scraps at camp (e.g. died on floor 1)**: all operations are dimmed; the panel is browsable
  but nothing is purchasable. The player can still open the workbench and see their pool.
- **Add Die with max pool**: no hard enforcement, but the die row should wrap at ~7 dice. The
  engineer implements wrapping; the spec does not define a cap.
- **Swap an engraved d12**: d12 is max size; Swap is disabled. Only Engrave (if unengraved) or
  the Engraved status label is shown.
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

#### Die selected (d4 Yellow — showing Swap + Engrave options):

```
│  [d6🔴]  [d6🟢]  ╔[d4🟡]╗  │  ← selected die: thin gold highlight ring
│                             │
│    Swap → d6   20 scraps    │  ← operation row; cost right-aligned
│    Engrave min  15 scraps   │
│                             │
```

#### After tapping Engrave → value picker (d6, showing 2 and 3):

```
│  [d6🔴]  ╔[d6🟢]╗  [d4🟡]  │
│                             │
│    Engrave minimum face:    │
│         [ 2 ]  [ 3 ]        │  ← tap targets; d4 shows only [ 2 ]
│         Cancel              │
```

#### After picking value → confirm:

```
│    Lock minimum face to 3   │
│    for 15 scraps?           │
│    [Confirm]  Cancel        │
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
| "Engraved: min N" status | 11px | regular | `--text-muted` |

---

## Open questions

No blocking questions — the spec is **READY**.

Calibration questions to watch during playtesting:

- **Engrave value range**: is `floor(faces/2)` tight enough? A d6 engraved to min 3 has expected
  value ~3.8 versus an un-engraved d6's ~3.5; worth monitoring for early-meta impact.
- **Add Die cost**: does 50 scraps feel weighty enough for the first pool expansion (3→4 dice)
  without being discouraging? The first Add is the biggest single upgrade; it should feel like an
  event, not a grind.
- **Scraps economy cross-check**: upgrade costs above must be tested against the actual gold-drop
  rates from features 019 and 026. The calibration note in feature 029 applies: if the 1:1
  gold-to-scraps conversion leaves players under-funded, adjust the conversion rate in 029, not
  the costs here.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
