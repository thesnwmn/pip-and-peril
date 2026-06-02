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

### 004 · Navigation & Room Selection

Direction-first movement: player picks an exit on Pip's current tile; if the destination is
unknown, three playing-card-style room choice cards are offered (room name, tile preview, flavour
tease); chosen tile is placed and Pip moves. Event log records notable room entries; corridors and
backtracking are silent. Status bar shows floor label and depth.
See `docs/features/004-navigation-room-selection.md` for the full spec.

---

## NEEDS SPEC

### 005 · Dice Pool System

Die colour types (Red, Blue, Green, Yellow), roll logic, pip display, and a spend-pips API.
Covers the full dice-roll-to-action flow from POC 2. Depends on: 002.

### 006 · Combat Encounter

Turn-based encounter loop: roll dice pool, spend pips on attack/dodge, track HP for Pip and one
enemy, resolve win/lose. First complete playable game moment. Depends on: 004, 005.

---

## IN PROGRESS

_(none)_

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
