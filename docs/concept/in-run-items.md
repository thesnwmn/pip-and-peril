# In-Run Items — Concept Direction

*Things Pip finds in the dungeon. Things he carries in his satchel. Lost when the run ends.*

This document sets the direction for in-run items as a system: the philosophy, structure, how they interact with different encounter types, and where they come from. Individual specable ideas are seeded in `IDEAS.md` (Ideas 019–023). This document shapes how all of them should feel and behave.

---

## The Two Layers

Pip's capabilities come from two places.

**Meta layer — who Pip is.** Between runs, the player upgrades the dice pool (die types, count, engravings) and unlocks passive skills. These define a baseline that carries across every run. The **weapon** is the bridge between layers: chosen before or at the start of a run, it tweaks Pip's red dice pool (the number and type of dice) and reshapes his primary Strike action. A dagger gives more d4s — fast and numerous; a sword gives fewer but heavier d8s and a heavier swing. The weapon persists for the full run and represents the meta layer bearing down on every combat encounter.

**In-run layer — what Pip has right now.** Everything below is in-run: found in the dungeon, carried in the satchel, consumed or lost when the run ends. This is the tactical layer — moment-to-moment decisions about what to use, when to save, and what to spend gold on.

The distinction matters. Meta items are who Pip *is*. In-run items are what Pip *has*. A seasoned player with an upgraded meta still navigates the same tension every run — finding the right items at the right time, reading the situation, and deciding when enough is enough.

---

## Persistence Spectrum

Not all in-run items are single-use consumables. They sit on a spectrum from fleeting to run-long:

| Duration | Description | Examples |
|---|---|---|
| **Single use** | Used once, effect fires immediately, gone | Healing crumb, smoke pellet, lucky acorn |
| **This encounter** | Active for current combat, trap, or check — auto-clears at encounter end | Poison coating (one combat), shield fragment (absorbs one hit) |
| **N tiles** | Active for a fixed number of subsequent tile moves | A lantern that illuminates fog ahead for 3 moves |
| **This run** | Persists until the run ends or is deliberately replaced | Leather jerkin (passive armour), a lucky ring |

Most in-run items are single-use — the most naturally roguelike feel. But a small set of *equipment* items that last the run create a second layer of decision: Pip is slowly building up a fragile loadout as he descends, and losing a run-long item (or choosing to replace it with something better) is its own kind of moment.

---

## Usage Register

Items are usable in one of three registers:

- **Navigation only** — usable from the Satchel during exploration; no combat application
- **Combat only** — appear in the combat ITEM overlay; unavailable on the map
- **Both** — applicable in either context

Feature 020 introduced this flag. The principle that should govern it going forward: the register should feel *inevitable* from the item's identity, not arbitrary.

A healing crumb is both — Pip eats when he needs to, walking or fighting. A smoke pellet is combat-only — there's nothing to flee *from* during navigation. Glowstone Dust is navigation-only — it's about seeing the map, not surviving a fight. When new items are added, the question should be: *in Pip's world, when would a mouse actually use this?*

Items can also apply to **non-combat encounter checks** — trap agility rolls, NPC skill checks, chest lock picks. A stat boost that is "navigation-usable" should naturally carry into a trap check if the player has it ready. The encounter register is broader than just "on the map vs. in a combat."

---

## Item Categories

### Healing

The most universally needed. Restore HP, capped at maximum.

Healing in Pip's world is **food**, not potions. Pip eats to recover. Every healing item should feel like something a mouse would actually carry in a worn leather satchel: a crumb of cheese, a wedge of gouda, a dried berry, a honeycomb scrap. The quantity ladder:

- Tiny snack: +2 HP — common, plentiful
- Proper meal: +5 HP — less common
- Full restoration: full HP recovery — rare, significant event

Available in both registers — eating while moving is as natural as eating after a fight.

---

### Stat & Dice Boosts

Temporary augmentation of Pip's dice pool for a single encounter or a single turn.

**Pip additions** — grant bonus pips of a specific colour for this turn or encounter. A Focused Mushroom adds +2 🔵 for one roll. A Beetleroot Brew grants +2 🔴 for one turn. Precise and limited — used to bridge a gap in the current pool when a specific colour is needed.

**Die upgrades** — temporarily swap one pool die for a larger one. A Whetstone swaps Pip's current red d6 for a d8 this combat. More powerful and rarer than pip additions.

Stat boosts are primarily combat-oriented, but applying them to non-combat checks is thematically sound — a Focused Mushroom sharpening Pip's mind for an NPC riddle check makes sense and should be allowed if the item's register permits it.

---

### Armour & Protection

Items that reduce incoming damage *before it lands* — defensive rather than reactive.

Unlike healing, which patches up damage after the fact, armour changes the expected damage calculation for an encounter. This makes armour most valuable *entering* a tough fight, not mid-combat when you're already bleeding.

Armour sits on the persistence spectrum more naturally than other categories:

- **Single-encounter armour** — absorbs one hit entirely, or reduces all damage this combat by 1. Used at the start of a fight (manually before first roll, or automatically on first hit). Tactical and clear.
- **Run-long passive armour** — worn for the entire run. Reduces all incoming damage by 1. Powerful; should be correspondingly rare, arriving from chests or boss rewards rather than ordinary item rooms.

**Passive or activated?** Recommendation: single-encounter armour is activated (a deliberate pre-combat decision); run-long armour is passive (equip it and it works). This gives both types clarity. Passive run-long armour is invisible during play, which is fine — it changes the texture of every combat quietly rather than requiring active attention.

The Iron Thimble (already in the chest spec as a tier item) is the natural first representative of this category. Its persistence scope should be decided when it is specced as a proper item.

---

### Utility: Escape & Manipulation

Items that change the *situation* rather than Pip's numbers. The most inventive category.

**Escape** — Smoke Pellet already exists: flee combat cleanly, no free hit. A rarer grappling hook could allow escape from a boss fight, but this should be deliberately very rare and perhaps a one-time item per run.

**Fog reveal** — Glowstone Dust already exists.

**Enemy manipulation** — items that affect the enemy's side rather than Pip's: a scattered coin that distracts an enemy (they lose their next attack), a sleep dust that skips an enemy turn. These shift combat feel from "make Pip stronger" to "change what the enemy does" — a meaningful variety that rewards preparation over raw power.

**Pip-sized shortcuts** — items that exploit Pip's small size as a mechanic. A Squeeze Phial that creates a mouse-hole crack in the wall of an enemy room, letting Pip exit without fighting (an alternative to the smoke pellet that uses terrain rather than fog). Connects naturally to Idea 010 (Squeeze Tiles) and reinforces the core pillar that Pip's smallness is a mechanic.

**Trap interaction** — items that let Pip set, disarm, or redirect traps. A Trip Wire lets Pip lay a trap in a corridor; a Disarm Kit neutralises a trapped chest without a dice check. This is further-future territory, but the design space is genuinely rich.

---

### Weapon Coatings

A distinct sub-category: items applied *to Pip's weapon*, modifying the Strike action for a limited duration. Not a direct effect — a coating fires when the next strike lands, or for this combat's strikes.

Examples:
- **Viper Oil** — next strike applies poison: 1 damage per enemy turn for 3 turns
- **Blinding Dust** — next strike disorients enemy: their next attack reduced by 1
- **Fire Resin** — next strike deals +2 damage, coating exhausted after one hit
- **Numbing Sap** — next strike causes the enemy to lose their next attack entirely

**One strike or one combat?** Both belong in the game. Common coatings fire on the next strike only — more tactical, requiring the player to time their use. Rare coatings coat the weapon for a full combat — more powerful, less fiddly. This maps naturally to item rarity tiers.

**One coating slot at a time.** Pip's weapon holds one coating. Finding a second before using the first forces a decision: apply the new one (discarding the old), or keep what you have. This is a genuine inventory pressure point that creates engagement rather than pure accumulation — the player weighs the known value of what they hold against the known value of what they found.

Coatings are combat-only by nature. The ongoing poison mechanic (damage per enemy turn) needs to be visually clear during combat — a persistent status icon with a turn counter is likely necessary.

---

## The Encounter Interaction Model

Items that interact with dice don't all behave the same way across encounter types. The key concept is the **resolve window**.

### The Resolve Window

Every dice-resolved encounter has a window between the dice hitting the table and the outcome landing. Items that interact with dice can only act inside this window. The window opens after the roll and closes when consequences are applied.

| Encounter | Window character |
|---|---|
| **Combat turn** | Open throughout the player's turn — roll, then spend pips, then enemy attacks |
| **Trap** | Short and urgent — roll, outcome is nearly instant |
| **NPC check** | Short — one roll, one result |
| **Chest lock** | Short — one check to pass |

In combat, the resolve window is the whole player turn. This is why using a reroll item in combat feels natural — there's a long window during which the player weighs their options before committing. In a trap, the window is compressed to a single beat. A reroll item here must *interrupt* the resolution immediately after the failure — before damage is applied. This calls for a distinct UI moment: not "open satchel and choose," but "this just happened, do you want to intervene right now?"

---

### The Luck / Tenacity Distinction

The compressed trap window produces the most important design insight for in-run items: **reroll items are not all the same class**. There are two recognisably different types of item that both interact with dice, and they should be distinct item classes with different identities, different UI moments, and different thematic registers.

---

**Luck items** — *the dice gave a bad answer; luck asks them again*

Luck items interact with the dice *directly* — they reseed probability before the action layer resolves.

- **Trap / check context**: offered as an interrupt immediately after failure. "Pip fails the agility check — use Lucky Charm?" The window is short; the prompt is urgent. Accepting reruns the roll; declining lets the failure land.
- **Combat context**: usable at turn start, *before* spending any pips — reroll the full pool for a fresh draw. Used when the initial roll is punishingly bad.
- **Thematic register**: mouse superstition. Carrying a lucky acorn, a rabbit's foot, a found coin. Fortune is not earned — it is *found*, and Pip trusts it at the worst moments.
- **UI moment**: a passive interrupt prompt at the moment of failure (non-combat); or a pre-spend action available at the top of a combat turn.

---

**Tenacity items** — *you made your moves; now make them again*

Tenacity items interact with the *action layer* — they grant an additional turn of action, not a reroll of an existing result.

- **Combat context**: usable *after* spending pips — not at turn start, not as a trap interrupt. Roll, spend everything you have, then activate. Get another full roll-and-spend sequence. You are not undoing anything; you are pushing harder.
- **Trap / check context**: tenacity does not reroll the failure. It fires *after* damage is taken — a Grit response. The item restores 1–2 HP immediately, representing Pip shaking off the blow and pressing on. Not a retry; a recovery.
- **Thematic register**: Pip's determination. The small mouse who gets back up. Not fortune — *character*. He didn't get lucky; he refused to stop.
- **UI moment**: a post-spend action button, available only after pips have been used this turn. If no pips have been spent, tenacity is unavailable — you haven't committed yet, so there's nothing to push through.

---

The two classes look similar from outside — both involve dice or extra actions — but feel fundamentally different in play. **Luck is nervous and hopeful**: an invocation at the worst moment. **Tenacity is deliberate and costly**: a commitment made when you're already committed.

This distinction should extend to naming and flavour. Luck items sound like charms: *Rabbit's Foot*, *Fortune Pebble*, *Lucky Acorn*, *Wishing Stone*. Tenacity items sound like Pip digging in: *Grit Stone*, *Second Wind Vial*, *Bitter Root Brew*, *Iron Resolve*.

---

## Sourcing

Items enter a run through several channels:

| Source | Character | Status |
|---|---|---|
| **Item rooms** | Reliable, free — one guaranteed item on a pedestal | Implemented (021) |
| **Chests** | Surprise, mixed — gold plus item(s); may be empty or trapped | Specced (026) |
| **Shops** | Deliberate purchase — curated selection for gold | Backlog (027) |
| **NPC rewards** | Narrative, one-off — given as payment, thanks, or trade | Future (028) |
| **Enemy drops** | Opportunistic, rare | Currently gold only; could introduce item drops for specific enemy types (a goblin carrying a stolen vial) — flavourful but should stay rare, not a primary source |
| **Boss room** | Run-climax reward — a guaranteed item findable before or after the boss fight | Not yet in concept; see Idea 023 |

**Merchant specialisation**: a shop's stock should feel like a real merchant, not a vending machine. A Weapons Merchant sells coatings and die boosts; a Field Medic sells healing items; a Curiosity Shop stocks utility items at random. This gives each shop encounter distinct character and makes the decision to visit one feel meaningful. The Designer should consider this when speccing 027.

The current sourcing set — item rooms, chests, shops — covers the run solidly. NPC rewards and a boss-room item are natural near-term extensions.

---

## Carrying Capacity

Not yet formally defined, and deliberately deferred. With only 5 items in the catalog (as of feature 020), there's no pressure to feel. Revisit when the catalog reaches ~12–15 distinct items.

When the time comes, the recommended shape:

- **No cap on consumables** — stacking healing items and utility items freely feels right for a satchel.
- **One slot per equipment type** — one armor piece, one active coating. Finding a better armor piece replaces the old one; finding a second coating before using the first forces a choice.

The coating slot rule above is a natural early pressure point even before any formal cap is introduced.

---

## Open Design Tensions

**Timing demands.** Items that must be used at exactly the right moment — luck items interrupting a trap, tenacity items firing post-spend — require the player to understand the system without a tutorial. The UI must communicate these windows clearly. An interrupt prompt for luck items (urgent, auto-dismissed if ignored) and a post-spend button state for tenacity (greyed until pips are spent) do most of this work. If these moments are unclear, players will ignore both item classes and the design collapses.

**Passive vs. active.** Run-long passive armour and activated single-encounter items serve different player temperaments. The game should carry both: the player who wants to set something up and let it run, and the player who actively manages their kit. Too many passives and items become invisible; too many activated items and the cognitive load is exhausting on a phone. A rough one-to-one balance between passive and active effects seems right.

**The hoard problem.** Players who save consumables for a "right moment" that never comes often finish a run having used nothing. This is partly a pacing problem and partly a sourcing problem. The fix is reliability of supply — if shops and item rooms make items consistently available, there's less pressure to save everything. Trap encounters are natural spend triggers: sudden HP loss creates an immediate need for the healing item that was being hoarded. The game should lean into this rather than fight it.

**Thematic constraint as a feature.** Pip is a mouse in a dungeon. Every item should feel like something that mouse would actually find and carry. This constraint forces originality and keeps the tone consistent. *Iron Thimble* over *Shield Fragment*. *Wedge of Gouda* over *Health Potion*. *Grit Stone* over *Willpower Capsule*. The world-building is in the item names, and the names are as important as the effects.

---

*Related:*
- `docs/concept.md` — core pillars, dice pool, meta-progression overview
- `IDEAS.md` — specific item ideas seeded from this document (Ideas 019–023)
- `docs/features/history/020-item-system-consumables.md` — current item catalog and data model
- `docs/features/026-chest-encounter.md` — chest as item source (Iron Thimble already specced)
