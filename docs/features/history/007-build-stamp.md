# 007 · Build Stamp

**Status:** SHIPPED
**Source idea:** Manager request
**Depends on:** 002 (Game Bootstrap)

## Summary

Inject a short build identifier at CI build time and surface it in two places: rendered subtly in the
corner of the Main Menu screen, and printed to the browser console when the app starts. Because the
identifier changes on every push — including PR preview builds — it gives the manager and developer
a quick way to confirm which exact commit is running in any deployed environment without opening
the repo.

## Acceptance criteria

1. A `BUILD_ID` constant is exported from `src/build-id.ts`. In CI it contains the short Git SHA
   (7 chars); when running `npm run dev` locally without the env var set, it falls back to `'dev'`.
2. Both CI workflows (`deploy-pages.yml` and `pr-preview.yml`) pass `VITE_BUILD_ID` as an
   environment variable — set to the short commit SHA — before `npm run build`.
3. On app start, `console.log` emits exactly: `[Pip & Peril] build: <BUILD_ID>` (e.g.
   `[Pip & Peril] build: a1b2c3d`).
4. The build stamp is rendered on the Main Menu screen: bottom-right corner, right-aligned, in
   `colors.textMuted`, at 10 px (logical), reading `build: <BUILD_ID>`.
5. The stamp renders identically at all DPR values (the existing DPR-scaling canvas handles this
   without extra work).
6. `npm run typecheck` passes with no errors after the change.
7. `npm run test` passes with no new failures.

## Scope / non-goals

- The stamp appears only on the Main Menu. It is **not** on the Home, Game, or any future screen
  (those can be added later if wanted).
- No version number, release tag, or changelog link — just the short SHA (and `dev` locally).
- No toggle or "hide in production" switch — it is always visible; it is intentionally subtle rather
  than hidden.
- No new color tokens — `colors.textMuted` is the right visual weight already.

## Design detail

**Data / state**

- New file `src/build-id.ts`:
  ```
  export const BUILD_ID = (import.meta.env.VITE_BUILD_ID as string | undefined) ?? 'dev'
  ```
  Vite exposes any `VITE_*` env var via `import.meta.env` at build time; no `vite.config.ts`
  change is needed.

**CI injection**

Both workflow files add an `env:` block on the build step:
```yaml
- run: npm ci && npm run build
  env:
    VITE_BUILD_ID: ${{ github.sha }}
```
`github.sha` is the full 40-char SHA; `BUILD_ID` truncates it to 7 chars for display (see
Behaviour below).

**Behaviour**

- `game-app.ts` `start()` method logs the stamp to console immediately before starting the RAF
  loop. Import `BUILD_ID` from `../build-id` (or `./build-id` depending on path).
- `src/screens/main-menu.ts` `draw()` renders the stamp string. It imports `BUILD_ID` and derives
  the display string as `'build: ' + BUILD_ID.slice(0, 7)`. Slicing to 7 chars is a no-op for
  locally-set short SHAs and for `'dev'`; it safely truncates the full 40-char `github.sha` if the
  CI env var is ever set to the full SHA.

**Edge cases**

- If `VITE_BUILD_ID` is set to an empty string (e.g. a misconfigured env), the display reads
  `build: ` (blank after colon). This is acceptable — it signals misconfiguration without crashing.
- The stamp string is never null or undefined at runtime; the `?? 'dev'` fallback guarantees a
  string.

## Visual design

**Layout wireframe** — Main Menu screen (390 × 844 logical px)

```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│            PIP & PERIL                 │
│                                        │
│       Fortune Favors the Small         │
│                                        │
│                                        │
│         ┌──────────────────┐           │
│         │    NEW GAME      │           │
│         └──────────────────┘           │
│                                        │
│                          build: a1b2c3d│  ← 10px, textMuted, right-aligned
└────────────────────────────────────────┘
```

**Color tokens**

No new tokens. The stamp uses the existing `colors.textMuted` (`#8b7355`), which is already
the established color for secondary / non-interactive text.

**Typography / sizing**

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Build stamp | `system-ui, -apple-system, sans-serif` | 10 px logical | normal | `colors.textMuted` |

Position: `x = LOGICAL_W - 8` (right-aligned, 8 px margin), `y = LOGICAL_H - 10` (10 px from
bottom). `textAlign = 'right'`, `textBaseline = 'bottom'`.

## Open questions

_(none — this item is READY)_

## Shipped

**Date:** 2026-06-01
**PR:** (pending — see below)

### What was built

- `src/build-id.ts` — new module exporting `BUILD_ID` constant; reads `VITE_BUILD_ID` env var injected by Vite at build time, falls back to `'dev'` locally.
- `src/vite-env.d.ts` — standard Vite+TS declaration file (`/// <reference types="vite/client" />`), required for `import.meta.env` to type-check cleanly.
- `src/game-app.ts` — `start()` now logs `[Pip & Peril] build: <BUILD_ID>` immediately before starting the RAF loop.
- `src/screens/main-menu.ts` — `draw()` renders `build: <BUILD_ID sliced to 7>` in `colors.textMuted` at 10 px, bottom-right corner (`textAlign='right'`, `textBaseline='bottom'`, `x=LOGICAL_W-8`, `y=LOGICAL_H-10`).
- `.github/workflows/deploy-pages.yml` and `pr-preview.yml` — each build step gains `env: VITE_BUILD_ID: ${{ github.sha }}`.

### Test evidence

`npm run test` — 5 tests pass across 2 files:
- `src/main.test.ts` — pre-existing trivial test (still passing)
- `src/build-id.test.ts` — 4 new tests: `VITE_BUILD_ID` env stub, 40-char SHA truncation to 7, `'dev'` passthrough, console log format

`npm run typecheck` — clean, no errors.

### Play-test instructions

1. Run `npm run dev` (or `python3 -m http.server 8000` after `npm run build`).
2. Open the app in a browser and navigate to the Main Menu (it loads there by default).
3. Open the browser DevTools console. Confirm the first log line reads exactly `[Pip & Peril] build: dev` (locally, without `VITE_BUILD_ID` set).
4. On the Main Menu canvas, look at the bottom-right corner. Confirm the text `build: dev` is visible in a muted brownish colour, small (10 px), right-aligned, approximately 8 px from the right edge and 10 px from the bottom.
5. The stamp must not appear on the Home screen or the Game screen — click NEW GAME and verify it is absent on those screens.
6. To verify CI injection: once the PR is merged (or via the PR preview), open the deployed page, check the console and bottom-right corner — both should show a 7-char hex SHA instead of `dev`.
