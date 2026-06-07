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

A small hand-drawn map pinned to the wall of Pip's camp, near the dungeon arch. Does not exist
until the first biome unlock visitor arrives and leaves a sketch — the board materialises as a
consequence of that discovery, not as an empty UI waiting to be filled. New locations are added
as crude sketches by subsequent unlock visitors. Tapping a location selects it as the run
destination; the "Descend" CTA reflects the choice. Biome availability is gated invisibly by
Marks of Descent; the player only ever sees the visitor encounter, not the gate behind it.
Risk: must read legibly as a tappable UI element on phone scale without dominating the camp
screen's existing objects.

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

## Idea 058 — Branching Authored-Procedural Floors

**Area:** System / Flow
**Inspiration:** Manager — "remove player tile selection entirely; pre-design the floor on entry."
Developed (and pushed back on) in `docs/concept/run-architecture.md`.

Replace the room-drafting mechanic (shipped feature 004) with floors generated **complete and hidden
under fog** before Pip enters. The player's agency moves from *drafting tiles into being* to *routing
through a place that already exists* — choosing branches, spurs, and shortcuts read through fog. Keep
the renderer, fog, snapping invariant, camera, and multi-floor structure; discard only the
room-selection card UI and on-choice placement. The floor is generated in four layers — shape × beat
skeleton × population × motif — mirroring the four-layer tile model one level up. Risk: if floors are
authored *linear*, navigation becomes a passive corridor; floors **must branch** so navigation stays a
renewable decision. This is the foundational change the rest of the run-architecture ideas build on.

---

## Idea 059 — Floor Shape Catalogue

**Area:** System / Art
**Inspiration:** Manager — "long floors, wide floors, winding floors, floors that spiral to a boss,
architecturally logical floors." `docs/concept/run-architecture.md`.

A catalogue of macro floor topologies, each with a distinct feel and pacing implication: Gauntlet
(forced march), Spiral (winds to a climax you can glimpse), Warren (dense maze of dead-ends), Hub
(central chamber + optional spokes), Long Hall (wide, patrolled sightlines), Split Level (verticality,
one-way drops), and **The Logical Place** (generated from a *semantic blueprint* — gatehouse → hall →
storerooms → throne — where a room's *purpose* is itself foreshadowing). Shapes are weighted by depth,
biome, and boss motif, never uniform-random. Risk: each shape needs its own snapping-safe layout
generator; recommend shipping two or three shapes first (Gauntlet + Hub + Spiral) and growing the set.

---

## Idea 060 — Roaming Enemies & Floor Sources (Spawners)

**Area:** System
**Inspiration:** Manager — "roaming enemies from the start… a mother spider who sends out little
minions across the map until we kill the source." `docs/concept/run-architecture.md`.

Two linked mechanics the authored floor unlocks. **Roamers** occupy and move across the floor map
(tick-based on Pip's movement, partially visible through fog), turning navigation into avoid-or-engage;
catching Pip from behind opens combat at a disadvantage (a home for Rattled), and squeeze routes let
Pip evade what can't follow. **Sources** are fixed tiles (nest, egg sac, shrine) that emit minions
until destroyed — a pressure clock with a kill-switch that creates a real routing dilemma (detour to
silence it, or race the exit and eat the brood) and doubles as boss foreshadowing (Mother Silk's
spiderlings roam from floor 1). Risk: needs a brood cap so a dawdling player isn't swarmed unbounded,
and a fog-telegraph radius tuned so avoidance is possible but not trivial.

---

## Idea 061 — The Dungeon Stirs (Soft Pacing Pressure)

**Area:** Flow / System
**Inspiration:** Thinker's own — the tension between branching loot (rewards thoroughness) and the
10–30 minute contract (punishes it). `docs/concept/run-architecture.md`.

A soft, escalating presence — *not* a timer — measured in **rooms entered**: the longer Pip lingers
on a floor, the more it wakes up. Torches gutter and fog thickens; patrols quicken; a Source's
brood-rate ticks up; the boss "stirs." It paces the run toward the time contract without a stopwatch,
rewards decisiveness (a fast or stomping run *outruns* it entirely), and delivers tonally-correct dread
("the dungeon is waking" instead of "hurry up"). Because it's measured in movement, it's fair to a slow
*thinker* and only bites a slow *explorer*. Risk: must stay soft — most runs the player should never
consciously feel it; only the room-vacuumer gets squeezed. Needs careful tuning of the escalation curve.

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

## Idea 064 — Gates & Keys (Locked Doors)

**Area:** System / Flow
**Inspiration:** Manager — "at its simplest it's a locked door (or doors) and keys."
`docs/concept/floor-objectives.md`.

A navigation **gate** (locked door, barred passage, sealed grate) opened by one of three keys, each
expressing a different system: a **dice check** (Blue picks / Red forces — pays in pips), a **found
object** (an iron key in a chest down a spur or beyond an enemy — pays in risk/time), or **Pip's size**
(a mouse-hole bypass — slower, or skips the door's reward, but never locked). Near-term and cheap: it
reuses the locked/trapped **Chest** machinery (026/048), applied at a doorway instead of a chest lid.
Gates display iconography for what opens them, and almost always guard an *optional* spur — the rare
mandatory gate (a boss antechamber) is guaranteed solvable. Risk: a locked-only path with no
affordable key bricks a permadeath run — gate reward, not progress, by default.

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

## Idea 070 — The Unified Check Model

**Area:** System / Dice
**Inspiration:** Manager — "where could dice be used in the game today if they're not already…
D&D-style skill checks." `docs/concept/dice-checks.md`.

One reusable machine for *every* non-combat dice moment, so checks feel like the same game as combat
rather than a pile of mini-games: **one roll of Pip's existing pool, against a stated bar, where the
player picks the *approach* (colour), sees the stakes before committing, and a near-miss fails
*forward***. Colours keep their combat identities re-expressed as approaches — 🔴 Force/intimidate,
🟢 Speed/slip, 🔵 Mind/reason-or-pick, 🟡 Fortune/charm — so charm needs no new stat. Results land in
three bands (Success / Success-at-a-cost / Failure, with a Critical flourish), and every check is paid
in the existing currencies (pips/risk/time/HP). Most checks offer 2–3 approaches so no build is ever
bricked. Risk: over-rolling — a check earns its roll only when *both* outcomes matter. The Designer
should generalise the shipped Chest check (026) into this one panel, starting with NPC checks (028).

---

## Idea 071 — NPC Social Checks (Charm / Intimidate / Reason / Slip)

**Area:** Flow / World / Dice
**Inspiration:** Manager — "an NPC conversation could rely on charm/persuasion to open favourable
options or a different path, or they turn nasty and a fight starts if you fail."
`docs/concept/dice-checks.md`. Folds into feature 028.

A check *inside* dialogue: when a response calls for it, the player picks an approach colour to
persuade, intimidate, charm, or deceive an NPC. Success opens a favourable branch (discount, hint,
shortcut, reward); success-at-a-cost opens it with friction the NPC remembers; failure closes the
favourable branch. **Pushback on the manager's framing:** combat-on-failure should be the rare,
loudly-signposted exception (the panel says "if you fail, he attacks" *before* you choose), not the
default — if talking routinely risks a fight, players avoid the blue rooms, which is backwards. Risk:
keep hostile-on-failure NPCs a small, telegraphed subset so NPCs stay inviting.

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

## Idea 075 — Charged Item UI Rendering

**Area:** UI / System
**Inspiration:** Engineer (049 Item Catalogue) — charged items (Healing Bandage Roll 3×+3HP, Smoke Canister 2×flee) are implemented but display logic is stubbed.

Display remaining charges as `3c` in the Satchel Pouch grid and ITEM overlay, distinct from `×N` quantity badges. Bandage Roll at 2 charges shows `2c` (10px monospace, `--gold` colour). When item is used, charges decrement by 1 and display updates; item removed when charges reach 0. Must distinguish charged items from stackable quantities at a glance. Risk: confusion between `3c` (3 uses left) and `×3` (3 copies); solution is the `c` suffix and different visual treatment.

---

## Idea 076 — Tenacity Window in Combat UI

**Area:** UI / Combat
**Inspiration:** Engineer (049 Item Catalogue) — Tenacity consumables (Grit Stone, Second Wind Vial, Bitter Root Brew) are defined but combat gating and reroll-after-item flow incomplete.

Tenacity items appear in the ITEM overlay greyed and untappable until `pipsSpentThisTurn` is true (any Red pip-spend action fires). Once any pip-spend happens and `itemUsedThisTurn === false`, Tenacity items activate (full opacity). Player taps item → item consumed, `itemUsedThisTurn = true`, dice pool rerols (~500ms animation), pip totals reset to new roll, player enters second spend phase. Enemy does NOT attack between spend phases. After second spend sequence, turn ends normally. Spec **037 § Tenacity Window** has full flow diagram and acceptance criteria. Risk: subtle state management around `itemUsedThisTurn` and `pipsSpentThisTurn` flags; dual-spend-phase UX may confuse if not clearly signalled.

---

## Idea 077 — Padded Coat Green Penalty

**Area:** Combat / Item Mechanics
**Inspiration:** Engineer (049 Item Catalogue) — Padded Coat (passive −2 damage, `greenPenalty: 1`) is itemized but penalty logic not wired.

Each time the dice pool rolls in combat while Padded Coat is in satchel, reduce the Green pip total by 1 (minimum 0) **before** the allocation UI renders. A roll showing 3 Green pips becomes 2; a 0 stays 0. Penalty fires automatically after each roll, once per combat (single combat log line: "Padded Coat — Green −1 per roll."). Penalty does NOT apply outside combat. Requirement: log the penalty once per combat, not per turn. Risk: the penalty must fire *after* roll but *before* player allocates, else the flow breaks.

---

## Idea 078 — Berserker Draught Status & Strike Doubling

**Area:** Combat / Status Effects
**Inspiration:** Engineer (049 Item Catalogue) — Berserker Draught (cursed, `during-allocation` window) is itemized but status mechanic and damage calculation incomplete.

On use, set `berserkTurnsLeft: 3` on CombatState. While active: all Strike actions deal 2× normal damage (multiplied *before* any enemy block/armour applies); Green pip reservation mechanic (the 2G full dodge and 1G partial dodge from 037) is **disabled** — pips can still be spent on Feint/Disengage (non-dodge Green actions) if available, but the dodge reserve cannot be set; unspent Green at END TURN are wasted as normal. `berserkTurnsLeft` decrements by 1 at the start of each new player turn (when ROLL fires). Status clears when it reaches 0 or combat ends. While active, a status indicator strip renders at combat panel top ("🔥 BERSERK · 2 turns left", `--room-enemy` bg, showing remaining turns and reminder "2× Strike · No dodge"). A second Draught in satchel is greyed in ITEM overlay while berserk is active (regardless of `itemUsedThisTurn`). Can be used again once berserk clears. Risk: dodge mechanic disable is a major rule break; must be visually unmistakable.

---

## Idea 079 — Tainted Mushroom Self-Damage & Bonus Pips

**Area:** Combat / Item Mechanics
**Inspiration:** Engineer (049 Item Catalogue) — Tainted Mushroom (cursed, `during-allocation` window, +3 pips/−2 HP) is itemized but self-damage and bonus pip application incomplete.

Player taps TAINTED_MUSHROOM in ITEM overlay → self-damage fires immediately (pipHp − 2, applied directly, not an enemy attack, so passive armour does NOT reduce it). If pipHp ≤ 0 after self-damage, the death-prevention hook fires (if available); if no prevention item, Pip dies and run ends. Otherwise, +3 bonus pips are added to the current allocation pool and the player assigns them freely across any colour. Item is consumed on use. Requirement: bonus pips fire *after* self-damage and death-prevention check, so a low-HP Pip can still get the bonus if they survive the cost. Risk: the damage-first-then-pips order is load-bearing; reversed order is a different game (risk-free bonus).

---

## Idea 080 — Stolen Idol Passive Gold & Enemy Damage Bonus

**Area:** Combat / Item Mechanics / Navigation
**Inspiration:** Engineer (049 Item Catalogue) — Stolen Idol (cursed, passive, run-long) is itemized but gold and damage mechanics incomplete.

On acquisition, two effects activate immediately and persist for the rest of the run. (1) **Gold bonus:** each time Pip enters a room for the first time (or first time after clearing a previously-cleared room — whichever is simpler for implementation), `gold += 2`. Fires on room-entry trigger, same hook as enemy-room entry if possible. (2) **Enemy damage bonus:** all enemy attacks deal +1 additional damage. Damage calculation order: base enemy damage + Stolen Idol bonus (+1) − passiveArmour reduction (if any) = clamped to 0 minimum. Idol appears in Satchel with "WORN" badge and `--item-cursed` red border as persistent reminder. Cannot be un-equipped or discarded once acquired. Does NOT appear in ITEM overlay. Risk: player must accept the burden to get the gold — removing the option removes the choice; keep it locked for the run. Interaction test case: Stolen Idol + Leather Jerkin (−1 damage) = (base + 1 − 1 = base): the two effects cancel, a valid and interesting run strategy.

