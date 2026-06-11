# Elastic Canvas Architecture — Decision Detail

**Register entry:** D9, D11  
**Introduced:** Feature 030

---

## Choice

The dungeon map canvas is **always present and never compressed**. Encounter panels **rise from
the screen bottom** as an overlay while the camera adjusts upward simultaneously. The map zone
clip region is a constant (`MAP_Y` to `LOGICAL_H`); panels draw on top of the lower portion of
the map rather than pushing it up.

## Context

Before Feature 030, combat had a split layout: navigation used the full screen height, but
entering combat compressed the map to ~45% height to make room for the combat panel. This made
the dungeon feel spatially unstable — the world shrank when something important happened.

## The architectural decision

Two rendering registers:

| Register | Map clip | Panel | Camera |
|---|---|---|---|
| **Navigation** | Full height (`MAP_Y` to `LOGICAL_H`) | None | Soft-follow (dead-zone, feature 017) |
| **Encounter** | Same full height — unchanged | Rises from bottom over the map | Zoomed to encounter target (room or Pip), clamped |

The map clip region **never changes**. Encounter panels overlay the lower portion of the map
rather than compressing it. The dungeon is always the stage; panels are always transient overlays.

## Transition contract

Every encounter panel uses the same animation contract:

- **Rise:** 200–350ms ease-out; panel and camera zoom start simultaneously.
- **Fall:** 200–350ms ease-in; panel falls, camera returns to navigation follow simultaneously.
- Nav input is blocked for the duration of the transition (short enough that no feedback message
  is needed).
- The clean nav panel (IDLE state) renders from the start of the fall so the background beneath
  the departing panel is always correct.

Each encounter type provides an `EncounterConfig` object with four fields:
- `panelHeightFraction` — how far up the screen the panel reaches (e.g. 0.55 for combat)
- `cameraZoom` — zoom factor applied while the panel is up
- `cameraTarget: 'room' | 'pip'` — what the camera centres on
- `transitionSpeed: 'normal' | 'snap'` — whether to use the standard transition or cut immediately

## Why this approach

- **Spatial stability**: the dungeon map never jumps or resizes. The player always knows where
  they are.
- **Composability**: new encounter types specify only four config values; all transition logic
  is in the registry.
- **Overlay semantics**: the panel covering the lower portion of the map is appropriate — that
  is where the encounter is happening. The upper map (fog, adjacent rooms) remains visible.

## Consequences

- The Satchel button is covered by any raised encounter panel. This is intentional — inventory
  management during an encounter would be disruptive.
- `MAP_Y` is a layout constant that all rendering code must respect; it is the boundary between
  the status bar and the map zone.
- Future encounter types must not set `panelHeightFraction` > 1.0 or attempt to resize the map
  clip region — that would break the spatial contract.
