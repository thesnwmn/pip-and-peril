# 002 · Game Bootstrap — Screen State Machine & Menus

**Status:** SHIPPED
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

1. Opening the app shows the Main Menu rendered on canvas: the title "PIP & PERIL", the tagline
   "Fortune Favors the Small", and a drawn "NEW GAME" button.
2. Clicking inside the "NEW GAME" button area transitions to the Home screen.
3. The Home screen is drawn on the same canvas: "HOME" heading, flavour text, a "START RUN"
   button, and a "← Main Menu" back-link.
4. Clicking the "← Main Menu" area on the Home screen returns to the Main Menu.
5. Clicking the "START RUN" button area transitions to the Game screen.
6. The Game screen shows a blank canvas (filled `--bg`) with a "← Quit Run" text link drawn
   in the top-left. No other content.
7. Clicking the "← Quit Run" area transitions back to the Home screen.
8. A single `requestAnimationFrame` loop runs continuously from app start; each tick calls the
   current screen's draw function. No separate loop per screen.
9. Hovering over a button or link redraws it in its hover state (background lightens to
   `--surface-raised`); moving away redraws it in its default state.
10. `npm run typecheck` exits with zero errors.
11. `npm run test` continues to pass with no new failures.

## Scope / non-goals

- No game content — the Game canvas is blank (filled `--bg`); the tick callback is a no-op stub
  for 003+ to fill in.
- No save/resume — "New Game" is the only entry point; resume is a future feature.
- No between-runs upgrade UI — the Home screen is a stub; that content is a future feature.
- No screen transition animations — transitions are instant; visual polish is a future enhancement.
- No audio.
- The placeholder "Pip & Peril" canvas text from feature 001 `main.ts` is replaced by the
  Main Menu draw function.

## Design detail

### Screen state machine

```ts
type Screen = 'main-menu' | 'home' | 'game'
```

A `GameApp` class owns `currentScreen: Screen` (initially `'main-menu'`) and exposes
`transitionTo(next: Screen): void`. A transition is just `currentScreen = next` — no DOM
manipulation. The continuous RAF loop will call the new screen's draw function on its next tick.

If `transitionTo` is called with the already-active screen it is a no-op.

### Rendering approach

**Everything is drawn on a single `<canvas>`**. The canvas is created once at app start and never
replaced. Menu screens are drawn with canvas 2D API calls — text, filled rects, stroked rects —
using the same approach as the game screen. There is no HTML/CSS for UI; no DOM nodes are created
or destroyed on transition.

This is consistent with the existing rendering decision (D3-v2: Browser Canvas API, no library)
and keeps the entire visual surface in one place.

### RAF loop

A single loop runs from app start until the page is unloaded:

```ts
function tick(timestamp: DOMHighResTimeStamp): void {
  currentScreen.draw(ctx, timestamp)
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
```

Each screen module exports a `draw(ctx, timestamp)` function. The Game screen's draw function is
a no-op stub in 002; 003+ will fill it in.

### Input handling

A single `'click'` and a single `'mousemove'` listener are attached to the canvas at app start.
Both convert the browser event coordinates to canvas logical coordinates (accounting for
`devicePixelRatio` and any CSS scaling), then delegate to `currentScreen.handleClick(x, y)` or
`currentScreen.handlePointerMove(x, y)`. Each screen maintains its own `hoveredElement` state;
changing it causes the next tick to redraw with the hover style applied.

```ts
canvas.addEventListener('click', (e) => {
  const { x, y } = toCanvasCoords(e, canvas)
  currentScreen.handleClick(x, y)
})
canvas.addEventListener('mousemove', (e) => {
  const { x, y } = toCanvasCoords(e, canvas)
  currentScreen.handlePointerMove(x, y)
})
```

### File structure

```
src/
├── main.ts              ← replaced: creates canvas, GameApp; starts RAF loop
├── game-app.ts          ← new: GameApp class, Screen type, canvas setup, event wiring
├── screens/
│   ├── main-menu.ts     ← new: draw() + handleClick() + handlePointerMove() for Main Menu
│   ├── home.ts          ← new: same interface for Home
│   └── game.ts          ← new: same interface for Game (draw is a stub)
└── main.test.ts         ← unchanged
```

Each screen module exports an object (or class instance) conforming to:

```ts
interface ScreenController {
  draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void
  handleClick(x: number, y: number): void
  handlePointerMove(x: number, y: number): void
}
```

The `GameApp` passes a `transitionTo` callback into each screen's factory so screens can trigger
navigation without holding a reference to `GameApp`.

### Canvas setup

```ts
const LOGICAL_W = 390
const LOGICAL_H = 844
const dpr = window.devicePixelRatio ?? 1
canvas.width = LOGICAL_W * dpr
canvas.height = LOGICAL_H * dpr
canvas.style.width = `${LOGICAL_W}px`
canvas.style.height = `${LOGICAL_H}px`
ctx.scale(dpr, dpr)
```

All draw calls and hit-test coordinates use logical pixels (390 × 844). DPI scaling is handled
once at setup and is invisible to screen modules.

### Edge cases

- `toCanvasCoords` must account for both `devicePixelRatio` and any CSS `transform: scale()`
  applied to fit the canvas into smaller viewports (future enhancement); in 002 no scaling is
  applied, so `getBoundingClientRect()` suffices.
- Hit-test rects for buttons should be defined as named constants within each screen module so
  they stay in sync with the draw calls that render them.

## Visual design

All visual elements are drawn with the Canvas 2D API. Coordinates are in logical pixels
(390 × 844 canvas). The wireframes below are layout guides; exact pixel positions are the
Engineer's call within the constraints given.

### Layout wireframe — Main Menu

```
┌──────────────────────────────┐  390 × 844 logical px
│                              │
│                              │
│                              │  ~250px from top
│       PIP & PERIL            │  title — see typography
│  Fortune Favors the Small    │  tagline
│                              │
│                              │
│  ┌────────────────────────┐  │  button centred, ~55px tall, ~280px wide
│  │       NEW GAME         │  │
│  └────────────────────────┘  │
│                              │
│                              │
└──────────────────────────────┘
```

### Layout wireframe — Home screen

```
┌──────────────────────────────┐
│ ← Main Menu           16,24  │  back link — top-left, 16px from left, 24px from top
│                              │
│                              │
│           HOME               │  heading, centred ~300px from top
│                              │
│  The dungeon awaits, Pip.    │  flavour text, centred, two lines
│  Choose your moment.         │
│                              │
│                              │
│                              │
│  ┌────────────────────────┐  │  button centred, bottom quarter
│  │       START RUN        │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Layout wireframe — Game screen

```
┌──────────────────────────────┐
│ ← Quit Run            16,24  │  back link — top-left, same position as Home back link
│                              │
│                              │
│    [blank --bg fill]         │  no other content in 002
│                              │
│                              │
└──────────────────────────────┘
```

### Color constants

CSS custom properties are not used for canvas drawing. These map directly to the established
palette and should be defined as named constants in a shared `colors.ts` module:

| Constant | Hex | Role |
|---|---|---|
| `bg` | `#0d0d1a` | Canvas background fill |
| `surface` | `#14142a` | Button default background |
| `surfaceRaised` | `#1c1c36` | Button hover background |
| `gold` | `#c8941e` | Title, button border & label |
| `textPrimary` | `#e8d5b0` | Screen headings |
| `textMuted` | `#8b7355` | Tagline, flavour text, back links |

### Typography / sizing

`ctx.font` strings use `system-ui, -apple-system, sans-serif` as the font stack.

| Element | `ctx.font` | `fillStyle` |
|---|---|---|
| Main menu title | `bold 48px system-ui, …` | `gold` |
| Tagline | `italic 14px system-ui, …` | `textMuted` |
| Screen heading ("HOME") | `bold 24px system-ui, …` | `textPrimary` |
| Flavour / body text | `14px system-ui, …` | `textMuted` |
| Button label | `bold 18px system-ui, …` | `gold` |
| Back / link text | `12px system-ui, …` | `textMuted` |

### Button draw spec (shared)

```
// default state
fillRect(x, y, w, h)  →  surface
strokeRect(x, y, w, h)  →  gold, lineWidth 1
fillText(label, centred)  →  gold

// hover state
fillRect(x, y, w, h)  →  surfaceRaised
strokeRect(x, y, w, h)  →  gold, lineWidth 1
fillText(label, centred)  →  gold
```

Corner radius on the stroke rect: `ctx.roundRect(x, y, w, h, 4)` if supported; plain `strokeRect`
as fallback.

## Open questions

_(none — all choices above can be acted on immediately)_
