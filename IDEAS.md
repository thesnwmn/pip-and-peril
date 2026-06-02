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

## Idea 001 — Room Entry Surprises

**Area:** World
**Inspiration:** Removed from feature 004 spec to keep scope tight.

When Pip enters a notable room, there's a small chance (~20%) the log message is undercut by a
"surprise" clause — the enemy is already dead, the shop is sold out, the chest is empty. Adds
personality and stops every room feeling formulaic. Needs a small string table per room type
(e.g. Enemy: "Already dead." · "It flees before you can act.", Shop: "Sold out. Bare shelves.").
Risk: if too frequent it becomes its own kind of predictable.
