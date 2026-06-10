# 090 · Camp Screen Redesign — Scene & Activity Bar

**Status:** READY
**Source idea:** Manager request (2026-06-10)
**Depends on:** 029 (camp screen, camp colour tokens, weapon selection panel), 053 (notice board — trigger relocation)

---

## Summary

The camp screen is restructured to match the visual grammar of the play screen: a permanent split
between an upper **scene zone** (animated camp) and a lower **activity bar** (explicit navigation
buttons and a persistent Descend CTA). The upper zone shows Pip seated by a flickering campfire,
weapons propped against the wall, the workbench with dice, and the dungeon entrance arch in the
background. The lower zone replaces the current model of tapping hidden scene objects: four
labelled activity buttons give Pip access to Weapons, Workbench, Notices, and Visitor, with
Descend always reachable at the bottom. Tapping a button rises the corresponding sub-panel from
the screen bottom; an ✕ button in the panel's top-right dismisses it. The warm camp palette is
unchanged — the camp temperature remains distinct from the dungeon.

---

## Acceptance criteria

### Layout

1. The camp canvas is permanently divided into two zones by a single visible horizontal line
   (`--camp-border`, 1 px):
   - **Scene zone** — fills the upper portion. At minimum 55% of `LOGICAL_H`.
   - **Activity bar zone** — fills the lower portion, from the dividing line to the bottom edge.
   The dividing line does not move during any camp interaction.

2. No camp object in the scene zone is a tap target. All interactions route through the
   activity bar.

### Scene zone

3. The scene zone renders the following elements, all drawn with canvas geometric primitives
   in the established camp style (consistent with D8 — no external sprites):
   - **Campfire** — in the lower-centre area of the scene zone; animated (see criterion 7)
   - **Pip** — small geometric mouse character seated to one side of the fire; static
   - **Weapon silhouettes** — two to four weapon shapes leaning against the right wall of the
     scene; static
   - **Workbench** — small wooden surface in the lower-left area of the scene with Pip's
     permanent dice rendered as small coloured squares; static
   - **Dungeon entrance arch** — lower-centre background, dark stone, faint cool glow behind
     the campfire; unchanged from feature 029
   - **Visitor area** — a stool or ground space to the left of the fire. When no visitor is
     present: empty stool. When a visitor is present (feature 051): a simple placeholder shape
     occupies the stool; full visitor character design is feature 051's scope.
   - **Scroll wall** — a row of rolled parchment cylinders along the upper portion of the scene
     zone, as a decorative element; unchanged from feature 029

4. Pip is drawn as a small geometric mouse:
   - Body: a small oval (~16 × 12 px)
   - Head: a slightly larger circle above the body
   - Ears: two small filled triangles atop the head
   - Tail: a thin curved arc behind the body
   - Colour: warm brown (approximately `#a07048`) with a lighter belly patch
   - Pip faces toward the fire. He is sized to feel *small* — consistent with the principle
     that Pip's smallness is the game's emotional anchor.

5. Weapon silhouettes lean at a slight angle against the right wall. Each is a simple elongated
   filled shape: a narrow vertical rectangle for a dagger, a wider taller version for a sword,
   a thin rod for a staff. These are decorative and do not update when the active weapon changes.

6. A soft ambient warm-light gradient centred on the campfire radiates across the scene:
   a radial gradient from `--camp-accent` at low opacity (~15%) at the fire, fading to
   transparent at the scene zone edges. This gradient is drawn before scene objects so that
   everything receives a warm cast without a separate draw pass.

7. The campfire animates continuously:
   - Drawn as 2–3 overlapping flame shapes (triangles or elongated teardrops)
   - Flame height per shape varies randomly between ~12 px and ~22 px each frame
   - Frame interval: 150–250 ms, randomly varied per frame for an organic feel
   - Colour: base of flame at `--camp-accent` (#c8781e), tip at a brighter amber (~#e89a30)
   - Glow radius on the ambient gradient expands and contracts proportionally with the tallest
     flame height (±2 px of the base radius)
   No other scene elements animate in this feature.

8. The **scraps counter** (`◈ N`) from feature 029 is positioned in the top-left of the scene
   zone (approximately where it currently sits). No change to content or behaviour.

### Activity bar zone

9. The activity bar zone contains, top to bottom:
   - A row of four **activity buttons**, equally spaced across the full canvas width
   - A **Descend strip**, full-width, at the absolute bottom of the canvas
   - Comfortable padding between the buttons and the Descend strip

   Activity buttons are at least 44 px tall. The Descend strip is at least 56 px tall.

10. The four activity buttons are:
    - **Weapons** — opens the weapon selection panel (feature 029)
    - **Workbench** — opens the workbench panel (feature 088)
    - **Notices** — opens the notice board panel (feature 053)
    - **Visitor** — opens visitor interaction (feature 051). When no visitor is present, this
      button is visually dimmed (label at `--text-muted`, icon at ~40% opacity) and does not
      respond to taps.

11. Each activity button shows a small geometric icon (~24 × 24 px, canvas-drawn) above a
    short text label (12 px, `--text-primary`). Icon designs are described in the Design detail
    section. Consistency of stroke weight and fill style across the four icons matters more than
    fidelity to any particular icon form.

12. Tapping an active (non-dimmed) activity button rises the corresponding sub-panel from the
    screen bottom. While any sub-panel is open:
    - The scene zone is covered by a dark scrim (~40% opacity, `#000000`)
    - The activity bar is not interactive

13. The **Descend strip** reads **"Descend"** in 16 px bold, `--camp-accent`. It is always
    visible and always tappable. Tapping Descend opens the weapon selection panel (the same
    panel as the Weapons activity button). The player confirms a weapon before the run starts;
    no run begins without weapon confirmation. Behaviour unchanged from feature 029.

### Sub-panel interaction model

14. All sub-panels (weapon selection, workbench, notices, and any future panels) rise from the
    screen bottom, covering **both** zones entirely. Rise transition: ease-out, ~400 ms.
    Dismiss (sink) transition: ~300 ms. These timings match the cool-temperature transition
    pattern established across the camp.

15. Every sub-panel has an **✕ button** in its top-right corner, at least 44 × 44 px.
    Tapping ✕ dismisses the panel (sinks it back down). No state change occurs; MetaState is
    not mutated by dismissal.

16. The **← Back** affordance in the weapon selection panel (feature 029) is replaced by the ✕
    button. The Descend CTA within the panel remains at the panel bottom; behaviour unchanged.

17. The **← Back** affordance in the workbench panel (feature 088) is replaced by the ✕
    button. The Done CTA remains at the panel bottom; behaviour unchanged.

18. The notice board panel (feature 053) gains an ✕ button in the top-right as the primary
    dismissal affordance. Tap-outside-to-dismiss is retained as a secondary gesture.

### Scene tap-target removal

19. The following tap targets from feature 029 are removed from the camp canvas:
    - Weapon rack tap target
    - Workbench stub tap target
    - Scroll wall stub tap target
    - Descent Record stub tap target
    The notice board tap target from feature 053 is also removed.
    The Descend CTA that currently sits in the scene canvas (bottom of the old layout) is
    removed and replaced by the Descend strip in the activity bar.

20. The Scroll Wall and Descent Record remain as **decorative visual elements** in the scene
    zone. They are not activity bar buttons in this feature. Their corresponding content
    (skill scrolls, Marks of Descent) is deferred to features 051/052.

---

## Scope / non-goals

- **Visitor character art and animation**: the Visitor area shows an empty stool when no
  visitor is present. A simple placeholder (a circle and rectangle suggesting a seated figure)
  may appear when a visitor is present, but full visitor character design is feature 051's scope.
- **Marks of Descent activity button**: deferred to feature 052. The Descent Record remains
  decorative in the scene.
- **Pip poses/reactions**: Pip is static in this feature. Reactive poses (looking up at a
  visitor, reacting to sounds) are a polish pass for 051 or later.
- **Weapon silhouette updating on active weapon change**: weapon shapes in the scene are
  static decorative elements; they do not reflect the currently selected weapon. Future polish.
- **Scene parallax or depth layers**: single canvas pass only. No parallax.
- **Sound / audio**: out of scope.
- **Scraps counter changes**: position and behaviour unchanged from feature 029. It moves into
  the top-left of the scene zone, which is approximately where it already sits.

---

## Design detail

### Zone proportions

The split is implemented as two draw regions on the same canvas (consistent with all existing
screen architecture — one canvas, logical dimensions `LOGICAL_W × LOGICAL_H`):

```
SCENE_BOTTOM = a constant, approximately 0.62 × LOGICAL_H (≈ 523 px at 844 logical height)

Scene zone:    Y: 0         → Y: SCENE_BOTTOM
Activity bar:  Y: SCENE_BOTTOM → Y: LOGICAL_H

Activity button row: SCENE_BOTTOM + padding → SCENE_BOTTOM + padding + ACTIVITY_BTN_H  (≥44 px)
Descend strip:       LOGICAL_H - DESCEND_H → LOGICAL_H                                 (≥56 px)
```

The exact `SCENE_BOTTOM` value is the Engineer's call based on comfortable touch-target sizing
and visual balance. The constraints are:
- Scene zone ≥ 55% of `LOGICAL_H`
- Activity buttons ≥ 44 px tall
- Descend strip ≥ 56 px tall
- Comfortable gap between activity buttons and Descend strip

### Activity button icons (geometric canvas)

| Button | Icon suggestion |
|---|---|
| Weapons | A sword silhouette: a vertical rectangle with a small horizontal crossguard |
| Workbench | A die face: small square with one centred dot |
| Notices | A paper/scroll rectangle with two short horizontal lines suggesting text |
| Visitor | A circle (head) above a smaller rectangle (body), suggesting a seated figure |

Icons are drawn with the same fill/stroke approach as other geometric elements in the camp.
The Engineer may refine these shapes; the goal is legibility at ~24 × 24 px.

### Scene element positioning (guidance, not pixel constraints)

```
Scene zone (0 → SCENE_BOTTOM):

 Top area:
   ░░ scroll wall silhouettes ░░░░░░░░░░░░  (upper ~15% of scene zone)

 Mid area (left → right):
   Workbench (lower-left)       Weapon rack (right wall)
   [🎲🎲🎲 on small table]       /  /  /    (leaning silhouettes)

 Visitor area:
   [stool / visitor]            (left of centre)

 Lower area (centred, in front of arch):
   Dungeon arch (background)
   Campfire 🔥    Pip
   (animated)     (seated beside fire)
```

The dungeon entrance arch sits behind and above the campfire in composition — the fire is
*in front of* the arch, so the arch reads as background rather than destination.

### Sub-panel full-screen coverage

```
┌─────────────────────────────┐
│  [scene zone — dimmed by    │  ← scrim drawn over scene zone at ~40% opacity
│   semi-transparent scrim]   │
│  ...                        │
│  ...                        │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel top edge (rises from screen bottom)
│ [Panel title]           [✕] │  ← ✕ always top-right (44×44 px tap area)
│─────────────────────────────│
│ [Panel content area]        │
│ ...                         │
│─────────────────────────────│
│    [ Primary CTA ]          │  ← "Descend into the Dark" / "Done" / etc.
└─────────────────────────────┘
```

The panel top edge covers the scene/activity dividing line — the panel rises as one surface,
with no visible break between "activity bar covered" and "scene zone covered."

### Dependency note for feature 088 (Workbench)

Feature 088 specifies "tapping the Workbench at camp" as the trigger for the workbench panel.
Under this redesign, the trigger is the **Workbench activity bar button** instead. Feature 088
should be implemented **after** this redesign; its panel content spec (all the die upgrade
mechanics, confirmations, etc.) is unaffected — only the trigger changes. If 088 is implemented
first, the trigger requires a one-line update when 090 lands.

### Dependency note for feature 053 (Notice Board, shipped)

Feature 053's notice panel is triggered by tapping the notice board object on the camp canvas.
This redesign removes that tap target; the **Notices activity bar button** becomes the trigger.
The Engineer building 090 must update the notice board integration in `camp.ts` to wire the
Notices button to `generateNotices()` and the existing notice panel render code.

---

## Visual design

### Full wireframe

```
┌─────────────────────────────┐  ← 390 × 844 logical canvas
│ ◈ 42 scraps                 │  ← scraps (--gold, 18px bold, top-left)
│                             │
│ ░░░░░░░░░ scroll wall ░░░░░ │  ← parchment cylinders, upper scene area
│                             │
│  ╔══════════════════════╗   │
│  ║   ·   ·   ·   ·      ║   │  ← dungeon entrance arch (centre, background)
│  ╚══════════════════════╝   │
│                             │
│  ┌────────┐     /  /  /     │  ← workbench + dice (left) · weapon rack (right)
│  │[🎲][🎲]│                 │
│  └────────┘                 │
│                             │
│  [stool]   🔥   (Pip)       │  ← visitor stool (left) · fire (centre, animated)
│                             │     Pip seated to right of fire
│─────────────────────────────│  ← SCENE_BOTTOM dividing line (--camp-border, 1px)
│                             │
│  [⚔]   [🎲]   [📋]   [👤] │  ← activity buttons (4×, equal width, ≥44px tall)
│ Weapons Workbench Notices Vsit│   Visitor dimmed when no visitor present
│                             │
│        [ Descend ]          │  ← --camp-accent, 16px bold, full-width ≥56px strip
└─────────────────────────────┘
```

### Sub-panel header (all panels after this redesign)

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel top edge
│  Panel Title            [✕]  │  ← title centred or left; ✕ always top-right
│─────────────────────────────│
│  ...panel content...        │
```

### Colour tokens

No new tokens. This feature reuses the camp palette from feature 029:

| Token | Value | Used for |
|---|---|---|
| `--camp-bg` | `#1a1208` | Scene zone background |
| `--camp-surface` | `#2e1d0d` | Activity bar zone background; sub-panel surfaces |
| `--camp-border` | `#5a3d1a` | Zone dividing line; activity button borders |
| `--camp-accent` | `#c8781e` | Campfire base colour; Descend strip CTA text; active icons |
| `--gold` | `#c8941e` | Scraps counter |

Campfire tip colour `#e89a30` is used only in the flame draw call; no named token needed.

Scrim overlay: `rgba(0, 0, 0, 0.40)` — no named token needed.

Visitor button dimmed state: icon and label drawn at 40% opacity. No new token.

### Typography / sizing

Reuse the established scale. New elements:

| Element | Size | Weight | Colour |
|---|---|---|---|
| Activity button label | 12 px | regular | `--text-primary` (dimmed: `--text-muted`) |
| Descend strip label | 16 px | bold | `--camp-accent` |
| Zone dividing line | 1 px | — | `--camp-border` |

---

## Open questions

No blocking questions — the spec is `READY`.

Post-ship tuning notes:
- **Scene/activity split proportion**: the ≥55% scene floor is a minimum. In practice
  `SCENE_BOTTOM` ≈ 62% of `LOGICAL_H` feels right; if the activity bar feels cramped at small
  screen sizes, the Engineer can push the boundary upward.
- **Fire animation speed**: 150–250 ms interval is a starting range. Tune during implementation
  for organic feel — the fire should feel alive but not frantic or distracting.
- **Visitor button opacity when absent**: 40% is a starting point for "present but clearly
  inactive." Adjust during implementation if it reads as broken rather than intentional.
- **Planner note**: This feature should be sequenced **before 088** (Workbench) in the
  priority order to avoid a trigger rework when 090 lands.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
