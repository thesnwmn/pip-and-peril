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

## IN PROGRESS

### 034 · Encounter Registry

Defines what an encounter panel *is* — a full-canvas module that can draw anywhere (including
over the map zone), declare a map-view configuration (zoom, pip centering), and signal outcomes
— and builds the encounter registry that manages trigger detection, rise/fall transitions, and
outcome routing. Combat is refactored as the reference implementation. After this, new encounter
types (021, 023, 025–028) plug in as panel modules without touching `game.ts`.
**Depends on 035** (the always-visible nav panel this feature layers encounter panels over).
See `docs/features/034-encounter-registry.md` for the full spec.

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

### 020 · Item System: Consumables & Use

The engine for items as *objects Pip carries and uses*, not just inventory rows. Defines the
consumable item category (e.g. cheese = restore HP, a charm = one free reroll), the act of
**acquiring** an item into the Satchel pouch, and **using** one — both during navigation and inside
a combat encounter (the Satchel explicitly defers in-combat use to a later spec; this is it). One
shared system that the item room, chest, and shop all plug into.
**Depends on:** 016 (item model + pouch UI), 006 (combat, for in-combat use), 030 (encounter panel, for in-combat use).
**Suggested stepping (for the Designer):** ① consumables — acquire + use (heal/reroll) in nav and
combat; ② equipment / passive gear — a small "worn" slot that modifies the dice pool (ties toward
meta-progression, item 029). Ship ① alone; ② can follow once shops/chests give gear worth wearing.

### 021 · Item Room Encounter

The green **Item** room type: Pip enters, finds a single item, and it goes into the pouch
(auto-collect or a one-tap "take" beat). The simplest *source* in the economy and the cheapest way
to make item 020 visible in play. Reuses the encounter register (panel rises, brief reveal).
**Depends on:** 020 (item acquire/use), 004 (room offer + entry trigger), 030 (encounter panel).
**Related:** Idea 001 (an "already taken — bare pedestal" surprise).

### 022 · Dungeon Structure: Depth Pacing & Boss Gate

Gives the dungeon a sense of *descent and an end*. Today navigation is effectively endless; this
makes room-type offers **depth-weighted** (shallow skews corridor/shop/NPC; deep skews
enemy/chest/boss, per the concept) and introduces the **boss gate** — past a threshold depth the
Boss room becomes the reachable **end trigger** for the run. This is the structural prerequisite for
"defeat a boss to complete the run": without it there is no boss to reach. Built to be extensible —
"more end triggers later" slot in here.
**Depends on:** 004 (room offer logic), `docs/concept.md` (Dungeon Structure).
**Suggested stepping (for the Designer):** ① depth-weighted room offers (encounter types that don't
yet exist simply stay inert on entry, exactly as the boss is silent today); ② the boss gate /
guaranteed-reachable boss room at threshold depth.
**Note:** weighting gets richer automatically as later encounter types (025–028) are built.

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

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
