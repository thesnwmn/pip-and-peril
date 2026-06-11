# Tile Variety & Props — Art / World Direction

> *Every tile looks the same. The dungeon should breathe.*

This note sets the direction for making the dungeon feel **varied, atmospheric, and alive** without
breaking the thing that makes navigation work: tiles that **snap together**. It is concept
material, not a spec — the Designer turns the pieces below into backlog items, and the discrete,
spec-able seeds live in `IDEAS.md` (008–011).

---

## The problem

Today every placed tile is the same square stone room. It differs only by **colour tint** and a
single **room-type icon**. Walk ten steps and you have seen the whole dungeon. The exploration
pillar promises *discovery*; identical rooms quietly break that promise. A corridor should *read*
as a corridor; a cavern should feel rough and close; a chasm should make you hesitate before you
cross.

The fix is not "more art for art's sake". It is to recognise that a tile is really **four
independent things stacked on top of each other**, and only one of them is currently allowed to
vary.

---

## The four layers of a tile

A tile is the composition of four orthogonal layers. Keep them independent and the variety
multiplies for free (4 layouts × N archetypes × 7 room types × M prop sets), while each layer stays
simple to reason about.

```
   ┌─────────────────────────────────────────────┐
 4 │  PROPS         torches, rocks, bones, glints  │  scattered objects, mostly cosmetic
   ├─────────────────────────────────────────────┤
 3 │  ROOM TYPE     enemy / shop / chest / …       │  colour tint + icon + border (EXISTS)
   ├─────────────────────────────────────────────┤
 2 │  ARCHETYPE     chamber / passage / cavern / …  │  the SHAPE & substance inside   (NEW)
   ├─────────────────────────────────────────────┤
 1 │  EXIT LAYOUT   N/E/S/W openings               │  where the doorways are        (EXISTS)
   └─────────────────────────────────────────────┘
```

1. **Exit layout** — which walls have a doorway (dead-end, straight, corner, T, crossroads). This
   already exists and is constrained so doorways align across neighbours.
2. **Interior archetype** — *the new dimension*. The shape and material of the space **between** the
   doorways: a grand chamber, a tight passage, a rough cavern, a chasm with a bridge, a well, a
   magic pool. This is what's missing today.
3. **Room type** — the encounter identity, expressed as the colour tint, icon, and border. Already
   implemented; layers cleanly on top of any archetype.
4. **Props** — small objects scattered on the tile (wall torches, rubble, bones, mushrooms, a
   glint of coins). Mostly cosmetic; a few double as feature anchors.

A corridor tile becomes "**straight layout + passage archetype + corridor type + a wall torch**". A
boss arena becomes "**crossroads layout + pillared archetype + boss type + braziers**". Same machine,
wildly different feel.

---

## The snapping invariant (the one rule that must not break)

Tiles snap together because **doorway openings are at fixed positions** — a corridor-width gap,
centred on each exited wall (in POC 5: width `cw`, offset `co`). Pip walks from one tile's east
doorway straight into the next tile's west doorway, and the map stays consistent.

**The contract:** an archetype may reshape *anything inside the walls*, but it must leave the
doorway openings exactly where the layout puts them, at the standard width, flush to the tile edge.
Everything between the doorways is free real estate. As long as each archetype "delivers" the floor
to each doorway, tiles snap no matter how strange their interiors are.

This is the whole trick. It means we can add cave-ins, chasms, and pools forever without ever
touching navigation logic.

---

## Interior archetype catalogue

The starting set. Most are pure visual variety (Designer can ship them as a skin with zero
mechanical change); a few are flagged as **feature** archetypes that *want* a mechanic later.

| Archetype | Feel | Shape rule | Notes |
|---|---|---|---|
| **Chamber** | The current square room. Solid, neutral. | Full square floor between walls. | The default; still the right answer sometimes, especially shops/NPCs. |
| **Passage** | A real corridor — you pass *through*, not *into*. | Floor only as a corridor-width strip connecting the doorways; the rest is wall. | For 2 exits this is a straight run or an L; for 4 it's a clean crossroads. Reads instantly as "just a way through". |
| **Cavern** | Rough, close, natural. | Irregular rock-hewn floor blob, slightly **narrower** than a chamber; rubble speckle, no neat flagstones. | Atmosphere tile. The manager's "rough rock walls, slightly narrower". |
| **Chasm + Bridge** | A held breath. A pit splits the room. | Interior is a dark drop; a plank or stone **bridge** spans it, connecting the aligned doorways. | Feature candidate: a 🟢 agility check to cross, or a place a trap fires. Drama. |
| **Well / Cistern** | A landmark. | Chamber with a circular stone well in the centre. | Feature candidate: drop a coin for luck, draw something up, a sound cue. |
| **Magic Pool / Shrine** | Eerie, inviting. | Chamber with a glowing pool (purple/cyan) in the centre; faint ripple light. | Feature candidate; ties to the future 🟣 Magic die — drink/scry/risk. |
| **Pillared Hall** | Grand, ceremonial. | Chamber with 2–4 stone columns set in the floor quadrants (clear of doorways). | Good under boss / shop types; columns frame an encounter. |
| **Rubble / Collapse** | Damaged, hazardous. | Chamber with rubble piles narrowing the path; cracked floor. | Atmosphere; could host a one-off "clear the rubble" 🔴 check. |
| **Squeeze** | *Only Pip fits.* | A crack far **narrower** than a normal doorway; jagged walls; a mouse-hole motif. | Directly serves the "Pip's small size is a mechanic" pillar — shortcuts/secret routes big enemies can't follow. Feature candidate. |

Archetypes should be **weighted by room type and depth**, not uniform: corridors lean Passage,
deeper floors lean Cavern/Rubble/Chasm, Magic Pools are rare, Squeezes rarer still and treated as a
treat. The same depth dial that already biases room types can bias archetypes.

---

## The props layer

Props are small objects laid over a finished tile. They are the cheapest, highest-impact variety:
the same chamber with a guttering torch by the door and a scatter of bones feels handmade.

**Two families:**

- **Decor props** — purely cosmetic: wall torches, floor rubble/rocks, bones & skulls, glowing
  mushrooms, cobwebs, puddles, moss, a glint of coins, cracks of light. They set mood and never
  affect rules.
- **Feature props** — the visible handle for an interaction: the well, the magic pool, a brazier, a
  signpost, a statue. These are usually the *centrepiece* of a feature archetype rather than
  scattered.

**Anchors, not coordinates.** A prop declares *where it's allowed to sit*, and the placer fills
those slots. Proposed anchor zones:

```
  wall-N            ┌──[door]──┐
  wall-E/W/S        │ corner    corner │     center  (one feature prop max)
  corner-NW/NE/…    │   ·  center  ·    │
  center            └──[door]──┘
```

- **Wall anchors** mount on the wall band, biased to the stretches *beside* doorways — exactly where
  a real torch would be. Torches, sconces, banners, chains, cobwebs.
- **Floor-corner anchors** sit in the floor quadrants. Rubble, bones, mushrooms, puddles, coins.
- **Center anchor** is reserved for one feature prop (well, pool, brazier) and suppresses other
  center clutter and the room-type icon.

**Placement rules that keep it readable on a phone:**

- Never place a prop over a doorway opening (preserves the snapping read and the "this is an exit"
  signal).
- Cap density (e.g. 0–3 decor props per tile) so tiles stay legible at thumbnail size.
- A prop's palette derives from the tile (torch glow tints the surrounding stone) so props feel
  *lit by* the room, not pasted on.
- Torches and braziers are the one prop allowed to cast light — a soft radial glow is the single
  biggest "this place is alive" win and worth doing well.

---

## Why this serves the pillars

- **Tile exploration** — variety is the literal point of exploring; sameness was undercutting the
  core loop.
- **Portrait / mobile** — all of this renders at thumbnail size with the existing primitives;
  archetypes change *shape*, which reads faster than texture on a small screen.
- **Pip as character** — the Squeeze archetype turns his smallness into traversable geography, not
  just flavour text.
- **Tone (Redwall meets Hades)** — torchlight, wells, and mushroom-lit caverns are the cosy-but-
  tense fantasy register the brief asks for; charm on the surface, a chasm underneath.
- **Future 🟣 Magic** — the Magic Pool/Shrine gives the not-yet-built purple die a home in the world
  before it's a mechanic.

---

## Open questions for the Designer

- **Flavour-first or mechanics-first?** Recommendation: ship archetypes + props as a pure **visual
  skin** first (no rule changes, fastest win, de-risks the renderer), then promote Chasm / Well /
  Pool / Squeeze to real interactions in a later item.
- **Where do archetype + prop weights live?** Likely an extension of the existing depth-based
  room-type pools — one table that biases layout, archetype, *and* props together by depth.
- **Art approach** — this stays within D8 (procedural canvas, `BiomePalette`). Archetypes are new
  `drawCell` branches; props are a new draw pass. No external assets required, and the same hook
  that swaps in sprites later still applies.
- **Authoring vs. random** — are feature tiles (a specific well room) hand-placeable, or always
  emergent from the random composer? Probably both: random for texture, occasional authored set
  pieces for rhythm.

---

*Visual exploration:* **Tile Gallery** (`gallery.html`) renders the full archetype catalogue using the
real game renderer. Served in dev at `/gallery.html` and included in the production build. The
POC (`public/poc/tiles/`) has been retired — the live gallery is now the single source of truth.
