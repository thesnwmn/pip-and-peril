# Build Tooling — Decision Detail

**Register entry:** D3-v2  
**Introduced:** Feature 001

---

## Choice

**Vite + TypeScript + Vitest**, replacing the plain static HTML proof-of-concept approach.

## Context

The project began as a set of static HTML POCs in `poc/` — no module system, no type-checking,
no tests. This was deliberate for speed of early exploration. By Feature 001, enough design
direction existed that a proper baseline was needed before game code accumulated.

## Why Vite

- Zero-config dev server with hot module replacement — no webpack configuration to maintain.
- Native ES-module support; TypeScript transpilation is built in.
- Production build to `dist/` with asset hashing, ready for GitHub Pages deployment without a
  custom CI step.
- Extremely fast cold starts; HMR updates sub-second.

## Why TypeScript

The game has a non-trivial data model: dice pools, tile maps, enemy specs, item interjection
windows, MetaState. TypeScript catches shape errors at edit time rather than at play-test time.
With a canvas-based renderer (no framework types to lean on), typed interfaces are the main
safety net against passing wrong data to draw functions.

## Why Vitest

- Shares Vite's config and transformer — no separate babel/jest setup.
- Tests run in the same module environment as production code, so imports resolve identically.
- Pure-function game logic (damage mitigation, dice pool operations, offer weight normalization)
  is the primary test target; Vitest's speed matters more than browser compatibility for this use.

## Alternatives considered

- **Plain Jest + Babel**: Additional config and transformer; slower cold start; module resolution
  differences between test and prod environments caused by CJS/ESM gaps.
- **No test harness**: Viable for a prototype; not acceptable once combat mechanics and item
  interactions made manual regression testing impractical.
- **Rollup directly**: Vite is already built on Rollup for production; using Vite gives the dev
  server for free.

## Consequences

- All source lives in `src/` as TypeScript modules; `poc/` POCs are archived and no longer built.
- `npm run dev / build / test / typecheck` are the four canonical commands (see `CLAUDE.md`).
- Future Engineers should run `bash init.sh` at the start of each session to verify the full chain.
