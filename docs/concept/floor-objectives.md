# Floor Objectives — Puzzles, Gates & Errands

> *Reaching the exit is not the only reason to walk a floor.*

This document sets the direction for **objectives**: the layer of *purpose* added on top of a floor's
geography. Today a floor has exactly one objective — reach the exit, or kill the boss. This note adds
two families of intent that make the branching floor worth engaging *with intent* rather than just
crossing: **spatial puzzles** (locked doors, keys, levers, and — eventually — a dungeon that
physically changes) and **errands** (NPC-given sub-objectives that pay out in-run or back at camp, and
that seed relationships across runs).

It depends entirely on [`run-architecture.md`](run-architecture.md): you cannot gate a route, hide a
key down a spur, or wire a lever to a distant door inside a floor that doesn't exist until the player
drafts it. The shift to **branching authored-procedural floors** is the prerequisite that makes
everything here possible. This doc is the "things to *do* on that floor" counterpart to that doc's
"shape of the floor."

The manager's framing is explicit about timing: the **simple locked door is near-term**; levers,
linked state, and dungeon-mutation are **later**; errands sit somewhere in between. This document
honours that — it lays out the whole ladder but flags clearly what is buildable soon and what is a
horizon piece.

---

## A Challenge First

Puzzles are seductive. They read as "depth." But four risks are worth naming before we spend effort,
because each one, unaddressed, turns a good idea into a worse game.

1. **The dice-identity risk.** Pip & Peril's core verb is *spend pips to resolve a thing*. A
   lever-and-door logic puzzle introduces a **different kind of cognition** — spatial logic,
   inventory-juggling, backtracking — that sits *beside* the dice system rather than expressing it.
   Do this carelessly and the game becomes "dungeon crawler with a sokoban minigame welded on." The
   discipline: **a puzzle must be paid for in the game's existing currencies** — pips (a check), risk
   (an enemy guards the key), or time (a detour weighed against the Dungeon Stirs). A "puzzle" should
   be *routing under constraint*, not abstract logic foreign to everything else.

2. **The backtracking-versus-pacing risk.** Keys and levers naturally invite *there-and-back* — fetch
   the key over there, return here. But `run-architecture.md` just established the **Dungeon Stirs**
   (lingering wakes the floor) and the 10–30 contract (beelining is rewarded). A puzzle that *forces*
   backtracking fights both systems head-on. The discipline: **never make the only way forward require
   a there-and-back.** Either the solution sits on the forward path, or the reward is a *spur* the
   player chooses to detour for, knowingly paying the Stirs as the cost.

3. **The phone-legibility risk.** "A lever that opens a door somewhere else" only works if the player
   can *tell* what just happened on a small portrait screen under fog. Pull a lever, feel nothing,
   and the mechanic is dead. The discipline: **remote state lives on the explored map, with matched
   iconography and immediate sensory feedback** (a rumble, a fog-reveal pulse over the affected tile).

4. **The bricked-run risk.** A locked door that is the *only* exit, with a key the player can't find
   or afford, ends a permadeath run on a technicality — the worst feeling a roguelike can produce. The
   discipline: **puzzles gate reward, not progress, by default**; the rare mandatory puzzle must be
   *guaranteed solvable* with resources guaranteed present on the floor.

None of these kill the idea. They sharpen it. A puzzle in Pip & Peril is a **navigation decision with
a gate, paid for in pips, risk, or time, legible on the map, and almost always optional.** Hold that
line and puzzles become an expression of the game rather than a guest from a different one.

---

## The Design Rules

The discipline above, codified for the Designer:

- **Optional by default.** A puzzle's reward is a spur, a vault, a shortcut, a buff — not the only path
  onward. Mandatory puzzles are rare and **must guarantee a solution exists on the floor** (the key is
  always somewhere reachable; the check is always affordable from a full reserve).
- **Pay in existing currencies.** Gates open via a **dice check** (pips), a **found object** behind
  risk (an enemy, a trap, a spur), or **time** (a detour weighed against the Stirs). Never via logic
  that has nothing to do with the rest of the game.
- **No forced backtracking.** Solutions sit on the forward path, or rewards justify a *chosen* detour.
  "Deliver forward" beats "return whence you came" every time.
- **Legible via the map.** Remote and persistent state (a door's open/closed, a lever's thrown state, a
  water level) is shown on the explored map with **matched iconography** linking cause to effect, and a
  state change always fires an **immediate feedback beat**.
- **Pip's smallness is a solution verb.** A locked door has a mouse-hole bypass; a lever sits behind a
  grate only Pip fits through; the "key" to a great door is sometimes just *being small enough to go
  around it*. This expresses the "Pip's small size is a mechanic" pillar and gives puzzles a uniquely-
  Pip answer that no key or check provides. Squeeze routes (Idea 010) are a first-class puzzle tool.

---

## Tier 1 — Gates & Keys *(near-term)*

The simplest objective, and the one the manager wants soonest. A **gate** (a locked door, a barred
passage, a sealed grate) blocks a route; a **key** opens it. The key takes one of three forms, each
expressing a different system:

| Key form | Pays in | Expresses | Example |
|---|---|---|---|
| **A check** | Pips | The dice system | A Blue check picks the lock; a Red check forces it; failure costs HP or a turn. |
| **A found object** | Risk / time | Navigation | An iron key in a chest down a spur, or in a chest *beyond* an enemy room. |
| **Pip's size** | Nothing but route knowledge | The smallness pillar | A mouse-hole beside the door — slower, or skips the door's reward, but never locked. |

**This is cheap to ship because the machinery already exists.** Feature 026 (Chest Encounter) already
specs a **locked** variant (a Blue dice check) and a **trapped** variant (an agility check) on the
item-interjection framework (048). A locked *door* is the same check applied to a *navigation gate*
instead of a chest lid. The near-term build is "reuse the locked-chest check at a doorway, and gate a
spur's reward behind it."

**Iconography.** A gate displays *what opens it*: a coloured glyph for a dice-check (blue lock = Blue
check), a keyhole for a found key (and the matching key shows the same motif when collected), a
mouse-hole silhouette for a squeeze bypass. The player reads the cost before committing to the route.

**Reward placement.** Tier-1 gates almost always guard a **spur** — a vault, a chest, a shortcut that
skips a later danger. The locked door is the dungeon asking *how much do you want this?* against the
clock of the Stirs. A rare mandatory gate (the boss antechamber) is guaranteed solvable.

---

## Tier 2 — Switches & Linked State *(later)*

A **lever here changes something there** — the manager's "lever that opens a door somewhere else, with
iconography." This is where legibility becomes the whole design problem, and the rules above do the
heavy lifting.

**Matched iconography.** A lever and the thing it affects share a glyph and colour: lever `⟳` blue →
door `⟳` blue, three rooms away. The relationship is readable without a tutorial. When a floor has two
mechanisms, they carry distinct motifs so the player never confuses which lever did what.

**Immediate, legible feedback.** Throwing a lever fires a sensory beat *now*: a distant rumble, and a
**fog-reveal pulse** over the affected tile on the map (a brief glimpse of the door swinging, even
across unexplored space), plus a persistent **map-pip** showing the new state. The player *feels* the
remote change land even though they can't see the room.

**The map is the puzzle's UI.** Fog already tracks "seen." Once a lever or door is seen, its state
persists on the explored map — thrown/un-thrown, open/closed. The player reasons about the puzzle by
reading the map, not by holding it in their head. This is essential on a phone.

**Levers as decisions, not buttons.** The richest version of the manager's idea: a lever that **opens
one route and closes another** ("opens new areas and closes old ones"). Now the lever is a *choice* —
trade the path behind you for the path ahead — not a press-to-win. That is a navigation decision
expressed as a mechanism, which is exactly the register this game wants.

---

## Tier 3 — Floor Mutation *(horizon)*

The spectacular end the manager flags as "not for soon": **levers that physically change the dungeon** —
rotating rooms to open new areas and seal old ones, raising and lowering water to close flooded routes
and open drained ones.

The clean way to model this: a floor is a **state machine with 2–3 configurations**, and mechanisms
**toggle between them**. Water-high vs. water-low. Rooms-aligned vs. rooms-rotated. Each configuration
is a valid, snapping-correct floor; the mechanism swaps which one is live.

- **The snapping invariant must hold in every configuration.** A rotated room re-maps its exits — but
  those exits must still land at the fixed doorway positions and width (`tiles-and-props.md`). A raised
  water level toggles which tiles and exits are *passable*, not where the doorways are. The renderer
  and fog don't change; the *connectivity* does.
- **This is a biome and boss signature, not a generic feature.** Water levels belong to the Ancient
  Halls (flooded chambers already exist there); rotating-room clockwork could define a future
  mechanism-themed biome or boss motif. Floor mutation is too expensive to scatter everywhere — it is a
  *centrepiece*, deployed where a place's identity is built around it.
- **It is the strongest expression of "the floor itself is the threat"** from `run-architecture.md`'s
  environmental hazards. A flooding floor that rises on a timer *is* a mutation puzzle under pressure.

This tier is a large lift (floor-scale state, connectivity recomputation, the renderer handling
multiple configs). It is documented here so the architecture below it does not foreclose it — the
authored-floor model should be built knowing that one day a floor will need to hold more than one
shape.

---

## The Run-Spanning Objective

*This section is the Thinker's own contribution — not a development of the manager's direction.*

Everything above is *per-floor*. The most powerful version of an objective stretches across the **whole
run** — and it solves a quiet problem: in a 3-floor run, early floors can feel like throat-clearing
before the climax. A run-spanning objective makes floor 1 *matter to* floor 3.

**The Keystone pattern.** A key, sigil, or quest item found early opens or weakens something at the
climax. Three sigils scattered across the floors, each behind a Tier-1 gate; collect all three and the
boss's first phase is weakened, or a shortcut to the boss opens, or a vault by the throne unlocks.
Collect none and the boss fight is simply harder — never impossible. The run gains a *spine of intent*
that the player carries the whole way down.

**The diegetic principle: the best puzzle *is* the boss approach.** A generic lever in a generic room
is filler. A lever that **drains the water flooding Mother Silk's chamber**, or **opens the Rat King's
throne-room gate**, is the same object as the climax — the puzzle and the boss are one. This makes
puzzles *narratively load-bearing* instead of busywork, and it plugs straight into the **boss motif**
(`run-architecture.md`) and **The Logical Place** floor shape: the Rat King's fortress *has* a barred
throne room because it is a fortress; draining the Adder's cold cistern *is* how you reach her. The
objective and the foreshadowing and the architecture become a single coherent thing.

The Keystone is how a run stops being three floors in a row and becomes one descent with a shape.

---

## Errands — NPC Quests In-Run

The manager's second thread: **NPCs that set quests within a run** — little sub-objectives, with a
reward on completion that helps in-run or adds to meta rewards, and a questgiver you might later meet as
a camp visitor. I'll call these **Errands**, to keep them light — they are favours and opportunities,
not a quest log.

**Opportunistic, never a chore.** An Errand overlays the route the player would take anyway, or points
at a spur they can *choose*. Good Errand shapes:

- *"Carry this to my cousin deeper in."* — a deliver-forward errand; completed by continuing, not
  doubling back.
- *"There's a beast in the east hall I daren't pass. Deal with it."* — converts an existing enemy room
  into a rewarded objective.
- *"Bring me a [item type] if you find one."* — opportunistic; completed only if the run naturally
  yields it, never demanding a hunt.

Bad Errand shapes (explicitly out): fetch-three-widgets checklists, anything that sends Pip wandering
off the floor's natural flow, anything that forces backtracking against the Stirs.

**Reward types — both, split by stakes.** Most Errands pay **in-run** (immediate and tight): a buff, a
consumable, a free die tweak, a shortcut opened, a hint about the boss. A few notable Errands pay
**meta** (scraps, a Mark, an advanced relationship) — but to avoid the return-trip problem, the meta
payout is **collected at camp**, not at the giver. This decoupling is a feature, not a workaround: it
is exactly how the relationship loop below works.

**Resolution without backtracking.** Three patterns, in order of preference: (1) **deliver forward** —
the giver, or their reward, is ahead toward the exit; (2) **complete in place** — the reward is granted
the moment the objective is met, no return needed; (3) **collect at camp** — the payout waits for the
next camp visit. Avoid "return to where you started."

**Graceful failure.** Die, skip, or fail an Errand and there is **no penalty** — the favour simply
went undone. The NPC doesn't show up grateful later; that absence is the only consequence. Errands are
upside-only opportunities, never obligations that punish.

---

## The Relationship Loop — Errand → Visitor

This is where the manager's two halves click together, and it is the part I'm most excited about.

`meta-progression.md` already defines a **visitor system** (feature 051): procedurally generated
visitors arrive at camp between runs, assembled from a *type* × *condition* × *offer*, with a
**relationship counter** that turns recurring visitors into named regulars — "Hades-style story
texture without authored dialogue." `biomes.md` already uses an in-run encounter to set a meta-layer
flag (a biome-unlock visitor becomes eligible after a Mark).

**Errands reuse exactly that machinery.** When Pip completes an Errand for an NPC, it sets a flag that
makes *that NPC* eligible — and heavily weighted — to appear at camp as a **visitor** in the next run
or two. The field mouse you escorted to safety on floor 2 is, two runs later, sitting on the stool by
the fire with a gift and a "you again." The questgiver is the **thread between the run layer and the
meta layer.**

This delivers the thing the manager is reaching for — *"you could meet them as a visitor later"* — with
**no new system and no authored dialogue.** It is the visitor relationship counter, seeded by an in-run
event instead of by repeat camp visits. The loop:

```
  In-run Errand completed  →  NPC flagged eligible  →  appears as a camp Visitor
        ↑                                                        │
        └──────────  offers a better Errand / reward next run  ←─┘
```

Each turn of the loop deepens the relationship counter, so the NPC's offers improve over time — a warm,
emergent acquaintance built entirely from flags and weights. It is the single highest-value idea in
this document because it costs the least (it is mostly wiring two existing systems together) and
returns the most (genuine cross-run continuity, the emotional texture the meta layer is reaching for).

---

## What Ships When

Honouring the manager's "not for soon, apart from the simple locked door":

| Tier | Buildable | Notes |
|---|---|---|
| **Gates & Keys (Tier 1)** | **Near-term** | Reuses the locked/trapped Chest machinery (026/048). Start with a locked door guarding a spur. |
| **Errands (in-run reward only)** | **After the NPC encounter (028)** | The in-run favour loop, paying immediate rewards. No meta wiring yet. |
| **Errand → Visitor loop** | **After the Visitor System (051)** | The cross-run relationship payoff; wiring, not new systems. |
| **Switches & Linked State (Tier 2)** | **Later** | Needs the map-state/iconography/feedback layer; meaningful design and UI work. |
| **The Keystone (run-spanning)** | **Later** | Needs cross-floor objective state; pairs with the boss motif. |
| **Floor Mutation (Tier 3)** | **Horizon** | Floor-as-state-machine; a biome/boss signature, not a generic feature. |

The recommendation to the Designer: spec **Tier-1 Gates** and **in-run Errands** as discrete near-term
items; document the rest as direction so the authored-floor architecture is built without foreclosing
them.

---

## Open Questions for the Designer

- **Does a locked door reuse the Chest's check UI, or get its own?** Likely reuse, framed as a
  navigation gate rather than an encounter panel — but the interaction surface (where the check is
  presented) needs a decision.
- **How is a found key carried and represented?** Pip's Satchel (016) holds items; is a key an item, a
  separate token, or a per-floor flag? Per-floor flag is simplest and avoids inventory clutter.
- **Lever-state persistence across floor re-entry / save.** If the player leaves and returns, or the
  game is saved mid-floor, linked state must survive. This shapes the floor state model in
  `run-architecture.md`.
- **How many Errands per run feels right?** Too many and the run is a quest hub; too few and the system
  is invisible. Probably 0–1 per run, occasionally 2. Weighted by NPC presence on the floor.
- **Does a failed/skipped Errand ever have a downside?** The recommendation is no — upside-only. Confirm
  this holds even for "deliver this" errands where the player keeps the thing (it should: the item is
  just unspent).
- **Keystone visibility.** If a run-spanning objective exists, how does the player *know*? A subtle
  notice-board hint (053) at run start, or an NPC who tells them, avoids the "I didn't know I was
  supposed to collect those" frustration.

---

*Related:*
- `docs/concept/run-architecture.md` — the branching authored-procedural floor that makes gates,
  keys, levers, and cross-room objectives possible; the Dungeon Stirs (the clock puzzles play against);
  the boss motif and The Logical Place (which the Keystone and diegetic puzzles plug into)
- `docs/concept/meta-progression.md` — the visitor system and relationship counters that the Errand →
  Visitor loop reuses
- `docs/concept/biomes.md` — the in-run-encounter-sets-a-meta-flag pattern the Errand loop mirrors;
  the Ancient Halls (water levels) as the natural home for floor mutation
- `docs/concept/tiles-and-props.md` — the snapping invariant that every gate, lever, and rotated room
  must obey; the Squeeze archetype as Pip's smallness made traversable
- `docs/concept/enemies-and-bosses.md` — enemies that guard keys and become Errand targets
- `docs/concept/dice-checks.md` — the unified check model that the Gates & Keys "dice-check key"
  and Errand-resolution checks are instances of; the pay-in-pips/risk/time discipline shared here
- `IDEAS.md` — discrete ideas seeded from this document (064–069)