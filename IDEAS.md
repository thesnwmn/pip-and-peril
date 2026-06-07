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
> Interjection Framework); 045 → feature **049** (Item Catalogue). The in-run item cluster
> (019, 020, 021, 022, 024, 025, 026, 027, 028) was consolidated into Idea 045 and promoted;
> weapon coatings → future Spec B; dice-face manipulation → future Spec C; knowledge/info
> items → future Spec D (blocked on map-drawing approach decision).
> **051** → backlog **051** (Visitor System); **052** → backlog **052** (Marks of Descent);
> **053** → backlog **053** (Notice Board). *(046 and 047 are pre-existing shipped features —
> the visitor/marks ideas originally mislabelled 046–047 were corrected to 051–052.)*

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

---

## Idea 054 — Destination Board (Camp Biome Selection)

**Area:** UI / Meta
**Inspiration:** Biome system concept; `docs/concept/biomes.md`

A small hand-drawn map pinned to the wall of Pip's camp, near the dungeon arch. Initially shows
only the dungeon entrance; new locations appear as crude sketches as Pip encounters and unlocks
them via Marks of Descent. Tapping a location selects it as the run destination; the "Descend"
CTA reflects the chosen location. The board is absent (or invisible) until the first biome
unlock — it appears the first time a Mark triggers a new destination, making its appearance
feel like a discovery. Risk: must read legibly as a tappable UI element on phone scale without
dominating the camp screen's existing objects.

---

## Idea 055 — Biome-Keyed Marks of Descent

**Area:** Meta / System
**Inspiration:** Biome system concept; existing Marks of Descent framework in `docs/concept/meta-progression.md`

A small parallel track of Marks that are biome-specific: "First Wildwood Boss Kill," "First Ancient
Halls floor 3 reach," etc. These sit alongside the existing generic Marks (first boss kill, first
floor 3) rather than replacing them. The biome-specific Marks unlock things that can only come from
that environment — the Thorn Whip from the Wildwood, the Carved Staff from the Ancient Halls,
the Shortbow from the Winter Fields — making each biome worth returning to for its own content
expansion rather than just its scraps yield. Risk: the Mark list grows; needs careful scoping so
early-meta players are not overwhelmed by locks they cannot yet see the purpose of.

---

## Idea 056 — The Larder as Scratch's Natural Domain

**Area:** World / System
**Inspiration:** Thinker's own; the observation that Scratch (already named in enemies-and-bosses.md)
is described as "a feral tabby who fell into the dungeon one winter" — which makes him a dungeon
creature by accident, not by nature.

Reposition Scratch: he is the boss of the Larder biome, not a dungeon boss candidate. A cat in a
pantry is at home — territorial, confident, playing before killing. A cat in a dungeon is a lost
creature, and that framing (already in the doc: "lost, half-mad, completely unpredictable") fits
well for the dungeon. But the Larder Scratch should be the opposite — unhurried, familiar with
every shelf and corner, fighting on his own terms. The two appearances of Scratch (if both are
eventually implemented) would feel like two different animals, which is the point: in the dungeon
he's a chaos boss; in the larder he's a territorial one. No mechanical duplication required — they
share a name and sprite; the boss pool handles the distinction.

---

## Idea 057 — Cold Status (Winter Fields Environmental Mechanic)

**Area:** System / Flow
**Inspiration:** Winter Fields biome concept; `docs/concept/biomes.md`

A persistent status unique to the winter fields: **Cold**, acquired by breaking through ice,
getting caught in wind exposure tiles, or certain enemy attacks. Cold drains 1 HP per room
entered until resolved by either a warming item (new item type: "Charred Tinder," "Wool Wrap")
or reaching a sheltered tile (Snowbank Room, Hedgerow Interior archetypes). It is the winter
fields' answer to the Dungeon Adder's poison — a slow, creeping consequence that forces resource
decisions across multiple rooms rather than in a single combat. Unlike poison (which is combat-
acquired), Cold is primarily environmental — a reason to route through shelter rather than the
fastest path. Risk: requires the status system (currently Rattled/Emboldened) to support a
persistent between-room effect; spec alongside or after feature 037 (Combat Overhaul).
