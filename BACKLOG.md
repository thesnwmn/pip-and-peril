# Backlog

Active feature list for **Pip & Peril**, ordered by priority. The Engineer always takes the top
**READY** item. Completed items live in [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md).

## Statuses

- **READY** — fully specced (`docs/features/NNN-*.md` exists), dependencies met, buildable now.
- **NEEDS SPEC** — idea captured, Designer needs to flesh it out before it can be built.
- **IN PROGRESS** — currently being built. At most one item should ever be here.

## Item format

```
### NNN · Short Title

One- or two-sentence summary of the feature and the player value.
See `docs/features/NNN-short-title.md` for the full spec.   ← only once specced (READY)
```

---

### 048 · Item Interjection Framework

The rules layer that gives every item a precise home. Defines eight interjection windows (pre-roll through between-turns), extends the item data model with `window` tags, a `luckyClass` flag, a `charges` field, and stubs for death-prevention and passive-armour hooks. Primary engineering deliverable: the **Luck interrupt prompt** — an amber overlay fired at any failed non-combat dice check when Pip carries a Luck-class item, offering a one-time reroll before the failure lands. Reclassifies existing items (Lucky Acorn, Rabbit's Foot) as Luck-class. Required before the locked chest variant of 026 can be built.
**Depends on:** 020 (item registry), 037 (combat turn structure), 046 (Tenacity post-spend state).
See `docs/features/048-item-interjection-framework.md` for the full spec.

### 024 · Run Summary Screen

A full-screen parchment retrospective at the end of every run — reached by boss victory (after
the 023 banner) or Pip's death. Its hero element is a hand-drawn **dungeon sketch** of the run just
played (Idea 014), framed by the record: floor reached, enemies defeated, total gold found, and on
defeat what felled Pip. Same screen serves both outcomes with different header tone. Introduces
`RunState` counters (`enemiesDefeated`, `goldEarned`, `killedBy`).
**Depends on:** 023 (run-complete trigger and banner), 006 (defeat signal routing), 034 (encounter registry).
See `docs/features/024-run-summary-screen.md` for the full spec.

### 026 · Chest Encounter

The amber **Chest**: the concept's two-beat reveal (anticipation → loot), paying out gold and/or
an item. Three variants — basic (open freely), locked (Blue dice check), and trapped (agility
check before loot) — plus three new chest-tier items (Stout Flask, Rabbit's Foot, Iron Thimble)
that make chests feel like a genuine reward tier above item rooms.
**Depends on:** 019 (gold), 020 (items), 025 (trapped variant), 030 (encounter panel), 034 (encounter registry), 048 (item interjection framework — locked variant).
See `docs/features/026-chest-encounter.md` for the full spec.

---

## NEEDS SPEC

> **Recommended build order (dependency-respecting):** 037 → 046 → 038 → 028 → 029. 037 and
> 046 are in READY above; 038 is now also READY. The non-combat encounters (025, 026, 027) and
> dungeon structure (022) proceeded in parallel and are in READY above. 023 (boss) is READY above.
> The Planner sets final priority; *Depends on* notes carry the real ordering constraints.
>
> Everything touching gold or items depends on **016 · Pip's Satchel** (the inventory/currency data
> model) and **020 · Item System** — both already shipped. *(Item 036 · Raw Flee has been folded
> into 037, which now owns the Flee action as part of the redesigned panel.)*

### 028 · NPC Encounter

The blue **NPC**: dialogue-first, the inverse of combat — text and choices primary, with branching
choices and a dice check appearing *inside* the dialogue when a response calls for one (check-gated
responses with rewards/consequences). Delivers hints, small rewards, and world voice; completes the
encounter-type set.
**Depends on:** 005 (dice for checks), 004 (entry trigger), 030 (encounter panel).

### 029 · Meta-Progression: Shiny Scraps & Dice Upgrades

The between-runs loop and the roguelike pillar's payoff: a run awards **shiny scraps** (persisted
across runs), spent in a cool parchment **camp/hub** to earn and persist scraps, upgrade the dice
pool (swap d6→d8, add dice), engrave faces, and unlock passive skills. Dice upgrades are a choice of
**risk profile**, not just bigger numbers — d4 consistent, d8 volatile, d10/d12 spikey — so swapping
a die or adding one is a strategic identity choice, and engraving (locking a face) tames variance.
Turns a single completable run into a reason to play again. **Deferrable:** the in-run loop is
complete without it; include when the manager wants the outer loop closed.
**Depends on:** 024 (scraps awarded at run end), 019/016 (currency model + persistence).
*(Absorbs Idea 042 · Die Type Risk Profiles.)*
**Related:** `docs/concept/overview.md` (Meta Progression), `docs/concept/screen-layout-and-transitions.md`
(Meta-Progression Hub direction sketch).

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
