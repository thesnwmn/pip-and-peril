# Enemies & Bosses — World & Escalation Direction

> *In a world built to mouse-scale, a beetle is a skirmish. A cat is the end of the story.*

This note sets the direction for the **creatures of Pip & Peril**: who they are, what they feel like
to fight, how they escalate across a run, and how a dungeon that has heard of Pip starts pushing
back over multiple runs. It is concept material — the tone and creature philosophy the Designer
uses when speccing feature 038 (enemy roster) and future boss work. Stats and acceptance criteria
belong downstream.

---

## The question: who threatens a mouse?

The answer isn't a list of fantasy archetypes bolted onto a dungeon template. It's a **question of
scale**. Pip is a mouse. A dungeon rat that a human adventurer might not even notice is, to Pip,
a large and dangerous thing. A weasel is terrifying. A raven is a monster. A cat is the apocalypse.

This scale-inversion is one of the game's most distinctive tools. Use it. It makes the creature
roster feel like it belongs to a **real world Pip lives in**, not just a list of HP values. Even
when the dungeon contains classic fantasy creatures — a goblin exists in the game already — the
mouse lens should colour how they read. A goblin is small to us; to Pip, a goblin is a stocky,
armed brute, and the player should feel that.

The tone remains **Redwall meets Hades**: the creatures have personality, even menace, but the
world has warmth underneath. No torture-chamber sadism, no pure-evil abstraction. A weasel
soldier is doing a job. A toad sentry has been sitting on this post for twenty years and is
frankly a bit bored. A spider has been patient so long she's become part of the architecture.
The Rat King has a throne made of bones and an old grievance. They are **characters**, not
obstacles.

---

## The threat ladder

Three tiers. The tiers are not rigidly locked floors — they form a **weighting pool** that shifts
across the run and across runs (see below). Shallow rooms early in a run lean heavily tier-1;
deep rooms late lean tier-2 and tier-3. All three tiers can appear anywhere, but their weights
tell you what the dungeon is mainly made of at any given depth.

### Tier 1 — Nuisances

*You should win these. They exist to teach the dice system, build rhythm, and occasionally
scratch a careless player.*

The defining quality: **predictable and containable**. A veteran player clears these without
stressing. A new player uses them to learn what the action buttons do. Losing to a nuisance
is always Pip's mistake — something to correct, not to dread.

Suggested creatures:

| Name | Scale reminder | Feel |
|---|---|---|
| **Dungeon Rat** | Larger than Pip, but only just. | The baseline — a scavenging rat doing what rats do. Fast, low health. The textbook fight. |
| **Goblin Runt** | Pip's approximate size. | Existing creature. Clumsy, opportunistic, quick to flee if hurt. Sets the entry-level combat expectation. |
| **Cave Bat Pup** | Comparable to Pip. | Young bat: swoops and misses often, fragile. Teaches that some enemies need agility to suppress, not strength to smash. |
| **Dung Beetle** | Unsettlingly large for an insect. | Armored, slow, hits in a straight line. A tank that barely notices Pip. Teaches patience and pip conservation. |

### Tier 2 — Threats

*You need to think about these. They reward skill and punish waste. A close fight is the point.*

The defining quality: **demand resource decisions**. A sloppy roll that wastes pips means you
finish the fight wounded. Pip can win every tier-2 encounter — but not on autopilot.

Suggested creatures:

| Name | Scale reminder | Feel |
|---|---|---|
| **Weasel Scout** | Notably larger than Pip. Quick. | Aggressive and fast. Hits before you expect it. The first enemy that punishes slow play — forces early commitment of red pips. |
| **Toad Sentry** | Massive to Pip. | Armored, slow, hits like a falling stone. Forces pip-efficient combat — you can dodge forever, but you need to eventually land hits hard enough to pierce the bulk. |
| **Goblin Guard** | Still roughly Pip's scale, but better equipped. | An upgraded goblin: shield-carrying, more patient. Teaches that not every red swing lands the same way; aggression alone doesn't win. |
| **Cave Spider** | About Pip's size but eight-legged. | Patient, web-laying. The first creature that makes Pip feel like the prey rather than the hunter. Rewards green (agility) play. |

### Tier 3 — Horrors

*You may not win this. Coming out the other side is an achievement.*

The defining quality: **genuine threat that requires everything**. These are the creatures that
make the deep floors feel earned. Even an experienced player treats a tier-3 encounter with
respect. They are not unfair — but they demand the full dice pool, smart pip routing, and
probably an item.

Suggested creatures:

| Name | Scale reminder | Feel |
|---|---|---|
| **Stoat Champion** | Considerably larger and stronger than Pip. | An elite warrior — high HP, multiple attacks, possibly the first enemy who can hit twice in a turn. The combat equivalent of a mini-boss. |
| **Dungeon Adder** | Enormous from Pip's perspective. A snake. | Silent, poisonous. The first creature where being hit at all carries a lasting price. Punishes impatience. |
| **Shadow Raven** | Monstrous from Pip's eye. | Intelligent, adapts its approach. Attacks twice in a turn. The first enemy that feels like it is *reading* the player — and responding. |
| **Iron Beetle** | Huge, slow, nigh-impenetrable. | Armoured to the point of being a puzzle. Punishes pure strength play; rewards intellect or the right consumable. The dungeon's reminder that brute force has limits. |

---

## Escalation within a run

A run spans three floors. The creature pool is **weighted, not gated** — tier-1 enemies can
technically appear anywhere, but they are the dominant offer early, and rare by floor 3.

The rough shape:

| Phase | Dominant tier | Notes |
|---|---|---|
| Floor 1, shallow | Tier 1 | Nuisances dominate. One or two tier-2 rooms push deeper in. |
| Floor 1, deep + Floor 2 | Tier 1 → Tier 2 | The hand-off. Tier-1 encounters start feeling like warm-ups rather than threats. |
| Floor 2, deep + Floor 3 | Tier 2 → Tier 3 | Real pressure. Tier-1 is a welcome relief. The player is managing resources, not learning. |
| Floor 3, approach to boss | Tier 3 | The dungeon's full weight. One or two tier-3 encounters before the boss room tell the player: *this is real now*. |

The pacing goal: **each floor should have its own emotional register**. Floor 1 teaches. Floor 2
pressures. Floor 3 tests. The boss is the exam.

---

## Escalation across runs

Pip gets stronger with each run via meta-progression — bigger dice, more pips, unlocked skills.
The dungeon should respond. A run that felt dangerous at run 1 should feel manageable at run 5.
But run 5 should have its own danger.

The mechanism is a **run-depth window** — a persistent counter (part of meta-progression) that
slides the creature pool's baseline upward over time:

| Run range | Window feel |
|---|---|
| Runs 1–3 | Tier-1 heavy, tier-2 present, tier-3 almost absent. Bosses at base stats. |
| Runs 4–7 | Tier-1 thinning, tier-2 dominant, tier-3 appearing on deep floors. Bosses at base stats. |
| Runs 8–12 | Tier-1 a rarity, tier-2 and tier-3 dominant. Bosses gain a small stat modifier. |
| Runs 13+ | Tier-1 gone, tier-3 starts appearing early. Bosses have modifiers and possibly a new behavior. |

The window creates a satisfying tension: Pip grows, but the dungeon grows with her. The
early-run sense of relief (recognising a tier-1 encounter as safe) dissolves as runs accumulate.
By mid-game, what was once dangerous is now scaffolding. By late-game, even the shallow
floors respect you.

**Important:** the window is not a punishment. It is a **difficulty curve** spread across the
meta rather than a single run. The player should feel the escalation as *consequence of mastery*,
not as a frustration mechanic. A run at window 8 should be harder than a run at window 2 — but
both should be *winnable*.

---

## The boss roster

The boss is the climax of every run. The Rat King is already specced as the first boss (feature
023); the roster should grow to at least five or six candidates so that the boss becomes a
**meaningful variable** in the run — something the player anticipates, not just a fixed endpoint.

Each boss has:
- A **name** — distinctive, memorable, in keeping with the Redwall tone
- A **title-card line** — the three words that appear under the name in the intro (see the Rat
  King's *"Ancient. Patient. Hungry."*)
- A **personality** — the emotional register of the fight, even before mechanics are defined

### Candidate roster

---

**The Rat King** *(already specced — feature 023)*
*"Ancient. Patient. Hungry."*

A warlord in a throne of stolen bones, the de facto lord of the dungeon's lower reaches. His
signature is **Enrage** — when hurt badly, he stops pretending restraint. The archetype of the
boss roster; every other boss is measured against him. He represents brute power with a hint of
political menace.

---

**Kira One-Eye**
*"She remembers everything."*

An ancient raven who fell into the dungeon generations ago and found she preferred it. One glass
eye, perfectly still; one real eye, watching. Where the Rat King overpowers, Kira outthinks. Her
fight should feel like she has *read the player's approach* — the combat equivalent of being
interrogated. An intellectual boss that rewards adaptation rather than repetition.

---

**Old Gloop**
*"He has all the time in the world."*

A toad patriarch so old that lichen has begun to grow on his back. He has sat in the same chamber
for so long that the flagstones have worn grooves under him. Enormously armored, crushingly
powerful when he finally moves — but slow. His fight is a war of patience: the player must not
panic, and must not give up a round carelessly, because one clean hit from Old Gloop is decisive.
The boss who punishes aggression and rewards discipline.

---

**The Pale Adder**
*"Silence is her warning."*

A great white snake — near-albino, so old that her scales have faded — who has lived in the
dungeon's cold veins longer than anyone can remember. She does not hiss before she strikes. Her
fight is the opposite of the Rat King's rage: cold, quiet, inexorable. She poisons; the player
fights against time as well as HP. She rewards the player who acts decisively and finishes quickly,
punishing the drawn-out fight.

---

**Scratch**
*"He doesn't know what mice are for."*

A feral tabby cat who fell into the dungeon one winter and never found his way back out. Half-mad,
enormous from Pip's perspective, completely unpredictable. He is not cruel — he is simply a cat
who has lost the social contract. His fight is chaos: wild, swinging, occasionally bafflingly
gentle before a devastating pounce. The chaotic boss — the hardest to plan for, the most
satisfying to survive. Fighting Scratch should feel like an emergency.

---

**Mother Silk**
*"She's been expecting you."*

An ancient weaver spider at the centre of a vast web that stretches from wall to wall of the
deepest chamber. She has been drawing creatures into the dungeon for decades, adding their
remnants to the pattern. She is patient, systematic, and has never lost. Her fight should feel
like walking into something already prepared — the player is the prey, not the predator. A boss
that rewards breaking her rhythm before she sets it.

---

### Randomisation and the boss reveal

For now, the boss is **randomised at run start** — a single draw from the available pool. This is
the right starting point. Simple to implement; meaningful to the run.

The emotional design goal is that the reveal should feel like **fate**, not a coin flip. When the
title card appears, the player should feel: *of course. This one.* Not: *oh, it's a random one.*
The title-card intro (already specced for the Rat King) is the main tool here — a name, a
flavour line, a tight camera — gives any boss presence instantly.

A possible enhancement (spec-able separately, not required now): **foreshadowing during the run**.
An NPC mentions hearing a terrible hiss from below. A corridor has feathers scattered on the
floor. A shopkeeper whispers a name. The randomisation still happens at run start — the hints
are just its echo, surfacing during the descent. This makes the reveal feel like a discovery
rather than a reveal. See `IDEAS.md` for a discrete idea on this.

---

## Open questions for the Designer

- **How many bosses before randomisation is meaningful?** Two feels shallow; five or six feels
  like real variety. The Rat King is one — the Designer should spec enough of the roster in one
  pass to make randomisation feel genuine (probably three to four bosses total as a first target).

- **Cross-run scaling mechanism.** The run-depth window sketched above needs a concrete data home.
  It probably lives alongside meta-progression (feature 029). Does the window advance
  automatically (always, every run), or only when Pip upgrades? Automatic is simpler and kinder;
  gated feels more player-controlled. The Designer should decide and note it.

- **Stat scaling for bosses at higher run depths.** The concept above gestures at "modifiers and
  possibly new behavior." The simplest version is a small HP/attack multiplier per window tier.
  A richer version unlocks a new boss behavior at a threshold (e.g. Old Gloop gets a second
  strike at window 10+). The Designer can scope to whichever is buildable first.

- **Boss pool availability.** Should all bosses be available from run 1, or should some unlock
  as the run-depth window increases? Unlocking later bosses (Scratch or Mother Silk, say) as
  late-window encounters makes early-run randomisation feel gentler and gives the player something
  to discover. This is a nice meta-progression hook.

- **Do tier-1 creatures ever meaningfully threaten in the late game?** They shouldn't — but
  they might serve as a pressure mechanic if they appear in groups (a swarm of rats rather than
  one rat). This is not a concept question but a Design note: the Goblin Runt becoming a
  "three goblins rush Pip" encounter at deep windows changes its feel entirely without a new
  creature.
