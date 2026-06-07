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

### 050 · Item Catalogue — Mechanics Integration

Wire the UI rendering and combat integration for five item mechanics from feature 049 that are currently stubbed: charged item display (3c remaining uses), Tenacity reroll window (dual pip-spend phases), Padded Coat Green penalty per roll, Berserker Draught 3-turn status (2× Strike damage, dodge disabled), Tainted Mushroom self-damage + bonus pips, and Stolen Idol passive gold + enemy damage bonus. Items are shipped; mechanics are not. The integration layer completes the in-run item feature set.
**Depends on:** 049 (Item Catalogue item definitions — shipped), 037 (Combat Overhaul — logic framework in place).
See `docs/features/050-item-catalogue-mechanics.md` for the full spec.

### 024 · Run Summary Screen

A full-screen parchment retrospective at the end of every run — reached by boss victory (after
the 023 banner) or Pip's death. Its hero element is a hand-drawn **dungeon sketch** of the run just
played (Idea 014), framed by the record: floor reached, enemies defeated, total gold found, and on
defeat what felled Pip. Same screen serves both outcomes with different header tone. Introduces
`RunState` counters (`enemiesDefeated`, `goldEarned`, `killedBy`).
**Depends on:** 023 (run-complete trigger and banner), 006 (defeat signal routing), 034 (encounter registry).
See `docs/features/024-run-summary-screen.md` for the full spec.

### 049 · Item Catalogue — IN PROGRESS

Thirteen new items across six mechanic classes: three **Tenacity** consumables (Grit Stone, Second Wind Vial, Bitter Root Brew) fill the long-empty post-spend window; one **Luck** item (Fortune Pebble) joins the existing two; two **passive armour** pieces (Leather Jerkin −1; Padded Coat −2 but Green −1/roll) introduce the equipment slot and a risk/reward tier; two **death-prevention** talismans (Saint's Acorn, Nine Lives Token) exercise the death hook; two **charged** items (Healing Bandage Roll 3×+3HP, Smoke Canister 2×flee); three **cursed/burden** items (Tainted Mushroom +3 pips/−2 HP; Stolen Idol +2 gold/room but enemies +1 dmg; Berserker Draught 2× Strike for 3 turns but no dodge) introduce a red-border warning visual and two new status mechanics. Brings the total catalog to ~21 items.
**Depends on:** 048 (passiveArmour / deathPrevention / charges hooks, window/luckyClass fields), 020 (acquireItem, item registry), 026 (chest pool), 027 (shop pool).
See `docs/features/049-item-catalogue.md` for the full spec.

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
(Meta-Progression Hub direction sketch), `docs/concept/meta-progression.md` (full direction).

### 052 · Marks of Descent

Milestone tokens earned from specific firsts and achievements — first boss kill, first floor 3 reach,
first full run without healing, and similar. Marks unlock **content rather than power**: new weapons
appear on the rack, skill scrolls arrive, new visitor types become possible. The achievement gate
means players cannot bypass meaningful unlocks by grinding scraps. Locked slots are visible but
unrevealing; a light "show unlock condition" affordance addresses frustration without spoiling
discovery.
**Depends on:** 029 (camp hub), 024 (run summary — marks awarded at run end).
**Related:** `docs/concept/meta-progression.md`.

### 051 · Visitor System

Procedurally generated visitors arrive at Pip's camp between runs (0–2, rarely 3). Each visitor is
assembled from a **type** (Tinker, Scout, Scholar, Trader, Wounded Traveller, Trickster — each with
a distinct offer pool) × **condition** (situational flavour line) × **offer**. Interaction is one
panel, one tap-and-confirm. Relationship counters on recurring visitors produce named regulars over
time, delivering Hades-style story texture without authored dialogue. Interaction must stay under
~10 seconds or the camp bloats beyond its purpose.
**Depends on:** 029 (camp hub).
**Related:** `docs/concept/meta-progression.md`.

### 053 · Dungeon Notice Board

Two generated notices shown in the camp before each run, assembled from weighted templates (enemy
activity reports, merchant sightings, atmospheric warnings, past-run echoes). Primes each run's feel
and makes successive descents feel distinct before the first tile is placed. **Ships first as pure
flavour text**; individual notices can be wired to actual run parameters (enemy weighting, shop
guarantee, boss state) incrementally after.
**Depends on:** 029 (camp hub).
**Related:** `docs/concept/meta-progression.md`.

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
