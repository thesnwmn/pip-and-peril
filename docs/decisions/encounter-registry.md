# Encounter Registry Pattern — Decision Detail

**Register entry:** D10  
**Introduced:** Feature 034

---

## Choice

All encounter types implement a single `EncounterPanel` interface and register with an
`EncounterRegistry`. The registry owns trigger detection, rise/fall transitions, map-view config
application, and outcome routing. It has no knowledge of any encounter's business logic.
New encounter types plug in via `registry.register()` without touching `game.ts`.

## Context

Before Feature 034, the combat encounter was implemented directly inside `game.ts`. Adding a
second encounter type would have required branching that file again — and there were at minimum
five encounter types planned (item room, trap, chest, shop, NPC, boss). Each type has different
camera needs, panel heights, and outcome paths.

## The EncounterPanel interface

Every encounter panel implements:

```ts
interface EncounterPanel {
  draw(ctx: CanvasRenderingContext2D, timestamp: number): void;
  handleClick(x: number, y: number): void;
  handleMove?(x: number, y: number): void;
  mapView?: MapViewConfig;        // optional camera/zoom override
  onComplete: (outcome: string) => void;  // set by registry at creation
}
```

`mapView` is declared on the panel type but owned by the registry — the registry reads it each
frame and applies it to the map renderer. The panel itself never touches camera state.

`onComplete` is a callback passed at factory time. When the encounter resolves (victory, defeat,
fled, purchased, collected, etc.), the panel calls `onComplete(outcome)`. The registry maps
outcome strings to handler functions.

## The registration model

```ts
registry.register({
  trigger: (tile: TileCell, state: RunState) => boolean,
  factory: (tile, state, onComplete) => EncounterPanel,
});
```

- `trigger` fires on every tile-enter event. The first registration whose trigger returns true
  wins; triggers are checked in registration order.
- `factory` creates the panel instance. The registry holds the live panel and calls its methods
  each frame.

Combat was refactored as the reference implementation of this pattern in Feature 034.

## Layering during transitions

During RISING:
1. Nav panel renders as the background layer.
2. Encounter panel rises on top.

During FALLING (after victory/leave):
1. A clean nav panel (IDLE state) renders from the start of fall.
2. Encounter panel falls away.

During FALLING (after defeat):
1. Same as above, but the outcome handler routes to the run-summary screen rather than revealing
   the nav panel.

## Why this approach

- **game.ts stays thin**: it manages the top-level RAF loop and routes input, not encounter logic.
- **Encounter types are isolated**: combat does not know about traps; traps do not know about shops.
  Each is a self-contained module.
- **Outcomes are data**: new outcome strings (`'left'`, `'purchased'`, `'trap-hit'`) are added as
  needed; the registry maps them to handlers at registration time.

## Consequences

- Every new encounter type must implement the `EncounterPanel` interface in full.
- Trigger order matters — combat is registered last (lowest priority), so specialised tiles
  (boss, stairwell) have higher-priority triggers.
- The `mapView` config declared on a panel is applied for the panel's full lifetime; transitions
  handle the interpolation.
- The registry is the only place allowed to start or stop encounter transitions. Panels signal
  completion only via `onComplete`; they do not animate their own fall.
