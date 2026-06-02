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

### 005 · Dice Pool System

`DicePool` data model (roll, spend, canAfford, reset) and a dice panel UI rendered in the Game
screen's bottom zone: coloured die faces, pip total badges, ROLL button with ~500 ms animation,
and three placeholder action buttons (Strike, Evade, Focus) that demonstrate the full
roll-to-spend flow. The data API and panel component are ready for 006 to integrate into the
combat encounter loop.
See `docs/features/005-dice-pool-system.md` for the full spec.

---

## NEEDS SPEC

### 006 · Combat Encounter

Turn-based encounter loop: roll dice pool, spend pips on attack/dodge, track HP for Pip and one
enemy, resolve win/lose. First complete playable game moment. Depends on: 004, 005.

---

## IN PROGRESS

_(none)_

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
