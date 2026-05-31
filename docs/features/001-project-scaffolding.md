# 001 · Project Scaffolding — Vite + TypeScript + Vitest

**Status:** READY
**Source idea:** manager request
**Depends on:** none

## Summary

Replaces the plain-HTML POC approach with a proper TypeScript project. Vite provides a fast
development server and a production build pipeline; TypeScript gives type safety across the
codebase; Vitest gives a unit test harness that runs in the same module environment. After this
ships, the Engineer can write typed modules, import across files, and run tests — the baseline
workflow every subsequent feature depends on.

## Acceptance criteria

1. `npm install` succeeds with no errors; `package.json` and the lock file are committed.
2. `npm run dev` starts a Vite dev server; opening `http://localhost:5173` shows a dark-background
   canvas with the text "Pip & Peril" centred on it.
3. `npm run build` produces a `dist/` folder that can be served as a static site (no server-side
   code required).
4. `npm run test` runs Vitest and exits with at least one passing test and zero failures.
5. `npm run typecheck` runs `tsc --noEmit` and exits with zero errors.
6. Opening `http://localhost:5173/poc/` shows a POC index page listing all five POCs with working
   links. This is the existing root `index.html` moved to `public/poc/index.html` with its
   internal links adjusted from `poc/tilemap/` → `tilemap/` etc.
7. Opening `http://localhost:5173/poc/tilemap/` (and each other POC path) serves the existing POC
   HTML unchanged.
8. After `npm run build`, `/poc/` and all POC sub-paths are present in `dist/poc/` and work as
   static HTML.
9. The GitHub Pages deploy workflow (`deploy-pages.yml`) is updated to deploy from `dist/` rather
   than the repo root, so the game and POCs are served correctly on merge to `main`.
10. `CLAUDE.md` Commands section is updated with the five commands (`dev`, `build`, `test`,
    `typecheck`, and the static-server fallback).
11. A decision record is added to `DECISION_REGISTER.md` superseding D3, recording the choice of
    Vite + TypeScript + Vitest and the rationale.

## Scope / non-goals

- No game logic — `src/main.ts` is a placeholder that draws text to a canvas only.
- No migration of POC code into TypeScript — POCs stay as plain HTML in `poc/`.
- No linting or formatting tooling (ESLint / Prettier) — can be added later.
- No CI changes beyond updating the deploy workflow to point at `dist/`.
- No CSS preprocessors or UI frameworks.

## Design detail

### Tech stack choices

| Concern | Choice | Rationale |
|---|---|---|
| Bundler / dev server | Vite (latest stable) | Zero-config, HMR out of the box, fast cold starts, native TypeScript support |
| Language | TypeScript (strict mode) | Matches the `kebab-case` module conventions already recorded; catches errors early |
| Test harness | Vitest | Same config as Vite; runs in the same module environment; no extra setup |
| Rendering | Browser Canvas API (no library) | Matches POC approach; keeps the bundle lean; full control over render loop |
| State management | Plain TS classes | No reactive framework needed at this scale |

**Alternative considered — Phaser.js:** A game framework would provide sprite management, scene
graphs, and animation helpers. Rejected for now: Phaser adds ~1 MB to the bundle, imposes its
own scene/state model, and the game logic is simple enough that a raw canvas loop is cleaner.
Revisit if asset management becomes complex.

### Project structure

```
/
├── src/
│   ├── main.ts              ← Vite entry point; creates canvas, draws placeholder text
│   └── main.test.ts         ← example Vitest test (tests a trivial utility)
├── public/
│   └── poc/
│       ├── index.html       ← POC landing page (was root index.html; links adjusted)
│       ├── tilemap/         ← POC 1, moved from poc/tilemap/
│       ├── dice/            ← POC 2, moved from poc/dice/
│       ├── dungeon/         ← POC 3, moved from poc/dungeon/
│       ├── combat/          ← POC 4, moved from poc/combat/
│       └── rooms/           ← POC 5, moved from poc/rooms/
├── index.html               ← Vite's HTML entry point (the game; new file)
├── vite.config.ts           ← Vite + Vitest configuration
├── tsconfig.json            ← strict TypeScript config targeting ES2022 / DOM
└── package.json
```

The existing `poc/` folder at the repo root is moved to `public/poc/` via `git mv` — no code
changes to the POC files, only the landing page's internal links adjusted (strip the `poc/`
prefix since it is now served from `/poc/` itself). The game's new `index.html` (Vite entry)
takes over the root.

### `vite.config.ts` key settings

```ts
// outline only — Engineer fills in the real config
export default defineConfig({
  // publicDir defaults to 'public' — no override needed
  build: { outDir: 'dist' },
  test: { environment: 'jsdom' }
})
```

Vite's default `publicDir: 'public'` copies everything in `public/` to `dist/` as-is, so
`public/poc/` becomes `dist/poc/` automatically. No plugin required.

### `tsconfig.json` key settings

- `"target": "ES2022"`, `"lib": ["ES2022", "DOM"]`
- `"strict": true`
- `"moduleResolution": "bundler"`
- `"noEmit": true` (Vite handles the actual transpilation)

### Placeholder `src/main.ts`

Mounts a `<canvas>` on `document.body`, sizes it to `390 × 844` (portrait phone reference),
fills with `#0d0d1a`, draws "Pip & Peril" centred in gold (`#c8941e`) at 24 px. No game loop.

### Updated deploy workflow

The `deploy-pages.yml` job needs a build step before deploy:

```yaml
- uses: actions/setup-node@v4
  with: { node-version: '22' }
- run: npm ci && npm run build
- uses: JamesIves/github-pages-deploy-action@v4
  with:
    branch: gh-pages
    folder: dist          # ← changed from .
    clean: true
    clean-exclude: pr-*/
```

## Open questions

_(none — all choices above are recommendations the Engineer can act on; no manager decision
blocks this item)_
