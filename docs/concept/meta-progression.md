# Meta-Progression — Concept Direction

> *A mouse who survives learns. The dungeon remembers.*

This document sets the design direction for **Pip & Peril's meta-progression layer**: what carries
between runs, how the player grows, what they do in the time between descents, and how that
activity is presented as a screen flow. It is concept material — the Designer turns the individual
pieces into backlog items.

The die-type risk profiles are established in `docs/concept/combat-system.md`. The weapon-as-
run-bridge is introduced in `docs/concept/in-run-items.md`. This document builds on both and adds
the full shape: the currency, the hub, the procedural between-runs layer, and the screen flow.

---

## A Challenge First

The manager's instinct — "change your dice pool (switch dice for different face counts, add dice)"
— is correct. But there's a risk: **dice upgrades are a mathematical transaction, not a story.**
"Swap d6 for d8" is an optimisation a spreadsheet could make. A meta-progression hub built purely
on number-tweaking becomes a skill tree with the feeling stripped out.

What prevents this is twofold:

1. **The dice must feel like objects Pip owns, not stats he adjusts.** When Pip engraves a face on
   a die, that is a decision he made about *that specific die*. The upgrade screen should feel like
   Pip at his workbench, not a MOBA skill screen. The direction: physical, warm, tactile. A die
   Pip has tinkered with feels different from one he picked up fresh.

2. **The weapons system provides the narrative skin the dice system lacks.** A weapon is not a
   dice modifier with flavour text; it is the run's *character*. Choosing a weapon is the
   decision that makes you feel the run before it starts. The dice optimisation happens at the
   bench; the identity decision happens at the weapon rack.

The upgrade system and the weapons system serve different player needs. The upgrade system
satisfies the player who wants to tinker and optimise. The weapons system satisfies the player
who wants to feel something about who Pip is right now. Both must be present; neither alone is
enough.

---

## The Currency: Shiny Scraps and Marks of Descent

Meta-progression runs on two tracks, at different paces.

### Shiny Scraps

The primary currency. Earned throughout every run — from enemy kills, chests, shops, boss
rewards, and floor-clear bonuses. Pip carries them in a small worn pouch at his belt; they
are the literal treasure of a mouse's hoard.

Scraps are spent at the workbench: die swaps, die additions, engravings. They flow in and out
easily. A run that goes deep earns substantially more than a run that ends on floor 1. The
spending decisions are frequent and low-stakes — players should spend scraps without agonising.

The scraps economy should be calibrated so that a player who runs consistently can afford one
meaningful dice upgrade roughly every two or three runs. This keeps the progression tangible
without feeling stalled.

### Marks of Descent

Milestone tokens earned from specific firsts and achievements. Not a second grind currency —
a recognition system. Marks are awarded for:

- **Reach a new depth**: first time reaching floor 2, floor 3
- **Boss kills**: first kill of a specific boss; first kill of any boss
- **Run conditions**: first full run without using any healing item; first run with three or
  more different enemy types defeated; first run using only the Whisker Staff
- **Combat achievements**: first time landing a killing blow while Rattled; first time
  surviving a Lunge with exactly 1 HP remaining

Marks are tracked on a parchment in the camp (the "Descent Record"). Each Mark unlocks
something specific: a new weapon becomes available at the rack, a skill scroll appears on the
wall, a new visitor type can now show up. **Marks do not buy power — they expand the menu.**

The distinction matters. A player who grinds scraps gets incrementally stronger dice. A player
who achieves something earns new *choices* — new weapons, new skills, new options. Marks
prevent the meta from becoming a pure optimisation tunnel: you cannot unlock the Paired Daggers
just by farming gold; you have to have done something.

Marks should be discoverable but not advertised. A player who hasn't earned a Mark doesn't
know exactly what it unlocks — they see a locked slot on the weapon rack or a rolled scroll
they can't open yet. The curiosity is itself a pull. Players who check what they've unlocked
after a notable run will find the system; players who don't are not punished.

---

## What the Player Upgrades

### The Dice Pool

The workbench is where Pip modifies his permanent pool — the dice he takes into every run
before the weapon contributes its addition.

Three operations, each with a cost in scraps:

**Swap:** Replace a die with a larger die type. A d6 Red becomes a d8 Red. The ceiling rises;
the variance rises too. The player is not just picking "bigger is better" — they are choosing
a risk profile. This is established in `combat-system.md` and is the mechanical heart of the
system. See the die-type profiles there.

**Add:** Add a new die to the pool. The pool grows by one. This is the highest-impact upgrade
early in the meta arc — going from 3 dice to 4 changes the range of available actions
fundamentally. Adding dice is more expensive than swapping them. Early additions are the ones
that feel most transformative.

**Engrave:** Permanently fix one face of a specific die to a chosen value. A d8 with its "1"
face engraved to "4" is a calmer die — it still reaches 8, but it never bottoms out as badly.
Engraving is cheap in scraps but requires owning a die worth engraving. The upgrade is
invisible during most rolls and pays off quietly at the worst moments.

**The flavour layer, per colour:**

🔴 **Red — Force — Arms and Training.** Upgrading Red dice represents Pip's physical training
and weapon mastery. The workbench for Red upgrades might show a small whetstone, worn wraps,
a training dummy in the corner. The flavour line for a d6→d8 Red upgrade: *"More power, more
risk. Pip grips his weapon tighter."* Engraving a Red die: *"One outcome, sharpened to a
reliable edge."*

🟢 **Green — Speed — Conditioning and Gear.** Upgrading Green dice is about becoming quicker,
lighter, more agile. It's physical conditioning — Pip running circuits through tunnels, learning
to roll with hits. The flavour line for adding a second Green die: *"Pip's footwork is something
else now."* Green upgrades are the most quietly defensive thing the player can do; they should
feel like preparation rather than power.

🔵 **Blue — Mind — Scholarship and Cunning.** Blue starts absent. Unlocking the first Blue die
is the meta-progression's largest single threshold moment — it opens an entirely new mode of
play. The framing: Pip found a tattered tactical manual in the dungeon once and actually read
it. Now he thinks differently. Blue upgrades are tomes, scrolls, lessons from NPCs. Adding a
second Blue die: *"Pip has started seeing the fight two turns ahead."* Blue should feel like
it makes Pip *smarter*, not stronger.

🟡 **Yellow — Fortune — The Charm Collection.** Yellow upgrades are superstition made tangible.
Each Yellow die addition or upgrade represents a lucky object Pip has added to his collection —
a charm, a token, a coin from a specific run. A small charm board in the camp displays them:
physical objects with stories attached. The d4→d6 Yellow upgrade: *"Whatever Pip found on that
run, it stuck."* Yellow is the most personal colour; its meta expression should feel like a
record of where Pip has been.

---

### The Weapons Rack

**The weapon is the bridge between the meta layer and the run.** It is chosen before each
descent and persists for the full run. It modifies the Red dice pool and redefines the primary
Strike action. Choosing a weapon is the moment where meta-optimisation becomes run identity.

The four starting weapons (established in `combat-system.md`) are always available:

| Weapon | Red dice added | Strike cost | Character |
|---|---|---|---|
| Dagger | +2d4 | 1R | Fast, numerous strikes. Low ceiling, high frequency. |
| Shortsword | +1d6 | 2R | The default. Reliable, learnable, forgiving. |
| Broadsword | +1d8 | 3R | Heavy, slow. Fewer swings, each one weighted. |
| Whisker Staff | None (+1d4B, +1d4B) | N/A | No extra Red at all. Intelligence-first. Pays off only when Blue is available. |

**Unlocking more weapons:** New weapons are found, not bought. They arrive as:
- Boss kill rewards (the most consistent gate — defeating a specific boss drops a weapon with
  a connection to that creature)
- Marks of Descent (specific achievements unlock a weapon on the rack)
- Occasional NPC gifts (a swordsmith visited in a run, helped sufficiently, leaves a weapon
  at the camp)

This means the weapon rack grows slowly and *meaningfully*. Finding a new weapon is an event,
not a transaction. The player develops attachment to specific weapons — the broadsword that
carried a run, the staff that worked against a boss — and that attachment is the meta-
progression's emotional texture.

**What makes a weapon interesting beyond its dice profile:**

The current four weapons map cleanly to dice profiles. Future weapons should include some that
do something *unexpected* — not just different dice, but different behaviour:

- A **shortbow** that adds Yellow dice instead of Red (ranged attacks that bypass some Guard —
  distance as a mechanic for a mouse)
- **Paired Daggers** that unlock a dual-strike action (two low-damage hits per spend) — a
  Red action variant unlocked by weapon choice, not meta skill
- A **rusted sword** (found in a run, cursed, cheap to use) that has better Red dice but
  causes Rattled on a miss — a burden item at the weapon layer
- A **carved staff** that unlocks a Purple die before Purple is otherwise available in the
  meta — an early taste of the colour, with all the instability that implies

The principle: the most interesting weapons change what *decisions* are interesting, not just
what numbers are available. A weapon that adds two d4s to Red asks a different question than
one that adds one d10. A weapon that brings a colour you don't normally have asks an entirely
different question.

**The weapon selection screen** is the last decision before Pip descends. It must show:
- Each available weapon's dice contribution (visually — not just as text)
- A live **pool preview**: the complete dice pool Pip will take in, with the weapon's addition
  included
- A brief flavour line per weapon (provenance, character)
- Locked weapons visible but greyed, with unlock condition shown

The pool preview is the hero element of this screen. The player should be able to see exactly
what they're bringing before they commit.

---

### Skills

Skills are one-time unlocks that change what decisions are interesting in combat — not just
bigger numbers. The skill library is established in `docs/concept/combat-system.md` with
examples including *Counter-Strike*, *Careful Eye*, *Desperate Swing*, *Battle Cry*, *Stout
Heart*.

The meta-framework for skills:

**Unlock method:** Skills arrive through Marks of Descent and occasional NPC gifts. They are
not bought with scraps. Each skill is a scroll on the wall of the camp — rolled up, sealed with
wax. A new scroll appears when earned.

**Active vs passive:** Some skills are always active once unlocked. Others require the player
to choose a loadout (e.g. "pick 2 active skills before each run") — the loadout cap ensures
the player cannot stack every skill and turn early floors into trivia. The loadout pick happens
at camp before descending, alongside weapon selection.

**Skill slots:** As a starting point: 1 active skill slot from the beginning; 2 slots from
around run 5–6. This grows slowly — perhaps a third slot unlocked by a deep Mark. Having a
cap forces real choices rather than skill accumulation.

**What skills should NOT do:** Add flat damage, flat HP, or raw pip bonuses. Skills should
unlock interactions and strategies that don't exist without them. *Counter-Strike* turns a dodge
into an attack opportunity. *Desperate Swing* reframes a bad fight state as a strategic posture.
These are not "+5% damage" — they are new ways to play.

---

### Unlocking New Colours

Adding a new colour to the permanent meta pool is the most significant single upgrade in the
system. It should be treated as a threshold moment.

**Blue** is the primary unlock. The first Blue die does not arrive through scraps — it arrives
through a Mark: first time reaching floor 2, perhaps, or first time successfully resolving an
NPC skill check mid-run. When it unlocks, a brief camp-screen moment acknowledges it — Pip
finds the die, or a tattered scroll teaches him what it means. The visual: a d4 Blue appears
on the workbench.

Blue can be upgraded (d4→d6) with scraps once it's in the pool. The first Blue die is the
gate; subsequent Blue progression is normal workbench work.

**Yellow** starts in the pool and is upgradeable from the beginning. It is not a threshold.

**Purple** is future expansion. It should not be planned until the base four colours are
stable and fully expressed. When it arrives, it will need its own unlock arc.

---

### What Stays Out of Meta-Progression

The manager is correct: **multipliers and large changes belong in-run, not in meta.** The meta
layer should never trivialise the dungeon for a well-upgraded player.

Things that should never be in meta-progression:
- Permanent damage multipliers of any kind
- Starting HP bonuses (Pip always starts a run at full, unmodified HP)
- Pip-specific immunities (cannot be poisoned, always dodge first hit)
- In-run item guarantees ("always have a healing item at run start")
- Anything that makes floor 1 feel like a formality

The dungeon's run-depth window (from `combat-system.md`) handles the other side: as the meta
arc grows, enemy intent complexity increases and tier-3 encounters appear earlier. A fully
upgraded pool running against a late-meta dungeon is not trivially easier than run 1 — it is
differently challenging.

The feeling a well-upgraded Pip should have: more tools available, more options per turn, more
depth in every combat decision — but never certainty that any given fight is already won.

---

## The Hub: Pip's Camp

Between runs, Pip is at his camp — a small, cosy mouse-hole carved from the stone near the
dungeon mouth. The camp is the between-runs state: where upgrades happen, where visitors
arrive, where the next descent is decided.

**Temperature:** Cool. Warm parchment tones, aged wood, candlelight. The dungeon entrance
is visible through a small arched opening in the background — dark stone, a faint flicker
beyond. The camp says: *you are safe here, for now.*

**The physical objects in the space:**

- **The Workbench** (lower area) — a small wooden bench with Pip's dice laid out. Tapping
  it opens the dice upgrade sub-screen. The scraps pouch is visible on the bench.
- **The Weapon Rack** (right wall) — wooden pegs holding Pip's collected weapons. Tapping
  opens weapon selection.
- **The Scroll Wall** (upper area) — rolled parchments pinned to stone, each a skill. Locked
  scrolls have wax seals. Tapping opens the skill loadout screen.
- **The Charm Board** (near workbench) — a small corkboard with Pip's lucky charms. Tapping
  opens the Yellow charm collection (later feature — for now, decorative).
- **The Descent Record** (a pinned parchment) — Pip's Marks of Descent. Shows completed
  Marks and locked slots. Tapping it shows what Marks are possible (not what they unlock —
  that is discovered).
- **The Dungeon Notice Board** (by the arched opening) — see below.
- **Visitor area** (a small stool or mat, near the entrance) — when a visitor is present,
  they sit here. Tapping them opens the visitor interaction panel.

The camp is a **single screen**, not a navigable space. Each object is a tap target that opens
a sub-screen or panel. The player does not walk around the camp — that would make the between-
runs phase feel heavier than it should. The objects are *present* (the player sees the weapon
rack and knows what it is) but navigation is by tap, not movement.

**A CTA button at the bottom**: "Descend" (or "Into the Dark" for flavour). This is always
visible. The player can skip every camp activity and descend immediately. The camp should never
feel like a mandatory gauntlet of menus.

---

## The Visitor System

Between runs, 0–2 visitors arrive at the camp. Rarely 3. Sometimes none. The absence of
visitors is itself a moment — Pip is alone with the dungeon breathing at his back.

Visitors are **procedurally generated** from three layers:

**Type:** defines the visitor's function and offer pool. Starting types:

| Type | What they offer |
|---|---|
| **The Tinker** | A one-run-only free die modification — a preview taste of an upgrade Pip hasn't afforded yet |
| **The Scout** | Information about the upcoming run (floor bias, boss hint, item density) — sold for a small scraps fee |
| **The Scholar** | Teaches a skill cheaply (but only if Pip has an available scroll slot unlocked) or shares lore about an upcoming enemy |
| **The Trader** | Unusual scraps exchange offers (more scraps for an in-run item Pip found last run; a bulk deal) |
| **The Wounded Traveller** | Needs help; helping costs small scraps but earns the visitor's gratitude — builds relationship track |
| **The Trickster** | Offers great deals with hidden costs; experienced players recognise the type but still sometimes take the bait |

**Condition:** flavours the visitor's situation with a randomly selected line. Examples: "breathless and damp," "carrying a bundle of stolen goods," "asleep at your door when you return," "eyeing the dungeon entrance nervously," "selling something that shouldn't be here." The condition is flavour only — it does not affect the offer — but it makes every visitor feel situational.

**Offer:** drawn from the type's pool. The interaction is presented as the visitor panel:

```
┌─────────────────────────┐
│  [Camp view above]      │  ← visitor visible sitting at the stool
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ [Portrait]  Name, type  │
│ "Situational blurb —    │
│  one or two lines."     │
│                         │
│  [Accept]  [Counter]    │
│  [Send Away]            │
└─────────────────────────┘
```

The entire interaction is one tap-and-confirm. No visitor interaction should take more than
10 seconds. The camp is a breath between runs — a visitor who asks for a complex decision is
overstaying their welcome.

**Relationship tracks and regulars.** After visiting a certain number of times, some visitors
become *regulars* — they gain a name, a slightly more distinctive portrait, and incrementally
better offers. The Scholar who visits five times becomes "Bramble, the Curious Mouse" with a
warm greeting and cheaper lessons. The Tinker who's been here eight times remembers what Pip
likes and offers targeted die tweaks.

This is mechanically driven: each interaction increments the relationship counter; the counter
unlocks labels and offer quality. No dialogue writing required — just a name, a tone flag, and
a relationship tier. It produces the *feeling* of Hades-style story interactions (a face you
recognise, a relationship you've built) through pure procedure.

The starting pool of potential regulars: 3–5 named types, enough to feel like a community
without requiring a writer. Each is distinct enough that a player who sees the same face twice
registers it as a return visit, not a repeat.

---

## The Dungeon Notice Board

A small second procedural element in the camp: a rough notice board by the dungeon entrance.
Before each run, 2 notices are generated and pinned. They are information, not choices.

Notices are assembled from templates weighted by game state:

| Notice type | Example | What it signals |
|---|---|---|
| Enemy report | "Weasel activity heaviest in upper passages." | Enemy tier weighting hint |
| Merchant sighting | "A stout badger was seen heading down yesterday." | A shop is more likely on floor 1 or 2 |
| Atmosphere / weather | "The deep smells wrong tonight." | A special boss state, a cursed floor variant |
| Past-run echo | "Someone left a scrawled map near the third landing." | A knowledge item is available |
| Challenge | "A passing hunter bet you couldn't clear all three floors without healing." | A self-imposed run challenge seed |

Notices change every run. They are not guarantees — they are hints. A player who uses them
plays with better information; a player who ignores them loses nothing. Crucially, they make
each run feel distinct before the first tile is placed. "The deep smells wrong tonight" primes
a different state of mind than "A merchant was seen heading down."

Notices do not require implementation of the underlying systems they reference — they can
exist as flavour text first and be wired up as actual game signals later. Their value is in
the run-priming effect; the mechanical hook is a bonus.

---

## Screen Flow — The Next Iteration

This is the full between-runs screen architecture. It is presented as a flow, with each
screen's temperature and design direction noted.

```
Title Screen (first session)
│
│ "Begin" ───────────────────────────────────────────→ Camp Screen
│
│ "Continue" (subsequent sessions, run in progress)
│         └──────────────────────────────────────────→ Resume mid-run
│
│ (After every completed run, the loop goes Camp → Run → Summary → Camp)
```

### 1. Title Screen

*Already sketched in `screen-layout-and-transitions.md`.* Cool temperature. Pip at the dungeon
mouth. "Begin" the first time; "Return to Camp" or "Continue" thereafter. On a first session,
"Begin" goes directly to a brief intro beat and then Camp. No tutorial screen — the camp
teaches itself by existing.

---

### 2. Camp Screen

Cool temperature. The hub between runs.

**Entry:** After run summary, the screen pushes left (retreat gesture) and the camp slides in.
**Exit:** Tapping "Descend" → weapon selection (if multiple weapons available) or direct run
start.

Layout:

```
┌─────────────────────────┐
│  [Descent Record  ···]  │  ← pinned parchment, Marks visible — top right, compact
├─────────────────────────┤
│                         │
│  [Scroll Wall — skills] │  ← upper area; rolled scrolls on stone
│                         │
│  [Weapon Rack]          │  ← right wall; weapons on pegs
│                         │
│  [Charm Board] [Bench]  │  ← lower area; bench is the hero for dice
│   [Notice Board]        │
│                         │
│  [Visitor, if present]  │  ← lower centre, on a small stool
│                         │
└────────[Descend]────────┘  ← always visible at bottom
```

The camp should feel **alive without being busy.** A candle flickers. The dungeon breathes
beyond the arch. Pip is small at the bench. If a visitor is present, they sit quietly until
tapped. Everything waits for the player.

---

### 3. Dice Upgrade Screen (sub-screen of Camp)

Panel rises from bottom. Cool temperature.

Hero element: the physical dice on the workbench, rendered as tappable objects.

- Top: scraps count
- Middle: current dice pool, each die tappable
- Tapping a die opens inline upgrade options (swap cost, engrave cost, current stats)
- "Add Die" CTA shows available colours and costs
- "Done" descends the panel

The player should be able to upgrade a die in three taps: tap the die, tap the upgrade,
confirm. No nested menus. The screen is not the destination; the upgraded pool is.

---

### 4. Weapon Selection Screen (sub-screen of Camp)

Panel rises from bottom, or screen pushes right (going to the rack). Cool-to-warm temperature
(the weapons feel alive in a way the dice bench does not).

Hero element: the **pool preview** — the complete dice pool the player will descend with,
updated live as they tap weapons.

- Each weapon shown as a card with: name, flavour line (one short sentence), dice added,
  Strike action
- Locked weapons visible, greyed, with unlock condition shown
- Pool preview at the bottom: the full combined pool (meta dice + weapon dice) displayed as
  die objects
- "Descend with [Weapon]" CTA

This is the last major decision before a run. It should feel momentous — not slow, but *felt*.

---

### 5. Skills Screen (sub-screen of Camp)

Panel rises from bottom. Cool temperature.

Hero element: the scroll wall — unlocked scrolls have open seals, locked scrolls are closed.

- Unlocked skills shown as card stubs: name, short effect line, active/inactive toggle
- Active skill slots shown at the top (the ones going in this run)
- Drag-or-tap to fill skill slots from unlocked pool
- Locked scrolls show their seal (no content — earned by achievement, not previewed)

Keep this screen simple. A player with 3 unlocked skills and 2 slots makes a quick choice.
Do not surface skill trees, upgrade chains, or comparisons between locked skills. The screen
should take 20 seconds for a returning player.

---

### 6. Visitor Interaction Panel

Rises from the bottom of the camp screen. Warm temperature. Same structural gesture as
dungeon encounter panels — consistent, familiar.

The visitor is visible in the camp view above the panel edge (same "portrait straddling the
edge" motif from NPC encounters in the dungeon). Interaction is: read blurb, pick option,
confirm, panel descends. No back-and-forth. Visitors do not negotiate.

---

### 7. Run Start

The transition from camp to dungeon should feel like crossing a threshold.

1. The camp view fades to black (slow, deliberate — the dungeon temperature shift)
2. A floor title card appears: *"Floor 1 — The Upper Dark"* (or equivalent)
3. Atmospheric flavour line: one sentence seeded from the notice board or the run's
   generated parameters
4. The dungeon map renders. Run begins.

The title card is the line between safe and unsafe. After it, the tone is hot.

---

### 8. Floor Transition Screen

*Already sketched in `screen-layout-and-transitions.md`.* Brief. Pip descends stairs.
A flavour line about the floor below. Temperature starts cool and tips hotter the deeper
the floor. 2–3 seconds. No skip button — but short enough it doesn't need one.

---

### 9. Run Summary Screen

*Already in backlog as item 024.* Very cool temperature. The dungeon sketch hero element.
Scraps awarded with a count-up animation. New Marks earned (if any) revealed here —
a small ceremony before the return.

CTA: "Return to Camp" — pushes right (retreat gesture, back to base). The camp screen
slides in from the right. The loop closes.

---

## Threads to Explore

These are directions this document opens but does not resolve. They are questions for
the Thinker, Designer, or manager in future sessions.

**1. The Weapons Discovery Arc.** The current four weapons are a starting set. The
question of *what comes next* — and what boss kills or Marks unlock them — shapes the
entire mid-game. Designing 6–8 more weapons with distinct identities and unlock conditions
is a rich Thinker session in its own right. The most interesting space: weapons that
introduce a colour you don't normally have, or weapons with explicit downsides.

**2. Named Dice.** A direction this document gestures at but does not commit to: giving
Pip's individual dice personal names or histories. *"The Red d6 Pip found near a rusted
blade."* This would make each die feel like a possession rather than a stat, and would
make engraving feel like a deeper decision. Risk: complexity on the workbench screen;
benefit: significant emotional texture. Worth exploring as a Thinker thread before
speccing.

**3. The Camp Expanding.** The camp as described is a single carved room. It could grow —
new chambers discovered rather than built. A "Scholar's Alcove" that appears after the
Scholar visits enough times. A "Weapon Storage" that appears after Pip collects three
weapons. The expansion is discovered, not unlocked by currency. This is the "BallXpit
city builder" direction in miniature: the camp's physical space as a record of Pip's
growth. Deferrable, but worth sketching.

**4. Cross-Run Dungeon Memory.** The combat-system doc establishes that the dungeon's
intent complexity window rises across runs. This could go further: the dungeon *remembers*
specific things Pip has done. A boss he defeated might appear differently on a later run
(weaker but more cautious; its minions carry its tactics). NPCs in the dungeon reference
past descents. The dungeon is not just harder — it is *aware*. This is a narrative-without-
writing direction: procedurally generated dungeon responses to Pip's history, not scripted
dialogue. High design ambition; leave for a Thinker session after the meta loop is stable.

**5. The Scraps Economy Balance.** The calibration of how many scraps fall per run and
how much upgrades cost is entirely unspecified here. This will need careful playtesting.
The risk: if scraps flow too fast, the pool feels built-out in 5 runs and the rest of the
meta is vacuous; if too slow, early runs feel stalled. The Marks system provides a parallel
unlock path that avoids pure grind — but the scraps rate still needs a Designer estimate
based on expected run length and floor depth distribution.

**6. Purple and the Magic Archetype.** Purple is reserved. But it has been reserved long
enough that it is worth a Thinker session on what it actually *is*. The `combat-system.md`
sketches a charge-accumulation mechanic. That is a direction, not a decision. What does a
magic-focused run *feel like*? How does Purple interact with the weapon system? Is there
a weapon that introduces Purple the way the Whisker Staff introduces Blue? This is the
biggest unexplored design territory in the game.

**7. Visual Design of the Camp.** The camp as described needs art direction. The palette
is warm — parchment, amber, candlelight. But the specific objects (the workbench, the
weapon rack, the scroll wall) need to feel like a mouse's home, not a generic RPG hub.
Constraints: it must read on a phone screen; the die objects on the workbench must be
tappable at phone thumb scale; the dungeon entrance in the background must be distinct
from the camp's warmth without dominating. This is a session for when the art direction
question (D8) is extended to out-of-dungeon screens.

---

*Related:*
- `docs/concept/overview.md` — meta-progression overview; the die-type upgrade list there is
  the starting point this document expands
- `docs/concept/combat-system.md` — die-type risk profiles, starting pool, meta skills, and
  the run-depth window that keeps the meta challenging
- `docs/concept/in-run-items.md` — the two-layer philosophy; the weapon-as-bridge model
- `docs/concept/screen-layout-and-transitions.md` — UI principles, temperatures, transitions;
  the camp and all its sub-screens should follow the principles established there
- `IDEAS.md` — Idea 050 (Named Dice) seeded from this document; backlog items 051, 052, 053 also originated here
