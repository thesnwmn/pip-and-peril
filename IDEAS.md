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
> Interjection Framework); 045 → feature **049** (Item Catalogue); 075–080 → feature **050**
> (Item Catalogue Mechanics Integration). The in-run item cluster
> (019, 020, 021, 022, 024, 025, 026, 027, 028) was consolidated into Idea 045 and promoted;
> weapon coatings → future Spec B; dice-face manipulation → future Spec C; knowledge/info
> items → future Spec D (blocked on map-drawing approach decision).
> **051** → backlog **051** (Visitor System); **052** → backlog **052** (Marks of Descent);
> **053** → backlog **053** (Notice Board). *(046 and 047 are pre-existing shipped features —
> the visitor/marks ideas originally mislabelled 046–047 were corrected to 051–052.)*
> **Planner session 2026-06-07:** **008** → backlog **081** (Interior Tile Archetypes);
> **009** → backlog **082** (Prop Layer); **010** → backlog **083** (Squeeze Tiles);
> **041** → backlog **041** (Rattled / Emboldened Combat States);
> **054** → backlog **054** (Destination Board);
> **058** → backlog **058** (Authored-Procedural Floors);
> **059** → backlog **059** (Floor Shape Catalogue);
> **060** → backlog **060** (Roaming Enemies & Sources);
> **061** → backlog **061** (Dungeon Stirs);
> **064** → backlog **064** (Gates & Keys).
> Biomes Ancient Halls / Wildwood / Larder / Winter Fields → backlog **084–087** (no prior idea
> numbers; concept in `docs/concept/biomes.md`).
> **Designer session 2026-06-08:** **070** (Unified Check Model) + **071** (NPC Social Checks) →
> feature **028** (NPC Encounter); both folded into the unified check panel spec.

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

---


## Idea 062 — The Boss Motif (Runs Themed by Their Climax)

**Area:** World / System / Art
**Inspiration:** Manager — "sub-themed biomes based on who the boss is." Synthesises boss foreshadowing
(Idea 011), tile/prop variety (008/009), roamers/Sources (060), and biomes.
`docs/concept/run-architecture.md`.

The boss (drawn at run start) becomes a run-wide **theme overlay** — layer 4 of the floor model — that
biases props, archetype weights, floor shape, the living-floor mechanic, and foreshadowing hints. A run
is no longer "the Dungeon" but *Mother Silk's* dungeon (webs, cocoons, spiderling Sources, a Warren) or
*the Rat King's* (bones, banners, a Logical-Place fortress, guard patrols) — same biome palette, a
different sub-theme each run. Makes the boss reveal land as fate, not a coin flip, and multiplies a
biome's felt variety by its boss roster with **no new biome required** — the cheapest, highest-impact
variety lever available. Risk: always-on motif may telegraph the boss too early; consider a curve that
is faint on floor 1 and loud on floor 3.

---

## Idea 063 — On a Tear (Run-Scale Momentum State)

**Area:** Character / Flow
**Inspiration:** Manager — "numbers go up is fun"; the Thinker's "permission to stomp."
The run-scale sibling of the per-fight Emboldened state. `docs/concept/run-architecture.md`.

A run-level momentum state that makes the power fantasy *visible*. Consecutive clean clears build
escalating swagger — faster kill animations, a louder battle log, a small mechanical sweetener — so a
snowballing run *feels* dominant, not just statistically ahead. The counterpart to the design rule that
the dungeon never rubber-bands within a run: when the player out-scales, the game leans into the blowout
rather than hiding it. Risk: the mechanical sweetener must be cosmetic-leaning so it celebrates an
already-won run without trivialising a close one; keep the power in the in-run item layer, not here.

---


## Idea 065 — Linked Switches (Lever → Remote Door)

**Area:** System / UI
**Inspiration:** Manager — "a lever somewhere that opens a door somewhere else (maybe with iconography
to indicate which)." `docs/concept/floor-objectives.md`.

A lever that changes state elsewhere on the floor. The whole design is legibility on a phone: **matched
iconography** (lever `⟳` blue → door `⟳` blue) links cause to effect without a tutorial; throwing it
fires **immediate feedback** (a rumble + a fog-reveal pulse over the affected tile) and lights a
persistent **map-pip**; the explored map becomes the puzzle's UI. The richest version opens one route
*and closes another* — a genuine navigation decision, not a press-to-win. Risk: without clear feedback
the player pulls a lever and feels nothing; needs the map-state/iconography layer before it's worth
building. Later than Tier-1 gates.

---

## Idea 066 — Floor Mutation (Rotating Rooms, Water Levels)

**Area:** System / Art
**Inspiration:** Manager — "levers that rotate rooms to open new areas and close old ones, or raise
and lower water levels." `docs/concept/floor-objectives.md`. Flagged by the manager as not-for-soon.

The dungeon physically changes. Model a floor as a **state machine with 2–3 configurations** that
mechanisms toggle between (water-high/water-low; rooms-aligned/rotated). Each config is a valid,
snapping-correct floor; the lever swaps which is live. The snapping invariant must hold in every
config — a rotated room re-maps its exits to the fixed doorway positions; a water level toggles which
tiles/exits are *passable*, not where doors are. Best deployed as a **biome/boss signature** (water
levels = Ancient Halls; clockwork rotation = a future mechanism boss), not scattered generically.
Horizon piece: a large lift (floor-scale state, connectivity recompute, renderer holding multiple
configs) — documented so the authored-floor architecture doesn't foreclose it.

---

## Idea 067 — In-Run Errands (NPC Sub-Objectives)

**Area:** Flow / World
**Inspiration:** Manager — "NPCs that set quests in runs… return to the NPC to get your reward."
`docs/concept/floor-objectives.md`.

Light, opportunistic favours an NPC offers mid-run — *carry this deeper in*, *deal with the beast in
the east hall*, *bring me a [item type] if you find one* — that overlay the route the player would take
anyway, never a fetch-checklist or a wander-off. Most pay **in-run** (a buff, a consumable, a die tweak,
a shortcut, a boss hint); resolution avoids backtracking by **delivering forward**, **completing in
place**, or **collecting at camp**. Failure is upside-only: skip or die and the favour simply went
undone, no penalty. Builds on the NPC encounter (028). Risk: must stay rare (0–1 per run, occasionally
2) or the run becomes a quest hub instead of a descent.

---

## Idea 068 — Errand → Visitor Relationship Loop

**Area:** Meta / World / System
**Inspiration:** Manager — "you could then meet them as a visitor later." Synthesises in-run Errands
(067) with the existing visitor system (051) and the biome-unlock-visitor pattern.
`docs/concept/floor-objectives.md`.

Completing an Errand for an NPC sets a flag that makes *that NPC* eligible and heavily weighted to
appear at camp as a **visitor** in the next run or two — the field mouse you escorted on floor 2 is,
two runs later, on the stool by the fire with a gift and a "you again." Reuses the visitor system's
existing relationship counter (051), seeded by an in-run event instead of repeat camp visits; each turn
of the loop deepens the relationship and improves their offers. Delivers genuine cross-run continuity —
the questgiver as the thread between run and meta layers — with **no new system and no authored
dialogue**, just wiring two existing systems together. Highest value-to-cost ratio in the objectives
set. Depends on 051 (visitors) and 067 (errands).

---

## Idea 069 — The Keystone (Run-Spanning Objective)

**Area:** Flow / World / System
**Inspiration:** Thinker's own — early floors can feel like throat-clearing before the climax; an
objective that spans the whole run makes floor 1 matter to floor 3. `docs/concept/floor-objectives.md`.

A key/sigil/quest item found early opens or weakens something at the climax: three sigils across the
floors (each behind a Tier-1 gate) that weaken the boss's first phase, open a shortcut to the boss, or
unlock a throne-room vault — collect none and the fight is merely harder, never impossible. Pairs with
the **diegetic principle**: the best puzzle *is* the boss approach (drain the water flooding Mother
Silk's chamber; open the Rat King's throne gate), so the puzzle, the foreshadowing, and the
architecture become one — plugging straight into the boss motif and The Logical Place floor shape from
run-architecture. Turns three floors in a row into one descent with a shape. Risk: cross-floor state +
the player needing to *know* the objective exists (seed via the notice board 053 or an NPC); a later
piece, after Tier-1 gates and the boss motif.

---

## Idea 072 — Foraging / Search Checks

**Area:** Flow / System / Dice
**Inspiration:** Thinker's own — the prop layer (Idea 009) is atmosphere with nothing to *do*.
`docs/concept/dice-checks.md`.

Make a sparse subset of props searchable (rubble, old corpses, cracked walls): a check (🟢 rummage
quickly / 🔵 know where to look) for a chance at scraps or an item, **paid in time** — a tick of the
Dungeon Stirs (061), since lingering wakes the floor. Gives the thorough player a dice-driven reason
to engage the world the fast player blows past, and plugs the search directly into the Stirs as the
cost of greed. Risk: must stay sparse (1–2 searchable props per floor) or it becomes over-rolling;
the time cost must be real or "fast vs. thorough" collapses.

---

## Idea 073 — Shop Haggle Check

**Area:** UI / System / Dice
**Inspiration:** Thinker's own — the shop is currently a flat menu with no dice in it.
`docs/concept/dice-checks.md`.

A single *optional* haggle on the shop screen — 🟡 charm the merchant down or 🔵 argue the price.
Success lowers one price; success-at-a-cost lowers it but the merchant is cooler next time; failure
bumps prices. Turns a deterministic menu into a dice beat and gives Yellow/Blue builds a non-combat
payoff. Risk: must stay optional and one-shot per shop, or every purchase becomes a minigame — the
menu stays, the haggle is one button on it.

---

## Idea 074 — Dice in the Camp (The Gambler & Tempering)

**Area:** Meta / Dice / System
**Inspiration:** Thinker's own — the camp is currently dice-*free*, which is the meta doc's own fear
("a transaction, not a story"). `docs/concept/dice-checks.md`.

Put the core mechanic back into the between-runs hub two ways. **The Gambler** — a new visitor type
(slots into the visitor system, 051) who lets Pip bet scraps on a roll of his own pool: the camp's one
push-your-luck flutter, fitting the Trickster family. **Tempering a die** — an optional, risky
workbench operation beside the safe swap/add/engrave: gamble a die for a better outcome (a face-bump,
or it cracks down a size). **Risk (load-bearing):** the permadeath meta economy must never let a player
gamble their build into a hole — cap the downside hard, make it net-neutral-or-better, or gate to
scraps only. Documented as a direction needing a firm safety rule before it is specced.

---

## Idea 089 — Run-Start Floor Title Card

**Area:** Flow / UI
**Inspiration:** `docs/concept/meta-progression.md` screen flow step 7; the `atmosphericLine`
hook introduced by feature 053 (Dungeon Notice Board).

Between weapon selection and the dungeon map rendering, a brief title card crosses the threshold:
floor number, a name ("Floor 1 — The Upper Dark"), and a one-line atmospheric flavour sentence
drawn from `NoticeState.atmosphericLine` (the first notice generated by the notice board for this
run). The card holds for ~2 seconds — slow fade in, slow fade out — then the map renders and the
run begins. This is the moment the camp temperature tips to dungeon temperature: the last beat of
safety before the first tile. The `atmosphericLine` field on `NoticeState` was exposed by feature
053 specifically for this consumer; if no notice state is available (e.g. notice board not yet
built), a static fallback line is used. Risk: the card must be brief enough not to feel like a
loading screen; keep it under 2.5 seconds and never add a skip button — short enough it doesn't
need one.


