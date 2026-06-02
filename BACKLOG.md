# Backlog

Active feature list for **Pip & Peril**, ordered by priority. The Engineer always takes the top
**READY** item. Completed items live in [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md).

## Statuses

- **READY** — fully specced (`docs/features/NNN-*.md` exists), dependencies met, buildable now.
- **NEEDS SPEC** — idea captured, Designer needs to flesh it out before it can be built.
- **IN PROGRESS** — currently being built. At most one item should ever be here.

## Item format

```
### NNN · Short Title

One- or two-sentence summary of the feature and the player value.
See `docs/features/NNN-short-title.md` for the full spec.   ← only once specced (READY)
```

---

## READY

### 016 · Pip's Satchel

Full-screen in-world overlay opened by a persistent bottom-right button: Pip's worn leather
satchel with four compartments — Pouch (gold + items), Journal (stub), Tally (live run stats),
Map (stub). Establishes the inventory data model (gold + Item list) and pauses navigation while
open; greyed and blocked during combat. Opens with a ≈300 ms buckle-unfasten animation.
See `docs/features/016-pip-satchel.md` for the full spec.

### 017 · Soft Camera Follow

Decouples the viewport from Pip's exact position: the camera follows through a configurable dead
zone (default 3×3 tiles) so Pip can roam freely within the central band without the map scrolling.
The camera only catches up when Pip exits the zone. Near the dungeon boundary the camera clamps,
letting Pip walk toward the visible edge. Makes each step feel more alive — the world shifts in
the direction of travel instead of pinning Pip like a crosshair.
See `docs/features/017-soft-camera-follow.md` for the full spec.

---

## NEEDS SPEC

_(none)_

---

## IN PROGRESS

### 008 · Menu Button & Pause Modal

Replaces the raw text back-links on the Home and Game screens with a proper MENU button in the
status bar. Tapping it opens a modal with meta actions: Settings (stub) and a context-labelled
End Run / Back to Menu. End Run requires a confirmation step. All in-game info (stats, map,
inventory) belongs to the future Satchel — this menu is deliberately administrative only.
See `docs/features/008-menu-button-pause-modal.md` for the full spec.

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
