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

## Idea 024 — Knowledge / Information Items

**Area:** System / Flow
**Inspiration:** Genre survey — NetHack scrolls of mapping, Slay the Spire enemy intent preview; `docs/concept/in-run-items.md`.

Items that reveal dungeon secrets rather than strengthening Pip directly — a different axis of
value where cunning substitutes for power. Four sub-types: **room preview** (reveal actual
contents of one offered tile before committing during navigation), **trap detection** (mark nearby
trap tiles on the map before Pip steps on them), **enemy scouting** (show enemy HP and attack
value at combat entry before the first roll), **floor map** (reveal the full current floor layout
briefly). Navigation-register primarily; enemy scouting sits at the combat-entry beat. These items
do not interact with the dice system at all, making them a useful counterweight to power-focused
categories. Risk: room preview may reduce tension in room selection — the Designer should consider
whether full reveal or a partial hint (e.g. "enemy" vs. exact HP) is the right granularity.

---

## Idea 025 — Charged / Multi-Use Items

**Area:** System
**Inspiration:** Genre survey — multi-charge items in NetHack, FTL augments; gap in persistence spectrum; `docs/concept/in-run-items.md`.

A `charges: number` field on the item type, counting down with each use and removing the item at
zero. Fills the gap between single-use consumables and run-long equipment: a **Healing Bandage
Roll** with 3 charges, a **Whetstone** that sharpens the weapon for 2 combats, a **Smoke Canister**
with 2 uses. The decision is different from single-use — not "is this the right moment to spend my
last one?" but "is this worth one of my remaining charges?" A two-charge item is visibly more
valuable than a one-charge item of the same type. Small data-model change (charges field on Item);
Satchel should display remaining charges clearly. Risk: the Engineer should confirm the item
catalog and `acquireItem` stacking logic handles charges vs. quantity correctly — these are
different things.

---

## Idea 026 — Death Prevention Item

**Area:** System / Flow
**Inspiration:** Genre survey — Hades Death Defiance, NetHack amulet of life saving, Isaac Dead Cat; `docs/concept/in-run-items.md`.

When Pip would die, this item triggers once instead — Pip survives at 1 HP. The most emotionally
impactful item category in the genre: when it fires, the player was *dead*. Should be very rare
(chests or high-cost shop item; never an ordinary item room), one at a time, and the thematic
frame should feel like a found object rather than a game mechanic. Candidates: **Saint's Acorn**
(*One last chance. Use it well.*), **Nine Lives Token** (*Found near a cat. Somehow that feels
right.*). The item fires automatically — no player action required — which means the data model
needs a hook in the death resolution path to check for it before writing `pipHp = 0`. Risk: if
too common it trivialises permadeath; rarity is the entire balance lever.

---

## Idea 027 — Cursed / Burden Items

**Area:** System / Flow
**Inspiration:** Genre survey — Risk of Rain 2 Lunar items, NetHack cursed items, Hades Pact of Punishment; `docs/concept/in-run-items.md`.

Items with a meaningful downside alongside their benefit, adding a risk/reward layer absent from
the current all-positive catalog. Examples: **Tainted Mushroom** (+3 all pip pools this combat,
deals 2 damage to Pip on use), **Stolen Idol** (+2 gold per room for the rest of the run, all
enemies deal +1 damage — the dungeon wants it back), **Berserker Draught** (next three attacks
deal double damage, but no dodging for three turns). A visual signal — faint red tint on the item
border — should make cursed status visible before the player takes it; the decision is *knowing
the cost and choosing anyway*. Risk: downsides must be real or the category collapses to flavour
text; the Designer should playtest each example item to confirm the cost genuinely deters use in
some situations.

---

## Idea 028 — Dice-Face Manipulation

**Area:** Dice / System
**Inspiration:** Dicey Dungeons (entire game); gap in the dice-interaction design space; `docs/concept/in-run-items.md`.

Items that act on the *current face values showing on individual dice* mid-turn, distinct from
stat boosts (add pips) and die upgrades (change die types). Four sub-types: **Lock Pin** (lock one
die to its current face — it won't change on next roll, protects a high result), **Pip Splitter**
(split one die's face value into two smaller ones — a 6 becomes two 3s, useful for two cheap
actions over one expensive one), **Colour Shift Vial** (treat one die as a different colour this
turn, bridges a colour gap), **Mirror Shard** (duplicate one die's current face value as a virtual
bonus pip count). All combat-only; all require access to per-die face values in combat state rather
than only pip totals — may need a small combat state extension. This is the highest skill-expression
category in the catalog: a player who understands their pool well gets disproportionate value.
Risk: the Lock Pin in particular changes the game's feel significantly — locking a 6 across turns
creates a very different rhythm; worth prototyping early.

---


