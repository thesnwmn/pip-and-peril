# Biomes — Run Destinations & World Direction

> *A mouse's world is vast. And all of it is dangerous.*

This document sets the direction for **Pip & Peril's biome system** — distinct environments beyond
the dungeon that Pip can descend into. It covers the structural question (what biomes *are* in the
game), the design rule that governs them all, and the intent for five specific environments:
what they feel like to explore, who lives there, how they look, and why they pull players back.
This is concept material — the Designer turns individual biomes into backlog items; stats and
acceptance criteria belong downstream.

---

## A Challenge Before the Idea

The appeal of biomes is obvious: new enemies, new art, new reasons to play after the dungeon
feels familiar. But there is a real risk worth naming first.

**The tileset-swap trap.** A biome that differs only in colour palette is not a biome — it is
a reskin. "Dungeon, but green" adds nothing the player will remember. Each biome needs a
*mechanical identity* — one or two things about how you play in it that feel genuinely different
from playing in the dungeon. Without that, you have variety without meaning.

**The scale-consistency risk.** The dungeon works because everything is filtered through Pip's
eyes. A beetle is a skirmish. A weasel is a threat. A cat is the end of the story. If a biome
imports fantasy tropes without asking *what this looks like to a mouse*, it breaks the game's
most distinctive creative tool. "Jungle" can mean the Amazon rainforest (generic) or the
overgrown garden behind a cottage where weeds are taller than trees and a garden spider has
built a web across the entire entrance (Pip's world). Only the second version belongs in this game.

**The "difficulty tier" reframe.** The instinct to assign biomes as easy/normal/hard difficulty
levels is understandable but undersells them. Difficulty tiers feel like gates; biomes should
feel like *destinations*. The winter fields are not "the hard dungeon" — they are a specific
place with a specific feel that rewards a different way of playing. The difficulty difference is
a side effect of the environment's character, not the point.

The recommendation: resist all three traps by designing each biome outward from a single
question — **what does this place feel like to a mouse who is trying to survive in it?**

---

## Structure: Biomes as Run Destinations

Biomes are not sequential floors within a single run and not separate campaigns. They are
**distinct run destinations** — places Pip can choose to descend into from the camp, each offering
a complete 3-floor run with its own enemy pool, boss pool, tile palette, and NPC flavour.
Meta-progression is shared across all destinations: scraps earned in the wildwood upgrade the
same dice pool Pip takes into the dungeon.

The camp gains a small addition: **the destination board** — a crude hand-drawn map pinned to
the wall near the dungeon arch, marking the places Pip has found and can return to. The dungeon
is always available. Other destinations appear on the board as Pip encounters and survives them
— initially as a rumour from an NPC, then as a confirmed route.

**Unlocking biomes through Marks of Descent**, not scraps:
- The dungeon is always available (no unlock)
- The Wildwood unlocks after Pip defeats his first boss in any biome
- The Ancient Halls unlock after Pip reaches floor 3 for the first time
- The Larder unlocks after a specific rare NPC encounter in any biome (a domestic mouse
  Pip helps, who tells him about the way in)
- The Winter Fields unlock after Pip defeats a boss in the Wildwood (late-meta gate — the
  most challenging environment)

This structure means biomes are discovered at the pace of mastery, not purchased. Each
unlock is an event; the destination board grows slowly and feels earned.

---

## The Rule: Mouse-Scale Must Hold Everywhere

The dungeon's credibility rests on seeing everything through Pip's eyes. Every biome must
maintain this contract. The translation rule for each environment:

- A *jungle* is an overgrown English garden — ferns taller than trees, roots the width of roads,
  a spider's web filling an entire archway, a pond that is a sea.
- A *desert* isn't the Sahara. In this game it doesn't belong. A more honest analog: the *winter
  fields* — exposed, cold, desperate, the world stripped bare. Or the *summer meadow* — baked
  earth, drought-dried grass, the slow lethal patience of a sun.
- *Ruins* are not abstract fantasy rubble. They are a place that was once grand to someone —
  a passage under an old garden wall, a collapsed stone outbuilding — and now belongs to the
  creatures that moved in when the humans stopped caring.
- A *pantry* is not just scenery. It is territory. Someone else's territory, meticulously organised
  and defended.

Every enemy, trap, NPC, and tile archetype in each biome should pass this test: does it make
sense as something a mouse would encounter here, at this scale?

---

## The Five Biomes

---

### I. The Dungeon — The Known Dark

*The baseline. Every other biome is measured against it.*

What makes the dungeon feel like itself: **enclosure**. Stone walls, a ceiling overhead, torchlight
pushing back against genuine darkness. The dungeon is a built place — someone made this, then left,
and now other things live in what was left. That history is in the flagstones and the iron brackets
and the worn grooves under Old Gloop's chamber.

The dungeon's mechanical identity: **balanced**. No colour is specifically favoured; no trap type
dominates. It is the generalist run — the place where any dice pool works and the player can
practise everything. Other biomes push harder in particular directions; the dungeon is the
control.

**Reward character:** General-purpose. The dungeon drops a representative spread of all item types.
It is the biome least likely to produce rare biome-specific unlocks, but also the least likely
to punish a player who leans into a narrow build.

The dungeon's boss pool and enemy roster are established in `docs/concept/enemies-and-bosses.md`.

---

### II. The Wildwood — The Living Tangle

*An English garden gone wild. Alive, layered, beautiful, and quietly predatory.*

**What it looks like to Pip:** Dense undergrowth so thick the walls are not stone but living
plant matter — bramble stems the width of pillars, fern fronds arching overhead. Light arrives
as *dappled shafts*, not torchlight: shifting, greenish, unreliable. On overcast days the wildwood
is as dark as the dungeon but smells completely different — damp earth, fungus, green growth, and
the faint sweetness of something decaying underneath.

Exits in the wildwood are not archways in stone walls. They are **gaps**: a thinning in the
undergrowth, a tunnel under an exposed root, a gap between two tree trunks, a hollow log's
far end. The snapping invariant holds (exits at fixed positions, fixed width) but the visual
grammar is entirely different. There are no doorways. There are *ways through*.

**Tile archetypes specific to the wildwood:**

| Archetype | Feel | Notes |
|---|---|---|
| **Mushroom Cap** | Floor is the top of an enormous fungus; edges are soft, slightly curved. | One of the most distinctive environments in the game. Bioluminescent variants glow faintly. |
| **Root Canopy** | Dense roots overhead like a ceiling, floor is bare earth. | Oppressively close; the roots can be climbed (🔴 check) for shortcuts. |
| **Stream Ford** | Shallow water crossing — stones to hop across. | 🟢 agility check; failure means slipping and taking damage. A rare exciting hazard. |
| **Web Room** | Thick spider silk covers most of the floor and walls. | Moving freely requires 🟢 (careful threading) or 🔴 (crashing through). Agility is strongly rewarded. |
| **Hollow Log** | Interior of a rotting log — soft, curved, organic. | Entirely distinct from a stone chamber. May have grubs as decor props (and food items). |
| **Burrow Crossing** | A rabbit warren intersection — several narrow tunnels meeting. | The standard T-junction or crossroads, but all exits are squeeze-width. Pip fits; larger enemies don't. |

**Props:** leaf litter, puddles, mushroom clusters, exposed roots, cobwebs, shed beetle shells,
feathers, a snail shell. Light comes from above (shafts) and below (bioluminescent fungi), not
from wall torches. The palette is greens, deep earth browns, and occasional blue-white fungal glow.

**Enemies — what threatens a mouse in an English woodland:**

| Name | Tier | Feel |
|---|---|---|
| **Woodlouse** | 1 | Slow, armored, curls into a ball when struck — teaches that some defences require patience to break. |
| **Field Vole** | 1 | A rival mouse, basically. Territorial and quick to scrap; the first enemy that is clearly Pip's size and should, by rights, be a peer. |
| **Garden Spider** | 2 | Patient, web-using. In the dungeon, cave spiders are threats; in the wildwood, a garden spider is completely at home and plays accordingly — more aggressive, better webs. |
| **Centipede** | 2 | Fast, many-segmented, hits in a sequence of small strikes that add up. Rewards aggressive early offense before all the legs engage. |
| **Grass Snake** | 2 | Non-venomous but large and fast. The wildwood's mid-tier predator — hunts by sight, retreats to strike again. |
| **Hornet** | 3 | Flying, aggressive, and deeply invested in its own survival — triggers an alarm state when hurt that calls a second hornet. Punishes slow combat. |
| **Stoat (Red Phase)** | 3 | The summer stoat — lethal, swift, and profoundly unafraid of mice. The wildwood's tier-3 anchor. |

**Mechanical identity — Green matters most here.** The wildwood is agility country. Speed and
dexterity are survival traits in an environment where everything is alive, everything moves,
and a web can immobilise you. Green dice investment pays dividends in this biome in ways it
does not in the dungeon. A player who has built a pool heavy in Red finds the wildwood harder
than expected; a player who has developed Green builds finds it more tractable than the dungeon.
Blue (analysis, cunning) is also useful — recognising a web before stepping in it is a Blue
check. Red remains relevant but is often the wrong tool.

**Traps:** web snares (🟢 to see before triggering; 🟢 to escape if caught), wasp nests
(disturb one = combat, with a Hornet), thorn walls (not impassable but 🔴 to bash through,
🟢 to find the gap), sticky sap patches.

**NPCs:** A hedgehog with a small cart — trades in unusual items he's found on the woodland
floor. A rook who acts as messenger and information broker (will carry a message to someone
further in for a fee, learning something about what's ahead in return). A family of harvest
mice who know the local paths — give map information freely.

**Shops:** A squirrel merchant who operates from a hollow tree. Sells the same categories of
item as dungeon shops but with wildwood flavour — natural remedies, woven cordage (equipment),
seeds and nuts (food consumables).

**Boss candidates:**

**The Hornet Queen** — *"Her patience has a radius."* A vast queen in a paper nest suspended
from the ceiling of the deepest chamber. The fight is a war of attrition with waves: drones
patrol between queen and player, requiring split attention. Strike the queen hard enough and
the drones swarm; don't strike hard enough and the queen sets the tempo. A fight where doing
*nothing* is not an option but doing *too much* makes everything worse.

**Barnabus the Badger** — *"He was here first."* An old territorial badger who has claimed this
patch of ground as his sovereign territory. He is not cruel — he simply cannot comprehend that
a mouse might have a reason to be here. Enormous, armoured like Old Gloop but slower to commit,
he hits with a casual disregard that is somehow worse than rage. Surviving Barnabus requires
patience and the right exits — he can be manoeuvred, even if he cannot be out-muscled.

**Reward character:** Green-leaning items, natural tools, foods and remedies. The wildwood's
rare unlock: the **Thorn Whip** weapon — adds Green dice instead of Red, with a distinctive
agility-based attack action. Only obtainable as a boss kill reward in this biome.

---

### III. The Ancient Halls — The Kept Memory

*Stone that was once grand. Now crumbled, overgrown, half-flooded, and full of things that have
moved into the silence.*

**What it looks like to Pip:** The ruins are older than the dungeon — the dungeon was built,
maintained, forgotten. The ancient halls were built, celebrated, and then broken. The difference
is legible in every tile: columns that once held a vaulted ceiling now stand in piles; floors
that were once decorated stone are cracked and rising with moss; walls that were once carved
with inscriptions are flaking and half-buried in root systems.

Light is different here. Some rooms have no ceiling — they are open to the sky. Moonlight (or
overcast grey) replaces torchlight in those spaces. Phosphorescent moss fills corners. Sections
are flooded — shallow water that reflects the sky above, which creates an eerie doubling effect.
The palette is the dungeon's stone but aged: grey-brown, dusty, with the occasional vivid green
of moss or blue-silver of moonlit water.

Exits are still doorways, but many are **half-blocked** — partially collapsed archways that
require ducking, squeezing, or navigating around rubble. The squeeze tile (from `tiles-and-props.md`)
is more common here than anywhere else. The architecture is still recognisable as made-by-hands,
but those hands are long gone.

**Tile archetypes specific to the ancient halls:**

| Archetype | Feel | Notes |
|---|---|---|
| **Flooded Chamber** | Knee-deep (to Pip) water; debris floating. Navigation by hopping between exposed surfaces. | 🟢 agility check; the debris changes each visit, making the room unpredictable. |
| **Open Vault** | No ceiling — sky above (night sky, overcast, or clouded moon). | Moonlight changes the palette of this room completely; unsettling after the dungeon's enclosure. |
| **Inscription Panel** | Wall covered in faded carved text. Deciphering it is a 🔵 check. | On success: map information, enemy weakness hint, or a small buff. On failure: nothing. On critical failure (a possible mechanic): a curse. |
| **Column Rubble** | One or more fallen columns forming alternative elevated paths. | 🔴 to climb up; climbing gives a positional advantage in combat (+1 damage for one turn). |
| **Root-Split Floor** | Tree roots have broken through the floor, creating an irregular surface. | Slows movement — or provides cover. A prop-heavy room that feels organic in a way the dungeon does not. |
| **Collapsed Gallery** | A wide room where the upper storey has partially fallen in. | Multiple levels of rubble; above/below are both accessible. |

**Props:** phosphorescent moss, carved fragments, rubble, shallow water puddles, old brazier
frames (cold, no flame), root tendrils, scattered relics (decorative — small carved objects
that have survived the collapse), dried bat droppings.

**Enemies — things that live in old abandoned places:**

| Name | Tier | Feel |
|---|---|---|
| **Stone Mite** | 1 | Tiny creatures that live in old mortar. In large numbers; individually weak. The ancient halls' primary tier-1 encounter often involves more than one. |
| **Mould Bat** | 1 | An older, more sluggish bat than the dungeon's Cave Bat Pup — less nimble but more durable. Teaches that bats in darkness have an advantage Pip must counteract. |
| **Ancient Beetle** | 2 | Huge, slow, encrusted — its shell has actual moss growing on it. An armour puzzle: sustained pressure is less effective than finding a gap. |
| **Ghost Moth** | 2 | Translucent-winged, erratic, drains *pips* rather than HP on a hit — the first enemy that doesn't attack the player's health but their resources directly. Deeply unsettling. |
| **Ruin Adder** | 3 | A cousin of the dungeon's Dungeon Adder — old, sedentary, and extremely patient. Poisons, but the poison works differently: slower, creeping, requiring attention over multiple rooms. |
| **Tomb Warden** | 3 | An ancient mole who has decided this ruin is under his protection. He is not evil; he is old and wrong and very dangerous. Fights intelligently — uses cover, retreats to draw Pip forward. |

**Mechanical identity — Blue pays dividends here.** The ancient halls reward knowledge and
cunning above all else. Inscriptions give tactical advantages to Blue-invested players. Ghost
Moth pip-draining punishes players who roll recklessly and rewards those who analyse before
spending. Flooded chambers require reading the room before moving through it. A Red-heavy player
can brute-force most encounters but misses most of the optional benefits this biome offers.

**Traps:** collapsing floor sections (🟢 agility to spot, 🟢 to react), unstable columns
(🔴 to brace, or move before they fall), cursed inscription (🔵 to resist a malign effect —
pips lost, movement restricted for a turn), a tripwire mechanism left from the original builders.

**NPCs:** An archaeologist mouse — cataloguing the ruin, perpetually startled, will trade
information about what he has mapped so far. A hermit toad who has lived here for decades and
regards Pip with a patient, slightly contemptuous wisdom; he gives advice that is always
technically correct, sometimes in a way that's inconvenient. The ghost of the ruin's original
occupant — not hostile, fragmented, communicates in partial images rather than words; treated as
a unique mechanic where 🔵 checks allow Pip to understand more of what the ghost is saying.

**Shops:** Less a shop, more a cache — a fellow traveller's emergency store, hidden in a
niche. Fewer items, but skewed toward unusual discoveries (relics with effects, enchanted trinkets,
something the archaeologist wants back).

**Boss candidates:**

**The Stone Warden** — *"The walls remember."* An ancient stone effigy that was carved to
protect this place and has been faithfully doing so long after any reason remained. Not
intelligent in the way living creatures are — it simply enacts its purpose. Slow, enormously
powerful, immune to the first hit of any attack sequence (needs to be primed with a light
action before a heavy one lands). The fight is a puzzle as much as a combat.

**Lord Musk the Mole** — *"Beneath this ground, I am the law."* The oldest creature in the
ruin, a mole of extraordinary size who has been digging these passages for so long he has become
part of them. He fights with his foreclaws and with the earth itself — collapsing sections of
the floor, redirecting Pip through chokepoints. Defeating him feels like defeating the ruin
itself; the room goes quiet in a way it wasn't before.

**Reward character:** Blue-leaning items — knowledge tools, map reveals, enemy analysis
items. Ancient relic drops (unique to this biome). The ancient halls' rare unlock: the **Carved
Staff**, a weapon that introduces a Purple die — an early, unstable taste of the magic colour
before it's otherwise available in the meta. Only obtainable as a boss kill reward here.

---

### IV. The Larder — Warm, Rich, and Someone Else's Territory

*A human pantry and cellar seen from mouse-scale. This is Pip's most domestic, most tonally
distinctive environment — and arguably his most dangerous.*

This biome is the Thinker's own suggestion, not a variation on the manager's directions.
It earns its place here because it is the one environment that most fully expresses the
game's core creative tool — the mouse-scale inversion — in a setting that humans would
recognise as safe and familiar. A kitchen pantry is cosy to a person. To a mouse it is an
enemy-held fortress full of traps, rival factions, and a predator who lives here by right.

**What it looks like to Pip:** Wooden floorboards. Brick walls. The undersides of shelves
stretching above like ceilings. Glass jars the size of rooms. The smell of cheese, grain,
dried herbs, and dust, all layered over each other with an intensity that is almost overwhelming.
Light comes through cracks between boards, around the edges of doors — thin, amber, constant
in a way the dungeon's torches are not. The larder is never entirely dark; it is never entirely
lit either.

This is a **warm** biome. The palette shifts completely from the dungeon's cool blue-dark:
warm wood tones, cream and terracotta, the brown of old brick, the amber of thin light.
This is not because it is safer — it is not — but because it is a *domestic* warm. The
danger is in the warmth. The cheerful light conceals the trap.

Exits are not stone archways. They are **gnawed holes** — mouse-sized gaps chewed through
baseboards, gaps behind pipes, the space under a door. The wooden edges are soft, worn from
use. Some exits are tight; many are squeeze-width by default (the larder assumes Pip is small).
Some tiles are accessible only from above or below — the larder has a vertical dimension that
the dungeon mostly does not.

**Tile archetypes specific to the larder:**

| Archetype | Feel | Notes |
|---|---|---|
| **Jar Room** | Inside a large glass jar — curved walls, visible outside world distorted through glass. | Unique visual; the player can *see* other tiles through the glass but cannot interact with them. A contained encounter space. |
| **Shelf Ledge** | A room on a high shelf — open to the air on one side (a dangerous edge). | Height as vulnerability: being knocked toward the edge costs HP (a fall). Also: you can see further from here. |
| **Pantry Passage** | A narrow gap between two shelving units — almost a squeeze in width. | Tight navigation; good ambush terrain for the enemies that live here. |
| **Trap Floor** | A tile dominated by a mousetrap — a literal mechanical device, occupying most of the room. | The trap is visible (unlike dungeon traps); the check is whether to attempt to disarm it (🔴 or 🔵) or route around it. A failed disarm triggers it. |
| **The Cold Store** | A section of the cellar where temperature drops — meat hooks overhead (enormous from Pip's perspective), wrapped items, cold stone floor. | Different from the rest of the larder; quieter, slightly eerie, with different enemies. |
| **The Grain Heap** | An open floor covered in grain — loose surface that makes movement slow and sound-dampening. | 🟢 to move at full speed; otherwise costs additional pips to navigate quickly. |

**Props:** grain and seeds (edible props — Pip can pick them up as minor consumables if the mechanic exists),
cheese rinds (bait for traps, but also edible), glass jar fragments, flour dust, rope bindings,
the edges of cloth sacks, a straw, a pin, wooden splinters.

**Enemies — the residents and rivals of the larder:**

| Name | Tier | Feel |
|---|---|---|
| **House Mouse Rival** | 1 | Another mouse, but territorial. He's been here longer, knows the layout, and resents Pip's presence. Fights with a pin. Not evil — just competitive. |
| **Grain Weevil** | 1 | Small, persistent, and deeply uninteresting individually — but there are always several. Teaches multi-enemy pressure at low stakes. |
| **Domestic Rat** | 2 | Larger than the dungeon rat, more confident, and at home here in a way dungeon rats are not. He knows the exits; he will not be chased out easily. |
| **Cockroach** | 2 | Fast, armored, and immune to shame. Does not stop. A pressure enemy that rewards decisive first-turn commitment — let it get going and it becomes hard to contain. |
| **Cat Scout** | 3 | A young cat, not yet the boss, but already enormous from Pip's perspective. Curious, fast, unpredictable. The first encounter with a feline and it should feel wrong in a way nothing else does — Pip is prey in a way that even the dungeon's weasels don't achieve. |

**Mechanical identity — Red and Yellow both matter here.** The larder is a brute environment:
things are heavier, tighter, and more resistant to cleverness. The mousetrap doesn't care
how smart Pip is — either he's strong enough to deal with it or he isn't. Yellow (fortune)
also rewards players here because the larder has more random hazard than any other biome —
lucky rolls avoid disaster in ways that analysis cannot. Green is less useful here than
anywhere else (there is nowhere to dodge to in a pantry passage).

**Traps:** the mousetrap (iconic, unavoidable encounter); sticky paper (🟢 to detect before
stepping on it; 🟢 to escape; otherwise combat in a disadvantaged state); bait placement
(a scent trail leading toward a trap — a 🔵 check identifies it); a rival mouse's
personal tripwire ("The Warder" — an aggressive territorial encounter rather than a passive trap).

**NPCs:** "The Cook's Mouse" — a domestic mouse who has been here for years and knows every
inch of the pantry. She gives map information freely but will not leave her patch. "Percy the
Dormouse" — a small dormouse deep in the back of the larder who has been trying to sleep
through winter and is extraordinarily grumpy about the interruption. He will trade information
for the promise of quiet. Occasionally a visitor from outside — a field mouse who came in
through a gap in the wall and is looking for a way back out, frightened, useful as a guide
for one floor.

**Shops:** A mouse black-market operation — items traded from the human house's supplies,
with improvised descriptions of what everything "actually does." Thimbles as armour already
exist in the game; the larder is their natural home. Food items are more plentiful here than
anywhere else.

**Boss — Scratch the Cat:**

**Scratch** — *"He doesn't know what mice are for."*

Scratch belongs in the larder more than he belongs in the dungeon. He didn't fall in and lose
his way — this is his territory. He sleeps here. He is fed here, inconsistently, which keeps
him in the pantry more than outside. When Pip encounters Scratch in the larder, Scratch is
in his element: confident, playful in the way that cats are before they kill, and utterly
unbothered by the ethical dimensions of what he is about to do.

The larder's Scratch fight should feel different from any other boss in the game. He does not
have a plan. He is not angry. He plays — which is worse. Random intervals of disengagement
followed by sudden devastating commitment. No intent telegraphing that fully prepares Pip
for what comes next. Surviving Scratch is not about reading his pattern. It is about
maintaining enough pips in reserve that when he decides he is finished playing, Pip is
still standing.

*Alternative boss for biome variety:* **The Warder** — *"This is his pantry. Pip is the intruder."*
An enormous, old domestic rat who has run this larder's black market for years. He has traps,
alliances with the weevils, and enough strategic intelligence to use the pantry's layout against
Pip. A counter-boss to Scratch's chaos — pure territorial intelligence.

**Reward character:** Equipment items (thimble armour, improvised tools), food consumables,
unusual scraps-value items (the larder is where the most random loot lives). The larder's
rare unlock: **The Cooking Needle** weapon — a sewing needle used as a rapier. Adds Red dice
with a distinctive thrust action that ignores one point of Guard. Also the game's best source
of food-based healing items.

---

### V. The Winter Fields — The Stripped World

*Replacing the "desert" direction. Cold, exposed, hungry, and merciless. The most hostile biome.*

**What it looks like to Pip:** Open sky. No ceiling. No walls of any kind in the way the dungeon
has walls — instead, snow-covered ground extending to distances that are psychologically
uncomfortable after the dungeon's enclosure. Cover comes from snow banks, tufts of dead grass,
dry stone walls, the bare bones of shrubs. It is very cold. The world smells of ice and frozen
earth and nothing else.

This is the biome that breaks from the game's established visual register most dramatically. The
dungeon is dark warmth (black-blue base, amber torchlight). The wildwood is dark green. The
ancient halls are grey-brown. The larder is dark wood-warm. The winter fields are **cold pale**
— the palette inverts the dungeon's warmth entirely. Near-white snow, a blue-grey night sky,
cold silver moonlight. No torches. The light source is the sky itself, and it casts no warmth.

Exits are: **snow tunnels** (burrowed, low, cramped), **gaps in dry-stone walls** (exposed
to the wind on both sides), **openings in hedgerow** (dense, thorned, requiring a squeeze).
The winter fields have fewer exits per tile than any other biome — it is genuinely harder to
navigate, which creates a sense of being stranded even as the map grows.

**Tile archetypes specific to the winter fields:**

| Archetype | Feel | Notes |
|---|---|---|
| **Snowbank Room** | A hollow scooped into a snowbank — oddly quiet, surprisingly insulated. | Dark and enclosed; the closest the winter fields get to the dungeon's warmth. A safe-feeling room that is not safe. |
| **Frozen Stream** | Ice over a shallow stream — crossable but unstable. | 🟢 agility check; on failure, breaks through and gets wet — causing a cold status that drains 1 HP per room unless addressed. |
| **Exposed Clearing** | Completely open ground — no cover, no enclosure, fully visible from above. | The dangerous room. Pip is visible from the sky here. In this tile, flying enemies gain an advantage; it also increases the chance of a random hawk encounter event. |
| **Hedgerow Interior** | Inside the body of a dense old hedgerow — tangled wood, dark, full of nesting material and old leaves. | Dense and warm; the best cover in the winter fields. Also home to the hedgehog-adjacent enemies and NPCs. |
| **Hay Barn Corner** | If the winter fields run includes a barn tile, this is a corner of it — vast wooden spaces, hay bale towers. | The only "built" space in the biome; a relief from exposure. Also the most likely spot for a large predator to shelter. |
| **Wind Exposure** | Tile with no shelter from wind — movement costs more, sounds are swallowed, and dice results are slightly penalised. | A narrative hazard: rolling in the wind is harder than rolling in shelter. Pip must find cover. |

**Props:** bare twigs, frost-covered grass stalks, scattered seeds (edible), frozen puddle patches,
animal tracks in the snow, old leaf-nests, bones picked clean and left by a raptor.

**Enemies — the winter makes everything more desperate:**

| Name | Tier | Feel |
|---|---|---|
| **Winter Shrew** | 1 | Hypermetabolic, frantic, will fight for any food source. Aggressive and difficult to disengage from. Teaching note: shrews are always hungry; they do not back down. |
| **Rabbit (Juvenile)** | 1 | Lost, frightened, and large. Not predatory — but panicking, and a panicking rabbit is dangerous to anything nearby. Teaches that size and threat are not the same thing. |
| **Winter Stoat** | 2 | White-coated, fast, confident. The summer stoat is a tier-3 creature; in winter, the stoat is in its element and appears as a tier-2. This is the winter fields' signature enemy — present throughout, always a real threat. |
| **Fieldfare (Thrush)** | 2 | A large thrush bird, aggressive in winter when food is scarce. Hits from above; can be evaded with 🟢 but not easily blocked. |
| **Hungry Robin** | 3 | Robins are territorial and aggressive at the best of times; a winter robin guarding its patch is a genuine danger to anything. Fights with beak strikes that come quickly and unexpectedly. |
| **Fox Cub** | 3 | Young enough to be uncertain, old enough to be deadly. Follows Pip out of something between play and hunger; not as terrifying as a full fox would be, but the encounter conveys the future threat. |

**Mechanical identity — Yellow shines here.** The winter fields is where fortune matters most.
The environment is uncontrolled — a frozen stream can give way at any moment, an exposed clearing
invites sudden aerial attack, wind makes everything less certain. Careful analysis (Blue) helps but
the winter fields resist optimisation in a way other biomes do not. A player who leans into Yellow
(fortune, adaptability) is the best prepared. A heavily Red-invested player finds many things
resistant to force; a heavily Green-invested player finds agility matters but doesn't save them
from environmental damage.

**Traps:** frozen stream (crossing without care), wind exposure (forced exposure turn in certain
tiles), hawk event (the exposed clearing mechanic — a shadow passes overhead, 🟢 to dive for
cover, else forced combat with a hawk), cold status (wet from ice break — persistent HP drain
requiring a warming item or shelter tile).

**NPCs:** A hibernating hedgehog who is deeply annoyed to be awoken but will grudgingly share
what he knows if Pip brings food. A wren in a hedgerow who observes everything that passes through
the winter fields and will talk about what she's seen (directional information, enemy activity
further in). A injured hare — too large to be threatened by Pip, too hurt to move; will trade
information for a healing item.

**Shops:** Rare and improvised. A fellow traveller's cached supplies in a snowbank — fewer
items, higher prices, but stocked with winter-specific gear (warming items, insulation
equipment, cold-weather rations).

**Boss candidates:**

**The Silent Hunter (Barn Owl)** — *"She heard you three tiles ago."*

A barn owl who has claimed the winter fields as her hunting ground. The most tonally extreme
boss in the game — enormously, improbably large from Pip's perspective, supernaturally quiet,
hunting by sound as much as sight. The fight's gimmick: spending pips in large numbers creates
"noise" that accelerates her intent progression. A player who dumps everything into offence
triggers a devastating response. She rewards precision over brute force — exactly two or three
actions per turn, every turn, no big splashes.

**Mara the Winter Fox** — *"She runs this ground."*

A vixen, territorial and experienced. She is not the chaotic predator that Scratch is; she is
deliberate. She uses the winter landscape itself as a tool — circling to force Pip into the
exposed clearing, retreating behind snowbanks to make tracking her difficult. Defeating Mara
requires understanding her pattern and committing to it; she punishes uncertainty more than
any other boss.

**Reward character:** Cold-weather survival items, warming consumables, hardier equipment.
Rare drops: materials that can only be found in winter (frost-touched items with elemental
flavour). The winter fields' unlock: the **Shortbow** weapon — ranged, adds Yellow dice
(not Red), with a unique attack that bypasses some Guard. A weapon for distance and fortune;
fitting for a biome where getting close is often a mistake.

---

## Reward Philosophy: Specialisation Without Siloing

Each biome's reward character creates genuine pull without fragmenting the meta. The baseline
rule: **all biomes award shiny scraps** — meta-progression currency works across all destinations.
The distinction is in what *else* drops:

| Biome | Reward specialty | Rare unlock |
|---|---|---|
| Dungeon | Balanced; all types | Standard boss drops |
| Wildwood | Green items, natural remedies, agility gear | Thorn Whip weapon |
| Ancient Halls | Blue items, relics, knowledge tools | Carved Staff (early Purple die) |
| Larder | Equipment items, food consumables | Cooking Needle weapon |
| Winter Fields | Survival items, cold-weather gear | Shortbow weapon |

**Important:** biome-specific unlocks expand the menu — they are not required for viable
meta-progression. A player who only runs the dungeon can build a complete, functional pool
and weapon collection. A player who explores all biomes finds *more choices*, not more power.
The biomes reward curiosity; they do not punish loyalty.

**No difficulty tier labels.** The biomes have natural gradients (the wildwood is gentler
than the winter fields; the larder's Scratch is a particular kind of terror) but they are
never labelled "easy/normal/hard." Players discover the gradient by playing, which is a
more interesting discovery than a star rating.

---

## Art Direction by Biome

These palette directions use the BiomePalette abstraction established in D8. Each biome
is a new palette — the exit positions, tile grid, and fog-of-war logic are unchanged.

| Token | Dungeon (existing) | Wildwood | Ancient Halls | Larder | Winter Fields |
|---|---|---|---|---|---|
| Background | `#0d0d1a` (dark blue-black) | `#0a120a` (dark forest) | `#0f0d09` (dusty dark) | `#120d08` (dark wood-warm) | `#0b0e14` (cold dark blue) |
| Wall/surface | Blue-grey stone | Dense green-brown undergrowth | Crumbled grey-brown stone | Warm wood plank / brick | Packed snow / ice |
| Primary light | Amber torch glow | Dappled green-yellow shaft | Phosphorescent blue-green | Thin amber (from cracks) | Cold silver moonlight |
| Secondary light | Brazier orange | Bioluminescent blue-white | Moonlight pale grey | — (no secondary source) | Star-glint white |
| Accent | Gold `#c8941e` | Pale fungal yellow | Ancient metal ochre | Terracotta / cream | Ice blue `#a8c8e8` |
| Exit visual | Stone archway | Gap in undergrowth / root tunnel | Partially collapsed arch | Gnawed baseboard hole | Snow tunnel opening |
| Atmosphere | Dark, enclosed, tension | Alive, layered, predatory green | Melancholy, moonlit, historical | Warm, domestic, traps hidden | Cold, exposed, vast |

The key principle: the exit's *visual form* is different per biome, but its *position and
width* are identical. Navigation logic does not change; only the picture.

---

## Cross-Biome Structural Questions for the Designer

These are open questions that the Designer will need to resolve when speccing biome features:

**1. When does the destination board appear?** The camp currently has no biome-selection
affordance. The destination board is the proposed addition — but when does it appear? Options:
always present but with all slots empty except the dungeon; or revealed only after the first
biome unlock. The second feels more appropriate to the game's "discover-don't-advertise" approach.

**2. Does each biome have a distinct floor title card tone?** The meta-progression doc
establishes that each floor starts with a title card. In the wildwood, *"Floor 1 — The Upper
Dark"* does not fit. Each biome should have its own floor naming conventions: the Wildwood's
floors might be *"The Shallow Growth," "The Dense Tangle," "The Canopy Roots"*; the Winter
Fields' *"The Near Field," "The Frozen Ground," "The Open White."* This is concept material,
not a spec — worth noting here so the Designer carries it through.

**3. Do biome-specific Marks of Descent exist?** A "First Wildwood Boss Kill" could be a
Mark separate from "First Dungeon Boss Kill." This gives players two overlapping reasons to
run each biome — for the biome-specific rewards *and* for the biome-specific Marks. Risk:
Mark list grows complex. But the distinction between "first boss killed" generically versus
"first boss killed in each biome" adds meaningful dimension to the achievement arc.

**4. Can a single run cross biomes?** The current concept says no — each run is one biome,
3 floors. But a future direction worth flagging: a run could transition at a floor boundary
(floor 1 dungeon, floor 2 ancient halls, floor 3 wildwood as Pip ascends through geological
layers of a single place). This is mechanically complex and probably not for the first
iteration — but the design should not foreclose it.

**5. Implementation order.** The dungeon is built. Recommended biome implementation order
for the Designer: **Ancient Halls first** (closest to the dungeon's tile grammar — same
stone base, new archetypes, no radical exit redesign), then **Wildwood** (the biggest
visual identity leap — exits, palette, and archetype all change), then **Larder** (highest
tonal distinctiveness), then **Winter Fields** (most complex environmental mechanics).

---

*Related:*
- `docs/concept/overview.md` — dungeon structure and room types (the baseline this extends)
- `docs/concept/tiles-and-props.md` — the four-layer tile model and snapping invariant (every
  biome must obey the snapping rule; new archetypes extend the catalogue)
- `docs/concept/enemies-and-bosses.md` — creature philosophy and threat tiers (biome creatures
  follow the same tier system; the mouse-scale lens applies everywhere)
- `docs/concept/meta-progression.md` — the camp hub, destination board, and Marks of Descent
  unlock structure that gates biome access
