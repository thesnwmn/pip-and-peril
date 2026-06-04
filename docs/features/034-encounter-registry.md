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

The RISING transition is a layered animation: by the time an encounter triggers, the nav panel
is already in WHISPER mode (the card-tap transition per feature 035). The encounter panel slides
up from off-screen below the whisper-showing nav panel; once it covers the nav zone the nav panel
is discarded. The FALLING transition on a victory outcome reverses this: the encounter panel
slides back down, revealing a clean nav panel in IDLE mode underneath.

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

7. Core gameplay behaviour is preserved — combat mechanics, navigation, overlays, menus, and
   satchel work identically to before this refactor. The one intentional visible change is the
   transition animation: the layered rise/fall described in criterion 8 and the Design detail
   replaces the current single-surface animation.

8. At encounter trigger the registry instantiates the encounter panel and begins the RISING
   animation with the encounter panel starting at LOGICAL_H (fully off-screen below). By this
   point the nav panel is already in WHISPER mode (the card-tap that moved Pip into the room
   triggered the CHOOSING → WHISPER transition per feature 035). The registry renders both
   panels each frame during the rise — nav panel at its normal position as the background
   layer, encounter panel rising above it — until the encounter panel top reaches PANEL_TOP,
   at which point the nav panel is discarded.
   On a **victory** outcome, the FALLING animation slides the encounter panel back to
   LOGICAL_H; the nav panel is rendered from the start of the fall in IDLE mode (reset: no
   cards, no whisper) so it is visible as soon as the encounter panel retreats below PANEL_TOP.
   Once the encounter panel exits the screen the encounter is cleared and navigation resumes.
   On a **defeat** outcome, the existing behaviour is preserved: the fall exits to the main
   menu without a navigation reveal.

9. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

## Scope / non-goals

- No new encounter types are built here (those are 021, 023, 025–028).
- The encounter panel specification should cover only what combat demonstrably needs today,
  with extension points noted as comments. Do not over-specify for encounters that don't exist yet.
- No changes to the satchel/menu modal.
- The nav panel's content modes (IDLE/CHOOSING/WHISPER) are 035's concern. This feature
  only needs the nav panel to expose one hook: reset to IDLE after a victory outcome.
- The layered transition animation is an intentional visible change; all other player-facing
  behaviour is unchanged.

## Dependencies

- 033 — navigation panel extract (cleaner `game.ts` before restructuring encounter wiring)
- 035 — nav panel content modes (always-visible nav panel with IDLE/CHOOSING/WHISPER states
  that this feature layers encounter panels on top of)

## Design detail

### Encounter lifecycle

```
Pip enters a room
        │
        ▼
Registry checks trigger conditions
        │ match found
        ▼
Nav panel: cards dismissed, whisper triggered
Encounter panel instantiated
        │
        ▼
  ┌─── RISING ───────────────────────────────────────────────┐
  │ Nav panel visible at normal position (background layer)   │
  │ Encounter panel rises from LOGICAL_H (foreground layer)   │
  │ Encounter panel's map-view config applied                 │
  │ Nav panel discarded once encounter panel top ≤ PANEL_TOP  │
  └──────────────────────────────────────────────────────────┘
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
  ┌─── FALLING ──────────────────────────────────────────────┐
  │ Encounter panel slides back to LOGICAL_H                  │
  │ Clean nav panel revealed underneath (victory only)        │
  │ Map-view returns to default                               │
  │ Defeat: exits to main menu — no nav reveal                │
  └──────────────────────────────────────────────────────────┘
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

### Layered transition

During the RISING and FALLING animations the canvas has two panel layers in play simultaneously.
Draw order each frame:

```
┌─────────────────────────────────────────┐
│  Map zone (rendered first)              │
│  Nav panel map-zone content (whisper)   │  ← background layer, discarded once covered
├─────────────────────────────────────────┤  ← PANEL_TOP
│  Nav panel zone content                 │  ← background layer
├─────────────────────────────────────────┤  ← encounter panel top (animating upward)
│  Encounter panel content                │  ← foreground layer
└─────────────────────────────────────────┘  ← LOGICAL_H
```

**RISING** — encounter panel climbs from LOGICAL_H toward COMBAT_PANEL_TOP:
- The nav panel stays pinned at its normal position and renders as usual, except room
  selection cards have been dismissed and the situated whisper is active.
- The encounter panel is drawn on top at its current animated position.
- The moment the encounter panel top reaches PANEL_TOP the nav panel is discarded; only the
  encounter panel renders from that point forward.
- Map-view (zoom, camera centering) transitions from navigation defaults toward the encounter
  panel's declared configuration over the course of the animation.

**FALLING on victory** — encounter panel drops from COMBAT_PANEL_TOP to LOGICAL_H:
- A clean nav panel (idle state: no cards, no whisper) is rendered as the background layer
  from the start of the fall, so it is visible as soon as the encounter panel retreats below
  PANEL_TOP.
- Map-view returns to navigation defaults over the course of the fall.
- Once the encounter panel exits the bottom of the screen, it is discarded and navigation
  resumes normally.

**FALLING on defeat** — unchanged from current behaviour:
- Encounter panel slides to LOGICAL_H, then the run is reset and the game transitions to the
  main menu. No nav panel is rendered during or after the fall.

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
