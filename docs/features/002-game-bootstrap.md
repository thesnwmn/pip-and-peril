# 002 · Game Bootstrap — Screen State Machine & Menus

**Status:** READY
**Source idea:** manager request
**Depends on:** 001

## Summary

Establishes the top-level screen architecture for Pip & Peril: a state machine with three screens
(Main Menu, Home, Game) and the transition logic between them. The Main Menu gives the player a
starting point with a "New Game" button; the Home screen is the between-runs hub with a "Start Run"
button; the Game screen hosts a canvas and a `requestAnimationFrame` loop that all subsequent
gameplay features will render into. After this ships, the Engineer building 003 (Tile Map Core) has
a live, correctly-sized canvas and a running tick loop to plug into.

## Acceptance criteria

1. Opening the app shows the Main Menu screen: the title "PIP & PERIL", the tagline
   "Fortune Favors the Small", and a "New Game" button. No other screen is visible.
2. Clicking "New Game" transitions to the Home screen.
3. The Home screen shows a "START RUN" button, a flavour text line, and a "← Main Menu" back link.
4. Clicking "← Main Menu" on the Home screen returns to the Main Menu.
5. Clicking "START RUN" transitions to the Game screen.
6. The Game screen shows a dark canvas (390 × 844 px logical size, filled with `--bg`) and a
   "← Quit Run" link. No other content.
7. Clicking "← Quit Run" transitions back to the Home screen.
8. Only one screen is visible at a time; transitioning tears down the outgoing screen's DOM nodes
   and mounts the incoming screen's nodes — hidden screens are not merely concealed.
9. The `requestAnimationFrame` loop starts when entering the Game screen and is cancelled before
   leaving it (no dangling ticks on a detached canvas).
10. `npm run typecheck` exits with zero errors.
11. `npm run test` continues to pass with no new failures.

## Scope / non-goals

- No game content — the Game canvas is blank (filled `--bg`); the tick callback is a no-op stub
  for 003+ to fill in.
- No save/resume — "New Game" is the only entry point; resume is a future feature.
- No between-runs upgrade UI — the Home screen is a stub; that content is a future feature.
- No screen transition animations — transitions are instant; visual polish is a future enhancement.
- No audio.
- The placeholder "Pip & Peril" text drawn to canvas by the feature 001 `main.ts` is removed;
  the canvas is blank in 002.

## Design detail

### Screen state machine

```ts
type Screen = 'main-menu' | 'home' | 'game'
```

A `GameApp` class owns `currentScreen: Screen` (initially `'main-menu'`) and exposes
`transitionTo(next: Screen): void`. On transition:

1. If `currentScreen === 'game'`, stop the RAF loop first.
2. Clear `#app` children.
3. Mount the new screen's DOM nodes into `#app`.
4. If `next === 'game'`, start the RAF loop.
5. Update `currentScreen`.

If `transitionTo` is called with the already-active screen it is a no-op.

### Rendering approach

Menu screens (Main Menu, Home) are **HTML/CSS**, mounted into `<div id="app">` in `index.html`.
The Game screen is a `<canvas>` also mounted into `#app`. When the Game screen is active, `#app`
contains only the canvas (plus the "← Quit Run" overlay link).

Menus are structure and text — HTML/CSS is the correct tool, giving accessible, scalable,
responsive layout without extra code. Canvas is reserved for game-world rendering where per-pixel
control is needed. This distinction should be recorded as a decision (D8).

### RAF loop

```ts
let rafId: number | null = null

function startLoop(canvas: HTMLCanvasElement): void {
  function tick(_timestamp: DOMHighResTimeStamp): void {
    // 003+ will render here
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}
```

The `canvas` parameter is passed into `startLoop` so future features can retrieve the 2D context
without reaching into the DOM.

### File structure

```
src/
├── main.ts            ← replaced: creates GameApp, calls app.mount()
├── game-app.ts        ← new: GameApp class, Screen type, transitionTo()
├── screens/
│   ├── main-menu.ts   ← new: returns DOM nodes for Main Menu
│   ├── home.ts        ← new: returns DOM nodes for Home
│   └── game.ts        ← new: returns canvas element; owns startLoop/stopLoop
├── style.css          ← new: global reset, layout, shared button styles
└── main.test.ts       ← unchanged
```

Each screen module exports a factory function returning the root element(s) to mount and any
teardown / callback hooks (e.g. `onNewGame`, `onStartRun`, `onQuit`, `onMainMenu`).

### Edge cases

- The RAF loop must be stopped before the canvas is detached. `transitionTo` enforces this order.
- Canvas is sized at 390 × 844 px (logical); `style.width/height` may scale it to fill the
  viewport via CSS — consistent with the portrait-first decision (D1).

## Visual design

### Layout wireframe — Main Menu

```
┌──────────────────────────────┐  ← #app, max-width 390px, centred
│                              │
│                              │
│                              │  ~30vh padding-top
│       PIP & PERIL            │  title, clamp(32px,8vw,48px), bold, --gold
│  Fortune Favors the Small    │  tagline, 14px, italic, --text-muted
│                              │
│                              │
│  ┌────────────────────────┐  │
│  │       NEW GAME         │  │  primary button
│  └────────────────────────┘  │
│                              │
│                              │
└──────────────────────────────┘
```

### Layout wireframe — Home screen

```
┌──────────────────────────────┐
│ ← Main Menu                  │  back link, 12px, --text-muted, top-left
│                              │
│                              │
│           HOME               │  24px, bold, --text-primary, centred
│                              │
│  The dungeon awaits, Pip.    │  flavour text, 14px, --text-muted, centred
│  Choose your moment.         │
│                              │
│                              │
│                              │
│  ┌────────────────────────┐  │
│  │       START RUN        │  │  primary button
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Layout wireframe — Game screen

```
┌──────────────────────────────┐
│ ← Quit Run                   │  back link, 12px, --text-muted, absolute top-left
│                              │
│                              │
│                              │
│    [canvas, --bg fill]       │  390 × 844 logical px
│                              │
│                              │
└──────────────────────────────┘
```

### Color tokens

No new tokens required. All elements use the established palette:

| Usage | Token | Value |
|---|---|---|
| Page / canvas background | `--bg` | `#0d0d1a` |
| Panel / container background | `--surface` | `#14142a` |
| Title, button borders & text | `--gold` | `#c8941e` |
| Body / heading text | `--text-primary` | `#e8d5b0` |
| Secondary text, back links | `--text-muted` | `#8b7355` |
| Button hover background | `--surface-raised` | `#1c1c36` |

### Typography / sizing

| Element | Size | Weight | Style | Color |
|---|---|---|---|---|
| Main menu title | `clamp(32px, 8vw, 48px)` | bold | uppercase | `--gold` |
| Tagline | `14px` | normal | italic | `--text-muted` |
| Screen heading ("HOME") | `24px` | bold | — | `--text-primary` |
| Flavour / body text | `14px` | normal | — | `--text-muted` |
| Button label | `18px` | bold | uppercase | `--gold` |
| Back / secondary links | `12px` | normal | — | `--text-muted` |

### Button style (shared)

```
border: 1px solid var(--gold)
border-radius: 4px
padding: 12px 32px
background: var(--surface)
color: var(--gold)
cursor: pointer
width: 100%
max-width: 280px

:hover { background: var(--surface-raised) }
```

## Open questions

_(none — all choices above can be acted on immediately)_
