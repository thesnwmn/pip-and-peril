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

### 023 · Boss Encounter & Run Completion

A cinematic intro (camera pull-back, title card, camera tighten) leads into a fight against
**The Rat King** — 20 HP, 3 attack, permanently enraging to 5 attack at half HP. Defeating him
ends the run with a parchment-toned "Run Complete" banner and routes to Home. Also corrects all
combat defeat paths to route to Home (not Main Menu).
**Depends on:** 006 (combat loop), 019 (gold reward pattern), 022 (boss room placement), 034 (encounter registry).
See `docs/features/023-boss-encounter.md` for the full spec.

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

> **Remaining run-loop features.** Items 022–029 complete the *full gameplay run loop* — every
> encounter type from the concept plus the structural and meta layers a player needs to experience a
> whole run. Items 020 and 021 have shipped. The order below is **recommended build order**
> (dependency-respecting; the Planner sets final priority): **022–024 close the minimal loop**
> (structure → boss → summary), **025–028 add encounter breadth**, with **029** the optional
> between-runs outer loop the manager may defer. Each item's *Depends on* notes carry the real
> ordering constraints.
>
> Everything touching gold or items depends on **016 · Pip's Satchel** (the inventory/currency data
> model) and **020 · Item System** — both already shipped.

### 037 · Combat Panel Redesign

The combat encounter panel is cramped — actions and item slots are squeezed into too little space
and will only get tighter as more actions (e.g. Flee from 036) and item slots are added. Redesign
the panel layout to give both areas room to breathe and scale. Exact approach TBD by the Designer.
**Depends on:** 006 (combat panel), 020 (item action button).
*(Spec this before 036 — adding a Flee button to the current layout before redesigning it creates
double work.)*

### 036 · Raw Flee: Combat Escape Action

A **Flee** option in the combat panel that lets Pip escape any non-boss fight without an item —
but at a cost: the enemy lands one unblocked hit before she goes, and Pip is pushed back to the
tile she entered the room from (not the room she's fleeing). The room is left in the **fled state**
introduced by feature 020 (red enemy marker, combat restarts on re-entry). The cost distinction
makes the Smoke Pellet meaningfully better: no free attack, stay in the room. Flee is available
any turn, requires no pips, and cannot be used against a boss.
**Depends on:** 020 (fled tile state), 006 (combat phase), 034 (encounter panel — Flee button placement).

### 038 · Enemy Roster Expansion

Feature 022 (dungeon structure) weights rooms toward "tier-1", "tier-2", and "tier-3" enemies
across floors and depth phases, but today only one enemy type exists (the Goblin). This feature
fills the roster: new named creatures at each tier, with stats (HP, attack, gold reward range) and
at least one distinguishing behaviour per tier. Weaker enemies (tier-1) can appear at any depth but
dominate shallowly; tier-2 and tier-3 creatures gate to deeper floors and phases, so progression
feels earned. Enemy room placement in 022 will pull from this roster once it ships.
**Depends on:** 022 (tier references and weighting system), 006 (combat loop).

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
later, engrave faces or unlock passive skills. Turns a single completable run into a reason to play
again. **Deferrable:** the in-run loop (022–028) is complete without it; include when the manager
wants the outer loop closed.
**Depends on:** 024 (scraps awarded at run end), 019/016 (currency model + persistence).
**Suggested stepping (for the Designer):** ① earn + persist scraps and a hub screen; ② dice
upgrades (swap d6→d8, add a die); ③ engrave faces / passive skills.
**Related:** `docs/concept/overview.md` (Meta Progression), `docs/concept/screen-layout-and-transitions.md`
(Meta-Progression Hub direction sketch).

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
