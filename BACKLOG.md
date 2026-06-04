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

### 022 · Dungeon Structure: Multi-Floor, Pacing & Boss Gate

Three floors replace the endless map. Room offers are **depth-and-floor weighted** from a tuning
config (corridors and shops shallow, enemies and traps deep). A **Stairwell** room type unlocks at
a per-floor tile threshold and descends one-way. On Floor 3 the **Boss room** is the only exit —
its offer weight is a product of a tiles-explored factor and a Manhattan-distance tier factor, so it
lurks far from where Pip arrived. Exactly one Shop is guaranteed per floor via a debt mechanism.
Trap tiles carry a `trapDifficulty` value scaled to floor and depth. All constants live in
`src/dungeon/tuning.ts`.
**Depends on:** 004 (room offer logic), 025 (trap encounter), 038 (enemy roster for tier references).
See `docs/features/022-dungeon-structure.md` for the full spec.

---

## NEEDS SPEC

> **Run-loop feature set.** Items 020–029 together complete the *full gameplay run loop* — every
> encounter type from the concept plus the major mechanics a player needs to experience a whole run
> with basic components: earn currency, pick up and use items, survive traps, and defeat a boss to
> end the run. They are listed in **recommended build order** (dependency-respecting; the Planner
> sets final priority). The order is deliberate: **019–024 reach a minimal but complete loop as
> early as possible** (earn → equip → descend → boss → summary), then **025–028 add encounter
> breadth**, with **029** the optional between-runs outer loop the manager may defer without
> breaking the in-run loop. Each item's *Depends on* notes carry the real ordering constraints.
>
> Everything touching gold or items depends on **016 · Pip's Satchel** (the inventory/currency data
> model) shipping first — it is already shipped.

### 023 · Boss Encounter & Run Completion

A single, named **boss** fight — a tougher enemy with one signature behaviour — using the combat
loop (006) with the boss-camera drama from the screen-layout concept. Defeating it **completes the
run** (a new "run complete" outcome distinct from the existing defeat→menu path). One boss and one
end condition now; more boss types and end triggers are explicitly later work.
**Depends on:** 006 (combat), 022 (a reachable boss room), 030 (encounter panel + camera infra for boss drama).
**Suggested stepping (for the Designer):** ① boss combat (stats, name, one special move, boss HP
display); ② the run-complete state + transition out of the run. Feeds directly into 024.
**Related:** `docs/concept/screen-layout-and-transitions.md` (Combat — Boss).

### 024 · Run Summary Screen

The payoff at the end of a run — reached by **boss victory (run complete)** or by **death**. A cool,
parchment retrospective showing depth reached, enemies felled, gold found, and (on death) what
felled Pip. Closes the emotional loop and replaces the current abrupt defeat→Main-Menu cut. The hero
element is the run's record, not a stats grid.
**Depends on:** 023 (run-complete trigger), 006 (defeat path to reroute here).
**Suggested stepping (for the Designer):** ① a stats-based summary that both outcomes route into;
② upgrade the centrepiece to the hand-drawn **dungeon sketch** of the explored run.
**Related:** Idea 017 (Run Summary as Dungeon Sketch), Idea 014 (Dungeon Sketch).

### 025 · Trap Encounter

A **forced** encounter: stepping onto a trapped tile fires a single agility check (the snap-camera,
no-Leave trap panel from the screen-layout concept). Fail → HP loss; pass → Pip slips clear. Cheap
to build (reuses dice + encounter register), adds real peril variety, and is the prerequisite for
the *trapped* chest variant in 026.
**Depends on:** 005 (dice), 004 (entry trigger), 030 (encounter panel + snap camera mode).
**Related:** Idea 011 (Feature Tiles as Interactions — chasm/bridge agility checks share this
mechanic and could be flavoured re-skins of it).

### 026 · Chest Encounter

The amber **Chest**: the concept's two-beat reveal (anticipation → loot), paying out gold and/or an
item. The richest single-room reward moment in the game.
**Depends on:** 019 (gold), 020 (items), 025 (for the trapped variant), 030 (encounter panel).
**Suggested stepping (for the Designer):** ① basic chest — open → loot reveal; ② locked chest — a
dice check before it opens; ③ trapped chest — the trap (025) fires before the reveal.
**Related:** `docs/concept/screen-layout-and-transitions.md` (Opening a Chest), Idea 001 (empty
chest surprise).

### 027 · Shop Encounter

The gold **Shop**: a warm merchant panel where Pip spends earned gold on items — the *sink* that
gives currency a purpose. Optional encounter (a "Leave" exit), browse-and-buy.
**Depends on:** 019 (gold to spend), 020 (items to sell), 030 (encounter panel).
**Suggested stepping (for the Designer):** ① buy items with gold; ② sell / a haggle dice-check.
**Related:** `docs/concept/screen-layout-and-transitions.md` (Shop), Idea 001 (sold-out surprise).

### 028 · NPC Encounter

The blue **NPC**: dialogue-first, the inverse of combat — text and choices primary, a dice check
appearing *inside* the dialogue only when a response calls for one. Delivers hints, small rewards,
and world voice; completes the encounter-type set.
**Depends on:** 005 (dice for checks), 004 (entry trigger), 030 (encounter panel).
**Suggested stepping (for the Designer):** ① dialogue + branching choices (no dice); ② check-gated
responses with rewards/consequences.
**Related:** Idea 016 (Dialogue-Primary NPC Panel), Idea 015 (camera signal), Idea 018 (situated
whisper for world voice).

### 029 · Meta-Progression: Shiny Scraps & Dice Upgrades

The between-runs loop and the roguelike pillar's payoff: a run awards **shiny scraps** (persisted
across runs), spent in a cool parchment **camp/hub** to upgrade the dice pool (swap/add dice) and,
later, engrave faces or unlock passive skills. Turns a single completable run into a reason to play
again. **Deferrable:** the in-run loop (019–028) is complete without it; include when the manager
wants the outer loop closed.
**Depends on:** 024 (scraps awarded at run end), 019/016 (currency model + persistence).
**Suggested stepping (for the Designer):** ① earn + persist scraps and a hub screen; ② dice
upgrades (swap d6→d8, add a die); ③ engrave faces / passive skills.
**Related:** `docs/concept.md` (Meta Progression), `docs/concept/screen-layout-and-transitions.md`
(Meta-Progression Hub direction sketch).

### 036 · Raw Flee: Combat Escape Action

A **Flee** option in the combat panel that lets Pip escape any non-boss fight without an item —
but at a cost: the enemy lands one unblocked hit before she goes, and Pip is pushed back to the
tile she entered the room from (not the room she's fleeing). The room is left in the **fled state**
introduced by feature 020 (red enemy marker, combat restarts on re-entry). The cost distinction
makes the Smoke Pellet meaningfully better: no free attack, stay in the room. Flee is available
any turn, requires no pips, and cannot be used against a boss.
**Depends on:** 020 (fled tile state), 006 (combat phase), 034 (encounter panel — Flee button placement).

### 037 · Combat Panel Redesign

The combat encounter panel is cramped — actions and item slots are squeezed into too little space
and will only get tighter as more actions (e.g. Flee from 036) and item slots are added. Redesign
the panel layout to give both areas room to breathe and scale. Exact approach TBD by the Designer.
**Depends on:** 006 (combat panel), 020 (item action button).

### 038 · Enemy Roster Expansion

Feature 022 (dungeon structure) weights rooms toward "tier-1", "tier-2", and "tier-3" enemies
across floors and depth phases, but today only one enemy type exists (the Goblin). This feature
fills the roster: new named creatures at each tier, with stats (HP, attack, gold reward range) and
at least one distinguishing behaviour per tier. Weaker enemies (tier-1) can appear at any depth but
dominate shallowly; tier-2 and tier-3 creatures gate to deeper floors and phases, so progression
feels earned. Enemy room placement in 022 will pull from this roster once it ships.
**Depends on:** 022 (tier references and weighting system), 006 (combat loop).

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
