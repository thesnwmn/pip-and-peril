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

## Idea 012 — Creature Personality Traits

**Area:** System
**Inspiration:** Enemies & Bosses concept; the weasel, toad, and adder all have distinct personalities that want distinct combat feel.

Each creature type gets one **personality trait** — a single behavioural note that makes it read
differently in the combat log and panel, without requiring new systems. Examples: the Weasel Scout
*presses advantage* (its attack message sharpens when Pip's HP is low); Old Gloop *hunkers*
(occasionally does nothing for a turn, then hits harder); the Pale Adder *strikes once, waits*
(regular attack, then a long pause in the log before the next). These are flavour, not rule changes
— they cost text and timing, not new mechanics. The sum is a roster that feels hand-made.

---

## Idea 019 — Weapon Coatings

**Area:** System
**Inspiration:** Manager — "poisons or coatings for weapons that might cause ongoing damage to enemies"; `docs/concept/in-run-items.md`.

A distinct item sub-category applied to Pip's weapon before a strike, modifying the Strike action
rather than acting as a direct consumable. Common coatings fire on the next strike only (more
tactical — when do you spend it?); rare coatings persist for a full combat. One coating slot at a
time: finding a second coating before using the first forces a genuine choice — apply the new one
(losing the old) or keep what you have. Starting examples: **Viper Oil** (next strike applies poison
— 1 dmg/enemy turn for 3 turns), **Fire Resin** (next strike +2 damage, exhausted), **Blinding
Dust** (next strike reduces enemy's next attack by 1). Risk: the ongoing poison counter needs a
clear status display during combat or it will be ignored.

---

## Idea 020 — Passive Armour Equipment Slot

**Area:** System
**Inspiration:** Manager — "armor items to decrease damage"; contrast with consumable single-use items; `docs/concept/in-run-items.md`.

A run-long passive equipment slot for armour: Pip wears one armour piece for the whole run,
passively reducing all incoming damage by a fixed amount. Acquiring a new armour piece replaces the
old — no stacking, no activation required. A −1 flat reduction is powerful; this category should
arrive primarily from chests or boss-room loot rather than ordinary item rooms. First candidate:
**Iron Thimble** (already in the chest spec as a tier item — its persistence scope needs locking
down). Further candidates: **Leather Jerkin** (−1 to all damage), **Padded Coat** (−2 but reduces
maximum green dice for combat, opening an interesting trade-off). Risk: a flat passive reduction may
need to be balanced against enemy scaling as floors deepen.

---

## Idea 021 — Tenacity Item Class

**Area:** System / Dice
**Inspiration:** Manager — "a re-roll after spending their pips to get a second turn… one is about luck and the other about tenacity"; `docs/concept/in-run-items.md`.

A named class of combat item — distinct from luck/reroll items — that grants an *additional
combat turn* (a fresh roll-and-spend sequence) rather than reseeding the current roll. Activated
only *after* pips have been spent this turn; unavailable at turn start and unavailable as a trap
interrupt (that is luck territory). In a trap context, tenacity acts differently: the item fires
*after damage is taken* and immediately restores 1–2 HP, representing Pip shaking off the blow
rather than retrying the roll. Examples: **Grit Stone**, **Second Wind Vial**, **Bitter Root
Brew**. Open question for the Designer: does using a tenacity item cost pips itself, or is it a
free action? Free feels powerful; a pip cost would require careful tuning.

---

## Idea 022 — Luck Item as Encounter Interrupt

**Area:** UI / System
**Inspiration:** Manager — "for trap it must be chosen just after roll by presenting user an option to apply it when they fail"; `docs/concept/in-run-items.md`.

A specific UI mechanic for luck-class items (Lucky Acorn, Rabbit's Foot, Fortune Pebble): when Pip
*fails* a dice check in a non-combat encounter — trap agility roll, NPC skill check, chest lock
pick — the game pauses before applying consequences and presents a contextual prompt: "Use [item
name]?" with a yes/no choice. Accepting reruns the roll immediately with the same dice pool;
declining lets the failure land. The prompt fires only if the player holds a luck-class item. In
combat, luck items work differently (available at turn start as a pre-spend reroll) — the interrupt
mechanic is non-combat only. Risk: the prompt must be fast and low-friction — a 2-second auto-
decline timeout avoids breaking trap tension for players who have no intention of using anything.

---

## Idea 023 — Guaranteed Item in the Boss Room

**Area:** Flow / System
**Inspiration:** Boss fight as run climax; current boss spec (023) rewards only gold; `docs/concept/in-run-items.md`.

The boss room contains one guaranteed item in addition to the boss encounter — visible on a side
pedestal or in a small chest in a corner of the room, collectable *before* triggering the boss
fight. Pip enters, can see both the lurking boss and the loot nearby. Grabbing it before engaging
the boss is the natural move; the item comes from a higher-tier pool than ordinary rooms (comparable
to a good chest reward) and is directly useful in the upcoming fight. Thematically: the Rat King's
stolen hoard is in his lair; Pip finds something useful among it. Creates a small micro-decision —
go for the loot first, or charge the boss immediately? The Designer should decide whether this is
a standalone chest/pedestal interaction or baked into the boss room layout.

---

