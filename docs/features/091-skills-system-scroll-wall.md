# 091 · Skills System & Scroll Wall

**Status:** READY
**Source idea:** Backlog item 091 (originated in `docs/concept/meta-progression.md` — "Skills" section; correction to feature 029's deferred-skills scope line)
**Depends on:** 029 (camp screen, MetaState, sub-panel contract), 052 (Marks of Descent — `mark-no-healing` unlock wiring)
**Related:** 037/046 (combat turn loop — skill effects hook here), 041 (Rattled/Emboldened — 3 of 5 skills wait on this), 088 (workbench / engrave — referenced by concept skills not in this spec), 092 (Scholar visitor — consumes the `unlockSkill` API defined here)

---

## Summary

The camp's **scroll wall** becomes functional: a library of five **skills** that change what decisions
are interesting in combat, not just which numbers go up. Skills are earned exclusively through Marks of
Descent and NPC gifts — a new scroll appears on the wall when one is earned. Before each run, Pip
selects an active **loadout** from his unlocked scrolls: 1 slot initially, 2 from around run 5. The
two skills that depend only on already-shipped systems (*Careful Eye*, *Counter-Strike*) are fully
wired into combat. The three that depend on Rattled/Emboldened (*Desperate Swing*, *Battle Cry*,
*Stout Heart*) are present and equippable but non-functional until feature 041 ships.

This spec also corrects feature 029's deferred-skills scope line, provides the Scholar visitor (092)
with a clean `unlockSkill` API, and wires the `mark-no-healing` Mark's stub unlock to *Stout Heart*.

---

## Acceptance criteria

### Skill data model

1. A new module `src/meta/skills.ts` defines and exports:

   ```
   type SkillSpec = {
     id:         string    // stable unique ID used throughout the system
     name:       string
     effectLine: string    // one sentence shown in the scroll wall UI
   }

   const SKILL_LIBRARY: readonly SkillSpec[]
   // Complete ordered skill list. Authoritative catalogue; new skills appended here.

   function getSkill(id: string): SkillSpec | undefined
   // Convenience lookup into SKILL_LIBRARY.

   function skillSlotCount(runCount: number): number
   // Returns 1 when runCount < 5; returns 2 when runCount >= 5.
   // Single source of truth for slot progression. No other code hardcodes these thresholds.

   function unlockSkill(meta: MetaState, skillId: string): MetaState
   // Returns a new MetaState with skillId appended to unlockedSkillIds if not already present.
   // Pure — does not persist. Caller is responsible for persisting.
   ```

2. The starting library contains exactly five `SkillSpec` entries, in this order (see Design detail
   for the full data):

   | ID | Name |
   |---|---|
   | `careful-eye` | Careful Eye |
   | `counter-strike` | Counter-Strike |
   | `desperate-swing` | Desperate Swing |
   | `battle-cry` | Battle Cry |
   | `stout-heart` | Stout Heart |

### MetaState extension

3. `MetaState` gains two backward-compatible fields (no version bump — absent fields default on load,
   consistent with features 051 and 053):

   ```
   unlockedSkillIds: string[]   // IDs of skills Pip has earned, in earn order
   activeLoadout: string[]      // IDs of skills chosen for the next run; length ≤ slot cap
   ```

   Both default to `[]` when absent in a loaded state.

4. On `MetaState` load, before the state is used, the following sanitisation runs:
   - Any ID in `activeLoadout` not present in `unlockedSkillIds` is removed.
   - `activeLoadout` is trimmed to `skillSlotCount(runCount)` entries if over-length.

   This corrects stale saves without a version bump. If `unlockedSkillIds` is absent, it defaults
   to `[]` first, making sanitisation a no-op on brand-new saves.

5. Every mutation to `unlockedSkillIds` or `activeLoadout` is persisted synchronously before any
   navigation (consistent with D22).

### Loadout slots

6. The available slot count is always `skillSlotCount(meta.runCount)`. After a run completes and
   `runCount` increments past the threshold (4 → 5), the extra slot becomes available on the next
   camp visit with no automatic content filled — the player must tap to equip.

7. `activeLoadout` never exceeds `skillSlotCount(runCount)` entries at any point. The UI enforces
   this; the sanitisation (AC 4) enforces it on load.

### Mark unlock wiring

8. The `MarkUnlock` discriminated union in `src/meta/marks.ts` gains a new variant:

   ```
   | { kind: 'skill'; skillId: string }
   ```

9. The Mark application logic handles `kind: 'skill'` by calling `unlockSkill(meta, skillId)` and
   persisting the result. This fires in the same call site as the existing `kind: 'die'` unlock
   (criterion 6 of feature 052 — immediately before the run summary screen renders).

10. The `mark-no-healing` Mark entry (`Steady Paw`) has its `unlock` field changed from its current
    stub to `{ kind: 'skill', skillId: 'stout-heart' }`.

    If feature 052 has already shipped when this spec is built, this is a targeted update to
    `src/meta/marks.ts`. If 052 has not yet shipped, the Engineer builds both at once.

11. The `evaluateMarks` unit tests cover the new `skill` unlock variant: earning `mark-no-healing`
    applies `unlockSkill(meta, 'stout-heart')` — i.e., `'stout-heart'` appears in `unlockedSkillIds`
    after the unlock runs.

### RunState extension

12. `RunState` gains one new field:

    ```
    activeSkills: string[]
    ```

    Captured from `MetaState.activeLoadout` at the moment the run starts — the same timing as
    `weaponId` capture (when the player confirms weapon selection and descends). This field is stable
    for the duration of a run. Changing the loadout at camp does not affect a run in progress.

    If absent in an existing `RunState` (legacy), it defaults to `[]`.

### Activity bar and scroll wall sub-panel

13. The camp activity bar gains a **sixth button**: **Skills** (icon: a scroll glyph). It is always
    visible. It renders greyed (D28) when `unlockedSkillIds` is empty; it renders active when at least
    one skill is unlocked.

14. Tapping Skills opens the **Scroll Wall** sub-panel, following D27: 400ms ease-out rise, ✕ dismiss
    (44 × 44 px, top-right), scrim dims scene to 40%.

15. The sub-panel body has three sections, in order:

    **Active Loadout** — `skillSlotCount(runCount)` slot tiles stacked vertically.
    - A filled slot shows the skill's `name` on a parchment-card background.
    - An empty slot shows a dashed border and the label "Empty" in a muted colour.

    **Your Scrolls** — each skill in `unlockedSkillIds` that is not currently in `activeLoadout`,
    shown as a card: `name` in regular weight; `effectLine` in smaller secondary weight below.

    **Locked** — a single text line: *"N scrolls still sealed."* (N = total skills not in
    `unlockedSkillIds`). No individual locked-skill cards; their content and conditions are not
    surfaced anywhere in the UI (discovery through play, not inspection).

    If all skills are unlocked the Locked line is absent. If `unlockedSkillIds` is empty, the
    "Your Scrolls" section body is absent and only the empty slots and the locked count appear.

16. **Equip interaction.** Tapping a skill card in "Your Scrolls":
    - If an empty slot exists → the skill moves into the first empty slot.
    - If all slots are full → the skill swaps into slot 0, displacing the skill that was there back
      to "Your Scrolls".

17. **Unequip interaction.** Tapping a skill tile in "Active Loadout" → the skill is removed from
    that slot (slot becomes empty) and returns to "Your Scrolls".

18. Loadout changes are persisted on each tap action (not on panel dismiss), consistent with D22. A
    player who equips a skill and immediately closes the panel will find their loadout intact on
    re-open.

19. The sub-panel is scrollable if the content exceeds the panel height. No drag-to-equip
    interaction — all equip/unequip is by tap.

### Combat effects — Careful Eye

20. At the start of every combat (before Pip rolls his first turn), if `'careful-eye'` is in
    `RunState.activeSkills`, the combat panel displays both the enemy's **current intent** and the
    **next intent** simultaneously — the same information that the Blue `Analyse` action would reveal
    mid-combat, but present from turn 1 at no pip cost.

21. The second (upcoming) intent renders in a visually secondary position (smaller or offset) to
    distinguish it from the current intent. If the enemy has only one intent remaining in its cycle
    pool (e.g. final intent of a boss phase), the secondary position shows a "?" indicator.

22. Careful Eye does not replace or suppress the `Analyse` Blue action. A player with both Careful
    Eye equipped and Blue dice may still use Analyse on subsequent turns to refresh the preview after
    the current intent fires.

### Combat effects — Counter-Strike

23. Whenever the enemy-turn defence phase fully cancels an incoming hit (2G consumed, damage reaches
    zero before landing), if `'counter-strike'` is in `RunState.activeSkills`, 1 damage is
    immediately applied to the enemy. This fires between steps 7 and 8 of the turn structure from
    D13 (after Defence fires, before any remaining damage lands on Pip).

24. Counter-Strike damage bypasses enemy Guard entirely — it is a reflexive parry strike, consistent
    with the Lucky Shot and Exploit precedent for Guard bypass (D12 / `docs/decisions/combat-mechanics.md`).

25. If the enemy dies from Counter-Strike damage (HP reaches zero), the combat resolves as a normal
    kill. Emboldened applies on the next combat as usual.

26. The battle log records Counter-Strike with a distinct entry: *"Counter-Strike — 1 damage."*

### Stub effects — Desperate Swing, Battle Cry, Stout Heart

27. `'desperate-swing'`, `'battle-cry'`, and `'stout-heart'` appear in the scroll wall with their
    names and `effectLine`s, are equippable in the loadout, and are copied into `RunState.activeSkills`
    at run start. No combat effect code is added in this spec — the IDs sit in `activeSkills` awaiting
    feature 041.

    Feature 041's spec must consult `RunState.activeSkills` for these IDs when implementing
    Rattled/Emboldened. The intended effects are documented in the Design detail section below.

### Tests

28. Unit tests cover:
    - `skillSlotCount(n)` returns 1 for n < 5 and 2 for n ≥ 5.
    - `activeLoadout` sanitisation on load: stale ID removed; over-cap entries trimmed.
    - `unlockSkill` is idempotent (calling twice does not duplicate the ID).
    - `mark-no-healing` unlock applies `'stout-heart'` to `unlockedSkillIds`.

---

## Scope / non-goals

- **No Scholar visitor.** The Scholar (feature 092) calls `unlockSkill()` on MetaState; that wiring
  belongs in 092's spec. This spec defines and exports the function; 092 calls it.
- **No True Edge or Lucky Start.** True Edge (engraving bonus) and Lucky Start (Fortune Track) are
  named in the combat-system doc but were not included in the starting five. True Edge is interesting
  once the player has engaged deeply with the engrave system; Lucky Start requires the Fortune Track
  which was explicitly deferred (D12 / `docs/decisions/combat-mechanics.md`). Both belong in a future
  skills expansion.
- **No third loadout slot.** Third slot unlocked by a deep Mark is explicitly deferred. `skillSlotCount()`
  is the extension point.
- **No locked skill condition preview.** Unlike Marks (where tapping a locked slot reveals the earn
  condition), locked skills show a count only. Skills are discovered, not previewed.
- **No drag-to-equip.** Phone-friendly tap interactions only.
- **No combat wiring for Desperate Swing, Battle Cry, Stout Heart.** Feature 041's domain.
- **No scene-zone visual update.** The scroll wall in the scene zone is ambient and non-interactive
  per D26. A scene-art pass is a separate future task.
- **No skill upgrade, rank, or evolution.** Skills are binary — earned or not, equipped or not.

---

## Design detail

### Starting skill library (full data)

| ID | Name | Effect line | Requires |
|---|---|---|---|
| `careful-eye` | Careful Eye | *See the enemy's first two intents at the start of every fight.* | Fully wired (combat intents — shipped in 037/046) |
| `counter-strike` | Counter-Strike | *A perfect dodge (2G) deals 1 damage back.* | Fully wired (active defence — shipped in 037) |
| `desperate-swing` | Desperate Swing | *While Rattled, Strike costs 1 Red less.* | Stub — wires in feature 041 (Rattled) |
| `battle-cry` | Battle Cry | *Emboldened lasts two turns instead of one.* | Stub — wires in feature 041 (Emboldened) |
| `stout-heart` | Stout Heart | *Rattled takes three missed turns to trigger, not two.* | Stub — wires in feature 041 (Rattled threshold); unlocked by `mark-no-healing` |

**Intended effects for feature 041 (non-normative, for the Engineer's reference):**

- *Desperate Swing:* In the Strike action cost calculation, if Pip is in the Rattled state and
  `'desperate-swing'` is in `RunState.activeSkills`, reduce Strike cost by 1R (minimum cost: 1R).
- *Battle Cry:* In the Emboldened application, if `'battle-cry'` is in `RunState.activeSkills`, the
  free Yellow pip bonus persists for the first 2 turns of the next combat, not just 1.
- *Stout Heart:* In the Rattled trigger check, if `'stout-heart'` is in `RunState.activeSkills`, the
  "consecutive turns without a hit" threshold is 3 instead of 2.

### Loadout sanitisation (pseudocode)

```
function sanitiseLoadout(meta: MetaState): MetaState {
  const cap      = skillSlotCount(meta.runCount)
  const unlocked = meta.unlockedSkillIds ?? []
  const loadout  = (meta.activeLoadout ?? [])
    .filter(id => unlocked.includes(id))
    .slice(0, cap)
  return { ...meta, unlockedSkillIds: unlocked, activeLoadout: loadout }
}
```

This runs once on MetaState load, before any camp screen renders.

### Interaction flow for equip/unequip

```
Player taps skill card in "Your Scrolls":
  ├── empty slot exists?  → skill moves to first empty slot; slot renders filled
  └── all slots full?     → skill swaps into slot 0; displaced skill returns to "Your Scrolls"

Player taps filled slot tile in "Active Loadout":
  └── skill removed from slot; slot renders empty; skill appears in "Your Scrolls"
```

No confirmation required — changes are instant and reversible. Persisted on each tap.

---

## Visual design

### Activity bar — Skills button

Sixth button. Icon: a rolled scroll outline. Label: "Skills". Greyed when `unlockedSkillIds` is empty.

With six buttons and the Descend CTA, the Engineer may compact icon size or abbreviate labels to fit
the ≤45% activity bar zone (D26). All tap targets remain ≥44 × 44 px.

### Scroll Wall sub-panel layout

```
┌──────────────────────────────────┐
│  Scroll Wall                  ✕  │
├──────────────────────────────────┤
│  Before the descent              │
│                                  │
│  ┌──────────────────────────┐    │
│  │  Careful Eye             │ ← slot 0 (filled)
│  └──────────────────────────┘    │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │  Empty                   │ ← slot 1 (visible only when runCount ≥ 5)
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                  │
│  Your Scrolls                    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ Counter-Strike           │    │
│  │ A perfect dodge (2G)     │    │
│  │ deals 1 damage back.     │    │
│  └──────────────────────────┘    │
│                                  │
│  3 scrolls still sealed.         │
└──────────────────────────────────┘
```

- **"Before the descent"** — italic header above the loadout slots, tone-setting rather than
  navigational. Smaller than the panel title.
- **Filled slot** — skill name centred on warm parchment background.
- **Empty slot** — dashed border, "Empty" in muted colour, centred.
- **Skill card** — name in regular weight at top; `effectLine` in smaller secondary weight below.
- **Locked line** — plain text, recessive; no individual sealed scroll shapes.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--skill-slot-filled` | `#e8dcc8` | Filled loadout slot background — warm parchment |
| `--skill-slot-empty-border` | `#a8997e` | Dashed border on empty slot |
| `--skill-slot-empty-label` | `#a8997e` | "Empty" label in empty slot |
| `--skill-card-bg` | `#f0e8d6` | Skill card background in "Your Scrolls" — lighter than slot |
| `--skill-locked-text` | `#7a6e5e` | "N scrolls still sealed" — recessive tertiary text |

These extend the warm parchment palette from features 052 and 053. The subtle difference between
`--skill-slot-filled` (the active choice) and `--skill-card-bg` (the option) should read as
"committed vs. available" without being jarring. Engineer may alias to an existing token if the
palette already has a close match.

### Typography / sizing

Skill name in slot tile: same weight and size as existing sub-panel section labels. Skill name in pool
card: regular weight, top of card. `effectLine`: same smaller secondary weight as notice body text
(feature 053), below the name. "Before the descent" header: italic, slightly smaller than the panel
title "Scroll Wall." "N scrolls still sealed": same secondary-text style as `--mark-flavour-text`
from feature 052.

---

## Open questions

1. **Second slot gate: `runCount >= 5` vs. a new Mark.** This spec uses `runCount >= 5` (simple, no
   new Mark needed). The alternative — a 7th Mark such as "use a skill that fires in combat for the
   first time" — is more consistent with the "Marks expand the menu" philosophy but adds a Mark and
   a new condition type. The `skillSlotCount()` function is the only place to change if the Manager
   prefers a Mark gate. **Not blocking — `runCount >= 5` is the default here.**

2. **Locked scrolls: count line vs. individual sealed shapes.** This spec shows "N scrolls still
   sealed" as a single text line. The meta-progression concept describes showing individual sealed
   scroll shapes (sealed but content-free). The visual is more evocative; the text line is simpler.
   **No data model or logic impact — the Manager may adjust the visual during review.**

Neither question blocks this spec. **Status: READY.**

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
