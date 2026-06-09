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

### 053 · Dungeon Notice Board

Two generated notices pinned to the camp wall before each run, assembled from weighted templates
(enemy activity reports, merchant sightings, atmospheric warnings, past-run echoes). Seeded with
`MetaState.runCount` so notices feel rooted in Pip's history rather than purely random. Primes
each run's feel and makes successive descents feel distinct before the first tile is placed.
Ships as flavour text; notices do not alter run generation parameters.
**Depends on:** 029 (camp hub, MetaState — adds `runCount` field).
See `docs/features/053-dungeon-notice-board.md` for the full spec.

### 029 · Camp Screen, Meta Persistence & Weapon Selection

Closes the outer roguelike loop: a completed run awards **shiny scraps** (remaining gold
converted one-to-one), the player returns to Pip's warm **camp screen**, chooses a weapon from
the rack (each contributing dice and a strike action), and descends again. A **live pool preview**
shows exactly what Pip brings in. Cross-run state (`MetaState`) is persisted in `localStorage`.
The workbench is visible at camp but not yet operational — dice upgrades ship in 088.
**Depends on:** 024 (run summary — exit CTA wired to camp), 019/016 (gold model).
See `docs/features/029-camp-meta-persistence-weapon-selection.md` for the full spec.

### 088 · Workbench — Dice Upgrades

The second half of the meta-progression foundation: Pip sits at his workbench and spends shiny
scraps to modify his **permanent dice pool**. Three operations — **Swap** (replace a die with a
larger face-count, raising ceiling and variance), **Add** (grow the pool by one die of a chosen
colour and type), and **Engrave** (permanently lock the minimum face of a specific die to tame
variance) — each costing scraps from `MetaState`. The workbench sub-screen is the camp's hero
interaction: tappable die objects, inline upgrade options, scrap costs, and confirmation. Together
with 029 this delivers the full "Shiny Scraps & Dice Upgrades" loop.
**Depends on:** 029 (MetaState, camp screen, workbench tap target).
See `docs/features/088-workbench-dice-upgrades.md` for the full spec.

---

## NEEDS SPEC

> **Planner note (2026-06-07):** Three principles govern the sequence below.
> **Meta first:** 028–052 deliver the NPC encounter and the full outer loop (camp, visitors,
> marks, notice board) with no dependency on floor architecture — build these before touching
> how floors are generated. **Art before the rewrite:** 041, 081, and 082 touch only the combat
> layer and renderer, which survive the authored-floors change intact; these are quick wins that
> avoid merging against a major rewrite. **Biomes after authored floors:** 084–087 ship *after*
> 058 (authored-procedural floors) — a biome's architectural identity (floor shapes, roaming
> enemies, boss motif) only lands when the floor is pre-authored. Building biome content on the
> current drafting model would require full rework.

### 051 · Visitor System

Procedurally generated visitors arrive at Pip's camp between runs (0–2, rarely 3), assembled from
**type** (Tinker, Scout, Scholar, Trader, Wounded Traveller, Trickster) × **condition** (flavour
line) × **offer**. One tap-and-confirm interaction. Relationship counters on recurring visitors
produce named regulars over time — Hades-style story texture without authored dialogue.
**Depends on:** 029 (camp hub).
**Related:** `docs/concept/meta-progression.md`.

### 052 · Marks of Descent

Milestone tokens earned from specific firsts and achievements — first boss kill, first floor 3
reach, first full run without healing, and similar. Marks unlock **content rather than power**: new
weapons appear on the rack, skill scrolls arrive, new visitor types become possible. Locked slots
are visible but unrevealing; a light "show unlock condition" affordance addresses frustration
without spoiling discovery.
**Depends on:** 029 (camp hub), 024 (run summary — marks awarded at run end).
**Related:** `docs/concept/meta-progression.md`.

---

### 041 · Rattled / Emboldened Combat States

Transient per-fight modifiers that give combat texture and momentum without permanent complexity.
**Rattled** triggers when Pip takes damage on two consecutive turns without landing a hit — one die
locks to its minimum face until Pip lands an attack. **Emboldened** triggers on a killing blow — the
next combat starts with one free virtual Yellow pip on the first roll. Both clear naturally and hook
into items and meta skills.
**Depends on:** 037 (Combat Overhaul — turn loop).

### 081 · Interior Tile Archetypes

Add the missing interior-shape layer to the tile model: Chamber (current default), Passage (floor
only between connecting exits), Cavern (rough, narrow, rubble-edged), Pillared Hall, and
Rubble / Collapse. Pure visual additions to the `drawCell()` renderer; exit positions and the
snapping invariant are unchanged. Ships as skin before any rule changes.
**Depends on:** 003 (Tile Map Core — renderer).
*(Promotes Idea 008.)*

### 082 · Prop Layer

A draw pass that scatters small atmospheric objects over finished tiles from a weighted, anchor-
zoned set: wall torches (with a soft light tint), rubble, bones, glowing mushrooms, cobwebs, coin
glints. Props use wall-band and floor-corner anchors, cap at ~3 per tile, and never cover a
doorway. Pure atmosphere; no mechanics changed.
**Depends on:** 003 (Tile Map Core — renderer), 081 (Interior Tile Archetypes — archetype shapes
inform valid anchor positions).
*(Promotes Idea 009.)*

---

### 058 · Authored-Procedural Floors

Replace player tile-drafting (feature 004) with floors generated complete and hidden under fog
before Pip enters — navigational agency moves from *conjuring tiles* to *choosing routes through a
real place*. The renderer, fog, snapping invariant, camera, and multi-floor structure are unchanged;
only the room-selection card UI and on-choice placement logic retire. **Large item** — the Designer
should consider splitting: floor-generator core, shape-template population, fog/entry migration,
NPC and roamer positioning hooks. All biome architecture, floor objectives, and roaming enemies
depend on this foundation.
**Depends on:** 022 (multi-floor structure), 003 (renderer).
*(Promotes Idea 058; see `docs/concept/run-architecture.md` for full direction.)*

### 059 · Floor Shape Catalogue

A starting set of macro floor topologies — Gauntlet (linear march), Spiral (winds to a climax),
Warren (tangle of dead-ends), Hub / Wheel (central chamber + spokes), Long Hall (patrolled
sightlines), Split Level (vertical strata), and The Logical Place (semantic blueprint:
antechamber → hall → storerooms → throne). Shapes are weighted by floor depth, biome, and boss
motif. Recommend shipping Gauntlet + Hub + Spiral first and growing the set.
**Depends on:** 058 (Authored-Procedural Floors).
*(Promotes Idea 059; see `docs/concept/run-architecture.md`.)*

### 061 · Dungeon Stirs

A soft, escalating presence measured in rooms entered, not real time: the longer Pip lingers the
more the floor wakes — torches gutter and fog thickens, patrols quicken, spawner brood-rate ticks
up, the boss "stirs." Paces runs toward the 10–30 minute contract without a hard timer; rewards
decisiveness; delivers tonally-correct dread. The escalation curve should be tuned so most runs
never consciously feel the pressure.
**Depends on:** 058 (Authored-Procedural Floors — the stir wakes a pre-existing floor).
*(Promotes Idea 061; see `docs/concept/run-architecture.md`.)*

### 083 · Squeeze Tiles (Pip-Only Shortcuts)

Mouse-hole-width passages that only Pip can navigate — shortcuts or secret routes that larger
enemies cannot follow, turning Pip's smallness into traversable geography. Most valuable once
roaming enemies patrol (060) and in biomes like the Wildwood where squeeze-width exits are the
architectural norm. Ships as a visual and navigation primitive; the "roamers cannot follow" rule
wires up with 060.
**Depends on:** 058 (Authored-Procedural Floors — floor must pre-exist for positioning to matter).
*(Promotes Idea 010.)*

### 060 · Roaming Enemies & Sources (Spawners)

Two linked mechanics the authored floor unlocks: **Roamers** occupy and patrol the map tick-by-step
with Pip, turning navigation into avoid-or-engage decisions (catching Pip from behind opens combat
Rattled; squeeze routes let Pip slip past what can't follow). **Sources** (nests, egg sacs,
corrupted shrines) periodically emit minions until destroyed — a pressure clock with a kill-switch
that creates a genuine routing dilemma: detour to silence it, or race the exit.
**Depends on:** 058 (Authored-Procedural Floors), 041 (Rattled — disadvantaged-start state).
*(Promotes Idea 060; see `docs/concept/run-architecture.md`.)*

### 064 · Gates & Keys

Navigation gates (locked doors, barred passages, sealed grates) opened by one of three keys: a
**dice check** (Blue picks, Red forces), a **found key** (item from a chest or spur), or **Pip's
size** (a mouse-hole bypass via squeeze tiles). Gate machinery reuses the locked-chest logic from
026/048 applied at a doorway. Gates guard optional spurs by default; the rare mandatory gate is
guaranteed solvable.
**Depends on:** 058 (Authored-Procedural Floors — stable topology required), 026 (chest lock
mechanic), 083 (Squeeze Tiles — mouse-hole bypass).
*(Promotes Idea 064; see `docs/concept/floor-objectives.md`.)*

---

### 054 · Destination Board (Camp Biome Selection)

A hand-drawn map pinned to the camp wall that materialises when the first biome-unlock visitor
arrives — not as an empty UI waiting to be filled, but as a consequence of discovery. New locations
are added as crude sketches by subsequent unlock visitors. Tapping a location selects the run
destination; biome availability gates through Marks of Descent invisibly.
**Depends on:** 029 (camp screen), 051 (visitor system), 084 (first biome in play).
*(Promotes Idea 054; see `docs/concept/biomes.md`.)*

### 084 · Biome: Ancient Halls

The first biome beyond the dungeon — crumbled stone ruins, phosphorescent moss, flooded chambers,
and open vaults open to a night sky. Closest to the dungeon's tile grammar: recommended first for
the Engineer. New archetypes: Flooded Chamber, Open Vault, Inscription Panel (🔵 check for hints),
Column Rubble. New enemies: Stone Mite, Mould Bat, Ancient Beetle, Ghost Moth (pip-drain), Ruin
Adder, Tomb Warden. Boss candidates: The Stone Warden, Lord Musk. Blue-leaning reward pool; rare
unlock: the **Carved Staff**. Unlock via Scholar visitor (Marks gate: first floor-3 reach).
**Depends on:** 058 (Authored-Procedural Floors), 029, 051, 052.
*(See `docs/concept/biomes.md` — Ancient Halls section.)*

### 085 · Biome: Wildwood

An English garden gone wild — living bramble-walls, dappled light shafts, gaps-in-undergrowth as
exits. Green-leaning: stream fords (🟢), web rooms (🟢 to thread through), agility-heavy traps.
New enemies: Woodlouse, Field Vole, Garden Spider, Centipede, Grass Snake, Hornet (alarm-trigger),
Stoat (Red Phase). Boss candidates: The Hornet Queen, Barnabus the Badger. Rare unlock: the
**Thorn Whip** weapon (Green dice instead of Red). Unlock via Scout visitor (Marks gate: first boss
kill in any biome).
**Depends on:** 058, 029, 051, 052.
*(See `docs/concept/biomes.md` — Wildwood section.)*

### 086 · Biome: Larder

A human pantry at mouse-scale — wooden floorboards, gnawed exits, glass jars as rooms, a
mousetrap in plain sight. Red and Yellow-leaning. New archetypes: Jar Room, Shelf Ledge, Trap Floor
(disarm or route around). New enemies: House Mouse Rival, Grain Weevil, Domestic Rat, Cockroach,
Cat Scout. Boss: Scratch the Cat (or The Warder). Rare unlock: the **Cooking Needle** weapon.
Unlock via Wounded Traveller visitor (Marks gate: help a domestic mouse NPC in any run).
**Depends on:** 058, 029, 051, 052.
*(See `docs/concept/biomes.md` — Larder section.)*

### 087 · Biome: Winter Fields

Open sky, exposed ground, and a **Cold status** (acquired from broken ice, wind-exposure tiles, or
enemy attacks) that drains 1 HP per room until resolved by a warming item or a sheltered tile.
Yellow-leaning. New archetypes: Snowbank Room, Frozen Stream, Exposed Clearing (hawk-event),
Wind Exposure. New enemies: Winter Shrew, Rabbit (Juvenile), Winter Stoat (tier-2 in its element),
Fieldfare, Hungry Robin, Fox Cub. Boss candidates: The Silent Hunter (barn owl), Mara the Winter
Fox. Rare unlock: the **Shortbow** (Yellow dice, bypasses some Guard). Unlock via weathered Scout
(Marks gate: first Wildwood boss kill).
**Depends on:** 058, 029, 051, 052, 085 (Wildwood boss kill — Marks gate).
*(See `docs/concept/biomes.md` — Winter Fields section. Cold status mechanic may warrant a
sub-spec; see also Idea 057.)*

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
