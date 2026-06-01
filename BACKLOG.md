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

_(none)_

---

## NEEDS SPEC

### 002 · Game Bootstrap

Game entry point, canvas initialisation, and a minimal game-loop shell (requestAnimationFrame).
Establishes the screen/state-machine pattern that navigation and combat screens will plug into.
Depends on: 001.

### 003 · Tile Map Core

Grid data model (tile types, exit bitmask, fog-of-war state) and a canvas renderer. No movement
logic — just the map as a data structure and a way to draw it. Depends on: 002.

### 004 · Navigation & Room Selection

Direction-first movement: player picks an exit on Pip's current tile; if the destination is
unknown, three room-type cards are offered; chosen tile is placed and Pip moves. Implements the
core dungeon build-up mechanic from POC 5. Depends on: 003.

### 005 · Dice Pool System

Die colour types (Red, Blue, Green, Yellow), roll logic, pip display, and a spend-pips API.
Covers the full dice-roll-to-action flow from POC 2. Depends on: 002.

### 006 · Combat Encounter

Turn-based encounter loop: roll dice pool, spend pips on attack/dodge, track HP for Pip and one
enemy, resolve win/lose. First complete playable game moment. Depends on: 004, 005.

---

## IN PROGRESS

### 001 · Project Scaffolding — Vite + TypeScript + Vitest

Replaces the plain-HTML POC approach with a proper TypeScript project: Vite for dev server and
build, Vitest for unit tests. No game logic — just the toolchain every subsequent feature depends on.
See `docs/features/001-project-scaffolding.md` for the full spec.

---

## DONE

See [BACKLOG_HISTORY.md](BACKLOG_HISTORY.md) for all completed items.
