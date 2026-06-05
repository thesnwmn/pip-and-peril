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

## READY

### 037 · Combat Overhaul: Intents, Active Defence & Panel Redesign

The combat keystone, and the prerequisite for everything that touches a fight. Replaces the
"spend everything every turn" loop with a real decision: the enemy **telegraphs an intent** before
Pip rolls, and **defence is active** — Pip *reserves* Green pips (2G fully dodges the coming hit,
1G shaves 1) instead of spending them. The combat **panel is redesigned** in the same feature to
render it (intent banner, dice pool with live faces, costed action buttons with a greyed
unaffordable state, defence-reserve indicator) — giving the cramped panel room for new actions and
item slots. Folds in **Raw Flee** (escape a non-boss fight for one free enemy hit; Pip retreats to
the entry tile and the room is left in the fled state — the seed for future roaming enemies).
Ships in two phases (Phase 1 = Attack/Guard intents + reserve defence + Strike/Heavy/Reserve/Flee
+ the new panel; Phase 2 = Blue/Yellow, the full intent set, Tenacity hook).
**Depends on:** 006 (combat loop), 030 (elastic canvas panel), 005 (dice), 020 (fled state).
See `docs/features/037-combat-overhaul.md` for the full spec.

### 027 · Shop Encounter

The gold **Shop**: a warm merchant panel where Pip spends earned gold on items — the *sink* that
gives currency a purpose. Optional encounter (a "Leave" exit), browse-and-buy. Up to 3 items
stocked at placement; purchased items removed permanently. Merchant names, item prices, and
parchment-warm panel styling all specced.
**Depends on:** 019 (gold), 020 (items, `acquireItem`), 034 (encounter registry).
See `docs/features/027-shop-encounter.md` for the full spec.

### 022 · Dungeon Structure: Multi-Floor, Pacing & Boss Gate

Three floors replace the endless map. Room offers are **depth-and-floor weighted** from a tuning
config (corridors and shops shallow, enemies and traps deep). A **Stairwell** room type unlocks at
a per-floor tile threshold and descends one-way. On Floor 3 the **Boss room** is the only exit —
its offer weight is a product of a tiles-explored factor and a Manhattan-distance tier factor, so it
lurks far from where Pip arrived. Exactly one Shop is guaranteed per floor via a debt mechanism.
Trap tiles carry a `trapDifficulty` value scaled to floor and depth. All constants live in
`src/dungeon/tuning.ts`.
**Depends on:** 004 (room offer logic). *(Note: 025 and 038 both depend on this item — they consume
the `trapDifficulty` values and enemy tier definitions it introduces. 022 can ship with the Goblin
as the sole tier-1 enemy and with trap tiles placed but not yet triggering an encounter.)*
See `docs/features/022-dungeon-structure.md` for the full spec.

### 024 · Run Summary Screen

A full-screen parchment retrospective at the end of every run — reached by boss victory (after
the 023 banner) or Pip's death. Shows floor reached, enemies defeated, total gold found, and on
defeat what felled Pip. Same screen serves both outcomes with different header tone. Introduces
`RunState` counters (`enemiesDefeated`, `goldEarned`, `killedBy`). Step ① of two: the dungeon
sketch centrepiece is deferred.
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

---

## NEEDS SPEC

> **The combat overhaul (037) comes first.** 037 replaces the combat flow itself, so every item
> that touches a fight sits behind it — **023** (boss), **038** (enemy roster, which now needs
> per-tier *intent sets*), and the whole item layer. The non-combat encounters (**025** trap,
> **026** chest, **027** shop) and the dungeon structure (**022**) are independent of the combat
> loop and proceed in parallel — they are in READY above. The order below is **recommended build
> order** (dependency-respecting; the Planner sets final priority): **037 → 038 → 023 → 028 → 029**.
> Each item's *Depends on* notes carry the real ordering constraints.
>
> Everything touching gold or items depends on **016 · Pip's Satchel** (the inventory/currency data
> model) and **020 · Item System** — both already shipped. *(Item 036 · Raw Flee has been folded
> into 037, which now owns the Flee action as part of the redesigned panel.)*

### 038 · Enemy Roster Expansion

Feature 022 (dungeon structure) weights rooms toward "tier-1", "tier-2", and "tier-3" enemies
across floors and depth phases, but today only one enemy type exists (the Goblin). This feature
fills the roster: new named creatures at each tier, with stats (HP, attack, gold reward range),
their **per-tier intent sets** (which of the 037 intents each tier can telegraph, gated by floor
depth and run-depth window), and a **personality trait** per creature — one behavioural note that
makes it read differently in the log/panel without new mechanics (Weasel *presses advantage*, Old
Gloop *hunkers*, Pale Adder *strikes once, waits*). Weaker enemies dominate shallowly; tier-2/3
gate to deeper floors. Enemy room placement in 022 pulls from this roster once it ships.
**Depends on:** 037 (combat overhaul — intents, the action model enemies plug into), 022 (tier
references and weighting system), 006 (combat loop).
*(Absorbs Idea 012 · Creature Personality Traits.)*

### 023 · Boss Encounter & Run Completion

The cinematic boss fight and run-completion flow. The intro (camera pull-back, title card, camera
tighten) and the completion plumbing (parchment "Run Complete" banner → Home; all defeat paths to
Home) are sound, **but the fight itself must be re-specced against 037**: the boss uses a **fixed,
learnable intent cycle** (3–4 intents) that the player decodes and plans against, escalating at the
Enrage threshold — not the old fixed "20 HP, 3 atk, enrage to 5" against the superseded combat
loop. The existing `docs/features/023-boss-encounter.md` predates the overhaul and needs a
Designer revision pass before it is READY.
**Depends on:** 037 (combat overhaul + boss intent cycles), 019 (gold reward pattern), 022 (boss
room placement), 034 (encounter registry).
*(Absorbs Idea 043 · Boss Fixed Intent Cycles. Old spec retained for reference until re-specced.)*

### 028 · NPC Encounter

The blue **NPC**: dialogue-first, the inverse of combat — text and choices primary, a dice check
appearing *inside* the dialogue only when a response calls for one. Delivers hints, small rewards,
and world voice; completes the encounter-type set.
**Depends on:** 005 (dice for checks), 004 (entry trigger), 030 (encounter panel).
**Suggested stepping (for the Designer):** ① dialogue + branching choices (no dice); ② check-gated
responses with rewards/consequences.

### 029 · Meta-Progression: Shiny Scraps & Dice Upgrades

The between-runs loop and the roguelike pillar's payoff: a run awards **shiny scraps** (persisted
across runs), spent in a cool parchment **camp/hub** to upgrade the dice pool (swap/add dice) and,
later, engrave faces or unlock passive skills. Dice upgrades are a choice of **risk profile**, not
just bigger numbers — d4 consistent, d8 volatile, d10/d12 spikey — so swapping a die or adding one
is a strategic identity choice, and engraving (locking a face) tames variance. Turns a single
completable run into a reason to play again. **Deferrable:** the in-run loop is complete without
it; include when the manager wants the outer loop closed.
**Depends on:** 024 (scraps awarded at run end), 019/016 (currency model + persistence).
**Suggested stepping (for the Designer):** ① earn + persist scraps and a hub screen; ② dice
upgrades (swap d6→d8, add a die) with risk profiles; ③ engrave faces / passive skills.
*(Absorbs Idea 042 · Die Type Risk Profiles.)*
**Related:** `docs/concept/overview.md` (Meta Progression), `docs/concept/screen-layout-and-transitions.md`
(Meta-Progression Hub direction sketch).

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
