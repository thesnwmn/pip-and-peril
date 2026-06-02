# Backlog History

Completed features for **Pip & Peril**, newest first. Each entry is the original backlog summary
kept for reference. Full implementation evidence — what was built, how it was verified, how to
play-test it, and the PR it landed in — lives in the archived spec in `docs/features/history/`.

## Entry format

```
### NNN · Short Title

**Shipped:** YYYY-MM-DD · **PR:** #NN · **Spec:** [docs/features/history/NNN-short-title.md](docs/features/history/NNN-short-title.md)

Original one- or two-sentence summary from the backlog.
```

---

### 006 · Combat Encounter

**Shipped:** 2026-06-02 · **PR:** #TBD · **Spec:** [docs/features/history/006-combat-encounter.md](docs/features/history/006-combat-encounter.md)

Turn-based encounter loop: roll dice pool, spend pips on Strike/Evade/Focus, track HP for Pip and
one enemy (Goblin), resolve win/lose. First complete playable game moment. Enemy rooms cleared on
victory; Pip's HP persists between rooms. Defeat returns to main menu.

---

### 005 · Dice Pool System

**Shipped:** 2026-06-02 · **PR:** [#24](https://github.com/thesnwmn/pip-and-peril/pull/24) · **Spec:** [docs/features/history/005-dice-pool-system.md](docs/features/history/005-dice-pool-system.md)

`DicePool` data model (roll, spend, canAfford, reset) and a dice panel UI rendered in the Game
screen's bottom zone: coloured die faces, pip total badges, ROLL button with ~500 ms animation,
and three placeholder action buttons (Strike, Evade, Focus) that demonstrate the full
roll-to-spend flow. The data API and panel component are ready for 006 to integrate into the
combat encounter loop.

---

### 004 · Navigation & Room Selection

**Shipped:** 2026-06-02 · **PR:** [#21](https://github.com/thesnwmn/pip-and-peril/pull/21) · **Spec:** [docs/features/history/004-navigation-room-selection.md](docs/features/history/004-navigation-room-selection.md)

Direction-first movement: player picks an exit on Pip's current tile; if the destination is
unknown, three playing-card-style room choice cards are offered (room name, tile preview, flavour
tease); chosen tile is placed and Pip moves. Event log records notable room entries; corridors and
backtracking are silent. Status bar shows floor label and depth.

---

### 003 · Tile Map Core

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/003-tile-map-core.md](docs/features/history/003-tile-map-core.md)

Grid data model (`TileCell`, sparse `GameMap`, `FogState`) and a canvas renderer using the Dungeon
biome: staggered brick walls, flagstone floors with per-stone tonal variation, room-type accent
overlays, and fog-of-war. No movement logic. Depends on: 002.

---

### 007 · Build Stamp

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/007-build-stamp.md](docs/features/history/007-build-stamp.md)

Inject a short Git SHA at build time and surface it as a subtle label on the Main Menu screen and
a console log on startup. Makes it trivial to confirm which exact commit is running in any deployed
environment (including PR previews).

---

### 002 · Game Bootstrap

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/002-game-bootstrap.md](docs/features/history/002-game-bootstrap.md)

Three-screen state machine (Main Menu → Home → Game) with canvas-based rendering and a continuous
RAF loop. Establishes the top-level screen architecture that all subsequent gameplay features
render into.

---

### 001 · Project Scaffolding — Vite + TypeScript + Vitest

**Shipped:** 2026-06-01 · **PR:** (pending merge) · **Spec:** [docs/features/history/001-project-scaffolding.md](docs/features/history/001-project-scaffolding.md)

Complete TypeScript + Vite + Vitest scaffolding replacing the POC-only approach. Enables typed
modules, imports across files, and unit tests — the baseline workflow every subsequent feature
depends on.
