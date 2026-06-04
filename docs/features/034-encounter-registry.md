# 034 · Encounter Registry

**Status:** READY
**Source idea:** Manager request
**Depends on:** 033 (cleaner game.ts foundation)

## Summary

As more encounter types land (021, 023, 025–028), each one needs a panel, a trigger, map-view
adjustments, and a transition lifecycle. Without a shared abstraction this logic accumulates
inside `screens/game.ts` as a growing tangle of encounter-specific branches. This feature
defines what an encounter panel *is* — a full-canvas module that can render anywhere, declare
how the map should look during the encounter, handle input, and signal completion — and builds
an **encounter registry** that manages trigger detection, rise/fall transitions, and outcome
routing for any panel registered with it. Combat is refactored as the first consumer and the
reference implementation. After this feature, adding a new encounter type means creating a panel
module and registering it; nothing else changes.

## Acceptance criteria

1. An encounter registry module exists that owns the encounter lifecycle: trigger detection,
   panel creation, the rise/fall transition animation, and outcome routing. The logic currently
   spread across `checkCombatTrigger`, `startFallingTransition`, and `computeCanvasState` in
   `game.ts` moves here.

2. An encounter panel specification (a TypeScript interface or equivalent contract) is defined
   and documented. It covers at minimum:
   - A `draw(ctx, timestamp)` method with unrestricted canvas access.
   - A map-view configuration (see criterion 5) the panel may optionally provide.
   - `handleClick(x, y)` and `handlePointerMove(x, y)` methods.
   - A mechanism for the panel to signal that the encounter is complete and what the outcome is.

3. The combat encounter is extracted into a self-contained panel module that implements the
   encounter panel specification. All combat-specific code (combat state machine, action
   callbacks, dice panel wiring, combat log, HP tracking) moves into this module or its
   sub-modules. `screens/game.ts` retains no combat-specific logic.

4. Adding a new encounter type requires only: writing a panel module that implements the
   encounter panel spec, and registering it with the registry (trigger condition + factory).
   No changes to `screens/game.ts` or the registry core are needed.

5. The registry supports map-view configuration declared by the active panel. A panel may
   specify a zoom level and how the camera centres during the encounter; the registry passes
   this to the map rendering step before the map is drawn. Navigation (no active encounter)
   uses default view; combat uses its existing zoom. A panel that declares no configuration
   gets the default view.

6. The registry supports encounter panels that draw anywhere on the canvas — including over
   the map zone — by calling the panel's `draw()` after the map has been rendered, with no
   clipping restriction applied to the panel's draw call.

7. All existing behaviour is unchanged: combat, encounter transitions, navigation, overlays,
   menus, and satchel work identically to before this refactor.

8. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

## Scope / non-goals

- No new encounter types are built here (those are 021, 023, 025–028).
- The encounter panel specification should cover only what combat demonstrably needs today,
  with extension points noted as comments. Do not over-specify for encounters that don't exist yet.
- No changes to navigation panel (033's work) or to the satchel/menu modal.
- No changes to player-visible behaviour or UI.

## Dependencies

- 033 — navigation panel extract (cleaner `game.ts` before restructuring encounter wiring)

## Design detail

### Encounter lifecycle

```
Pip enters a room
        │
        ▼
Registry checks trigger conditions
        │ match found
        ▼
Panel module instantiated
        │
        ▼
  ┌─── RISING ───────────────────────────┐
  │ Transition animation                  │
  │ Registry interpolates panel-top       │
  │ Panel's map-view config applied       │
  └──────────────────────────────────────┘
        │ animation complete
        ▼
  ┌─── ACTIVE ───────────────────────────┐
  │ Panel owns input                      │
  │ Panel draws anywhere on canvas        │
  │ Panel draws over map zone freely      │
  │ Panel signals outcome when ready      │
  └──────────────────────────────────────┘
        │ outcome signalled
        ▼
  ┌─── FALLING ──────────────────────────┐
  │ Transition animation (reverse)        │
  │ Map-view returns to default           │
  └──────────────────────────────────────┘
        │ animation complete
        ▼
Registry applies outcome to game state
(update inventory, route to next screen,
 clear room, award gold, etc.)
```

### What a panel can do

```
┌─────────────────────────────────────────┐  ← status bar (registry/game.ts)
│                                         │
│   MAP ZONE                              │
│   ─────────────────────────────────     │
│   Panel may draw here freely:           │
│   • NPC portrait overlaid on tiles      │
│   • Environmental colour wash           │
│   • Boss intro artwork                  │
│   • Any overlay the encounter calls for │
│                                         │
├─────────────────────────────────────────┤  ← panel-top (animated by registry)
│                                         │
│   PANEL ZONE                            │
│   ─────────────────────────────────     │
│   Primary home for encounter UI:        │
│   • Dice, action buttons (combat)       │
│   • Merchant inventory (shop)           │
│   • Dialogue tree (NPC)                 │
│   • Loot reveal (chest)                 │
│                                         │
└─────────────────────────────────────────┘
```

### Map-view configuration

The map view is currently hardcoded in `computeCanvasState()`: navigation uses zoom 1.0 and
default pip centering; combat uses a tighter zoom and shifts pip toward the map area centre.
After this refactor, each encounter panel optionally declares its preferred map-view: a zoom
factor and a pip vertical target. The registry reads this once per frame and passes it to the
map renderer; it does not hard-code any encounter-specific values.

Encounters that want the default navigation view declare nothing. Combat declares the same zoom
and pip-centering it uses today. Future encounter types can declare their own:
- Boss: a more dramatic zoom, perhaps pip offset to one side
- Trap: a brief snap-zoom before settling
- NPC: slight camera shift, no zoom, to leave room for a portrait overlay

The precise shape of this configuration (what fields it contains) is the Engineer's call; the
intent is that the registry, not `game.ts`, is the only place that reads it and applies it.

### Outcome signalling

A panel signals completion by calling a callback it receives at creation time, passing an
outcome value. The outcome tells the registry what happened so the registry can apply the
correct game-state update. The combat encounter today has two outcomes: `victory` and `defeat`.
Future panels will add outcomes appropriate to their type (e.g., `left`, `purchased`,
`collected`, `trapped`). The registry maps each outcome to a handler; handlers it does not
recognise should cause a visible error in development.

### Registry as a thin coordinator

The registry is a coordinator, not a rules engine. It knows:
- Which panel factory corresponds to which trigger condition
- How to run the rise/fall transition
- How to pass map-view config to the renderer
- Which outcome handler to call when the panel completes

It does not know anything about goblin HP, dice pips, gold, or any other encounter-specific
detail. All of that lives in the relevant panel module.

### Trigger conditions

Each encounter type registers a trigger function: given the current dungeon cell, does this
encounter activate? The registry checks all registered triggers when Pip enters a room and
activates the first match. Today only `enemy` rooms trigger combat; this is the hook that
future encounter types use to register their own conditions.

### Extension point note

If a future encounter needs to alter how individual tiles are *rendered* (e.g., a fire effect
colouring specific tile cells), that requires a drawing hook earlier in the pipeline — before
the map is drawn — which this registry does not address. That is a separate, future extension.
The panel's post-map `draw()` access covers all known use cases in the current backlog.

## Open questions

None that block this item. The combat panel's existing behaviour is the reference; the
Engineer picks the specific interface shapes.
