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

### 081 · Interior Tile Archetypes

Add the missing interior-shape layer (layer 2 of the four-layer tile model) to the renderer:
Chamber (default), Passage, Cavern, Pillared Hall, Rubble, Chasm + Bridge, Well, Magic Pool, and
Squeeze. Each archetype is a **family of seeded variants** (a few types per style, chosen
deterministically by grid position) so the dungeon stops repeating itself, while doorway positions
and the snapping invariant are unchanged. Ships as a pure visual skin before any rule changes, and
adds a **Tile Gallery** dev run mode (`gallery.html`) that renders the whole catalogue from the real
renderer — built to host props (082) and biomes later.
**Depends on:** 003 (Tile Map Core — renderer).
See `docs/features/081-interior-tile-archetypes.md` for the full spec.
*(Promotes Idea 008.)*

### 089 · Scalable Dice Pool Display

Improve dice rendering to handle **variable pool sizes** (currently hard-coded for 4 dice) and
**diverse die types** (D4, D6, D8, and larger). Sized dynamically to fit container; smaller die
glyphs (or alternative notation) for higher face counts. Affects camp permanent pool display,
weapon card pools, and run-time pool preview. Ships as visual refactor with no mechanical changes.
**Depends on:** 029 (camp screen), 088 (workbench upgrades — unlocks larger pools).
See `docs/features/089-scalable-dice-pool-display.md` for the full spec.

### 051 · Visitor System

Procedurally generated visitors arrive at Pip's camp between runs (0–2, rarely 3), assembled from
**type** × **condition** × **offer**, resolved in one tap-and-confirm. A relationship counter turns
recurring faces into **named regulars** — Hades-style story texture with no authored dialogue. Ships
the framework + relationship loop + two buildable types (**Tinker**, **Wounded Traveller**); the
four concept types that need unbuilt systems (Scholar/Trader/Scout/Trickster) are deferred behind
named blockers.
**Depends on:** 029 (camp hub, MetaState), 090 (Visitor activity button + stool), 053 (sibling pattern).
See `docs/features/051-visitor-system.md` for the full spec.

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

> **Planner note (2026-06-11):** Feature 051 shipped only two of the six concept visitor types.
> The cut four are captured as **092 · Additional Visitor Types**, each gated by its own blocker
> (Designer splits per-type as blockers clear). The Scholar's skill-teaching needs a real **skills
> system** — feature 029 wrongly deferred skills to 051; captured here as **091 · Skills System &
> Scroll Wall**, a foundational meta item, *not* a visitor type. **Biome-unlock visitors are not
> 092:** where 084/085/087 say "unlock via Scholar/Scout visitor," that is a Mark-gated *biome-unlock
> offer kind* layered on the 051 framework and wrapped in a themed visitor — it depends on 051 + 052
> + 054 (Destination Board), **not** on the deferred service types in 092. (086 · Larder unlocks via
> the Wounded Traveller, already shipped in 051.)

### 052 · Marks of Descent

Milestone tokens earned from specific firsts and achievements — first boss kill, first floor 3
reach, first full run without healing, and similar. Marks unlock **content rather than power**: new
weapons appear on the rack, skill scrolls arrive, new visitor types become possible. Locked slots
are visible but unrevealing; a light "show unlock condition" affordance addresses frustration
without spoiling discovery.
**Depends on:** 029 (camp hub), 024 (run summary — marks awarded at run end).
**Related:** `docs/concept/meta-progression.md`.

### 091 · Skills System & Scroll Wall

Make the camp's **scroll wall** functional: a library of **skills** (examples in
`docs/concept/combat-system.md` — *Counter-Strike*, *Careful Eye*, *Desperate Swing*, *Battle Cry*,
*Stout Heart*) that change what decisions are interesting in combat rather than adding flat numbers.
Skills are unlocked through Marks and NPC gifts (never bought with scraps) and equipped via a
**loadout** chosen before each run — 1 slot early, a 2nd around run 5–6. Corrects feature 029's scope
line that mis-deferred skills to 051: skills are their own system, and they **gate the Scholar
visitor** (092). Foundational meta work.
**Depends on:** 029 (camp, scroll-wall element).
**Related:** 052 (Marks unlock scrolls), 037/046 (combat actions skills modify),
`docs/concept/meta-progression.md` (Skills section), `docs/concept/combat-system.md` (skill library).

### 092 · Additional Visitor Types

Extend the visitor framework (051) with the four concept types deferred from it. The framework was
built to take each as a data entry + one effect; the Designer should **split per-type** and spec each
as its blocker clears, not build all four at once:
- **Scholar** — teaches a skill cheaply. *Blocked on:* 091 (Skills System).
- **Trader** — buys an in-run item Pip carried out, or offers a bulk scraps deal. *Blocked on:*
  cross-run item persistence (items are cleared at run end today; no system owns this yet).
- **Scout** — sells run information (floor bias, boss hint, item density). *Blocked on:* run-gen
  exposing those signals at camp time (post-058; boss is drawn at run start); must beat what the
  Notice Board (053) already gives free.
- **Trickster / Gambler** — great deals with hidden costs; a push-your-luck flutter. *Blocked on:* a
  gamble-safety rule (the permadeath economy must never let a player gamble their build into a hole)
  + the unified check panel (028). *Source:* Idea 074.
**Depends on:** 051 (visitor framework, relationship loop) + the per-type blockers above.

### 093 · Named Dice & Die Collection

Transforms Pip's dice from a fixed statistical pool into a **personal collection of named objects
with provenance**. Each die Pip owns has an origin line ("Found near a rusted blade." "Left by a
Tinker who came twice."). Dice are **earned** through achievements, boss kills, NPC events, and
Marks of Descent — not purchased with scraps. The workbench shows Pip's full collection; before
each run, Pip selects a **loadout** of dice to take in (a cap, growing with meta progress). This
replaces the Swap and Add Die operations from feature 088: "upgrading" means finding or earning a
better die, not paying scraps for a stat change. Engraving (088, tier-cost model) becomes a
commitment to a specific named die, not a fungible upgrade. Absorbs **Idea 050** (Named Dice).
**Key design questions blocking the spec:**
1. **Die acquisition**: what specific events grant which dice? (Boss kills → a die themed to that
   boss? Marks → specific colour/size unlocks? Tinker visitor → leaves a die behind? Run loot?)
2. **Starting collection**: what does Pip own at game start, and does it align with the current
   088 starting pool?
3. **Loadout cap**: how many dice per run initially, and what (if anything) increases the cap?
4. **Workbench redesign**: with Swap and Add Die gone, what does the workbench screen show?
   (Collection browser + engrave + loadout selection seems right — needs wireframe.)
5. **Provenance generation**: how are origin lines generated? Seeded from the event that granted
   the die (boss name, NPC name, floor found on), or a small fixed template set?
**Depends on:** 088 (engrave tier model — survives into this system), 052 (Marks of Descent —
the primary achievement gate for die acquisition).

### 041 · Rattled / Emboldened Combat States

Transient per-fight modifiers that give combat texture and momentum without permanent complexity.
**Rattled** triggers when Pip takes damage on two consecutive turns without landing a hit — one die
locks to its minimum face until Pip lands an attack. **Emboldened** triggers on a killing blow — the
next combat starts with one free virtual Yellow pip on the first roll. Both clear naturally and hook
into items and meta skills.
**Depends on:** 037 (Combat Overhaul — turn loop).

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
