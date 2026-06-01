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
