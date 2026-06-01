# Backlog History

Completed features for **Pip & Peril**, newest first. Each entry is the **implementation evidence**
for a shipped item: what was built, how it was verified, how to play-test it, and the PR it landed
in. The feature's full spec is archived in `docs/features/history/`.

## Entry format

```
### NNN · Short Title

**Shipped:** YYYY-MM-DD · **PR:** #NN · **Spec:** docs/features/history/NNN-short-title.md

**What was built**
A short description of the change and which acceptance criteria it satisfies.

**Evidence**
- Tests: which tests were added/run and that they pass (e.g. `npm test` → N passing).
- Type-check / build: result, if a toolchain exists.

**Play-test**
1. Concrete, sequential steps a human can follow to see the feature working.
```

---

### 002 · Game Bootstrap

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** docs/features/history/002-game-bootstrap.md

**What was built**
Three-screen state machine (Main Menu → Home → Game) with canvas-based rendering and a continuous RAF loop. The Main Menu displays the game title and tagline with a clickable "NEW GAME" button. The Home screen shows flavour text and a "START RUN" button to begin a run, with a back-link to the Main Menu. The Game screen provides a blank canvas that subsequent gameplay features will render into. A single event loop runs from app start, delegating each frame to the current screen's draw function. All UI interactions (buttons, links) support hover states with visual feedback.

**Evidence**
- Tests: `npm run test` → 1 passing (no new failures)
- Type-check: `npm run typecheck` → 0 errors (tsc --noEmit)
- Browser verification: All three screens render correctly with proper typography, colors, and layout
- Screen transitions: All bidirectional transitions (Main Menu ↔ Home ↔ Game) work correctly
- Input handling: Button and link hit-detection precise; hover states render on mousemove
- RAF loop: Single continuous loop confirmed, no separate loops per screen

**Play-test**
1. `npm run dev` — start the dev server at http://localhost:5173
2. Visit http://localhost:5173 — Main Menu displays with "PIP & PERIL" title, "Fortune Favors the Small" tagline, and "NEW GAME" button (centred, with gold border and background)
3. Hover over "NEW GAME" button — background lightens from dark to lighter shade
4. Click "NEW GAME" — transitions to Home screen (no animation, instant change)
5. Home screen displays: "← Main Menu" link (top-left), "HOME" heading (centred), flavour text ("The dungeon awaits, Pip. Choose your moment."), and "START RUN" button (lower centre)
6. Hover over "START RUN" button — background lightens like in step 3
7. Click "← Main Menu" link — transitions back to Main Menu
8. Verify Main Menu is identical to step 2 — state machine correctly restored
9. Click "NEW GAME" again, then click "START RUN" — transitions to Game screen
10. Game screen displays: blank dark canvas with "← Quit Run" link in top-left corner
11. Hover over "← Quit Run" — text colour brightens (visual feedback)
12. Click "← Quit Run" — transitions back to Home screen
13. From Home, click "START RUN" again — transitions to Game (verifying forward transition works repeatedly)
14. Observe that RAF loop is running: no jank, smooth rendering at 60fps

---

### 001 · Project Scaffolding — Vite + TypeScript + Vitest

**Shipped:** 2026-06-01 · **PR:** (pending merge) · **Spec:** docs/features/history/001-project-scaffolding.md

**What was built**
Complete TypeScript + Vite + Vitest scaffolding replacing the POC-only approach. Vite provides dev server with HMR and production bundling; TypeScript brings type safety; Vitest provides unit testing in jsdom environment. POCs preserved as static HTML in `public/poc/`, served from `/poc/` paths in production build. All five npm commands implemented: `dev`, `build`, `test`, `typecheck`. GitHub Pages deploy workflow updated to build and deploy from `dist/`.

**Evidence**
- Tests: `npm run test` → 1 test passing, 0 failures
- Type-check: `npm run typecheck` → 0 errors (tsc --noEmit)
- Build: `npm run build` → 60ms, gzip 0.26 KB (index.html) + 0.61 KB (JS)
- Dev server: `npm run dev` → Vite ready on http://localhost:5173
- Production build verified: root serves game HTML, `/poc/index.html` serves POC listing, `/poc/tilemap/` serves tilemap POC, all POCs accessible as static HTML

**Play-test**
1. `npm run dev` — start the dev server at http://localhost:5173
2. Visit http://localhost:5173/ — should show a dark canvas with "Pip & Peril" text (canvas rendering via src/main.ts)
3. Visit http://localhost:5173/poc/index.html — should show the POC index page with links to all 5 POCs
4. Visit http://localhost:5173/poc/tilemap/index.html (or build, then /poc/tilemap/) — should show the tile map POC with grid and controls
5. Run `npm run build` — should complete successfully and create `dist/` folder with all files including POCs
6. Serve `dist/` folder with any static server (e.g. `python3 -m http.server`) — all paths should work as in steps 2-4
7. `npm run test` → all tests pass
8. `npm run typecheck` → no type errors
