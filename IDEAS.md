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

## Idea 019 — Elastic Canvas Infrastructure

**Area:** UI / System
**Inspiration:** Thinker session — structural prerequisite identified before speccing the run-loop encounter set (020–029).

All encounter types in the run-loop (item rooms, chests, shops, NPCs, traps, boss) share the same underlying stage: the dungeon map is always present, an encounter panel rises from the bottom, and the camera adjusts to suit the situation. None of the individual encounter specs own building this foundation — they assume it. This idea is a call for a **dedicated prerequisite story** that gives the Engineer that foundation before any encounter specs are built on top of it.

What the story should deliver: (1) a clean **navigation register** — map fills the canvas, camera follows Pip at standard zoom, no panel present; (2) a clean **encounter register** — a panel rises from the bottom at a configurable height while the camera adjusts above, both simultaneous at 200–350 ms; (3) a generic **API** that each encounter type plugs into by supplying its panel height and camera behaviour, so the Engineer for each of 020–029 only needs to describe *personality*, not plumbing. The existing combat panel (006) should be retrofitted onto this foundation as part of the story, so it becomes the first proof that the system works.

`docs/concept/screen-layout-and-transitions.md` is 80% of the spec already — the Designer's main job is translating the structural description there into acceptance criteria, resolving the open questions on exact breakpoints and animation curves, and deciding how the tile renderer handles zoom (scale transform vs viewport adjustment). Slot as the first item in the run-loop group, before 020.

---

## Idea 012 — Immersive Combat Overlay

**Area:** UI
**Inspiration:** Manager suggestion during dice pool spec discussion (feature 005).

Instead of the permanent split-screen layout (map top / dice panel bottom), the dice tray appears
as a contextual overlay when combat triggers: it fades up from the bottom and floats over the
lower portion of the tile map. The visible map area above shows a zoomed-in "combat camera" view —
framing Pip and the enemy inside the room with atmospheric dungeon context — so the player never
loses sight of where they are. The result feels more immersive than a hard split, and the dice
tray appears and disappears with the encounter rather than occupying permanent screen estate.
Prerequisites: encounter state machine (006) and a zoom/pan capability in the tile renderer.
Risk: the overlay must not obscure critical combat information (HP bars, action outcomes); the
combat camera zoom needs careful tuning for phone screen sizes. A natural follow-on to feature 006
once the encounter loop is solid.
