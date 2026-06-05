# Combat System — Design Direction

> *Every turn is a question: hit harder, or take less?*

This document sets the design direction for **Pip & Peril's combat system** — the moment-to-moment
rules of a fight, the emotional shape of escalation across a run, and the pathways through which
items and meta-progression make combat richer without making it noisier. It replaces and supersedes
any combat thinking in `docs/concept/overview.md`.

The enemy roster and boss roster are addressed in `docs/concept/enemies-and-bosses.md`; this
document focuses on the structural mechanics that enemies and items plug into.

---

## The Problem With the Current System

Right now: Pip rolls all dice, spends all pips, takes damage, next turn. The problem is not that it
is too simple — it is that there is **nothing to save pips for**. Spending everything every turn
costs nothing strategically. The only decision is which buttons to press, not *whether* to press
them.

The fix is not to add more actions — it is to create **genuine opportunity cost** in every turn.
The strategic spine of combat must be a single, unavoidable question:

> *Do I spend pips on offence, or hold them for defence?*

Everything else in this document is either **how that question is set up** (enemy intents, turn
structure) or **what happens around it** (items, emotional states, escalation). The binary is the
whole game.

---

## The Central Mechanic: Active Defence

**Defence is not passive.** Pip does not automatically absorb or mitigate damage when an enemy
attacks. If Pip spends no Green pips on his turn, he takes the enemy's full damage. Period.

Green pips reserved during Pip's turn act as a damage shield when the enemy acts:

- Each **2 Green pips reserved** fully cancels one enemy hit (a clean dodge)
- Or each **1 Green pip reserved** reduces incoming damage by 1 (partial mitigation, less
  efficient — spending imprecise Green to blunt rather than evade)

The player must consciously *not* spend those Green pips on offence to get this benefit. That
trade — attack now vs. survive the incoming hit — is the turn's primary decision.

This design choice has three implications:

1. **Enemies must telegraph their attack** — otherwise there is no information to make a decision
   with (see Enemy Intents below).
2. **Green becomes the defence colour** — not just an action to take, but a *reserve posture* for
   the whole turn.
3. **A turn where Pip does not dodge is a valid strategy** — if the enemy's attack is small and
   Pip can afford to absorb it and hit harder, that is correct play. The system does not punish
   aggression; it charges it.

---

## Enemy Intents

Before Pip rolls, the enemy reveals what they will do this turn — a single **intent icon with a
value**. The player rolls and allocates pips with this information in hand.

Intent examples (the Designer will define per-enemy sets):

| Icon | Intent | Effect |
|---|---|---|
| ⚔️ **Attack** | Deals *N* damage to Pip | Can be dodged with reserved Green |
| 🛡️ **Guard** | Enemy gains *N* damage block before their next hit received | Forces heavier Red spending or a Feint |
| 💢 **Empower** | Next turn's attack is doubled (shown now, fires later) | Pip may decide to kill before it triggers |
| 😴 **Recover** | Enemy heals *N* HP | Turn to maximise offence, not defend |
| 🕸️ **Status** | Applies a debuff on hit (slow, poison, stun) | Dodge or remove before it lands |
| ☠️ **Lunge** | A high-damage attack — more than Pip's full Green can absorb | Survive by racing to kill first |

The intent is revealed at the *start of Pip's turn* — before the roll. The intent is the context;
the roll is the resource. The decision is: what can I do with these pips, given what is coming?

**Two-turn telegraphs.** At Blue spending level (see below), Pip can reveal not just the current
intent but the *next* one as well — planning two turns ahead. This rewards a Blue-heavy build and
creates a meaningful escalation in information access across the run.

**Boss intent patterns.** Bosses have a fixed, learnable cycle rather than procedurally generated
intents. A 3–4 intent loop that the player decodes over the course of the fight. At the Enrage
threshold, the cycle accelerates or an additional intent is injected. This gives bosses the feel
of a puzzle that rewards pattern recognition — something you can get better at.

---

## Turn Structure

One full combat round:

### Pip's Turn

1. **Intent revealed** — the enemy's current intent is visible at the top of the combat panel.

2. **Roll** — Pip rolls all active dice. All face values are shown.

3. **Allocate and spend** — Pip distributes pips across:
   - **Offence actions** — Strike, Special Actions (pips consumed now)
   - **Defence reserve** — Green pips held; they do not produce an action but will fire on the
     enemy's turn automatically
   - **Blue actions** — intelligence-based interventions (see colour roles)
   - **Items** — dice-manipulation items are usable in this phase (Lock Pin, Pip Splitter, etc.)

4. **Offence resolves** — attack actions fire; enemy HP decreases; coatings apply to the strike.

5. **Tenacity window** — if Pip spent pips this turn, Tenacity items may now grant a second
   spend sequence (see in-run-items.md).

### Enemy's Turn

6. **Intent fires** — enemy executes what they telegraphed.

7. **Defence fires** — reserved Green pips automatically reduce incoming damage.

8. **Damage lands** — any remaining damage hits Pip.

9. **Post-damage window** — healing items, the Luck interrupt if a check is involved, and
   status effect ticks.

10. **Ongoing effects** — poison ticks, guard expiry, empowered status clears or fires.

11. **Intent refresh** — enemy reveals the *next* intent. New turn begins.

---

## The Four Colours — Combat Roles

Every colour must have a clear and satisfying role in *every* combat, not just occasionally.

### 🔴 Red — Force

Pip's raw physical commitment. The primary offence colour.

| Action | Cost | Effect |
|---|---|---|
| *Strike* | 2R | Deal damage equal to weapon's attack value |
| *Heavy Strike* | 4R | Deal weapon damage +2 (more pip-efficient at scale) |
| *Shove* | 3R | Skip enemy's current intent (not a kill, but it delays their attack or Guard) |

**Design note:** Red is simple and satisfying. More Red pips = more damage. The depth comes from
the other colours complicating how much Red Pip actually has to spend.

**Meta direction:** More Red dice = more consistent attack output. Upgrading Red dice (d6→d8)
raises the attack ceiling but increases variance. A Red-heavy build dominates when the run goes
well; it suffers when rolls cluster low.

---

### 🟢 Green — Speed

Pip's agility. Both the primary defence colour and a tool for tactical surprise.

| Action | Cost | Effect |
|---|---|---|
| *Reserve (Dodge)* | Hold 2G | Negate one enemy hit completely when it arrives |
| *Partial Mitigation* | Hold 1G | Reduce incoming damage by 1 per pip (less efficient) |
| *Feint* | 2G (spend, not reserve) | Reduce enemy's current Guard value by 2 — makes them easier to hit |
| *Disengage* | 3G (spend) | Force enemy to skip *their* next attack turn; cancel their current intent |

**Design note:** Green's duality — it can be spent for active effects (Feint, Disengage) *or*
reserved for passive defence — is the core of the turn's tension. Unlike Red, which is always
consumed, Green is sometimes spent and sometimes hoarded.

**Meta direction:** More Green dice = harder to hit, more reliable defence. A Green-heavy build
survives longer but hits less consistently. Particularly valuable in late floors where enemy damage
numbers climb.

---

### 🔵 Blue — Mind

Pip's intelligence and cunning. The *meta-action* colour: actions that manipulate the state of the
fight rather than dealing damage directly.

| Action | Cost | Effect |
|---|---|---|
| *Analyse* | 2B | Reveal the enemy's *next* intent in addition to the current one |
| *Exploit* | 2B | Deal damage targeting enemy's weakness; bypasses Guard if any (requires prior Analyse) |
| *Resist* | 3B | Cancel one active status effect on Pip |
| *Identify* | 1B | Reveal enemy's remaining HP exactly (vs. the HP bar approximation) |

**Design note:** Blue is the "smart play" colour. It does not win fights alone — it makes
the other colours more efficient. The player who uses Blue well fights with better information and
makes fewer bad decisions. Blue adds a skill ceiling that does not exist in pure Red/Green play.

Blue starts absent from most beginning-of-run dice pools. When the first Blue die arrives (from a
weapon, a meta unlock, or an item), it opens a new mode of play mid-run. That discovery moment
should feel like an upgrade to Pip's capability, not just an additional button.

**Meta direction:** Blue dice are typically added (not upgraded) — a second Blue die is more
valuable than upgrading a Blue d6 to d8, because Blue actions are relatively cheap.

---

### 🟡 Yellow — Fortune

Pip's luck and spirit. Mechanically distinct from the other colours: Yellow pips are a **universal
converter** and a **fortune amplifier**, not a colour with a fixed action list.

**Conversion:** Any Yellow pip may be spent as *1 pip of any colour*, at a 2:1 rate: 2Y = 1 of
any other colour. This means Yellow is always useful, never dead — but it is never as efficient as
the colour it replaces.

**Lucky Shot:** 1Y → Deal 1 damage, bypassing Guard entirely. Luck slips through defences that
skill cannot.

**Fortune accumulation (optional):** Yellow pips spent (in any direction) add to a per-combat
*Fortune Track* (0–5). At certain thresholds:
- Fortune 2: next roll may reroll one die
- Fortune 4: enemy's next attack reduced by 1 automatically
- Fortune 5: a windfall — small item drop or bonus pip at start of next turn

The Fortune Track resets at the end of each combat. Meta-progression can let Pip start combats
with Fortune 1 already built.

**Design note:** Yellow is the "everything else" colour — it smooths out bad rolls, bridges
colour gaps, and rewards consistent luck-spending with compounding benefits. A Yellow-heavy build
is stable and forgiving; it rarely peaks as high as a Red build, but it rarely bottoms out either.

---

### 🟣 Purple — Magic (Future)

Held for expansion. Magic will represent arcane ability — actions that would not fit the other
four colours. Mechanically it should feel *different* in kind, not just magnitude. One possibility:
Purple pips are not spent from rolls but accumulated over multiple turns (a charge system),
representing the slow build of magical energy. This keeps Purple from competing with the immediacy
of the other colours.

No further design until the base system is stable.

---

## Die Types — Risk Profiles

The die *type* (d4, d6, d8, etc.) carries strategic meaning beyond "bigger ceiling":

| Die | Min | Max | Expected | Profile |
|---|---|---|---|---|
| d4 | 1 | 4 | 2.5 | **Consistent** — narrow range, rarely punishes. High floor relative to max. |
| d6 | 1 | 6 | 3.5 | **Balanced** — the workhorse. Predictable over time. |
| d8 | 1 | 8 | 4.5 | **Volatile** — good ceiling, but frequent low rolls. Feast or famine. |
| d10 | 1 | 10 | 5.5 | **Spikey** — thrilling when high; crushing when low. |
| d12 | 1 | 12 | 6.5 | **Wild** — for the committed gambler. Terrible median, spectacular ceiling. |

The meta-progression choice is not just "upgrade to bigger" — it is "do I want consistency or
ceiling?" A d6 Red is reliably useful; a d10 Red sometimes wins a fight in one turn and sometimes
contributes almost nothing. Engraving (permanently locking one face) tames variance: a d10 with
its "1" face engraved to "5" is a much calmer die.

**Build archetypes this creates:**
- *Reliable* — many small dice (d4s and d6s), engraved for consistency. Rarely thrilling, rarely
  terrible. Good for a player who wants to execute a plan.
- *Spike* — fewer large dice (d8s, d10s). Can end fights quickly on good rolls; vulnerable on
  bad ones. Higher skill expression; item support (Luck items, Lock Pin) amplifies the best rolls.
- *Hybrid* — mixed sizes, selectively engraved. The meta-game of tuning the pool.

---

## Starting Pool and Growth

### Default starting pool (zero meta-upgrades)

| Die | Colour |
|---|---|
| 1d6 | Red |
| 1d6 | Green |
| 1d4 | Yellow |

Three dice. Intentionally tiny — this is correct. Pip is a mouse at the start of his first descent.
His pool should feel minimal, almost precarious. The run and meta-progression both grow it.

### Weapon contribution

The weapon chosen before a run (meta-layer) modifies the Red dice pool and defines Pip's primary
strike action. Starting weapons:

| Weapon | Added dice | Strike action |
|---|---|---|
| *Dagger* | +2d4 Red | Fast, low-cost (1R). More actions per turn, lower per-action damage. |
| *Shortsword* | +1d6 Red | Standard (2R). The default. |
| *Broadsword* | +1d8 Red | Slow, high-cost (3R). Fewer actions but higher damage per hit. |
| *Whisker Staff* | +1d4 Blue, +1d4 Blue | No extra Red; adds Blue. Rewards an intelligence-first playstyle. |

The weapon is the run's defining character before the first room is entered. A Dagger run feels
different from a Broadsword run before a single combat occurs.

### In-run growth

Items found mid-run can temporarily extend or modify the pool (Die Upgrades from in-run-items.md).
These are a layer of tactical surprise on top of the permanent meta pool.

### Meta-progression growth

Between runs, Pip upgrades his permanent pool:
- **Swap dice** — e.g. upgrade a d6 Red to a d8 Red (higher ceiling, more variance)
- **Add dice** — add a new die of a given colour (more actions per turn, more pips available)
- **Engrave** — permanently fix one face of any die (reduce variance on a specific die)
- **Unlock Blue** — add the first Blue die (opens Blue actions as a permanent option)
- **Unlock skills** — see below

The starting pool grows from 3 dice to typically 5–7 over a meta arc, not 10+. A pool of 7 varied
dice is mechanically rich; a pool of 15 dice is a chore to read on a phone screen.

---

## Item Interjection Points

Items interact with combat at specific, defined moments. The designer and engineer should treat
this as a complete event model — items land in exactly one of these windows:

| Window | Timing | Items that fire here |
|---|---|---|
| **Pre-roll / Scout** | Before Pip rolls, at turn start | Enemy scouting items; items that add pre-roll pips |
| **On roll (Luck interrupt)** | After roll, before any spending | Luck items (full pool reroll); only usable *before* any pips are spent |
| **During allocation** | After roll, while spending | Dice-manipulation items: Lock Pin, Pip Splitter, Colour Shift Vial, Mirror Shard |
| **On Strike** | When a Strike action resolves | Weapon coatings: Viper Oil, Fire Resin, Blinding Dust, Numbing Sap |
| **Post-spend (Tenacity)** | After all pips spent this turn | Tenacity items: grant a second full roll-and-spend sequence |
| **On enemy hit** | When enemy damage would land | Passive armour (auto-fires); Shield items (if equipped) |
| **Post-damage** | After enemy action resolves | Healing items; Luck items' *trap-interrupt* mode (non-combat only) |
| **Between turns** | Turn end / turn start | Status effect ticks (poison, empowered); item expiry |

**Why this matters for design:** An item can only have one interjection point. "Use before rolling
for a full reroll" is the Luck item. "Use after spending pips to get another turn" is the Tenacity
item. The distinct windows give each item class a distinct feel and prevent two items from
competing for the same moment. When speccing a new item, the Designer's first question should be:
*which window does this sit in?*

---

## Emotional States: Rattled and Emboldened

*This is the Thinker's own contribution — not a direct development of the manager's direction.*

Pip's emotional state is a transient per-fight modifier that tracks the texture of the fight in
progress. It adds no permanent complexity — it arrives and clears within a single combat — but it
makes fights feel *alive* in a way that pure HP-and-attack cannot.

### Rattled

**Trigger:** Pip takes damage on two consecutive turns without landing a single hit on the enemy in
between.

**Effect:** One die in Pip's pool (the smallest available, or the player's choice if multiple are
tied) becomes Rattled — it shows and locks to its minimum face value for the next roll only.

**Recovery:** Rattled clears the moment Pip's next attack lands on the enemy. A hit ends the fear.

**Thematic read:** Pip is a small mouse getting pounded. He flinches. He needs a win to settle his
nerves. The mechanic reflects this without being a separate stat or screen element — just a shaky
die with a low face.

**Item hook:** *Steadying Brew* — clears Rattled immediately; also used by nervous players as
insurance before a scary fight. The meta-skill *Stout Heart* raises the threshold to 3 consecutive
turns before Rattled triggers.

**Design note:** Rattled must feel recoverable, never spiralling. A locked minimum face is
meaningful on a d6 or d8 (costing 3–5 expected value) but not catastrophic. The trigger is
consecutive turns without a hit — a player who lands any attack, even a small one, does not get
Rattled. Aggressive play prevents Rattled; passive play invites it.

### Emboldened

**Trigger:** Pip lands the killing blow on an enemy (HP reaches zero from Pip's attack).

**Effect:** Pip enters the *next combat* Emboldened — his first roll of that fight has one free
Yellow pip added (virtual, not a die).

**Duration:** One turn only, in the next combat. If no new combat follows (run ends), Emboldened
simply dissipates.

**Thematic read:** The mouse who just won a fight walks into the next one with his tail up.
Fortune follows confidence.

**Item hook:** *Emboldening Draught* — activates Emboldened for the current combat's next turn
(not a kill required). The meta-skill *Battle Cry* extends Emboldened to last two turns.

**Design note:** Emboldened is the inverse of Rattled — a small positive feedback loop that
rewards clean play. One free Yellow pip is modest (roughly a bonus 0.5 Red pip at the 2:1
conversion rate) but tangible. It feels like a reward, not a mechanical advantage.

---

## Scaling Within a Run

The three floors should each have a distinct emotional register. Combat is the mechanism that
delivers it.

### Floor 1 — Learning the System

- Enemy intents are **simple**: mostly ⚔️ Attack, occasionally 🛡️ Guard. No multi-step threats.
- Enemy HP is low enough that Pip can often *race to kill* — not dodge, just attack faster than
  the enemy can threaten. This is a valid strategy and should work on Floor 1.
- Rolling dice feels generous: the pool is small but the problems are sized to match.
- Rattled is possible but forgiving — enemies don't hit hard enough to cascade it.
- **Learning moment:** the player discovers that reserving Green for defence sometimes beats going
  full offence. Usually through a fight they barely survived.

### Floor 2 — Learning to Read

- Intents include 💢 Empower and 😴 Recover — **forcing the player to respond**, not just attack.
  An Empower turn says: "either kill them now or prepare to eat a big hit." A Recover turn says:
  "attack hard — they're about to steal your progress."
- Enemy HP climbs: racing to kill is no longer reliable. Dodging is now a real strategy.
- Two-turn intents appear on late Floor 2: Guard this turn, then heavy Strike next. Forces
  planning across turns.
- The player has collected items by now. The combat panel feels more alive: coatings available,
  maybe a Luck item in reserve, Blue dice possibly unlocked.

### Floor 3 — The Test

- Enemy intents include ☠️ Lunge (lethal potential) and 🕸️ Status (ongoing damage). The player
  *must* dodge at least some hits — the option to always absorb is gone.
- Tier-3 enemies have high HP, demanding sustained pip efficiency across multiple turns.
- The player is arriving with depleted resources from Floor 2. Items are precious; healing is
  scarce. Combat decisions carry weight because there is less margin.
- **The pre-boss corridor:** one or two Tier-3 encounters in the approach rooms before the boss.
  These are the dungeon saying: *this is real now.* Surviving them into the boss fight is the
  roguelike pressure arc in miniature.

### Boss Fight Arc

The boss has a **fixed intent cycle** — learnable on the first run, exploitable on subsequent ones:

- **Phase 1 (full HP):** Cycle of 3–4 intents at manageable scale. Player can pace themselves,
  read the pattern, establish a rhythm.
- **Phase 2 (50% HP):** The enrage transition — one intent in the cycle escalates (an Attack
  becomes a Lunge, a Guard becomes double-Guard). The rhythm breaks and must be re-established.
- **Phase 3 (boss-specific):** Some bosses have a third phase (the Pale Adder's venom-flood,
  Scratch's final pounce). Not all — some bosses simply become very fast versions of their cycle.

The boss fight should feel like a final examination: the player who learned the system on Floors 1
and 2 has the tools to win. The player who did not will lose and understand why.

---

## Scaling Across the Meta

The meta arc runs roughly 15–20 runs before Pip has a significantly upgraded pool. The experience
at each stage:

### Runs 1–3 (Tiny pool, learning)

Pool: 3–4 dice. Floor 3 is punishing without items. The game is about learning the intent system
and discovering which items save runs. Most players will not finish Run 1.

### Runs 4–7 (Growing, surprising)

Pool: 5–6 dice. Pip has one Blue die or a second Red. Combos start appearing. Blue opens mid-fight.
The player can begin to build a fighting style. Runs feel winnable with good decisions.

### Runs 8–12 (Capable, challenged by the window)

Pool: 6–8 dice. The dungeon's run-depth window starts raising tier weighting. Tier-3 enemies
appear earlier. A well-built pool navigates this; a poorly-built one does not. The player is
choosing what kind of Pip they want — Red-heavy for offence, Green-heavy for durability, Blue for
control.

### Runs 13+ (Powerful, tested)

Pool: 8+ dice, engraved faces, unlocked skills. Pip is genuinely powerful. The dungeon responds.
Bosses have modifiers. The early floors feel almost comfortable — which makes the moment when
something goes wrong on Floor 3 all the sharper.

### Meta skills that change combat feel

Not a complete list — a direction for what makes skills feel meaningful:

- **Reaction unlocks** — e.g., *Counter-Strike*: "When you fully dodge a hit (2G reserved),
  deal 1 damage automatically." Defence becomes offence.
- **Intent advantage** — *Careful Eye*: "Start each combat seeing the enemy's first *two*
  intents." Complete information from the first turn.
- **Rattled turning point** — *Desperate Swing*: "While Rattled, Strike costs 1R less." Converts
  a penalty into a stylistic advantage.
- **Fortune seeding** — *Lucky Start*: "Start each combat at Fortune 1." A persistent Yellow
  investment that builds over a run.
- **Engrave bonus** — *True Edge*: "Engraved dice show their engraved value on all faces above
  it too." A powerful engraving variant.

The rule for skills: **a good skill changes what decisions are interesting, not just which numbers
go up**. Counter-Strike makes dodging a dual-use action. Careful Eye makes Blue spending a
planning tool from turn one. These change what the player *thinks about* during combat, not just
how far the numbers travel.

---

## Open Questions for the Designer

These are the unresolved tensions this concept document leaves open. They require spec-level
decisions before building.

- **Dodge threshold.** Is a dodge binary (2G = full dodge, 1G = nothing) or graduated (each G
  reduces damage by 1)? Binary is cleaner and more dramatic; graduated is more forgiving and
  tunable. Both are defensible. The Designer should pick one and commit.

- **Fortune Track implementation.** The Fortune Track adds a fifth UI element to the combat
  panel. Is it worth the space and complexity? A simpler Yellow model (conversion + Lucky Shot
  only, no Track) may be better for the first implementation. The Track could be added as a meta
  unlock later.

- **Number of starting dice.** The concept recommends starting at 3 dice (lean). This may feel
  too small in play — only one colour has two dice. Playtest with 3 and 4 before locking.

- **Multi-colour combo actions.** Actions that cost pips of two colours (e.g. Feint-Strike: 1G +
  2R for bonus damage) add expressiveness but require teaching. Are they core actions or
  skill-unlocked actions? Recommend: only via meta-progression skills, so they are not present
  in the first combat and not teaching-surface for new players.

- **Where does Flee fit?** Feature 036 (Raw Flee) allows Pip to exit combat at a cost (one free
  enemy hit). Under this system, Flee is a valid choice when the intent is Lunge and Pip cannot
  afford to dodge or kill quickly. The Designer should confirm the Flee action fits in the new
  turn structure (probably sits in the allocate phase, before any pips are spent, as a "skip the
  turn" option).

- **Enemy Guard and Heavy Strike interaction.** If the enemy Guards and Pip uses Heavy Strike,
  does Guard soak the extra damage first? Or does Heavy Strike bypass Guard? Recommend: Guard
  soaks everything except Lucky Shot and Exploit. This makes Guard a meaningful obstacle that
  requires a specific response.

- **Rattled visual.** The Rattled die should be visually distinct — a shaky animation or a
  changed border. Must be readable on a small screen without being distracting during play.

---

*Related:*
- `docs/concept/overview.md` — core pillars; the colour table there should be treated as
  superseded by this document's colour roles
- `docs/concept/in-run-items.md` — item categories and interjection model; the interjection
  points in this doc supersede the earlier resolve-window thinking
- `docs/concept/enemies-and-bosses.md` — enemy roster and escalation; enemy intents here
  complement the enemy personality traits in that doc
- `IDEAS.md` — discrete ideas seeded from this document (Ideas 039–043)
