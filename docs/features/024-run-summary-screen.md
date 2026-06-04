# 024 · Run Summary Screen

**Status:** READY
**Source idea:** Manager request; backlog item 024
**Depends on:** 023 (run-complete trigger; this screen follows the "Run Complete" banner on the victory path), 006 (defeat signal routing), 034 (encounter registry for outcome routing)

---

## Summary

The quiet retrospective at the end of every run. Whether Pip triumphed over the Rat King or fell
to a dungeon creature, the run closes with a full-screen parchment screen that holds the record:
floor reached, enemies defeated, gold found, and — on defeat — what ended the run. The same
screen serves both outcomes with a different header tone. No dramatic "YOU DIED"; just the account.
A single "Begin Again" CTA returns the player to Home.

Victory and defeat reach the screen differently: the victory path goes through the 023 "Run
Complete" banner first (the in-dungeon triumph beat), then taps through to this retrospective.
The defeat path fades straight here, no prior banner.

This is **step ①** of a two-step plan. The visual centrepiece here is the styled stats card.
The hand-drawn dungeon-sketch centrepiece (Idea 014) is reserved for step ②.

---

## Acceptance criteria

### Routing

1. After the 023 "Run Complete" banner, when the player taps (or the 3 s auto-advance fires),
   the encounter registry routes to the Run Summary screen with `outcome: 'victory'`.

2. When Pip's HP reaches 0 in any combat encounter (enemy or boss), the encounter registry
   routes to the Run Summary screen with `outcome: 'defeat'`. This replaces the current Home
   routing for `'defeat'` outcomes.

3. The transition **to** the Run Summary screen in both cases is a **full fade** (~600 ms):
   the dungeon canvas fades out; the parchment screen fades in. No slide, no rise gesture.

4. From the Run Summary screen, tapping "Begin Again" routes to the Home screen with a brief
   fade (~300 ms).

### Run-state tracking

5. A `RunSummary` data object is assembled by the encounter registry (or a dedicated `RunState`
   module) when the run ends. It contains:
   - `outcome: 'victory' | 'defeat'`
   - `floorReached: number` — the floor Pip was on when the run ended (1–3)
   - `enemiesDefeated: number` — total combat victories accumulated across the run
   - `goldEarned: number` — total gold credited to inventory over the run (the accumulator,
     not the current inventory balance — Pip may have spent some at shops)
   - `killedBy: string | null` — the enemy's display name if `outcome === 'defeat'`; `null`
     on victory
   - `killedByFloor: number | null` — floor of the fatal combat if `outcome === 'defeat'`;
     `null` on victory

6. `enemiesDefeated` is incremented by 1 each time a combat encounter resolves with a player
   victory (enemy HP ≤ 0). The counter lives in run-wide state, not inside any encounter panel.

7. `goldEarned` is incremented by the exact amount each time gold is credited to
   `inventory.gold`, from any source (combat reward, chest, etc.). It reflects total gold
   found over the run, not the current balance. The counter lives in run-wide state.

8. On a combat defeat signal: `killedBy` is set to the enemy's display name; `killedByFloor`
   is set to the current floor number. Both are captured at the point the `'defeat'` outcome
   is signalled to the registry.

9. If any tracker was not initialised before the run ended (defensive fallback), defaults are
   used: `floorReached: 1`, `enemiesDefeated: 0`, `goldEarned: 0`, `killedBy: null`,
   `killedByFloor: null`.

### Screen layout

10. The Run Summary screen occupies the full viewport. Background surface: `--surface-parchment`
    (`#201810`). No dungeon canvas is visible behind it.

11. The screen has three vertical zones:
    - **Header zone** (upper ~30% of screen height): outcome-specific title text and a thin
      rule, centred horizontally.
    - **Stats card** (centre ~45%): a bordered card containing the run stats.
    - **Footer zone** (lower ~25%, thumb country): a single "Begin Again" CTA.

12. **Header — victory**: `RUN COMPLETE` in bold 20 px monospace, `--gold`, centred. A thin
    full-width horizontal rule below at `--gold` 40% opacity.

13. **Header — defeat**: `THE RUN ENDS` in bold 20 px monospace, `--text-primary`, centred.
    A thin full-width horizontal rule below at `--text-muted` 40% opacity. No "YOU DIED" or
    equivalent dramatic phrasing.

14. **Stats card**: a centred panel bordered 1 px in `--parchment-rule`, 4 px border-radius,
    horizontal padding 16–20 px. Each stat occupies one labelled row:
    - Label in 10 px monospace small-caps, `--text-muted` (e.g. `FLOOR REACHED`)
    - Value in 22 px monospace, `--text-primary`, right-aligned within the card

    Rows are separated by thin rules in `--parchment-rule` at 30% opacity.

    Rows in display order: `FLOOR REACHED`, `ENEMIES DEFEATED`, `GOLD FOUND`.

    On defeat only: an additional row below `GOLD FOUND` with label `FELLED BY` and value
    `"[EnemyName] · Floor [N]"` in italic 14 px system-ui, `--text-muted`.

15. **Stats animation**: when the fade-in completes, `enemiesDefeated` and `goldEarned` count
    up from 0 to their final values over ~1 s. `floorReached` and the `FELLED BY` row appear
    immediately with the card, without count-up (discrete / text values).

16. **Footer**: a single centred button, label `Begin Again`, styled as the primary parchment
    CTA: `--surface-parchment` background, `--gold` border (1 px), `--gold` text, 14 px
    monospace. The button fades in 0.5 s after the screen appears, giving the player a beat
    to read the record before they are invited to tap.

### Quality

17. The screen renders correctly at portrait widths 360 px–430 px without horizontal overflow
    or clipped text.

18. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

---

## Scope / non-goals

- **No dungeon sketch.** The hand-drawn map as centrepiece (Idea 014, step ②) is deferred.
- **No shiny scraps display.** Depends on 029 (meta-progression); that feature will add a
  scraps row to the stats card when it ships.
- **No items-remaining display.** Showing what Pip had left in their satchel is future.
- **No defeat beat in the combat panel.** What the panel shows at the moment Pip's HP hits 0
  is owned by 006/023. This spec owns only what happens after `'defeat'` is signalled.
- **No run history or persistent records.** This screen shows the current run only.
- **No non-combat death sources yet.** Trap deaths will carry `killedBy` / `killedByFloor`
  using the same mechanism when trap encounters are built (025); no change to this spec needed.

---

## Design detail

### Data model

```
RunSummary {
  outcome: 'victory' | 'defeat'
  floorReached: number
  enemiesDefeated: number
  goldEarned: number
  killedBy: string | null
  killedByFloor: number | null
}
```

`RunState` (new module, or augmented game state) tracks live counters during a run:

```
RunState {
  floor: number               // existing
  enemiesDefeated: number     // new — starts at 0
  goldEarned: number          // new — starts at 0
  killedBy: string | null     // new — null until defeat
  killedByFloor: number | null  // new — null until defeat
}
```

On run end, the encounter registry reads `RunState` and builds `RunSummary` before routing.

### Run flow

```
[BOSS PANEL — COMPLETE sub-phase]
  "Run Complete" banner (023 spec)
  Player taps / 3 s auto-advance
        │ registry receives onComplete('run-complete')
        │ RunSummary assembled with outcome: 'victory'
        ▼
[FADE OUT dungeon — 600 ms]
        ▼
[RUN SUMMARY — victory header]
  Stats count up; "Begin Again" fades in at +0.5 s
        │ player taps "Begin Again"
        ▼
[FADE — 300 ms → HOME]


[ENEMY / BOSS PANEL — COMBAT sub-phase]
  Pip hp ≤ 0
        │ registry receives onComplete('defeat')
        │ killedBy + killedByFloor captured; RunSummary assembled
        ▼
[FADE OUT dungeon — 600 ms]
        ▼
[RUN SUMMARY — defeat header + FELLED BY row]
  Stats count up; "Begin Again" fades in at +0.5 s
        │ player taps "Begin Again"
        ▼
[FADE — 300 ms → HOME]
```

Note: the 023 "Run Complete" banner does NOT appear on defeat — only on the victory path.

### Counter integration

`enemiesDefeated` and `goldEarned` are incremented at the encounter-registry level, not inside
individual panels. On receiving a `'victory'` completion signal from any combat panel, the
registry increments `RunState.enemiesDefeated`. On any gold-award event (from combat rewards
or chest drops), it increments `RunState.goldEarned` by the amount credited.

Panels signal outcomes; the registry maintains run-level tallies. No panel writes directly to
`RunState`.

### Edge cases

- **Pip dies to the Rat King**: `killedBy = "The Rat King"`, `killedByFloor = 3`. The defeat
  variant of the screen appears; the 023 banner does not.
- **Pip dies on floor 1 with 0 enemies defeated**: valid. `enemiesDefeated: 0` displays as-is.
- **Pip wins having spent all gold**: `goldEarned` reflects total gold found across the run,
  not the 0 remaining in inventory. The retrospective should feel like a record of richness, not
  penalise spending.
- **Multiple enemy deaths in one combat turn** (future possibility): `enemiesDefeated` increments
  once per combat encounter resolved, not per strike — the counter is "fights won," not "hits
  landed."

---

## Visual design

### Layout wireframe — victory

```
┌──────────────────────────────────┐  bg: --surface-parchment
│                                  │
│         RUN COMPLETE             │  --gold, bold 20px mono, centred
│  ────────────────────────────    │  --gold @ 40% opacity
│                                  │
│  ┌────────────────────────────┐  │  border: --parchment-rule 1px
│  │  FLOOR REACHED             │  │  --text-muted, 10px mono small-caps
│  │                       3    │  │  --text-primary, 22px mono
│  │  ──────────────────────    │  │  --parchment-rule @ 30%
│  │  ENEMIES DEFEATED          │  │
│  │                      12    │  │
│  │  ──────────────────────    │  │
│  │  GOLD FOUND                │  │
│  │               ◈  47        │  │
│  └────────────────────────────┘  │
│                                  │
│                                  │
│          [ Begin Again ]         │  --gold border + text, 14px mono
│                                  │
└──────────────────────────────────┘
```

### Layout wireframe — defeat

```
┌──────────────────────────────────┐  bg: --surface-parchment
│                                  │
│         THE RUN ENDS             │  --text-primary, bold 20px mono, centred
│  ────────────────────────────    │  --text-muted @ 40% opacity
│                                  │
│  ┌────────────────────────────┐  │
│  │  FLOOR REACHED             │  │
│  │                       2    │  │
│  │  ──────────────────────    │  │
│  │  ENEMIES DEFEATED          │  │
│  │                       8    │  │
│  │  ──────────────────────    │  │
│  │  GOLD FOUND                │  │
│  │               ◈  23        │  │
│  │  ──────────────────────    │  │
│  │  FELLED BY                 │  │  ← defeat only
│  │  Goblin Guard · Floor 2    │  │  --text-muted, italic 14px system-ui
│  └────────────────────────────┘  │
│                                  │
│          [ Begin Again ]         │
│                                  │
└──────────────────────────────────┘
```

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--surface-parchment` | `#201810` | Full-screen parchment background (introduced in 023; reused) |
| `--parchment-rule` | `#5a3e28` | Stats card border and internal row dividers — warm brown, visible against `#201810` but not harsh |

No other new tokens. The screen relies on the existing palette: `--gold`, `--text-primary`,
`--text-muted`.

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| Header title (victory) | bold 20px monospace | `--gold` |
| Header title (defeat) | bold 20px monospace | `--text-primary` |
| Stat label | 10px monospace, small-caps | `--text-muted` |
| Stat value | 22px monospace | `--text-primary` |
| "Felled by" value | italic 14px system-ui | `--text-muted` |
| "Begin Again" button | 14px monospace | `--gold` |

---

## Open questions

None. All design choices are settled.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
