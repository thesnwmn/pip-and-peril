# Run Architecture — Floors, Flow, and Scaling

> *A floor should feel like a place, not a deck of rooms.*

This document sets the direction for the **next generation of dungeon design** in Pip & Peril: how a
run is structured, how floors are generated, how difficulty and complexity escalate within a run and
across the meta, and how the whole thing is themed around its boss. It is the structural counterpart
to the existing concept set — `combat-system.md` owns the moment-to-moment fight, `enemies-and-bosses.md`
owns who you fight, `biomes.md` owns *where* a run happens; this doc owns the **shape of the run
itself** and the space you move through.

It builds on a manager direction with real teeth: *stop letting the player draft tiles into being;
pre-design the floor instead*. That instinct is right, but it carries a cost worth naming before we
spend it.

---

## A Challenge First

The manager's proposal is to **remove player tile selection entirely** — pre-author each floor on
entry so we gain surprise (traps, ambushes), relief (corridors, shops), living enemies that roam a
map that already exists, real architecture (long halls, spirals, logical layouts), and immersion.

Every one of those gains is real, and the drafting mechanic (shipped as feature 004 · Navigation &
Room Selection) genuinely blocks most of them. You cannot have a spider's brood roaming a floor that
doesn't exist three tiles ahead of Pip. You cannot build a place that *was built* — a gatehouse, a
hall, a throne room — out of squares the player conjures one at a time. The drafting model has been
quietly fighting the exploration pillar it was meant to serve.

**But here is the cost.** Navigation is one of only *two* decision layers in the entire game. The
other is pip allocation in combat. Strip the choice out of navigation and you are left with a single
decision layer plus a corridor you walk down while fog peels back. Surprise is a **one-time** reward
per tile — it fires once and is spent. Agency is a **renewable** decision — it fires every fork,
every run. Trade a renewable decision for a one-time reward and exploration stops being a game and
becomes a hallway.

So the challenge to the manager's framing is this: **remove tile *drafting*, but do not remove
navigational *choice*.** The fix is not "author a linear floor." It is "author a *branching* floor,
and let the player choose their route through a place that already exists." That is a *better* choice
than drafting ever was, because a route through a real place can be **informed** — by what you glimpse
through the fog, by the shape of the architecture, by what the dungeon is telling you about itself.
The rest of this document is built on that synthesis.

---

## From Drafting to Descent — the navigation model

**The new model:** each floor is generated as a complete, connected map *before* Pip sets foot on it,
hidden under fog. Pip explores it by moving through it. There is no "pick one of three room types"
card. The player's navigational decisions are now about **route**, not **conjuring**:

- Which branch do I take at this fork — the red-lit passage or the one with a distant glint?
- Do I detour down that spur for the chest, or beeline the stairs?
- Do I take the squeeze shortcut that skips the patrol (and skips its loot)?
- Do I go and silence that nest, or race the exit before its brood multiplies?

These are *richer* decisions than drafting because they can be read in advance. The floor foreshadows
itself (see "Living Floors" and "The Boss Motif" below). The player is no longer authoring the
dungeon — they are **reading and outwitting** one.

**What survives the change (this is most of the work).** The shipped tile renderer (003), the
fog-of-war, the snapping invariant from `tiles-and-props.md`, the multi-floor structure and boss gate
(022), the camera and navigation panel (017/030/033) — all of it stays. Tiles still snap; fog still
hides; the camera still follows Pip. **What is discarded is narrow:** the room-selection card UI and
the "tile materialises on choice" placement logic from feature 004. We are not rebuilding the
dungeon; we are changing *who places the tiles* — an authored-procedural floor planner instead of the
player's draft — and *when* (all at once, up front, instead of one card at a time).

**The pillar this revises.** `overview.md` currently lists the pillar as *"Tile-based dungeon built
room by room through player choice."* That wording must change. The pillar is still about player
agency over what Pip faces — but agency now lives in **routing through an authored space**, not in
drafting the space. Proposed wording: *"Tile-based dungeon explored by player choice — branching,
authored-procedural floors read through fog."* This is a deliberate, argued bend of a foundational
pillar and should be ratified as a decision (see the summary).

---

## The Floor as a Generated Object

`tiles-and-props.md` showed that a *tile* is four independent layers stacked together. A **floor** is
the same idea one level up — four layers, generated in order, each one cheap to reason about on its
own:

```
   ┌─────────────────────────────────────────────────────┐
 4 │  MOTIF / DRESSING   biome palette + boss theme        │  how the floor looks & whose floor it is
   ├─────────────────────────────────────────────────────┤
 3 │  POPULATION         which enemies / rooms / hazards    │  what fills the beats (depth-weighted)
   ├─────────────────────────────────────────────────────┤
 2 │  BEAT SKELETON      where encounters sit on the shape  │  the pacing spine + optional spurs
   ├─────────────────────────────────────────────────────┤
 1 │  SHAPE              the macro topology of the floor    │  spiral / gauntlet / warren / hub / hall
   └─────────────────────────────────────────────────────┘
```

1. **Shape** — the floor's macro topology (catalogue below). The skeleton's geometry.
2. **Beat skeleton** — where the *beats* (encounters, set-pieces, rests) sit along that shape, split
   into a **spine** (the critical path to the exit) and **spurs** (optional detours). This is the
   pacing layer; see "The Pacing Contract."
3. **Population** — which specific enemies, room types, traps, and hazards fill the beats, weighted by
   depth, the run-depth window, and the biome (the existing weighting machinery from
   `enemies-and-bosses.md`, applied at floor-generation time instead of per-card).
4. **Motif / dressing** — the biome palette (`biomes.md`) and the **boss motif** (see below) that skin
   the whole floor and bias its props, archetypes, and hazards.

Keep the layers orthogonal and floor variety multiplies for free, exactly as tile variety does.

### Floor shape catalogue

The starting set of macro topologies. Each has a *feel* and a *pacing implication*. The Designer
weights them by floor depth, biome, and boss motif — a floor shape is never uniform-random.

| Shape | Feel | Navigation decision it creates | Good for |
|---|---|---|---|
| **Gauntlet** | A forced march. Mostly linear, short spurs. | Little routing; the tension is *forward*. | The boss-approach floor (the pre-boss corridor). |
| **Spiral** | Winding inward/down to a climax. You circle the centre and sometimes *see* it. | Pacing yourself toward a destination you can glimpse. | Climax floors; built-in boss foreshadowing across the gap. |
| **Warren** | A dense tangle of short passages and dead-ends. | Easy to get turned around; fog tension; squeeze shortcuts matter. | Wildwood/burrow biomes; Mother-Silk-style web floors. |
| **Hub (Wheel)** | A central chamber, spokes to optional rooms, one locked way onward. | Pure risk/reward — clear spokes for loot, or take the exit. | Breather/shop floors; "how greedy are you" floors. |
| **Long Hall / Gallery** | A wide, open, columned space with long sightlines. | Avoid the patrol or engage it; stealth-adjacent traversal. | Roaming-enemy set pieces; "wide floors." |
| **Split Level** | Two strata (dry/flooded, upper/lower) joined by drops and climbs. | Verticality; one-way drops that reshape the route. | Ancient Halls, Larder; surprise topology. |
| **The Logical Place** | A floor that reads as a *real built location* — antechamber → hall → storerooms → quarters → throne. | Function is foreshadowing: you know what each room is *for*. | Rat King fortress; immersion-forward runs. |

**The Logical Place deserves its own note.** "Architecturally logical" floors are not just a shape —
they are generated from a **semantic blueprint**, a small grammar of rooms-with-purpose rather than
abstract cells. A storeroom holds loot. A guardroom holds enemies. The throne room holds the boss.
The *purpose* of a room is itself information the player can read, which means the floor foreshadows
its own contents simply by being coherent. This pairs naturally with the boss motif: the Rat King's
floor is a fortress; Mother Silk's is a hunting-web; the Pale Adder's is a cold, narrowing descent.

---

## The Pacing Contract

The target: **a successful run lasts 10–30 minutes.** That range is wide on purpose — it is a
*spread of outcomes*, not a number every run should hit. The branching-floor model is what lets a
single design serve both ends of it, because **the player controls run length by choosing how much
optional content to engage.**

- The **spine** of each floor is the critical path: the minimum beats between entrance and exit. A
  player who beelines the spine across every floor finishes the *fast* run — roughly **10–15 minutes**.
- The **spurs** are everything optional: chests down dead-ends, a shop off the hub, an NPC, a vault
  behind a check. A player who clears everything finishes the *complete* run — roughly **25–30
  minutes**.

This is the elegant part: **the branching navigation (the thing we kept) is also the pacing control.**
We do not need a timer or a level-length slider. Run length emerges from topology and player greed.
The same fork that makes navigation a decision *also* tunes the clock.

**Floor count is a variable, not the number 3.** Three floors was arbitrary, and the manager is right
to question it — but the fix is not "add more floors." More floors is not more game; it is more of the
same beat. **The *run* owns the time contract; floors are the progression beats inside it.** Floor
count becomes a per-biome tuning parameter (think 2–4) chosen so the *run* lands in the 10–30 window:

- A tight, intense biome (the Larder) might be **2 dense floors** — short, claustrophobic, lethal.
- A sprawling one (the Winter Fields) might be **4 shorter floors** — the feeling of distance and
  exposure is partly a floor-count-and-size choice.

A biome's identity includes its **length and rhythm**, not just its palette. Default to 3; let the
biome move it.

**Beat budget, as a rough sketch for the Designer:** a floor's spine is ~3–5 beats; spurs add ~2–4
more. A combat beat is ~1–3 minutes of turn-based play; a non-combat beat (shop/chest/NPC) is under a
minute; navigation between beats is seconds. That arithmetic is what produces the 10–30 spread across
three floors. The Designer should treat these as dials to playtest, not gospel.

---

## The Complication Curve

The manager wants the run to **add mechanics as it progresses** — more involved enemies, more involved
traps — and to **broadly get harder**, with progression **driven by floor**. The discipline that makes
this feel like teaching rather than piling-on is a single rule borrowed from the best roguelikes:

> **Introduce one new idea at a time. Never two at once.**

Each floor — and each beat within a floor — may introduce **at most one mechanic the player hasn't
seen this run**: a new enemy intent, a new trap type, a roaming enemy, a spawner, an environmental
hazard. The player meets it, practises it in isolation, and only *then* sees it combined with
everything that came before. This is a **complication budget**: small on floor 1, growing with depth.

Difficulty then climbs along **two distinct axes**, and they feel completely different:

- **Breadth** — *more kinds* of threat, introduced one at a time as you descend. This is the
  "mechanics unfold" axis. It is what keeps a run *interesting*.
- **Density & combination** — *known* threats stacked together, at higher tiers, in worse
  configurations. This is the "it gets harder" axis. It is what keeps a run *tense*.

Floor 1 is mostly breadth at low density (learn the pieces). Floor 3 is mostly density and combination
of pieces already taught (the exam). The boss is the ultimate combination: every mechanic the run
introduced, deployed against you at once, in a learnable pattern (per `combat-system.md`).

**This generalises the scaling model already in `combat-system.md`.** That doc scales enemy *intent*
complexity on two axes — floor depth (within a run) and the run-depth window (across the meta). This
document extends the *same two axes* to **every threat type**: traps, hazards, roamers, and spawners
all unlock and intensify along floor-depth and run-window together. One unified model. An "Attack-only"
rat and a "step-on-it" trap on floor 1, run 1; a multi-intent stoat, a compound trap, and a roaming
brood on floor 3, run 12.

---

## The Dungeon Stirs

*This section is the Thinker's own contribution — not a development of the manager's direction.*

There is a quiet problem hiding in everything above. A branching floor full of optional loot rewards
**thoroughness** — clear every spur, take every chest. But thoroughness is the enemy of the 10–30
contract and the enemy of tension: a player who methodically sweeps every room is never in danger and
never in a hurry. We need a force that gently discourages dawdling *without* a stopwatch, because a
hard timer is stressful and tonally wrong for a game whose surface is Redwall-cosy.

The answer is a soft, escalating presence I'll call **the Dungeon Stirs**: the longer Pip lingers on a
floor, the more the floor *wakes up* around him. Not a countdown — a **rising pressure** measured in
movement, expressed atmospherically and mechanically:

- Torches gutter and the fog thickens — sightlines shorten, foreshadowing fades.
- Patrols quicken or a new wanderer joins (ties directly to roaming enemies, below).
- A spawner's brood-rate ticks up; the dungeon's ambient threat weighting nudges upward.
- The boss "stirs" — a distant sound, a tremor, an intent-cycle that will start one step accelerated.

The pressure is measured in **rooms entered**, not real seconds, so it is fair to a slow *thinker* and
only punishes a slow *explorer*. And it is **soft**: most runs, the player exits well before the stir
becomes dangerous and never consciously feels it. It only bites the player who tries to vacuum up every
last scrap — turning over-exploration into a real, legible risk. It does three jobs at once:

1. **Paces the run** toward the 10–30 window without a timer.
2. **Rewards decisiveness** — the fast, confident run *outruns* the stir entirely (which is exactly why
   a stomp run should be short; see below).
3. **Delivers dread** — "the dungeon is waking" is the tonally-correct way to say "hurry." Charm on the
   surface, a chasm underneath.

The stir is the connective tissue of this whole document — it links pacing, roaming enemies, the
permission to stomp, and "broadly harder as it progresses" into one breathing system.

---

## Living Floors — Roamers, Sources, and Hazards

A pre-authored floor unlocks threats the drafting model could never support. These are the mechanics
the manager is reaching for, and they are the biggest *gameplay* payoff of the change.

### Roaming enemies

Some enemies are no longer bound to a room — they **occupy and move across the floor map** in
navigation space. They patrol routes; they are partially visible through fog when near (a shape, a
sound, a shadow). The player now navigates *around* them or *into* them — a genuinely new navigation
decision layered on top of routing.

- **Movement is tick-based on Pip's movement** — each room Pip enters, roamers take a step. Pursuit is
  legible and plannable, not twitchy.
- **Contact triggers combat** — and a roamer that catches Pip *from behind* opens the fight at a
  disadvantage (a natural home for the **Rattled** start-state from `combat-system.md`).
- **Pip's smallness is the counter** — squeeze routes (Idea 010) let him slip past roamers that cannot
  follow. The "small size is a mechanic" pillar finally pays off in navigation, not just flavour.

Roamers turn the Long Hall and Warren shapes into avoid-or-engage puzzles and give the dungeon the
feeling of being *inhabited* rather than *stocked*.

### Sources (spawners) — the Mother Spider made real

A **Source** is a *fixed* tile — a nest, an egg sac, a crack, a corrupted shrine — that periodically
emits **minions** which then roam the floor until the Source is destroyed. This is the manager's
"mother spider who sends out little minions across the map until we kill the source," generalised into
a reusable mechanic. It is one of the most valuable tools this redesign unlocks, because it creates a
**strategic objective beyond "reach the exit":**

- The Source is a **pressure clock with a kill-switch.** Dawdle and the brood multiplies; find and
  silence the Source and the bleeding stops. It punishes over-exploration (pairing perfectly with the
  Dungeon Stirs) and rewards decisive play.
- It creates a **real routing dilemma:** the Source may sit on a spur, off the critical path. Do you
  detour to kill it (costing time, stopping the bleed) or race the exit (saving time, eating the
  brood)? That is a far better decision than any drafting card.
- It is **boss foreshadowing as a floor mechanic.** On Mother Silk's run, spiderlings roam from the
  first floor; the player feels the boss as a *floor-wide presence* long before the title card. A minor
  egg sac on floor 1 is the echo of the Mother waiting on floor 3.

### Environmental floor mechanics

Beyond creatures, the *floor itself* can be the threat — set-piece floors that are memorable and add
time pressure where the run wants a spike:

- **Rising dark** — torches dying, fog closing in (the Dungeon Stirs made literal on a single floor).
- **Flooding / collapse** — water rises or rooms cave behind Pip each move, closing routes and forcing
  forward. Turns a Split Level into a race.
- **The failing light / wind** — biome-flavoured roll penalties in exposed tiles (already gestured at
  in `biomes.md` for the Winter Fields).

Use these sparingly — one set-piece floor per run at most — so they stay special.

### New encounter / tile concepts

A handful of new room concepts the authored floor makes possible:

- **The Overlook** — a room where Pip can *see* a future part of the floor across an impassable gap:
  the boss arena, or a treasure he'll have to route to. Pure foreshadowing-as-architecture.
- **The Vault** — a high-reward locked room, gated by a check (Blue/Red) or by a key found elsewhere on
  the floor — a cross-room objective that makes a spur worth the detour.
- **The Shrine / Altar** — risk/reward: spend HP or gold for a buff or a die manipulation (promotes the
  Magic Pool archetype from `tiles-and-props.md`; a future home for Purple).
- **The False Relief** — a room that reads as a corridor or a rest and turns out to be an ambush. The
  *cost* of the surprise pillar; use rarely, or relief stops meaning anything.
- **One-way drops** — collapse tiles that pitch Pip to a lower section he can't climb back from,
  reshaping the run mid-floor.

---

## The Permission to Stomp

The manager asked for something most difficulty systems actively prevent: it should be **okay for the
player to find a perfect combo and out-scale the dungeon** — numbers-go-up, stomp-it-flat fun. This is
a real design value and it deserves to be systematised, not balanced away.

**The core rule: the dungeon does not rubber-band within a run.** A floor's difficulty is fixed at
generation time (depth + run-window + biome). If Pip finds a broken combo on floor 1, floors 2 and 3
do **not** secretly buff themselves to compensate. The player gets to *feel the snowball*. No hidden
catch-up scaling, ever — that is the whole promise.

**Where the power comes from matters.** There are two power layers and only one should be capable of a
blowout:

- **Meta-progression** is deliberately *low-variance* and must never trivialise the dungeon — this is
  already locked in `meta-progression.md` (no permanent multipliers, no starting-HP bonuses). A
  well-upgraded Pip has *more options*, not a won game.
- **In-run items and combos** are deliberately *high-variance*. This is where the stomp lives. A lucky
  confluence of drops — a coating plus a Tenacity item plus the right dice — *can* break a single run
  open. That is the jackpot, and it is intended.

So the stomp is a **jackpot outcome of the high-variance item layer**, not a reward for grinding. That
keeps it rare enough to feel special and frequent enough to feel possible. The risk to name (a
challenge to the value itself): if jackpots are too common the game is trivial; too rare and the
promise is hollow. The lever is **item/combo variance and floor density**, tuned in playtest — never
enemy rubber-banding.

**The emotional shape of a stomp run is FAST.** When the player is out-scaling, the reward is a quick,
dominant victory lap — beeline the spines, pop everything, finish in **10–12 minutes**, outrun the
Dungeon Stirs entirely. A stomp dragged across 30 minutes is not a power fantasy; it is a chore. The
branching model already supports this: the snowballing player skips the spurs because they don't need
the loot, and the short run *is* the trophy.

A small hook to make the fantasy *visible* (seeded as an idea): a run-level momentum state — call it
**On a Tear** — the run-scale sibling of the per-fight **Emboldened**. Consecutive clean clears build
visible swagger (faster kill animations, a louder log, a small mechanical sweetener) so the numbers
going up are *felt*, not just true.

---

## Scaling a Floor Across the Meta

The manager's requirement: as the meta-game progresses, **levels must be able to scale — by raising the
stats of what's in them and/or by changing what's in them** (e.g. more powerful enemy variants from the
start). This is the cross-run counterpart to the in-run Complication Curve, and it runs on the existing
**run-depth window** (`enemies-and-bosses.md`). There are three levers, in increasing order of how
*interesting* the result is:

- **Lever A — the Stat Dial.** Same content, tuned up: enemy HP/damage, trap severity, spawner rate.
  Smooth, continuous, invisible. Cheap. *Boring on its own* — doubling a rat's HP just makes the same
  decision take longer.
- **Lever B — the Content Swap.** *Different* content: the floor-1 rat becomes a floor-1 *armoured*
  rat; a simple trap becomes a compound one; a plain room becomes a Source room. Discrete, visible,
  and it **changes how you play**. This is "more powerful versions from the start," exactly as the
  manager describes.
- **Lever C — the Structural Reshape.** The *floor itself* changes: more spurs, a longer spine, a
  roamer added, an environmental mechanic switched on, the shape shifted to a harder topology (a Hub
  becomes a Gauntlet). Late-meta floors aren't "same map, tougher mobs" — they are **more elaborate
  places.** This is the most novel lever and the one that keeps the *world*, not just the numbers,
  growing.

**The guiding rule:** *prefer Swap and Reshape over the Stat Dial; use the Dial only to smooth the
gradient between thresholds.* This is the same philosophy `combat-system.md` applies to skills ("change
what decisions are interesting, not just which numbers go up") and `meta-progression.md` applies to
upgrades — now applied to the floor. Pure stat inflation is the boring kind of scaling; substitution
and reshaping are the kind that keep a veteran engaged.

All three levers read from the **same run-depth window**, so the dungeon escalates coherently: the
window slides up, and floors get harder *and* stranger *and* bigger together — but a run at window 12
is still *winnable*, just *differently challenging*, never trivial and never rubber-banded.

---

## The Boss Motif — Runs Themed by Their Climax

This is where everything in this document, and the manager's last prompt — *"sub-themed biomes based on
who the boss is"* — converge.

Today the boss is drawn at run start (`enemies-and-bosses.md`) and only appears at the end. The new
direction: **the boss colours the entire run.** A **boss motif** is a thematic overlay — layer 4 of the
floor model — that sits on top of the biome palette and biases everything below it. The biome answers
*where* you are; the motif answers *whose floor this is tonight.*

A run is no longer "the Dungeon." It is **Mother Silk's** dungeon, or **the Pale Adder's**, or
**Scratch's** — same biome base, a different sub-theme each time:

| Boss | Motif biases (props, archetypes, hazards, foreshadowing) | Living-floor mechanic |
|---|---|---|
| **Mother Silk** | Webs everywhere; cocooned remains as props; Web Room archetype frequent; a Warren shape. | Spiderling **Sources** from floor 1 — her presence felt before she's seen. |
| **The Pale Adder** | Shed skins, cold quiet, snake-track props; a narrowing Spiral/Gauntlet; the light feels thinner. | A creeping environmental poison hazard; few roamers — she hunts alone. |
| **The Rat King** | Bone props, banners, iron brackets; **The Logical Place** — a fortress with gatehouse and throne. | Roaming guard **patrols**; a fortress that is garrisoned, not stocked. |
| **Scratch** | Claw-marks, knocked-over and scattered props (a cat has *been* here); fur tufts. | An unpredictable "the cat passed through" roaming event; chaos, not pattern. |

The motif **reuses every system in this document**: it weights the **props** layer (`tiles-and-props.md`),
the **archetype** weights, the **floor shape**, the **living-floor mechanic** (roamer vs Source vs
hazard), and the **foreshadowing hints** (Idea 011). A spawner is no longer just a pacing tool — on
Mother Silk's run it is *her*, foreshadowed across three floors. The boss reveal then lands as
*inevitable*: "of course — the webs, the cocoons, the things in the dark — *her*." Not a coin flip; a
fate, exactly as `enemies-and-bosses.md` asks the reveal to feel.

And it is **efficient.** A biome's felt variety multiplies by its boss roster with *no new biome
required*. The Dungeon with the Rat King and the Dungeon with Mother Silk are two different experiences
sharing one palette. The motif is the cheapest, highest-impact variety lever we have — it is the same
"four orthogonal layers" trick from `tiles-and-props.md`, paying off one more time at run scale.

---

## How this changes the existing docs

For the Designer and Documenter, the concrete edits this direction implies:

- **`overview.md`** — revise the navigation pillar (drafting → routing); mark the "Dungeon Navigation"
  and "Dungeon Structure" sections as superseded by this doc; update the POC 5 note (room-selection is
  a discarded mechanic, not a preserved one). *(This session updates the pillar and adds pointers; the
  full rewrite is a Documenter follow-up.)*
- **`combat-system.md`** — its two-axis intent-complexity model is now a *special case* of the
  Complication Curve; add a pointer noting traps/hazards/roamers/spawners scale on the same two axes.
- **`tiles-and-props.md`** — the floor model is the tile's four-layer model one level up; the props and
  archetype layers are now also driven by the **boss motif**, not depth alone.
- **`biomes.md`** — biome length and floor *count* are part of biome identity (2–4 floors); the boss
  motif is the "sub-theme" within a biome.
- **`enemies-and-bosses.md`** — roamers and Sources are new *delivery modes* for the existing roster;
  the boss now themes the run, not just the final room.
- **A new decision (D9)** should record the navigation-model change once the manager ratifies it.

---

## Open Questions for the Designer

- **Generation method for authored-procedural floors.** Two viable models: (a) *set-piece + connective
  tissue* — hand-authored rooms-of-interest stitched by procedural corridors (Spelunky/Hades), or
  (b) *shape templates + procedural population* — a floor drawn from a shape template and filled by
  depth-weighted pools. Recommend (b) first (closest to the existing weighting machinery), with (a) as
  a later layer for authored set-pieces and rhythm. Probably both, eventually.
- **Spine/spur balance and the beat budget.** The 10–30 contract rests on un-playtested arithmetic.
  How many spine beats, how many spurs, how punishing the Dungeon Stirs — all need tuning.
- **How visible is a roamer through fog?** Too visible and avoidance is trivial; too hidden and contact
  feels unfair. A sound/shadow telegraph radius is the likely answer; needs feel-testing.
- **Does the Source mechanic need a global brood cap?** Without one, a dawdling player could face
  unbounded minions. A cap (or a per-floor brood budget) keeps it pressure, not punishment.
- **Stomp frequency.** What item/combo variance and floor density produce a jackpot often enough to feel
  possible but rarely enough to feel special? Pure playtest territory.
- **Is the boss motif always on, or a sometimes-thing?** Always-on maximises thematic coherence but
  risks making the boss obvious too early. A dialled-up motif on later floors (faint on floor 1, loud on
  floor 3) may be the right curve.
- **Migration cost.** Feature 004 (room selection) is shipped. Confirm exactly which modules are
  discarded vs. retained so the Engineer scopes the change accurately (the renderer, fog, snapping, and
  multi-floor structure should all survive).

---

*Related:*
- `docs/concept/overview.md` — pillars and the navigation/structure sections this doc revises
- `docs/concept/combat-system.md` — the two-axis scaling model this doc generalises; Rattled (roamer
  ambush) and Emboldened (the run-scale "On a Tear")
- `docs/concept/enemies-and-bosses.md` — the roster, threat tiers, run-depth window, and boss pool this
  doc gives new delivery modes and a run-wide theme
- `docs/concept/biomes.md` — biomes as destinations; floor count/length as biome identity; the boss
  motif as a biome sub-theme
- `docs/concept/tiles-and-props.md` — the four-layer tile model this doc mirrors at floor scale; the
  snapping invariant that survives the change
- `docs/concept/meta-progression.md` — the low-variance meta layer that must never trivialise the run
  (the counterweight to the high-variance stomp)
- `IDEAS.md` — discrete ideas seeded from this document (058–063)
</content>
</invoke>
