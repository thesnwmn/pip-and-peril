# 025 · Trap Encounter

**Status:** READY
**Source idea:** Manager request; backlog item; `docs/concept/overview.md` (Non-combat encounters); `docs/concept/screen-layout-and-transitions.md` (Trap)
**Depends on:** 004 (room entry trigger), 005 (dice pool), 022 (sets `trapDifficulty` on tile at placement), 030 (encounter panel + snap camera mode — shipped)

---

## Summary

Stepping onto a Trap tile fires an immediate, forced agility check — the snap-camera, no-Leave encounter from the screen-layout concept. The camera snaps (no easing) to a close view of the trap, a minimal panel rises, and the player rolls their dice pool once. Enough Green pips and Pip slips clear; too few and HP is lost proportional to the trap's difficulty. The tile then becomes spent: it never triggers again on re-entry. Traps are cheap to build (one roll, no menu, no Leave button), add real peril variety across floors, and provide the "trap fires before loot" hook that the trapped Chest variant (feature 026) needs.

---

## Acceptance criteria

1. Entering a Trap tile for the first time triggers the trap encounter automatically and immediately — no player confirmation, no opportunity to back away before it fires.

2. The **camera snaps** — near-instant zoom, `transition: none`, no easing — to a close view of the trap tile. The snap precedes the panel rise by ~100 ms, making it feel intentional rather than coincidental with the panel.

3. The trap **panel rises** from the screen bottom with dungeon-temperature styling (`--surface` background, stone-weight borders). It contains:
   - A one-line terse trap label (e.g. "Pressure plate!") in `--gold`.
   - The player's Green dice, displayed ready to roll.
   - A single full-width **Roll** button in the thumb zone.
   - **No Leave or exit option** — forced encounter, the choice was made on the step.

4. Tapping **Roll** animates the full dice pool. After animation settles, only the **sum of Green pips** is evaluated against the check. Non-Green pips are visible in the roll but do not affect the outcome.

5. **Pass condition:** Green pip total ≥ `tile.trapDifficulty`. No HP loss. Outcome line: terse pass flavour (e.g. "Slipped clear.").

6. **Fail condition:** Green pip total < `tile.trapDifficulty`. Pip loses `trapDamage` HP. Outcome line: terse fail flavour with HP cost (e.g. "Spikes. −2 HP.").

7. `trapDamage = Math.ceil(trapDifficulty / 2)`, minimum 1. No other formula is used.

8. The outcome line is displayed in the panel for ~1.5 seconds, then the **panel auto-descends** (no tap required) and the camera returns to navigation framing using standard smooth easing (~300 ms).

9. If the HP loss from a failed trap reduces Pip to 0 HP, the run ends in defeat — the same defeat path as combat. The trap panel descends before the defeat screen appears.

10. After the encounter resolves (pass or fail), the tile is marked `trapFired: true`. Re-entering the tile **never triggers the encounter again** — Pip walks through freely.

11. A **spent trap tile** is visually distinct from a live one: a tint overlay (see visual design) signals the trap has already fired. The underlying tile art is not replaced.

12. No situated whisper (room-entry narration) plays on trap entry — the camera snap is the signal. Whisper is suppressed for this encounter type.

---

## Scope / non-goals

- **Trap disarming** — a pre-trigger dice check to neutralise the trap before it fires. Deferred.
- **Multiple check types** — Intellect check for a rune trap, Strength for a boulder. All traps here use a Green (Agility) check. Different flavour, same mechanic.
- **Yellow luck pips as wild cards** in the check. Deferred.
- **Pre-trigger visual warning** on live trap tiles. Fog of war hides the tile until Pip steps; the snap-camera is the first signal. No "it looks suspicious" indicator.
- **Trapped Chest variant** — the hook is provided (`trapFired` state and `trapDifficulty` are available), but the Chest encounter flow is feature 026.
- **Idea 011 environmental agility checks** (chasms, bridges) — re-skins of this mechanic, deferred.

---

## Design detail

### Tile data

Feature 022 already sets `trapDifficulty: number` on each Trap tile at placement. This spec adds one field to the tile:

```
trapFired: boolean   // false at placement; true after the encounter resolves
```

No new global or run-level state is required.

### Encounter flow

```
Pip steps onto Trap tile (trapFired === false)
          │
          ▼
  Camera SNAPS to trap close-up (no easing)
          │  ~100ms
          ▼
  Trap panel RISES (dungeon temp, ~200ms)
          │
          ▼
  Player taps Roll
          │
          ▼
  Full dice pool animates
          │
          ▼
    Green pips ≥ trapDifficulty?
          │                    │
         YES                  NO
          │                    │
   "Slipped clear."      "Spikes. −N HP."
   (no HP loss)           pip.hp -= trapDamage
          │                    │
          └──────────┬─────────┘
                     │
              trapFired = true
                     │
              Panel auto-descends (~1.5s)
                     │
              Camera returns to nav framing
                     │
                     ▼
              Navigation resumes
              (if hp ≤ 0 → defeat path)
```

### Trap flavour set

Each Trap tile is assigned a flavour variant when the encounter first triggers (drawn randomly from the table below). The mechanic is identical across all variants; only label and outcome lines differ.

| Label | Pass outcome | Fail outcome |
|---|---|---|
| "Pressure plate!" | "Slipped clear." | "Spikes. −N HP." |
| "Tripwire!" | "Ducked under." | "Caught it. −N HP." |
| "Snap trap!" | "Squeezed through." | "Caught. −N HP." |
| "Falling stones!" | "Rolled clear." | "Struck. −N HP." |

The flavour variant is stored on the tile once assigned, so re-entry (post-`trapFired`) shows the same label in the room art context. Four variants cover the first floor; new entries can be added without a spec change.

### Camera behaviour

- **Snap:** `transition: none` (or 0ms duration). Near-instant. The room should not appear to scroll or zoom — it cuts.
- **Zoom level:** Close — the trap tile fills roughly half the map zone above the panel. Enough room context is visible at the edges that the player knows where they are.
- **Sequencing:** Snap fires first. Panel begins to rise ~100 ms after the snap completes. Per `screen-layout-and-transitions.md`: *"the snap comes first (instant), the panel follows immediately after (~100ms later). This tiny sequencing makes the snap feel intentional rather than glitchy."*
- **Return:** Standard smooth easing (~300 ms) after panel descends. No snap on the exit.

### Panel architecture

The trap panel is a **new panel type** implementing the encounter panel interface from feature 030. It does not extend or inherit from the combat panel. The snap-camera behaviour is supplied by 030's snap-camera mode; the trap panel declares it at construction.

### Panel contents (roll phase)

Three elements stacked top-to-bottom, minimal by design — this is a surprise, not a scene:

1. **Trap label** — terse, toned gold, centred. No subtitle, no description.
2. **Dice row** — Green dice from the player's pool, displayed ready to roll. Non-Green dice may be shown greyed-out (to reinforce "only these count") or omitted. Engineer's call.
3. **Roll button** — full-width, dungeon-styled, in the thumb zone.

### Panel contents (outcome phase)

The Roll button is replaced by two lines:

1. **Result line** — pip count vs difficulty (e.g. "🟢 4 vs. 2 — Pass"). Styled in `--text-muted`, 14 px.
2. **Outcome flavour line** — pass or fail text from the flavour set above, with HP delta if fail. Styled in `--text-primary`, 16 px, italic.

The outcome phase lasts ~1.5 s then the panel auto-descends. No tap needed.

### Edge cases

- **Pip at 1 HP, trap fails:** `trapDamage` may exceed remaining HP. Clamp `pip.hp` at 0 and proceed to defeat. Never show negative HP.
- **Re-entry after firing:** `trapFired === true` — no encounter triggers. The spent visual overlay is present. Pip walks through freely.
- **Double-tap on Roll:** Standard event dedup; lock input while dice animate.
- **trapDifficulty = 0:** Treat as a pass regardless of roll (edge case from tuning; the encounter still triggers and displays, but always resolves as pass). `trapDamage` would be 0 clamped to minimum 1, but difficulty 0 should never produce failure, so clamp before evaluation.

---

## Visual design

**Temperature:** Very hot — dungeon surface, fast transitions, heavy borders, no warmth.

**Layout wireframe — Roll state**

```
┌─────────────────────────┐
│  [status strip — thin]  │
├─────────────────────────┤
│                         │
│  close-up: trap tile    │  ← snap-camera; trap geometry prominent
│  (plate, tripwire, etc) │    room walls/art visible at edges
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← PANEL_TOP
│   "Pressure plate!"     │  ← gold `--gold`, ~18–20px, weight 600, centred
│                         │
│  [d6🟢]  [d4🟢]  ···   │  ← Green dice (non-green greyed or absent)
│                         │
│  [        Roll       ]  │  ← full-width; thumb zone
└─────────────────────────┘
```

**Layout wireframe — Outcome state (pass)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "Pressure plate!"     │
│                         │
│  [3🟢]  [1🟢]  ···     │  ← dice showing settled values
│                         │
│  🟢 4 vs. 2 — Pass      │  ← `--text-muted`, 14px
│  "Slipped clear."       │  ← `--text-primary`, 16px, italic; auto-advances ~1.5s
└─────────────────────────┘
```

**Layout wireframe — Outcome state (fail)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "Pressure plate!"     │
│                         │
│  [1🟢]  [0🟢]  ···     │
│                         │
│  🟢 1 vs. 3 — Fail      │  ← `--text-muted`, 14px
│  "Spikes. −2 HP."       │  ← `--text-primary`, 16px, italic; auto-advances ~1.5s
└─────────────────────────┘
```

**Color tokens**

No new tokens for the panel itself — the established dungeon palette covers everything.

One new token for the spent trap tile overlay:

| Token | Value | Used for |
|---|---|---|
| `--trap-spent` | `#1a1a2a` | Tint overlay on a fired trap tile |

The overlay sits above the tile art at low opacity (~0.5) so the underlying geometry reads through it. The room still looks like itself — it just looks triggered.

**Typography / sizing**

- Trap label: 18–20 px, weight 600, `--gold`. Same register as the enemy name in combat.
- Dice row: same size/style as the combat dice tray (feature 006).
- Result line: 14 px, `--text-muted`.
- Outcome line: 16 px, `--text-primary`, italic.

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —
