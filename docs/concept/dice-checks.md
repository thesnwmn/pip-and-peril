# Dice Beyond Combat — The Check System

> *The dice that fight are the dice that talk, sneak, haul, and charm. Everything Pip is should be rolled.*

This document sets the direction for **the dice check** — the use of Pip's dice pool *outside* the
combat turn loop. The manager's observation is the seed: the game keeps reaching for moments that
*should* be dice (a tense conversation, a locked door, a risky search) and resolving them with
flat menus or deterministic outcomes instead. Each of those is a place the core mechanic quietly
goes missing. This note is about putting it back — and, more importantly, about defining *one
coherent way* to do so, so that checks feel like the same game as combat rather than a pile of
ad-hoc mini-games.

It is concept material. The Designer turns the model below into specs (starting with the NPC
encounter, feature 028); the open questions at the end flag what needs a spec-level decision.

---

## A Challenge First

The manager is right that dice should appear in more places — but "add a dice roll here" is the
*wrong* unit of thought, and three risks are worth naming before we spend a single pip, because
each one turns a good instinct into a worse game.

1. **The over-rolling risk — the big one.** A dice roll is special *because it is reserved for
   moments of real uncertainty with real stakes*. Sprinkle rolls over every door, every step, every
   sentence of dialogue and the dice stop *meaning* anything — they become a slot-machine tax
   between the player and the thing they wanted. The discipline: **a check earns its roll only when
   both outcomes matter.** No stake, no roll. If failure costs nothing and success grants nothing,
   it is not a check — it is a button with a delay. This is the single rule the rest of the document
   serves.

2. **The two-idioms risk.** Pip & Peril already has *two different ways dice work*, and confusing
   them will produce slop. **Combat is the allocation idiom**: roll the whole pool every turn, spend
   pips across competing actions, the decision is *opportunity cost under a clock of incoming hits*.
   **Everything else is the check idiom**: one roll, measured against a bar, the decision is
   *whether to attempt and what to risk*. The locked/trapped Chest (026) and the planned NPC check
   (028) are already the check idiom in the wild. A check must **not** drag the combat turn loop into
   a conversation, and combat must not become a string of checks. Keeping the two idioms clean is
   what lets dice be everywhere without everything feeling the same.

3. **The no-stat-for-charm risk.** The manager's example — *charm / persuasion* opening favourable
   options — has no home in the current colour set. The naive fix is a fifth "Charisma" die, which
   bloats the pool, dilutes the combat colours, and breaks the "small, precarious pool" pillar from
   `combat-system.md`. The better fix (below) is that **charm is not a stat — it is an *approach*,
   expressed through the colours Pip already owns.** Solving this without a new colour is most of the
   design work, and it pays off far beyond conversations.

None of this kills the idea. It sharpens it into a single sentence the Designer can hold:

> **A check is one roll of Pip's existing pool, against a stated bar, where the player chooses the
> *approach* (which colour), sees the stakes before committing, and a near-miss fails *forward*
> rather than dead-ends.**

Hold that line and dice spread across the whole game as an expression of the core mechanic, not a
garnish sprinkled on top of it.

---

## The Unified Check Model

This is the reusable machine. Every non-combat dice moment in the game — today's and tomorrow's —
should be an instance of it. Define it once; skin it everywhere.

### 1. One roll of the existing pool

A check rolls **Pip's whole current pool, once.** No turn loop, no replenishment, no reserve
carried between rooms. Out of combat there is no competing clock, so the scarcity that makes combat
tense comes from a different place (the stake, below) — not from rationing pips across turns. This
keeps a check *fast*: roll, read, resolve, move on. It also means **every meta die upgrade improves
checks automatically**, which is the whole point (see *Why This Matters* below).

### 2. The approach is the decision — colour as fiction

The player does not have a "persuasion score." They have **dice**, and they choose *how Pip
approaches the problem* by choosing which colour clears the bar. The four colours carry the exact
identities they have in combat, re-expressed in the fiction of the moment:

| Colour | Combat identity | Check identity | A guard blocks the door… |
|---|---|---|---|
| 🔴 **Red — Force** | Strike | **Intimidate / force / haul** | …Pip squares up and makes him back down. |
| 🟢 **Green — Speed** | Dodge | **Slip past / sleight / reflex** | …Pip darts through his legs before he reacts. |
| 🔵 **Blue — Mind** | Analyse | **Reason / deceive / recall / pick** | …Pip talks him in circles, or picks the lock behind him. |
| 🟡 **Yellow — Fortune** | Convert / Lucky Shot | **Charm / plead / gamble / luck** | …Pip is just so *earnest* the guard waves him through. |

Yellow keeps its combat role here too: it is the **universal top-up** (2Y = 1 of any colour, as in
combat) *and* the dedicated colour of charm and pleading. A Yellow-leaning Pip is the one who talks
his way out of things; a Red-leaning Pip is the one who doesn't have to talk.

This is the heart of the system. **The same dice build that defines how Pip fights now defines who
Pip *is* everywhere.** A Blue-heavy pool isn't just "good at Analyse" — it's a clever Pip who reasons
with NPCs, picks locks, and recalls lore. A Red-heavy pool is a Pip who intimidates and forces. The
player's combat optimisation quietly authors a *personality*, and the world responds to it.

Most checks offer **two or three viable approaches**, never one. This is a hard rule — it guarantees
that *any* build has an answer (no run is bricked because Pip "isn't a Blue build"), and it turns the
check into an expressive choice rather than a stat gate. A locked door might accept Red (force it,
loud, maybe wakes the floor), Blue (pick it, clean), or Pip's size (a mouse-hole bypass, free but
slower — the smallness pillar as a permanent fourth answer).

### 3. Stakes before the roll — information first

Exactly as enemy intents are shown *before* Pip rolls in combat, a check shows **what success and
failure mean before the player commits.** The panel states the bar, the approaches available, and the
consequence of each. The player chooses an approach knowing the downside. A roll the player walks
into blind is a slot machine; a roll they choose with eyes open is a decision. This is what makes a
check *fair* on a permadeath run.

### 4. Fail forward — three bands, not a coin flip

Binary pass/fail is brittle and, on a permadeath run, cruel. Checks resolve in **three bands** (with
a critical flourish on top):

- **Success** — clear the bar. The intended outcome: the route opens, the NPC warms, the loot is
  found.
- **Success at a cost** — fall just short. Pip gets *most* of what he wanted, but pays: a few HP, a
  tick of the Dungeon Stirs, a worse price, a noisier entrance, a closed *other* option. This band
  is where the system earns its keep — a near-miss produces a *story* ("I got in, but it woke the
  floor"), not a dead stop.
- **Failure** — fall well short. The stated stake fires.
- **Critical** *(flourish)* — clear the bar with room to spare and earn a bonus: the merchant throws
  in an extra, the NPC offers a second favour, the search turns up a rare find. Keeps high rolls
  thrilling, same as a combat spike.

The design target across the whole game: **failure rarely means "nothing happens" and rarely means
pure punishment.** "Success at a cost" should be the most common off-target result. Reserve hard
failure for checks the player *chose* knowing the stake (the rare combat-on-failure conversation),
and for optional spurs where the cost of failure is simply not getting the bonus.

### 5. What a check costs — paid in pips, risk, time, or HP

A check is **paid for in the same currencies as everything else in the game** (the discipline
established in `floor-objectives.md`):

- **Pips** — the roll itself; your pool composition is the price of admission.
- **Risk** — failure's stake (a fight, a closed route, damage).
- **Time** — attempting a search or a haggle can cost a tick of the Dungeon Stirs.
- **HP** — forcing a door or shrugging off a trap can cost a little health even on success.

Never a check resolved by logic foreign to the rest of the game, and never a check that costs
*nothing* to fail. If it's free to fail, it isn't a check.

### 6. The push — luck and tenacity already fit

The check model already has a home for the existing item classes (`in-run-items.md`):

- **Luck items** interrupt *after* a failed check, before the stake lands: *"Pip failed the lock —
  use the Fortune Pebble?"* Reroll the pool, try again. This is exactly the "short, urgent" non-combat
  resolve window that doc defines.
- **Tenacity items** fire *after* the stake lands: not a retry, a recovery — shrug off the trap
  damage and press on.

No new item machinery is needed. The check is the missing surface those item windows were already
designed for.

---

## Where Dice Fit — Today, Future, and Beyond

Mapped to the manager's three horizons. Each entry is an instance of the one model above.

### Today — reuses machinery that exists or is next up

**NPC social checks** *(the headline; folds into feature 028).*
The manager's exact example. An NPC conversation is dialogue-first, but when a response calls for it,
a check appears *inside* the dialogue: persuade the toad sentry, intimidate the goblin, charm the
frightened mouse, deceive the trader. The player picks an **approach colour** for that line. Outcomes
by band: success opens a favourable branch (a discount, a hint, a shortcut, a reward); success-at-a-
cost opens it but the NPC remembers the friction; failure closes the favourable branch — and, *only
when the panel said so up front*, the rare nasty NPC turns and a fight begins. **Pushback on the
manager's framing:** combat-on-failure should be the *exception*, loudly signposted, not the default
— if talking to NPCs routinely risks a fight, players learn to avoid the blue rooms, which is exactly
backwards (NPCs should *invite* interaction). The default failure is a closed door, not a drawn blade.

**Trap checks.** A trap is the purest check: a single Green (reflex) roll to avoid or reduce the
hit, stakes shown, success-at-a-cost = partial damage, failure = full. The overview already gestures
at "a single agility check"; this just formalises it as the model.

**Chest lock & trap** *(shipped, 026).* Already the check idiom — Blue picks the lock, an agility
roll on the trap. Named here as the precedent everything else generalises from, so future checks
match its feel rather than reinventing it.

**Foraging / Search checks** *(my own — not the manager's prompt).* The prop layer (Idea 009)
scatters rubble, bones, cracked walls, old corpses — atmosphere with nothing to *do*. Make some of
them searchable: a check (Green to rummage quickly, Blue to know where to look) for a chance at
scraps or an item, **paid in time** (a Stirs tick — lingering wakes the floor). This gives the
optional, thorough player a dice-driven reason to engage the world the fast player blows past, and it
plugs straight into the Stirs as the cost of greed. Risk: keep search *sparse* — a searchable prop in
every room is over-rolling; one or two per floor.

**Shop haggle check** *(my own).* The shop is currently a flat menu. A single optional haggle —
Yellow (charm the merchant down) or Blue (argue the price) — turns it into a dice beat: success lowers
one price, success-at-a-cost lowers it but the merchant is cooler next time, failure bumps prices.
Risk: must stay *optional and one-shot per shop*, or every purchase becomes a minigame. The menu
stays; the haggle is a button on it.

### Future — needs systems already on the roadmap

**Gates & Keys** *(064).* The "dice-check key" form already in `floor-objectives.md` is this model
applied to a navigation gate. Reframed here so it shares the check panel and the multi-approach rule
(Blue picks / Red forces / mouse-hole bypasses) rather than being a bespoke door minigame.

**Errand resolution** *(067).* Some errands resolve through a check, not just delivery: *calm the
panicked vole* (Yellow), *lift the fallen beam off the trapped beetle* (Red), *figure out the
cousin's riddle* (Blue). The check gives an errand a *moment* instead of a fetch.

**Roamer evasion** *(060).* When a roaming enemy catches Pip, a Green check to *slip past* is the
alternative to fighting at a disadvantage — the smallness pillar and Green's identity, expressed as a
single tense roll. Failure: the fight starts Rattled.

**Environmental status resistance** *(Cold, Idea 057).* Crossing ice or wind exposure prompts a
check to *resist* gaining Cold (Green reflexes on the slick, Red to power through) — a check whose
stake is a lingering between-room status rather than immediate damage. Ties the proposed Cold mechanic
into the dice instead of being a flat tax.

**In-fight check beats** *(my own).* A *punctuation* inside combat that is deliberately the check
idiom, not the allocation loop: a boss intent that demands a one-roll response distinct from pip
spending — *brace* against Old Gloop's stomp (Red check or take the hit), *resist* Kira's gaze (Blue
check or be read), *hold your nerve* against Scratch's pounce. Used sparingly, it breaks the rhythm of
allocation with a sudden binary moment — the combat equivalent of a saving throw. Risk: easy to
overuse; this is seasoning on a boss cycle, not a per-turn thing.

### Beyond — horizon pieces and new pillars

**Dice in the camp** *(my own — the camp is currently dice-*free*).* The between-runs hub is, right
now, pure deterministic transaction: spend scraps, get die. That is the meta-progression doc's own
stated fear ("a mathematical transaction, not a story"). Two ways to put the core mechanic back into
the camp:
- **The Gambler** — a new visitor type (slots into the visitor system, 051): bet scraps on a roll of
  Pip's own pool. Pure push-your-luck, capped stakes, the camp's one flutter. Fits the Trickster
  family already in the roster.
- **Tempering a die** — an *optional, risky* workbench operation alongside the safe swap/add/engrave:
  gamble a die for a better outcome (a chance at a free face-bump, a chance to crack it down a size).
  **Tread carefully** — the permadeath meta economy must never let a player gamble away their build
  into a hole; cap the downside, make it always a *net-neutral-or-better* flutter, or gate it to
  scraps only. Documented as a *direction*, not a green light.

**The Fortune Track.** `combat-system.md` defers a compounding luck-score as a possible later meta
layer. Checks are its natural feeder: a critical check seeds Fortune; a charmed conversation builds
it. If the Track is ever built, the check system is where most of its input comes from.

**Navigation fortune-steps.** A rare, light dice event on stepping into fog — a found scrap, a
near-miss, a fork that rewards a quick roll. Horizon-only, and the *most* exposed to the over-rolling
risk: it must be rare enough to feel like an event, never a toll on every move.

**Magic as charged checks** *(Purple).* When Purple finally arrives, spellcasting is a natural fit
for the check idiom — a charged-up roll against a bar — rather than another allocation colour. A
direction to hold, not design, until the base four are stable.

---

## Why This Matters — The Whole Pool Answers

The strongest argument for the manager's instinct is systemic, and it deserves to be stated plainly,
because it changes how valuable the whole idea is.

**Today, every meta-progression decision is a combat decision.** Upgrading Blue makes Pip better at
*Analyse*. Adding Green makes him *dodge* more. The pool is, functionally, a combat loadout — and so
the rich risk-profile choices in `combat-system.md` (consistency vs. ceiling, Red-heavy vs.
Green-heavy) only express themselves in fights.

**Extend checks across the game and every die investment ripples outward.** A Blue-heavy Pip now
reasons with NPCs, picks locks, recalls lore, and solves errands — he is a *clever* Pip everywhere,
not just a Pip with good Analyse. A Yellow-heavy Pip is charming and lucky in every room. A Red-heavy
Pip kicks down the doors he can't be bothered to talk through. The build stops being a spreadsheet and
becomes a **way of moving through the world** — which is exactly the emotional texture
`meta-progression.md` is straining to manufacture with flavour text. Here it falls out of the
mechanics for free.

This is also the cheapest variety lever available. Each new check *reuses* the dice the player already
has and the panel the model already defines. The cost is low; the return is that the core mechanic
finally touches the parts of the game it currently abandons — and that the player's choices about who
Pip *is* finally matter outside of a fight.

---

## Open Questions for the Designer

- **Does an out-of-combat check roll the *full* pool, or a relevant subset?** The model above says
  full pool, once, for speed and so upgrades always help. An alternative — roll only the dice of the
  chosen approach colour — is more readable but punishes narrow builds and complicates Yellow top-up.
  Recommend full pool; confirm in the 028 spec.

- **How is the bar set, and does it scale?** A check's threshold needs a difficulty number. Does it
  scale with floor depth / run-depth window like enemy intents do, or is it fixed per check? Recommend
  light scaling (a floor-3 lock is harder than a floor-1 lock) but never beyond what a reasonable pool
  can clear with a viable approach.

- **Combat-on-failure: how rare, and how signposted?** The recommendation is *rare and loudly
  telegraphed* — the panel must say "if you fail, he attacks" before the player picks that approach.
  Confirm the threshold (which NPC types ever turn hostile) so the blue room stays inviting.

- **Are the three result bands worth the complexity on a phone, or start binary?** Success-at-a-cost
  is the heart of "fail forward," but it's more to render and read. Possible path: ship NPC/lock
  checks binary first, add the cost band once the panel is proven.

- **Does the same check panel serve every context** (NPC line, door, trap, search, haggle), or do
  some get bespoke surfaces? Strong recommendation: **one panel, reskinned** — it is what makes checks
  feel like one system. The chest check (026) is the template to generalise.

- **Search density and the Stirs.** How many searchable props per floor before foraging becomes
  over-rolling? Recommend 1–2, and the time cost (a Stirs tick) must be real or the "fast vs. thorough"
  tension collapses.

- **Camp dice safety.** If tempering-a-die ships, what is the hard floor on its downside so a
  permadeath player can never gamble their build into ruin? This needs a firm rule before it's specced
  at all.

---

*Related:*
- `docs/concept/combat-system.md` — the allocation idiom and the colour identities this document
  re-expresses as approaches; the deferred Fortune Track that checks would feed; the "small pool"
  pillar that the no-new-colour rule protects
- `docs/concept/in-run-items.md` — the resolve-window model and the Luck/Tenacity item classes that
  already fit the check's push step; the note that items "can also apply to non-combat encounter checks"
- `docs/concept/floor-objectives.md` — Gates & Keys (the dice-check key), Errands, and the
  pay-in-pips/risk/time discipline this document inherits
- `docs/concept/meta-progression.md` — the dice-free camp the *Beyond* section proposes to bring dice
  into; the visitor system the Gambler slots into; the "transaction, not a story" fear this system
  answers
- `docs/concept/enemies-and-bosses.md` — roamers (evasion checks), boss personalities (in-fight check
  beats like Kira's gaze and Old Gloop's stomp)
- `IDEAS.md` — discrete ideas seeded from this document (070–074)
</content>
</invoke>
