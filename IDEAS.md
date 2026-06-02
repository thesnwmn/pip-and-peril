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

## Idea 002 — Soft Camera Follow

**Area:** UI
**Inspiration:** Manager suggestion; the concept doc currently locks the viewport centred on Pip, which may feel mechanical.

Instead of hard-centering the viewport on Pip at all times, Pip can roam freely within the central 3×3 tiles of the visible grid; the camera only scrolls when she would exit that zone (or when she is near the dungeon boundary, where the map edge takes precedence and she can reach the visible edge). This gives the movement a more alive, dynamic quality — the world shifts in the direction of travel rather than keeping Pip pinned like a crosshair. Open question: on a portrait phone the visible area is already constrained; if the viewport shows, say, 7×9 tiles the 3×3 dead zone may feel subtler than expected, so the exact zone size needs playtesting against screen real estate.

---

## Idea 003 — In-Game Context Menu

**Area:** UI
**Inspiration:** Manager suggestion; the current navigation design has a back/backtrack affordance that may end up as a standalone button.

Replace any dedicated "back" button with a lightweight in-game context menu (a small icon or gesture in a corner) that surfaces multiple options in one place: backtrack / retreat, inspect current tile, check run stats, abandon run. This avoids cluttering the portrait layout with multiple persistent controls, and a menu naturally scales as more options are added (inventory, map zoom, settings). Risk: adding a tap-to-open menu introduces one extra step for backtracking, which is a frequent action — the menu may need a swipe or long-press shortcut to stay out of the way during normal navigation.

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

## Idea 011 — Feature Tiles as Interactions

**Area:** World
**Inspiration:** Manager — "bridges across chasms, a well in the room, a magic pool".

Promote a few archetypes from decoration to interaction. Chasm+Bridge → a 🟢 agility check (or trap
trigger) to cross; Well/Cistern → drop a coin for a luck boon or draw something up; Magic
Pool/Shrine → a 🟣-flavoured drink/scry/gamble that foreshadows the future Magic die. Each is a
small dice-pool encounter reusing the existing resolution system, flavoured by the tile rather than
a generic room. Recommend these land *after* the visual archetype skin (Idea 008) so the renderer
is proven first. Risk: scope creep — keep each interaction to a single check at first.

---

## Idea 001 — Room Entry Surprises

**Area:** World
**Inspiration:** Removed from feature 004 spec to keep scope tight.

When Pip enters a notable room, there's a small chance (~20%) the log message is undercut by a
"surprise" clause — the enemy is already dead, the shop is sold out, the chest is empty. Adds
personality and stops every room feeling formulaic. Needs a small string table per room type
(e.g. Enemy: "Already dead." · "It flees before you can act.", Shop: "Sold out. Bare shelves.").
Risk: if too frequent it becomes its own kind of predictable.

---

## Idea 013 — Pip's Satchel (In-Game Context Hub)

**Area:** UI
**Inspiration:** Manager suggestion — "a menu styled on Pip's satchel showing inventory, quests, settings, end run — a mix of pause menu and browser."

**Updated:** Settings and end-run now handled by the Menu Button modal (Idea 015). The satchel is purely in-world — Pip's possessions and records.

A single persistent satchel-icon button (bottom-right, thumb-friendly on portrait mobile) opens a full-screen overlay styled as the interior of Pip's worn leather explorer satchel: aged canvas lining, brass rivets, warm brown and amber tones that contrast with the dungeon's cold blues and blacks. Opening plays a short buckle-unfasten micro-animation (≈300 ms, skippable on tap). The overlay is organized into named **compartments** navigated by small pocket-icons or stitched tab labels along the base:

- **Pouch** (default): inventory — items and consumables shown as small drawn objects on worn canvas; stub-friendly (empty pouch is fine before inventory exists as a system)
- **Journal** (folded parchment): Pip's notes and active objectives, written in-character in Pip's voice rather than as a sterile quest log
- **Tally** (scrap of paper): run stats — rooms entered, enemies defeated, depth, pips spent; formatted as tally marks and scribbled numbers
- **Map** (parchment sketch): see Idea 014 for the full design of this compartment

The overlay pauses navigation (arrows hidden, room selection blocked). During combat it is blocked entirely — in-combat item use is interesting but belongs in a later, dedicated design. When blocked, the satchel icon should appear greyed rather than hidden so the player learns it exists.

Supersedes the lightweight-menu intent of Idea 003 (which can remain as a reference; this is the fuller version). Idea 003's "backtrack" option stays as an in-map gesture, not a satchel item.

---

## Idea 015 — Menu Button & Pause Modal

**Area:** UI
**Inspiration:** Manager — resolves the tension of where settings and end-run live; the existing "← Quit Run" / "← Main Menu" back links are misaligned relative to the status bar and mix navigation with meta-actions.

Replace the current top-left back/quit text link on the **Home** and **Game** screens with a small **MENU** button (or ≡ icon) that is visually aligned as a proper member of the status bar row rather than a floating text link. Tapping it opens a clean, player-facing modal overlay — deliberately *not* styled in the satchel aesthetic, since its contents are meta (player-facing, not Pip-facing):

- **Settings** — audio toggles, display options; expandable as features accumulate
- **Quit Run / Back** — context-labelled depending on screen: "End Run" on Game (with a confirmation step to prevent accidents), "Back to Menu" on Home (no confirmation needed)
- **Save / Load** (future slot, stubbed or hidden for now)

The modal uses the existing dark palette (surface, gold border, text-primary) in a conventional centred card style. It pauses whatever state the current screen is in while open. Tapping outside the modal or pressing a close button dismisses it.

**Consistent across screens:** the same button and the same modal shell appear on Home and Game. The button label and modal option list change per screen (the quit action is labelled and weighted differently), but the visual component is shared. Main Menu has no menu button — you're not yet in a session.

**Alignment fix:** the current back link sits at y ≈ 24 as a raw text draw, outside the status bar's visual rhythm. The new menu button should be vertically centred within the status bar zone (y 0–50), sized and positioned to sit flush with the other bar elements (floor label, HP bars during combat). This is a polish fix that ships as part of introducing the button, not separately.

---

## Idea 014 — Dungeon Sketch (Satchel Map Tab)

**Area:** UI / World
**Inspiration:** The satchel as an explorer's kit; a mouse cartographer sketching her route on parchment as she goes.

A compartment within the Satchel showing Pip's hand-drawn overhead sketch of the explored dungeon: rooms as rough pencil rectangles on aged parchment, corridors as connecting ink lines, room types denoted by small inked symbols (a skull for enemy, a coin stack for shop, a scroll for NPC, a question mark for unresolved). The sketch is deliberately imprecise — slightly off-square rooms, mildly crooked lines — reinforcing in-world charm rather than acting as a nav tool. Unexplored tiles are blank parchment; the absence of marks is the fog. This is a different visual register from the game's precision tile renderer: the game map is what Pip *sees*; the sketch is what Pip *remembers and records*.

Rough shape: a sepia/cream parchment fills the centre panel of the satchel view; the dungeon graph is redrawn in a "sketchy" style (slightly randomised line offsets per session) at a scale that fits the whole explored run on one page; Pip's current position is a small mouse-paw icon. Open questions: does the sketch build progressively as Pip enters rooms (new rooms fade in), or appear all-at-once when the satchel opens? Progressive feels more alive; all-at-once is simpler. Does this tab only appear once at least one room beyond the starting tile has been explored?

This can be specced independently of whether the rest of the satchel is built first — the parchment sketch is a fully self-contained visual feature once the satchel overlay shell exists.

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
