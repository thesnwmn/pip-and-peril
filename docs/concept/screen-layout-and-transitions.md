# Screen Layout & Transitions — UI/UX Direction

> *The dungeon is always present. The encounter is always in the dungeon.*

This document sets the direction for how the screen organises itself across every game state and
how it moves between them. It is concept material — the Designer turns individual pieces into
backlog items.

---

## The Central Problem

Pip & Peril has a single canvas on a portrait phone screen. It needs to serve wildly different
moments:

- Pip navigating a procedural dungeon: a spatial puzzle, all map
- A furious dice-driven combat: rolling and spending pips against a monster
- A cosy conversation with a merchant or traveller: browsing, talking, weighing options
- A tense trap check: a single agility roll with immediate consequences
- A ceremonial chest reveal: anticipation, then payoff

The naive answers — permanent split screen (map top, controls bottom) or full mode-switching
between "map" and "encounter" screens — both fail. A permanent split wastes screen during
navigation; full mode-switching destroys the player's spatial grounding.

---

## The Answer: The Elastic Canvas

**The dungeon map is always present. It never disappears. It changes how it frames itself.**

The map canvas is the stage. Encounters happen *in the dungeon*, not in a separate space. What
changes between navigation and encounter is:

1. **How much of the screen the map occupies** — encounters compress the map view into the upper
   portion, while a **context panel** rises from the bottom.
2. **What the camera frames** — the camera adjusts (zooms, centres) to suit the situation.

This produces two registers: the **navigation register** (map fills the canvas) and the
**encounter register** (panel rises, camera adjusts). The transition between them is always the
same structural gesture — a panel rises from the bottom while the camera adjusts above — and so
the player quickly learns to read the screen.

---

## The Navigation Register

The map is the hero. Nothing competes with it.

```
┌─────────────────────────┐
│  [status strip — thin]  │  ← HP hearts · floor depth · gold count (~40–50px)
├─────────────────────────┤
│                         │
│                         │
│       DUNGEON MAP       │  ← full canvas tile renderer; camera follows Pip
│                         │
│                         │
│                         │
└──[≡ menu]───────[bag]───┘  ← persistent floating buttons, bottom corners
```

- The status strip at the top is minimal — information Pip needs to navigate, nothing more.
- The map viewport fills everything between strip and screen bottom.
- Persistent UI buttons (menu, satchel) float at the bottom corners, small enough not to compete
  with the map but always reachable with a thumb.
- Room selection cards (the "pick a tile type" flow from POC 5) rise from the bottom when Pip
  steps toward an unexplored tile — already within the navigation register, no panel required.

There is no dice tray, no encounter panel, no character sheet visible. The game says: right now,
you are exploring. Pay attention to the map.

---

## The Encounter Register

When an encounter triggers, a **context panel** slides up from the bottom. The map compresses
into the upper portion. Camera adjusts.

```
┌─────────────────────────┐
│  [status strip — thin]  │
├─────────────────────────┤
│                         │
│   ZOOMED / ADJUSTED     │  ← map canvas, now showing the active room framed for
│   DUNGEON VIEW          │    the encounter type; varies by situation (see below)
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel edge — rises from screen bottom
│                         │
│   CONTEXT PANEL         │  ← character varies by encounter type
│                         │
└─────────────────────────┘
```

The **panel** has a consistent structure (a surface that rises from the bottom) but a
**distinct personality per encounter type** — its height, visual texture, and contents vary.
The panel is not a generic HUD; it is a piece of in-world furniture that matches the encounter.

The **map above the panel is still dungeon** — not a screenshot, not a blur, but the live
renderer showing the active room at the camera's current position and zoom. The player always
knows where Pip is.

---

## The Camera as Storyteller

The camera is not neutral. It has a personality. Different encounter types call for different
zoom depths and transition speeds — and that variation is itself communication:

| Situation | Camera behaviour | Signal |
|---|---|---|
| Navigation | Centred on Pip; medium zoom; smooth follow | Calm, exploratory |
| Enemy combat | Smooth zoom in to medium-close; Pip and enemy visible in room | Tension rising |
| Boss combat | Dramatic close pull to near-full room, slower pan; title beat before panel rises | Scale and weight |
| Shop | Gentle centring on room; minimal zoom | Inviting, unhurried |
| NPC dialogue | Moderate zoom; NPC prominent in view | Intimacy |
| Chest | Tight zoom onto the chest itself | Anticipation |
| Trap | Sharp snap zoom — near-instant, no easing | Sudden, startling |

The camera's *speed* matters as much as its destination. A smooth zoom says "here comes a
fight." A snap says "the trap already fired." The player will learn these signals without being
told — they are game feel, not tutorial.

---

## Per-Situation Breakdown

### Navigating the Map

Full navigation register. No panel. Camera follows Pip at the standard navigation zoom. Room
selection cards float from the bottom when Pip chooses to step into an unexplored tile; this is
a momentary decision overlay, not a full panel — it resolves in one tap and the cards disappear.

The experience: the dungeon is open and readable, the player has agency over where they go, and
nothing interrupts that feeling until an encounter triggers.

---

### Combat — Enemy

Camera smoothly zooms to **medium-close**: Pip is visible on one side, the enemy on the other,
inside the room's rendered art (torches, archetype, props). Neither is cropped; the room
context is preserved.

The **combat panel** rises to ~50% of screen height:

```
┌─────────────────────────┐
│ [status strip]          │
├─────────────────────────┤
│                         │
│  Pip ←→ Enemy in room   │  ← medium-close combat camera (~50% height)
│  (room art visible)     │
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ ♥♥♥ Pip    Enemy ♥♥♥   │  ← HP bars
│  [d6🔴] [d4🟢] [d8🟡]  │  ← dice pool display
│  [Attack 2🔴] [Dodge 1🟢]│  ← action buttons; insufficient pip state shown here
│  [ Battle log line ]    │  ← most recent outcome
└─────────────────────────┘
```

The panel is dungeon-dark: stone textures, the same `--surface` colour, heavy borders.
It is a piece of the dungeon, not a game menu.

---

### Combat — Boss

Same architecture as Enemy combat, but the camera earns its drama. The sequence:

1. Pip steps into the room; a beat of silence.
2. Camera pulls back *wider* than normal navigation zoom — the whole room in view.
3. A title card appears over the map: the boss's name and a short flavour line.
4. Camera then zooms to a *tighter* frame than standard enemy combat — the boss fills the view,
   Pip is small but visible.
5. The combat panel rises — same structure as enemy, but the boss HP display is more prominent
   (larger bar, named).

The point: the camera tells you "this is different and larger" before the mechanics say anything.

---

### Shop

Camera centres on the room and adjusts gently — perhaps a slight pull-in to 1.2× so the
room feels present without drama. The merchant (or their stall) is visible in the zoomed view.

The **merchant panel** rises to ~65–70% of screen height — shops need room to breathe:

```
┌─────────────────────────┐
│ [status strip]          │
├─────────────────────────┤
│   Shop room w/ merchant │  ← ~30% of screen; merchant visible in room
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│  [Merchant name/line]   │  ← parchment or warm-toned panel surface vs dungeon-dark
│  ┌──────────────────┐   │
│  │ Item A  ·  3🪙   │   │
│  │ Item B  ·  5🪙   │   │  ← item cards; tappable; tap expands description
│  │ Item C  ·  2🪙   │   │
│  └──────────────────┘   │
│  Gold: 7🪙   [Leave]    │  ← gold count and exit
└─────────────────────────┘
```

The panel surface is warm, not dungeon-dark — parchment tones or aged wood. The visual
contrast signals "this is a different kind of interaction." No dice are visible unless the
player triggers a haggle or a check (see Ideas). The room peeks over the panel edge, giving
the merchant spatial grounding.

---

### NPC Dialogue

Camera zooms to a moderate frame — the NPC is prominent, Pip is beside them. The room
context remains visible; this is a conversation *in a place*, not a menu.

The **dialogue panel** rises to ~60% of screen height. Unlike the combat panel, it is
primarily text and choices:

```
┌─────────────────────────┐
│ [status strip]          │
├─────────────────────────┤
│  NPC and Pip in room    │  ← ~40%; NPC visible, body-language readable
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ [NPC portrait — small]  │  ← sits at the panel edge, straddling map and panel
│ "Dialogue text here,    │
│  a line or two at most. │  ← scrolling single-line at a time, not walls of text
│  Short and characterful"│
│                         │
│  [Option A]  [Option B] │  ← response buttons; max 3 options
│  [Option C]             │
│       ↑ if a check:     │
│  [d6🟢][d8🔵] [Roll]    │  ← dice tray appears within panel only when needed
└─────────────────────────┘
```

The dice tray is **embedded in the dialogue panel** rather than replacing it — the dice
appear within the conversation's space when a stat check is required, then disappear.
Dialogue is primary; dice are a moment inside the dialogue, not the other way around.

---

### Opening a Chest

Camera zooms tight onto the chest — filling a large portion of the upper view. This is a
moment of anticipation; the zoom earns it.

The chest encounter is two beats:

**Beat 1 — The approach.** A small panel rises (~35% height):

```
│  [Chest close-up in room] │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│  "An old chest. [Type]."   │  ← brief description
│  [Open]  or  [Lock: 🔵3]  │  ← if locked: a dice check before opening
│  [Leave]                   │
```

If locked, a dice check sits in this panel (brief, then resolved). If trapped, the trap
fires *before* opening (see Trap, below); the chest panel then reappears for the reveal.

**Beat 2 — The reveal.** A loot card animates in — the item or gold count — with a brief
flourish. The panel expands slightly to accommodate the reveal, then settles.

The two-beat structure — uncertainty, then resolution — is the chest encounter's whole
emotional arc. The camera never moves between the beats.

---

### Trap

Traps are involuntary. The player did not choose this. The camera knows.

Camera **snaps** — a near-instant zoom with no easing — to a close view of the triggered
trap. No smooth pull; the jolt is the signal.

The **trap panel** rises fast (~25–30% height) — the smallest panel in the game, because
traps are brief and punishing:

```
│   Trap triggered — close view  │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│  "Pressure plate!"             │  ← 1 line; terse, sudden
│  [d6🟢][d4🟢]  [Roll]         │  ← agility check (or whatever fits the trap)
│  ← no Leave button →           │  ← forced; can't walk away
```

One roll. Immediate consequence in the map view above (Pip reacts). Panel descends.
Back to navigation. The whole sequence should feel like thirty seconds, not a scene.

Traps are the only encounter type with no Leave/exit option before resolution — the choice
was made when Pip stepped on the tile.

---

## The Narrative Voice — World Narration vs Action Feedback

The existing log strip (feature 004: three lines below the map, fading by recency) predates the
elastic canvas concept. It works in the current POC but creates a structural problem in the
full layout: where does a permanent strip live when an encounter panel rises from the bottom?
Between map and panel it becomes a cramped sandwich; covered by the panel it loses information;
expanded upward it compresses the map. None of these are right.

More importantly: the log strip is doing **two different jobs** that belong in different places.

### The two communication layers

**World narration** is atmospheric, in-world, brief. "Something snarls in the dark." "The
shelves are bare." These are the game's voice — flavour tied to a moment. The player needs
them for roughly three seconds after entering a room, then never again. A permanent strip
that stores three fading entries is overbuilt for this job.

**Action feedback** is mechanical, immediate, critical. "Strike — 2 damage. (Goblin: 6→4)"
This lives inside the encounter panel, one line, updating in place. It already exists in
the combat panel (feature 006). It belongs there and nowhere else.

These should not share the same element. Combining them forces the design to serve both
jobs poorly: too persistent for narration, too sparse for feedback.

### World narration: the situated whisper

World narration lives **inside the map view**, not below it. When Pip enters a new room, a
single line appears at the bottom of the visible map canvas — the game's voice speaking from
the dungeon, not from a UI strip below it. It fades out after ~2–3 seconds and leaves no
trace. No permanent footprint; no space wasted when silent.

```
┌─────────────────────────┐
│                         │
│       DUNGEON MAP       │
│                         │
│  "Something snarls       │  ← appears here, bottom of the map canvas
│   in the dark."         │     faint scrim beneath the text; fades in ~2s
└─────────────────────────┘
```

The text sits over a subtle gradient scrim (not a solid band — the tile art should breathe
through it) so it reads against any background. When the map is silent, this zone is
invisible. It competes with nothing.

**Crucially**: by the time any encounter panel rises, the room-entry narration has already
faded. The two elements never share the screen simultaneously.

### Action feedback: stays in the panel

The combat panel's one-line log (the most recent action outcome) is correct as specced.
That pattern extends to any dice-resolved encounter. There is no separate feedback strip; the
panel owns mechanical feedback entirely.

For non-dice encounters (a shop browse, a simple chest open), there may be no log line at all
inside the panel — the visual action (item card appearing, chest opening) is the feedback.

### The complete record: Satchel Journal

The full history of every narration and encounter outcome accumulates in the Journal tab of
the Satchel (feature 016 has this as a stub). Players who want to re-read what happened can
open the satchel. Players who don't, won't. The game does not force three fading lines of
recent history into the primary view at all times.

### What this supersedes

The three-line log strip from feature 004 is a design that served the POC phase. In the
final game this pattern should be replaced:
- Permanent log strip → **situated whisper** (map-canvas overlay, fading)
- Most recent entry always visible → **ephemeral** (appears on event, gone in ~3s)
- History in the strip → **history in the Satchel Journal**

This is a future reconciliation for the Designer and Engineer when the encounter system
is rebuilt to match the elastic canvas architecture. The existing 004 implementation is not
wrong — it is a stepping stone.

---

## Transition Design

All navigation-to-encounter transitions follow the same choreography:

1. Camera adjusts (zoom, centre, speed as noted per type)
2. Panel rises from the screen bottom

Both happen simultaneously, taking 200–350 ms total. The camera move and panel rise arrive
together; neither waits for the other.

Encounter-to-navigation:

1. Panel descends back below the screen edge
2. Camera zooms back to navigation framing

Again simultaneous. The retreat of the panel and the open-up of the map happen as one exhale.

**The only exception is the trap:** the camera snap is deliberate and precedes the panel by
a fraction — the snap comes first (instant), the panel follows immediately after (~100ms
later). This tiny sequencing makes the snap feel intentional rather than glitchy.

---

## What This Does Not Specify

This document sets the **structural architecture** — the elastic canvas, the rising panel,
the camera as storyteller. It does not specify:

- The exact pixel heights or breakpoints (those are Designer territory, sensitive to the
  tile renderer's current dimensions and the phone sizes being targeted)
- Specific animation curves or timings beyond rough guidance
- How the tile renderer implements the zoom (scale transform, canvas redraw, viewport
  adjustment — all valid; the Engineer chooses)
- Pip's sprite or NPC sprite direction — still open pending the art approach decision (D8)
- Which encounters use dice vs. flat menus — some shops may never roll dice; some NPCs may
  always roll; the spec per encounter locks that down

---

## Open Questions

- **Pip in the combat camera:** does Pip appear at a larger rendered size, or is it just
  the tile rendered at higher scale? If sprites are introduced (post-D8), does Pip have
  encounter-specific poses?
- **Floating status during encounters:** HP hearts and floor depth are in the status strip,
  but during combat, HP bars also appear in the panel. Is the strip redundant during
  encounters, or does it serve a different role? Consider hiding the strip during combat and
  letting the panel own HP entirely.
- **The "merchant peek" motif:** the NPC portrait straddling the panel edge into the map
  area is a nice trick. Does the merchant in the shop get the same treatment — a character
  visible above the panel edge? Worth trying; risk is it clutters the map view.
- **Room selection and the panel:** the room selection cards (POC 5) rise from the bottom in
  the navigation register. They share the same structural gesture as the encounter panel.
  Is that confusing (both are "bottom-up") or does it naturally unify? Likely fine — the
  room cards appear briefly and look nothing like an encounter panel.
- **Transition on forced vs optional encounters:** a forced encounter (enemy, trap, boss)
  triggers without player choice. An optional encounter (shop, NPC, chest) *could* offer
  a "pass through" moment before the panel rises. Is that a separate beat ("a merchant
  beckons — enter?") or does the panel rise immediately either way and "Leave" is the
  out?

---

---

## Design Philosophy for Future Screens

The game will grow beyond the six encounter types above. A meta-progression hub, a run summary,
floor transitions, a settings screen — all of these need screens. The principles below should
guide every new screen in the game, whether it's inside a dungeon run or not.

---

### 1. Everything is Pip's World

No screen in this game should look like a generic mobile game menu. Even the settings screen
should sound and feel like Pip's world. The voice is warm, slightly archaic, slightly wry. Not
"ATTACK" but "Attack". Not "INSUFFICIENT PIPS" but "Not enough." Not "SETTINGS" but
"Options" — or better, a journal entry about options.

The world is always present. Even an abstract screen like a run summary should feel like it's
happening somewhere Pip recognises.

---

### 2. Two Surface Temperatures

Every screen in the game operates at one of two temperatures, and that temperature should
determine its surface material, animation speed, and typography weight.

**Dungeon temperature — hot:** Fast, dark, dangerous. Uses `--surface`, `--surface-raised`,
heavy stone borders, strong contrasts. Quick transitions (~200–300ms). Pip is in the dungeon
and something is happening.

**Camp temperature — cool:** Slow, warm, reflective. Uses aged parchment tones, warm ambers,
softer borders. Slower transitions (~400–600ms). Pip is between things — safe, planning,
remembering.

| Screen | Temperature |
|---|---|
| Dungeon navigation | Hot |
| Combat (enemy / boss) | Very hot |
| Trap | Very hot |
| Shop | Warm (between) |
| NPC dialogue | Warm |
| Chest | Warm |
| Satchel (inventory) | Cool |
| Run summary / death | Very cool |
| Meta-progression hub | Cool |
| Floor transition | Cool (tending hot as depth increases) |
| Home / title | Cool |

Transitions *between temperatures* should take longer and feel more deliberate — like stepping
from firelight into cold air. Transitions *within* the same temperature are quick.

---

### 3. One Hero Element Per Screen

Resist the temptation to show everything at once. Every screen has **one thing** it is about,
and that thing should be the biggest, most central, most visually prominent element on the
screen.

- Combat: the dice pool
- Shop: the item cards
- Run summary: the dungeon sketch of the completed run
- Meta-progression: the dice on the table
- Home: the "New Run" button

Secondary information supports the hero element; it does not compete with it.

---

### 4. The Bottom Quarter is Thumb Country

Portrait-first means the bottom ~20–25% of the screen is always reachable with one thumb
without shifting grip. **All primary interactive controls live here.** The top of the screen
is the visual stage — what the player *looks at*. The bottom is where they *act*.

This maps naturally to the encounter register (panel at bottom) but should inform every
screen: primary CTAs, navigation buttons, and dice rolls belong in the lower quarter.
Information and visual context belong in the upper portion.

---

### 5. Surfaces Tell You Where You Are

Two surface types, used consistently, train the player to understand their context instantly:

**Dungeon surface** (`--surface` / `--surface-raised`, dark, stone borders): you are in
the dungeon, stakes are present.

**Parchment surface** (aged paper tones, warm borders, softer shadow): you are in Pip's
personal space — the satchel, the camp, the journal, the dice upgrade table. Safe. Yours.

The satchel (feature 016) is already built on this principle. Meta-progression screens
should follow: the upgrade hub is parchment, warm, the player's home base. The dungeon is
visible through a window or doorway — present but not active.

---

### 6. Transitions Carry Meaning

The *direction* and *character* of a transition encodes its meaning. Used consistently, the
player learns these without a tutorial:

| Motion | Meaning | Examples |
|---|---|---|
| Rise from bottom | Encounter begins / panel opens | All encounter panels, satchel |
| Sink to bottom | Encounter ends / panel closes | All encounter resolution |
| Push right (in) | Going deeper / forward | Floor transition, new area |
| Push left (back) | Retreating / going back | Back to menu, previous screen |
| Fade in/out | Crossing temperature (run start/end) | Title → game, game → summary |
| Instant snap | Surprise / danger | Trap trigger, boss reveal beat |

When these are used consistently, a transition that breaks the pattern is itself information —
it tells the player that something unusual is happening.

---

### 7. Pip's Scale is Always the Emotional Anchor

Wherever Pip appears, his smallness should communicate the game's core fantasy: a tiny mouse
in an enormous, dangerous dungeon. This is not just art direction — it is the emotional core.

- On the tile map: Pip is a small token among large tiles
- In the combat camera: Pip is clearly smaller than most enemies
- In the meta-progression hub: Pip is small at the dice table, the dice are relatively large
- On the run summary: the dungeon sketch dwarfs Pip's paw-icon marker

When Pip is on screen, the composition should always convey *smallness against vastness*.
When Pip is absent from a screen (a pure menu), something from his world should anchor it
(his satchel, his dice, the dungeon behind the UI).

---

### 8. Pip's Physicality Extends to UI Objects

Dice are not icons — they are objects Pip picks up and rolls. The satchel is not an inventory
screen — it is a worn leather bag with compartments. The dungeon map is not a minimap — it is
a sketch Pip made on parchment. The upgrade screen is Pip at a workbench.

Every UI element should ask: *what is this object in Pip's world?* A floating abstract panel
labelled "OPTIONS" is wrong. A journal page, slightly worn, with a quill-written header, is
right. This physicality is what separates the game from generic mobile games and keeps it
inside the Redwall-meets-Hades register.

---

### Future Screens — Direction Sketches

These are not specs; they are rough directions for when the Designer reaches each screen.

**Meta-Progression Hub (between runs):**
Cool temperature. Pip's camp or a cosy mouse-hole study near the dungeon. Warm parchment
surfaces. Dice are physical objects on a worktable — tappable, inspectable. The dungeon
entrance is visible in the background (dark, `--bg`). Shiny scraps are coins in a small
pouch visible in the corner. Navigation to upgrade areas feels like moving around a small
physical space, not drilling into menus.

**Run Summary / Death Screen:**
Very cool temperature. Full-screen parchment surface — a retrospective. The dungeon sketch
(Idea 014, if built) fills the centre: the explored run laid out like a hand-drawn map.
Around it: floor reached, enemies defeated, gold found, what killed Pip (if death). At the
bottom: shiny scraps earned this run, with a slow count-up animation. The hero element is
the sketch — the map of where Pip *went*. No dramatic "YOU DIED" — just the record.

**Floor Transition:**
Brief — 2–3 seconds maximum. Pip descending a staircase. The stone walls close in. A lantern
swings. Floor depth ticks up. Temperature: cool tending hot — the deeper you go, the faster
the transition should feel. Could show a one-line atmospheric flavour text about the floor
below. Then the map renders. No separate loading screen; the generation happens behind this
beat.

**Home / Title Screen:**
Cool temperature. Pip at the dungeon mouth — the entrance is a dark, warm-glowing archway.
The title floats above (gold, the established display font). One hero CTA: "Begin." Secondary:
"Continue" (if a run is in progress) — and this is the most prominent element if a run
exists. The dungeon breathes behind the interface: subtle parallax, ambient flicker. The UI
should feel like it could blow away in a dungeon draft.

---

*Related:*
- `IDEAS.md` Idea 012 — Immersive Combat Overlay (the original seed this expands from)
- `docs/concept.md` — core pillars, palette, game states
- `docs/concept/tiles-and-props.md` — tile rendering; the "stage" this layout sits on top of
