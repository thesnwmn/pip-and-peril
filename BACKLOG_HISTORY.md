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
