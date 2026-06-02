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

## Idea 001 — Room Entry Surprises

**Area:** World
**Inspiration:** Removed from feature 004 spec to keep scope tight.

When Pip enters a notable room, there's a small chance (~20%) the log message is undercut by a
"surprise" clause — the enemy is already dead, the shop is sold out, the chest is empty. Adds
personality and stops every room feeling formulaic. Needs a small string table per room type
(e.g. Enemy: "Already dead." · "It flees before you can act.", Shop: "Sold out. Bare shelves.").
Risk: if too frequent it becomes its own kind of predictable.
