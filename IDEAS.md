# Ideas

A running pool of ideas for **Pip & Peril**, written by the **Thinker** and consumed by the
**Designer**. Each idea is a seed, not a spec — enough to act on, short enough to scan.

Idea numbers are assigned sequentially and **never reused**, even when an idea is removed or
promoted into a feature. When an idea becomes a feature, note the feature number and move on.

## Format

```
## Idea NNN — Short Title

**Area:** [Flow / Dice / Character / World / Art / UI / Meta / System]
**Inspiration:** [what sparked this, if anything]

One to three sentences: what it is, why it might be good, and any obvious risk or open question.
Optionally a rough shape (interface, screen, or data sketch) — but no acceptance criteria and no
code; the Designer writes those.
```

> **Recently promoted / consolidated** (kept here only as a pointer so numbers aren't reused):
> Ideas 039 + 040 → feature **037** (Combat Overhaul); 043 → item **023** (Boss); 012 → item
> **038** (Enemy Roster); 042 → item **029** (Meta-Progression); 044 → feature **048** (Item
> Interjection Framework). The in-run item cluster (019, 020, 021, 022, 024, 025, 026, 027, 028)
> has been consolidated into the seed below (Idea 045), which is now parked behind feature 048.

---


## Idea 008 — Interior Tile Archetypes

**Area:** Art
**Inspiration:** Manager — "every tile is exactly the same"; concept note `docs/concept/tiles-and-props.md`.

Treat a tile as four independent layers — exit layout × **interior archetype** × room type × props —
and add the missing archetype layer: the *shape and substance between the doorways*. Starting set:
Chamber (today), Passage (a real corridor, floor only where it connects exits), Cavern (rough,
narrower, rubble), Pillared Hall, Rubble/Collapse. The hard invariant is that doorway openings stay
at the fixed snapping position and width, so any interior tiles cleanly. Recommend shipping as a
pure visual skin first (new `drawCell` branches, no rule changes). Risk: must stay legible at
phone-thumbnail size — favour *shape* changes over texture.

---

## Idea 009 — Prop Layer (Decor & Features)

**Area:** Art
**Inspiration:** Manager — "props that can be randomly placed… torches on the wall, rocks, etc."

A draw pass that scatters small objects over a finished tile from a weighted set: wall torches
(with a soft light glow), rubble, bones/skulls, glowing mushrooms, cobwebs, puddles, coin glints.
Props use **anchor zones** (wall band, floor corners, centre) rather than raw coordinates; the
placer never covers a doorway and caps density (~0–3 per tile) for readability. Torch glow tints
the surrounding stone so props feel lit by the room. Rough shape: `Prop = { kind, anchors[], weight }`
plus a `placeProps(tile)` that fills anchors. Risk: over-cluttered thumbnails — needs a tight cap
and a "no prop over exits" rule.

---

## Idea 010 — Squeeze Tiles (Pip-Only Shortcuts)

**Area:** System
**Inspiration:** Pillar "Pip's small size is a mechanic"; manager — "slightly narrower than usual".

A Squeeze archetype: a crack far narrower than a normal doorway, with a mouse-hole motif, that only
Pip can pass. Renders as atmosphere but carries a mechanic — a shortcut or secret route that large
enemies (and pursuing bosses) cannot follow, turning Pip's smallness into traversable geography
rather than flavour text. Open question: does a Squeeze guarantee a safe escape, or just a different
path? Pairs naturally with backtracking and any future "chase" pressure.

---

## Idea 011 — Boss Foreshadowing

**Area:** World
**Inspiration:** Enemies & Bosses concept; the boss-reveal intro already gives any boss instant presence via title card.

The boss is randomised at run start, but small echoes surface during the descent: an NPC mentions
a terrible hiss from below; a corridor has raven feathers on the floor; a shopkeeper whispers a
name. The randomisation is unchanged — the hints are just its echo, seeded in the world as
atmosphere. The effect: the boss reveal feels like a discovery rather than a lottery. Risk: hints
must be vague enough not to feel like promises if the player never reaches the boss.

---

## Idea 041 — Rattled / Emboldened Combat States

**Area:** System / Character
**Inspiration:** Entirely the Thinker's own — not a direct development of the manager's direction.
**Parked behind:** feature 037 (Combat Overhaul) — these states layer on top of the new turn loop.

Transient per-fight modifiers that track how the fight is going, without permanent complexity. **Rattled** triggers when Pip takes damage on two consecutive turns without landing a hit — one die locks to its minimum face until Pip lands an attack (representing flinching fear). **Emboldened** triggers when Pip lands a killing blow — the *next* combat starts with one free virtual Yellow pip on the first roll (confidence following a win). Both states clear naturally; neither compounds. They make fights feel like they have texture and momentum beyond HP tracking, and they create natural hooks for items (*Steadying Brew* clears Rattled) and meta-skills (*Counter-Strike* triggers on a full dodge; *Battle Cry* extends Emboldened). Risk: Rattled's visual representation — a "shaky" die — must read clearly on a small phone screen without being distracting mid-allocation.

---

## Idea 045 — Item Catalogue

**Area:** System / Items
**Inspiration:** the manager's item directions + genre survey; the concrete payload for Idea 044.
**Parked behind:** feature **048** (Item Interjection Framework) — each item is tagged to a window/class.

The concrete items, each slotted into one window from Idea 044, preserving the creative content
from the consolidated seeds:

- **Coatings (on-strike):** Viper Oil (poison 1/turn ×3), Fire Resin (next strike +2), Blinding
  Dust (−1 to enemy's next attack), Numbing Sap. One coating slot — a new one forces a swap choice.
- **Passive armour (on-enemy-hit, run-long, one slot):** Iron Thimble (−1), Leather Jerkin (−1),
  Padded Coat (−2 but reduces combat Green) — chest/boss-room loot, not ordinary item rooms.
- **Tenacity (post-spend):** Grit Stone, Second Wind Vial, Bitter Root Brew — a second turn; in a
  trap context, restore 1–2 HP instead.
- **Luck (on-roll / trap-interrupt):** Lucky Acorn, Rabbit's Foot, Fortune Pebble — full reroll in
  combat (pre-spend); a "Use [item]?" prompt on a *failed* non-combat check.
- **Dice-face manipulation (during-allocation):** Lock Pin (lock a face across rolls), Pip Splitter
  (split a face into two), Colour Shift Vial (recolour a die this turn), Mirror Shard (duplicate a
  face). Highest skill-expression class; prototype Lock Pin early — it changes the rhythm.
- **Knowledge / info (pre-roll / navigation):** room preview, trap detection, enemy scouting (HP +
  attack at combat entry), floor map. Cunning as a value axis; doesn't touch the dice.
- **Charged / multi-use:** a `charges` field counting down to removal — Healing Bandage Roll (3),
  Whetstone (2 combats), Smoke Canister (2). Distinct from quantity; Satchel shows charges.
- **Cursed / burden:** real downside alongside benefit — Tainted Mushroom (+3 pips, 2 self-damage),
  Stolen Idol (+2 gold/room, enemies +1 damage), Berserker Draught (double damage but no dodging
  for three turns). Faint red border signals the cost before taking it.
- **Death-prevention (death-resolution hook):** Saint's Acorn, Nine Lives Token — fires once at
  Pip's death, survives at 1 HP. Must be very rare; rarity is the entire balance lever.

Risk: this is a lot of surface — spec it in batches by window once 044 fixes the hooks, rather than
all at once.

---

## Idea 046 — The Visitor System

**Area:** Meta / Flow
**Inspiration:** Between-runs concept session; manager's reference to Hades' story interactions.

Procedurally generated visitors arrive at Pip's camp between runs (0–2 per run, occasionally
3). Each visitor is assembled from a **type** (Tinker, Scout, Scholar, Trader, Wounded
Traveller, Trickster — each with a distinct offer pool), a **condition** (randomly selected
situational flavour line), and an **offer** (drawn from type pool). Interaction is one panel,
one tap-and-confirm — no back-and-forth. After enough visits, some visitors become named
regulars with incremental relationship tiers, producing the feeling of Hades-style story bonds
through pure procedural generation rather than authored dialogue. Risk: visitor interactions
must stay fast (~10 seconds max) or the between-runs phase bloats beyond its purpose.
See `docs/concept/meta-progression.md` for full visitor type definitions.

---

## Idea 047 — Marks of Descent

**Area:** Meta / Flow
**Inspiration:** Thinker's own; the observation that scraps-only progression turns upgrades
into a mathematical transaction without narrative shape.

Milestone tokens earned from specific firsts and achievements (first boss kill, first time
reaching floor 3, first full run without healing, first time surviving a Lunge at 1 HP).
Marks unlock *content* rather than *power*: new weapons appear on the rack, new skill scrolls
arrive, new visitor types become possible. The unlock gate is achievement-based, not currency-
based, so players cannot bypass it with grinding — they must *do something*. Locked slots
on the rack are visible but unrevealing (you see a pegged space, not what weapon is coming),
preserving discovery. Risk: players who feel stuck will want to know what they're working
toward; a light "see unlock condition" affordance on locked slots addresses this without
spoiling the discovery. See `docs/concept/meta-progression.md`.

---

## Idea 049 — Dungeon Notice Board

**Area:** Meta / Flow / World
**Inspiration:** Thinker's own; the gap between identical runs and runs that feel pre-seeded
with character.

A small notice board in the camp showing 2 generated notices before each run. Assembled from
templates weighted by game state: enemy activity reports, merchant sightings, atmospheric
warnings, past-run echoes, self-imposed challenge seeds. Notices are information, not choices —
they prime the run's feel and give the player something to think about before descending.
Mechanical hooks (notices wired to actual run parameters) are secondary; the priming effect
works even as pure flavour text. Should be implemented first as flavour, then wired up
incrementally. Risk: notices that are too specific feel like broken promises if the seeded
event doesn't appear; keep templates vague ("heavy activity reported") rather than precise
("a Dung Beetle guards the second junction"). See `docs/concept/meta-progression.md`.

---

## Idea 050 — Named Dice

**Area:** Meta / Character / World
**Inspiration:** Thinker's own; the observation that "swap d6 for d8" is a mathematical
transaction while "sharpen the old Red die" is a story.

Give Pip's individual dice personal provenance — a brief origin line attached when a die
enters the pool ("Found near a rusted blade." "Traded from a travelling merchant.").
The die's name is generated from its origin. Engraving a face becomes a decision made about
*that specific die*: "lock its worst outcome, the way Pip learned to never take that shortcut
again." The workbench screen shows each die's line on hover/tap. No gameplay effect — purely
flavour — but it transforms the upgrade system from number management into something that
feels like Pip's history. Risk: requires a data model change (provenance string on die objects)
and a workbench UI pass; worth deferring until after the base workbench is built, then
retrofitting as a polish pass.
