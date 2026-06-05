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

---

### 047 · Combat Panel Layout Redesign

Restructure the combat panel to fix button cramping and align with the "bottom quarter is thumb country" design principle. Move ROLL/END TURN and secondary controls (Flee, Item) to the screen bottom in a single row; repurpose pip-counter badges as clickable buttons that open submenus; create a clear middle zone for submenu or enemy action display. Improves usability without changing any combat mechanics.
**Depends on:** 046 (combat mechanics). See `docs/features/047-combat-panel-layout.md` for the full spec.

### 038 · Enemy Roster Expansion

Feature 022 (dungeon structure) weights rooms toward "tier-1", "tier-2", and "tier-3" enemies
across floors and depth phases, but today only one enemy type exists (the Goblin). This feature
fills the roster: twelve named creatures across three tiers, each with HP, gold range, a
**weighted intent pool** (Tier 1 uses Attack/Guard; Tier 2 adds Empower/Recover; Tier 3 adds
Lunge/Status-Poison), and a **personality** object with per-intent-kind log-line strings that
make each fight feel distinct. Enemy rooms store the selected creature ID on the tile at placement
time; combat reads that ID to spawn the correct enemy. Run-depth-window intent scaling is deferred
to 029.
**Depends on:** 037 (combat overhaul), 046 (full intent set — 038 removes the TODO-038 Goblin
test entries and populates the production roster), 022 (tier references and weighting system).
*(Absorbs Idea 012 · Creature Personality Traits.)*
See `docs/features/038-enemy-roster.md` for the full spec.

### 027 · Shop Encounter

The gold **Shop**: a warm merchant panel where Pip spends earned gold on items — the *sink* that
gives currency a purpose. Optional encounter (a "Leave" exit), browse-and-buy. Up to 3 items
stocked at placement; purchased items removed permanently. Merchant names, item prices, and
parchment-warm panel styling all specced.
**Depends on:** 019 (gold), 020 (items, `acquireItem`), 034 (encounter registry).
See `docs/features/027-shop-encounter.md` for the full spec.


### 024 · Run Summary Screen

A full-screen parchment retrospective at the end of every run — reached by boss victory (after
the 023 banner) or Pip's death. Its hero element is a hand-drawn **dungeon sketch** of the run just
played (Idea 014), framed by the record: floor reached, enemies defeated, total gold found, and on
defeat what felled Pip. Same screen serves both outcomes with different header tone. Introduces
`RunState` counters (`enemiesDefeated`, `goldEarned`, `killedBy`).
**Depends on:** 023 (run-complete trigger and banner), 006 (defeat signal routing), 034 (encounter registry).
See `docs/features/024-run-summary-screen.md` for the full spec.

### 025 · Trap Encounter

A **forced** encounter: stepping onto a trapped tile fires a single agility check (snap-camera,
no-Leave panel). Enough Green pips — Pip slips clear; too few — HP loss scaled to the tile's
`trapDifficulty`. Tile is spent after one trigger; never fires again on re-entry.
**Depends on:** 004 (room entry trigger), 005 (dice pool), 022 (sets `trapDifficulty`), 030 (encounter panel + snap camera mode).
See `docs/features/025-trap-encounter.md` for the full spec.

### 026 · Chest Encounter

The amber **Chest**: the concept's two-beat reveal (anticipation → loot), paying out gold and/or
an item. Three variants — basic (open freely), locked (Blue dice check), and trapped (agility
check before loot) — plus three new chest-tier items (Stout Flask, Rabbit's Foot, Iron Thimble)
that make chests feel like a genuine reward tier above item rooms.
**Depends on:** 019 (gold), 020 (items), 025 (trapped variant), 030 (encounter panel), 034 (encounter registry).
See `docs/features/026-chest-encounter.md` for the full spec.

### 023 · Boss Encounter & Run Completion

The cinematic boss fight and run-completion flow. Intro sequence (camera pull-back, title card,
camera tighten), then the **Rat King** combat: a 4-intent Phase 1 cycle (Attack → Guard → Empower
→ Attack×2) giving way at 50% HP to a brutal 3-intent Phase 2 (Attack → Lunge → Attack). A
`BossSpec` data shape makes adding further bosses a data change, not a panel rewrite. Run
completion and all defeat routing to Home specced.
**Depends on:** 037 (combat overhaul), 046 (combat depth — Empower and Lunge intent kinds), 019
(gold reward), 022 (boss room placement), 034 (encounter registry).
See `docs/features/023-boss-encounter.md` for the full spec.

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
