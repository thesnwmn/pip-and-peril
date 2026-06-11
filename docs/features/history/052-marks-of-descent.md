# 052 · Marks of Descent

**Status:** READY
**Source idea:** Backlog item 052 (originated in `docs/concept/meta-progression.md` — "Marks of Descent")
**Depends on:** 029 (camp screen, MetaState, weapon rack), 024 (run summary screen), 090 (camp redesign — activity bar layout, sub-panel contract)

---

## Summary

**Marks of Descent** are milestone tokens earned from specific firsts and
achievements — the first time Pip reaches a new depth, the first boss kill, the
first clean run without healing. Unlike Shiny Scraps (which buy power), Marks
**expand the menu**: they unlock new weapons on the rack, the first Blue die in
the permanent pool, and eventually skills and new dice as those systems ship.
Each Mark is a recognition, not a resource — you earn it once by doing something
real, and it persists forever.

Marks are tracked on the **Descent Record**, a parchment accessible from the
camp activity bar. The run summary screen reveals newly earned Marks with a
brief ceremony before the player returns to camp. Locked Mark slots are visible
but their rewards are hidden; tapping a locked slot reveals the condition so the
player knows what they are working toward, without spoiling what they will get.

This spec ships: the Mark data model and MetaState extension; evaluation at run
end with immediate unlock application; the Descent Record sub-panel; the run
summary Mark ceremony; and one concrete, functional unlock — the **Blue d4**
added to the permanent pool on first reaching floor 2.

---

## Acceptance criteria

### Data model and persistence

1. A new module `src/meta/marks.ts` defines the complete starting set of six
   `MarkSpec` records (see Design detail). Each has: a unique string `id`, a
   `name`, a `flavourLine`, a `conditionText` (shown when the player reveals a
   locked slot), a `condition` (a discriminated union, see Design detail), and
   an `unlock` payload (also discriminated; one concrete unlock, rest are stubs).

2. `MetaState` (feature 029) gains one new backward-compatible field, defaulting
   to `[]` when absent in a saved state — no version bump, matching the pattern
   from features 051 and 053:
   ```
   marksEarned: string[]   // list of earned mark IDs, in order of earning
   ```

3. Every mutation to `marksEarned` (and any unlock side-effect on other
   `MetaState` fields) is persisted synchronously before any navigation,
   consistent with D22.

### RunState extensions

4. `RunState` (feature 024) gains four new tracked fields. If any of these are
   absent in an existing run (legacy), they default to their zero values. The
   Engineer must wire increment/set calls at the appropriate points:
   - `floorsReached: number` — highest floor number Pip entered during this run.
     Incremented when Pip first enters a new floor. (Floor 1 entered at run start
     = 1; entering the stairwell and landing on floor 2 = 2; floor 3 = 3.)
   - `victory: boolean` — `true` if the run ended with a boss kill, `false`
     if Pip died. Set at run-end routing (the same branch that determines whether
     the run-summary header reads "You fell" vs. "Boss vanquished").
   - `healingItemsUsed: number` — total number of healing item uses during the
     run. Incremented in the item consumption path whenever an item with a
     healing effect is consumed (`kind: 'heal'` or equivalent in the item spec
     data from feature 049).
   - `rattledKillingBlow: boolean` — `true` if at any point during the run Pip
     was in the **Rattled** state (feature 041) when a killing blow was landed.
     Set in the combat kill resolution path; if 041 is not yet shipped, this
     field always initialises to `false` and the corresponding Mark will never
     trigger (which is correct — the Mark is still specced and will become
     earnable when 041 ships).

### Mark evaluation

5. A function `evaluateMarks(run: RunState, meta: MetaState): string[]` in
   `src/meta/marks.ts` returns the IDs of all Marks whose conditions are met
   by this run's `RunState` **and** which are not already in
   `meta.marksEarned`. It has no side effects.

6. At run end — immediately before the run summary screen renders — the game
   calls `evaluateMarks`, applies each newly earned Mark's `unlock` payload to
   `MetaState` (see criterion 8), appends the IDs to `marksEarned`, and persists
   the updated `MetaState`. The newly earned Mark IDs are passed to the run
   summary screen.

7. `evaluateMarks` is a pure function and is unit-tested for all six Mark
   conditions, covering both the positive case (condition met, Mark not yet
   earned → returned) and the idempotency case (condition met, Mark already
   earned → not returned again).

### Unlock application

8. When a Mark with `unlock.kind === 'die'` is applied, the specified die
   (`{colour, size}`) is appended to `MetaState.permanentPool`. Dynamic pool
   composition (D23) then includes it automatically in the next run without
   further wiring.

9. The **`mark-floor-2` Mark** (`unlock.kind === 'die'`, colour `blue`, size 4)
   is the only Mark in the starting set whose unlock is concretely functional.
   After this Mark is earned and the camp screen loads, the workbench shows a
   new Blue d4 in the permanent pool.

10. Marks with `unlock.kind === 'stub'` produce no side effect on `MetaState`
    when applied. A stub unlock is not an error — it means the content will be
    wired when the relevant downstream spec (weapon, skill, or die-collection)
    ships. Stub Marks still appear in the Descent Record as fully earned.

### Run summary ceremony

11. The run summary screen (feature 024) accepts the list of newly earned Mark
    IDs (passed at criterion 6). If the list is empty, the run summary renders
    exactly as before — no Marks section appears.

12. If one or more Marks were earned, a **"Marks Earned"** section appears in
    the run summary below the stats line (floor reached, enemies, scraps). Each
    earned Mark is shown with its stamp icon and `name`. If the Mark's unlock
    is concrete (`kind: 'die'`), a one-line note appears beneath the name
    describing what was added (e.g. "Blue die added to your pool.").

13. The Marks section appears after the scraps count-up animation resolves —
    it does not interrupt the animation, and it does not require any additional
    player input. The Return to Camp CTA remains and the player exits normally.

### Descent Record sub-panel

14. The camp activity bar (feature 090) gains a fifth button labelled **Marks**
    (icon: a scroll or stamp glyph). It is always interactive (unlike Visitor,
    which dims when empty) — the Descent Record is always worth inspecting.

15. Tapping the Marks button opens the **Descent Record** sub-panel, following
    the sub-panel contract from D27: rises from bottom at 400ms ease-out, ✕
    dismiss at 300ms ease-in, scrim dims scene to 40%.

16. The sub-panel shows two sections, **Earned** and **Locked**, each listing
    Marks in definition order:
    - **Earned** marks show their stamp icon (filled), `name`, and `flavourLine`.
    - **Locked** marks show an empty seal icon and a placeholder label. Tapping
      a locked mark reveals its `conditionText` (e.g. "Reach floor 2 for the
      first time.") and the placeholder label is replaced by that text. The
      **reward is never shown** — a locked Mark's unlock payload is not
      surfaced anywhere in the UI. Once revealed, the condition text persists
      for the session (no need to persist "which conditions have been revealed"
      in MetaState — a reveal is cheap to repeat and persisting it adds
      complexity for no gain).

17. If all six Marks are earned, the "Locked" section is absent (empty section
    headers are not shown).

---

## Scope / non-goals

- **No new weapon unlocks in this spec.** Marks 3 (`mark-floor-3`) and 4
  (`mark-first-boss`) have `kind: 'stub'` unlocks. Weapon specs for Paired
  Daggers, Rusted Sword, Carved Staff, and Shortbow are separate future items;
  each will add its weapon to `src/meta/weapons.ts` with a `unlockedByMark`
  field pointing to the relevant mark ID. This spec defines the mechanism and
  the IDs; weapon content fills in later.
- **No skills unlocks.** Skills (feature 091) are not built. Mark 5
  (`mark-no-healing`) has a stub unlock labelled for skills.
- **No named-die-collection unlocks.** Named die acquisition (feature 093)
  redesigns how dice are earned; Mark 6 (`mark-whisker-run`) and Mark 7
  (`mark-rattled-kill`) are stubs that 093 will wire.
- **No biome-specific Marks.** Biome Marks (Idea 055 — first Wildwood boss kill,
  first floor 3 in Ancient Halls, etc.) are not in this spec. They belong in
  each biome's spec (084–087) once the biome architecture (058) exists. This
  spec's Mark evaluation function should remain easy to extend (the condition
  union accepts new variants; the Mark list is a plain array).
- **No Blue die unlock via NPC skill check.** The concept mentions this as an
  alternative trigger for the Blue die. It would require hooking into the check
  outcome from feature 028, coordinating with MetaState, and evaluating outside
  the run-end path — a disproportionate complication for a secondary trigger.
  Deferred; the floor-2 path is the canonical unlock.
- **No visual update to the scene zone parchment.** The concept describes the
  Descent Record as a "pinned parchment" visible in the scene. Per D26, scene
  objects are not tap targets; access is via the activity bar button. The scene
  art is unchanged by this spec — if a future art pass wants to render a parchment
  in the scene as decoration, that is a separate feature.
- **`rattledKillingBlow` requires feature 041.** If 041 has not shipped when this
  spec is built, the field defaults to `false` and `mark-rattled-kill` is never
  awarded. This is acceptable — the Mark is in the Descent Record and visible as
  locked until 041 ships.

---

## Design detail

### Mark data model

```
type MarkCondition =
  | { kind: 'floor-reached';    floor: number }
  | { kind: 'boss-killed' }
  | { kind: 'floor-no-healing'; floor: number }
  | { kind: 'weapon-and-floor'; weaponId: string; floor: number }
  | { kind: 'rattled-kill' }

type MarkUnlock =
  | { kind: 'die';   colour: DieColour; size: DieSize }
  | { kind: 'stub';  hint: string }        // placeholder for future unlock

type MarkSpec = {
  id:            string
  name:          string
  flavourLine:   string   // shown in Descent Record on earned Marks
  conditionText: string   // revealed when player taps a locked slot
  condition:     MarkCondition
  unlock:        MarkUnlock
}
```

`DieColour` and `DieSize` are the types already established in the dice/MetaState
modules from feature 029.

### Starting Mark set (6 Marks, in definition order)

| # | ID | Name | Flavour line | Condition | Condition text (tap-reveal) | Unlock |
|---|---|---|---|---|---|---|
| 1 | `mark-floor-2` | Into the Dark | *Pip took his first real step downward.* | `floor-reached` ≥ 2 | "Reach floor 2 for the first time." | `die` · Blue d4 |
| 2 | `mark-floor-3` | Below the Bells | *The deep is not a place. It's a feeling.* | `floor-reached` ≥ 3 | "Reach floor 3 for the first time." | `stub` · "A weapon will appear on the rack when the next weapon spec ships." |
| 3 | `mark-first-boss` | Bane | *Something old died tonight.* | `boss-killed` | "Defeat the dungeon boss for the first time." | `stub` · "A weapon will appear on the rack when the next weapon spec ships." |
| 4 | `mark-no-healing` | Steady Paw | *The herbs sat untouched.* | `floor-no-healing` ≥ 2 | "Complete a run past floor 1 without using a healing item." | `stub` · "A skill scroll will appear when the skill system ships." |
| 5 | `mark-whisker-run` | Scholar's Gambit | *Pip put down the sword. He thought instead.* | `weapon-and-floor` · whisker-staff · floor ≥ 2 | "Reach floor 2 in a run using only the Whisker Staff." | `stub` · "A new weapon will appear on the rack." |
| 6 | `mark-rattled-kill` | Through the Fear | *Shaking paws, and still — a killing blow.* | `rattled-kill` | "Land a killing blow while in the Rattled state." | `stub` · "An upgrade will become available." |

**Condition evaluation rules:**

- `floor-reached N`: `runState.floorsReached >= N`
- `boss-killed`: `runState.victory === true`
- `floor-no-healing N`: `runState.floorsReached >= N && runState.healingItemsUsed === 0`
- `weapon-and-floor weaponId N`: `runState.weaponId === weaponId && runState.floorsReached >= N`
  - `weaponId` for Whisker Staff: `'whisker-staff'` (match the ID used in `src/meta/weapons.ts`)
- `rattled-kill`: `runState.rattledKillingBlow === true`

All conditions evaluate independently. A single run can earn multiple Marks. The
order in which they are applied is definition order (Mark 1 before Mark 2, etc.);
for the starting set this has no practical consequence since no unlock depends on
another unlock in the same pass.

### Weapon unlock mechanism (for future weapon specs)

When a weapon spec ships a weapon that is Mark-gated, it should add a
`unlockedByMark?: string` field to the `WeaponSpec` type in `src/meta/weapons.ts`
and pass the relevant Mark ID (e.g. `'mark-floor-3'`). The weapon selection
screen (feature 029) already renders locked weapons greyed with an unlock
condition shown; the condition text for a Mark-locked weapon should read:
*"Earn the [Mark name] mark."* The weapon becomes selectable when the Mark ID
appears in `MetaState.marksEarned`. This wiring belongs in the weapon spec,
not here.

### `runState.weaponId` capture

`weaponId` should be captured from `MetaState.activeWeapon` at the moment a run
starts (when the player taps Descend / confirms weapon selection) and stored in
`RunState`. This avoids any ambiguity if `activeWeapon` ever changes mid-run
(it shouldn't, but the run record should be self-contained).

### Evaluation call site

`evaluateMarks` is called once per run, at the transition point where the game
routes to the run summary screen — after `RunState` is complete and
`MetaState.scraps` has been updated with the run's gold, but before the summary
screen renders. The newly earned Mark IDs returned by `evaluateMarks` are passed
as a prop or argument to the run summary screen renderer; they are not persisted
separately (the source of truth is `MetaState.marksEarned` after the Mark IDs
have been appended).

---

## Visual design

### Activity bar — Marks button

The activity bar currently has four buttons: Weapons, Workbench, Notices,
Visitor. Add **Marks** as a fifth button. The button is always enabled (never
dimmed). Suggested icon: a wax-seal outline (○ with a small ✦ inside, or a
scroll glyph). Label: "Marks".

If the screen width constrains five buttons, the labels may abbreviate or the
icon may carry the label at smaller sizes — this is left to the Engineer's
discretion within the activity bar layout established in 090.

### Descent Record sub-panel layout

```
┌──────────────────────────────┐
│  Descent Record           ✕  │
├──────────────────────────────┤
│  Earned (2)                  │
│                              │
│  ✦  Into the Dark            │
│     Pip took his first real  │
│     step downward.           │
│                              │
│  ✦  Bane                     │
│     Something old died       │
│     tonight.                 │
│                              │
│  Locked (4)                  │
│                              │
│  ○  [Tap to reveal]          │
│  ○  [Tap to reveal]          │
│  ○  [Tap to reveal]          │
│  ○  [Tap to reveal]          │
└──────────────────────────────┘
```

Tapping a locked `[Tap to reveal]` row replaces its label with the Mark's
`conditionText` in-place (no panel dismiss/reopen). The ○ icon remains; only the
label changes.

The sub-panel is **scrollable** if more Marks than fit are earned — unlikely at
launch with 6 Marks, but the layout should not assume a fixed count.

### Run summary Mark ceremony

Below the stats line (floor / enemies / scraps), if Marks were earned:

```
        ─────────────────
        Marks Earned

        ✦  Into the Dark
           Blue die added to your pool.

        ✦  Bane
```

- Section header: "Marks Earned" in a slightly smaller weight than the stats.
- Each Mark: stamp icon (✦) + `name` in regular weight.
- If the unlock is a `die`: one indented line beneath the name describing what
  was added. Format: *"[Colour] die added to your pool."* (e.g. "Blue die added
  to your pool.")
- If the unlock is a `stub`: no additional line beneath the name (the stub hint
  is not user-facing).
- Section appears in its entirety after the scraps count-up animation ends. No
  new animation is required — the section simply fades in with the rest of the
  summary content (or appears in a single-step reveal matching the stat lines).

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--mark-stamp-earned` | `#c8a96e` | Earned mark stamp icon (✦); warm amber — reads as gold on parchment |
| `--mark-stamp-locked` | `#8a7c6a` | Locked mark seal outline (○); mid warm-grey — visible but clearly inactive |
| `--mark-flavour-text` | `#5c4a36` | Flavour lines and condition text; dark sepia — secondary text on parchment background |

These extend the warm parchment palette used in the camp and run summary screens.
The `--mark-stamp-earned` amber should feel continuous with the scrap/gold accent
already used in the scraps display; a new value is given here rather than reusing
an existing token because the mark stamp is decorative rather than numerical, but
the Engineer may alias to an existing token if the palette already has a close
match.

### Typography / sizing

No new type sizes. Mark `name` uses the same weight/size as existing sub-panel
section labels. `flavourLine` and `conditionText` use the same secondary text
style as notice card body text (feature 053). The Marks Earned header in the run
summary matches the stats-section label style from feature 024.

---

## Open questions

None blocking this spec. The following are noted as future threads:

- **Biome-specific Marks (Idea 055).** The six Marks defined here are all
  biome-agnostic. Once biomes (084–087) exist, their specs should each contribute
  1–2 biome-Marks and corresponding unlocks. The `MarkCondition` union will need
  to be extended with a `biome-boss-killed` variant at that point. This is a
  straightforward extension.
- **NPC-check-triggered Blue die unlock.** The concept mentions resolving an NPC
  skill check as an alternative first-Blue-die path. This would be a second unlock
  condition on `mark-floor-2`, or a separate Mark. Deferred; the floor-2 path is
  sufficient.
- **Stub hint text is user-invisible.** The `hint` field on `MarkUnlock.stub` is
  purely for developer readability in the Mark definitions — it does not appear in
  the UI. Future specs that wire in real unlocks should simply replace the stub
  with the correct payload; the hint field can be removed at that time.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** 2026-06-11 · **PR:** (pending)

### What was built

- `src/meta/marks.ts` — `MarkSpec[]`, `evaluateMarks()`, `applyMarkUnlocks()`, full type definitions
- `src/meta/marks.test.ts` — 30 unit tests covering all 6 mark conditions (positive, idempotency, negative) and `applyMarkUnlocks`
- `src/meta/state.ts` — added `marksEarned: string[]` to `MetaState`
- `src/navigation/dungeon-state.ts` — added `healingItemsUsed`, `rattledKillingBlow`, `weaponId` to `DungeonState`
- `src/navigation/dungeon-state.test.ts` — added test assertions for new run-tracking fields
- `src/screens/types.ts` — added `newMarkIds?` and `metaWithMarks?` to `RunSummary`
- `src/screens/game.ts` — wired `evaluateMarks`/`applyMarkUnlocks` at run end; tracks healing item uses and weapon ID; passes `metaWithMarks` via `RunSummary`
- `src/screens/run-summary.ts` — Marks Earned ceremony (fades in after count-up, stamp icon + name + optional die note)
- `src/screens/camp.ts` — fifth activity bar button (Marks); Descent Record sub-panel (Earned/Locked sections, tap-to-reveal locked conditions); `getMarksLockedRects()` pure geometry helper
- `src/game-app.ts` — threads `metaWithMarks` into `this.metaState` on run-summary transition

### Evidence

- `npm run typecheck` — clean (no errors)
- `npm run test` — 648/648 tests pass (30 new marks tests + 1 new `initDungeon` test)
- `npm run build` — succeeds

### Play-test

1. Start a new run; descend to floor 2. End the run.
2. Run summary should show **"Marks Earned"** section with "Into the Dark" and a note "Blue die added to your pool."
3. Return to camp; open the Workbench — confirm a Blue d4 is now present in the permanent pool.
4. Open the Marks panel from the activity bar; confirm "Into the Dark" appears in the Earned section.
5. Tap a locked slot — confirm the condition text appears in-place (icon remains ○, label changes).
6. Abandon a run via the menu — run summary should show no Marks section.
