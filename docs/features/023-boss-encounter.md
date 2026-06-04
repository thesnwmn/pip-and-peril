# 023 · Boss Encounter & Run Completion

**Status:** READY
**Source idea:** Manager request; backlog item
**Depends on:** 006 (combat loop and actions), 019 (gold reward pattern and `rollGoldReward`), 022 (boss room placement), 034 (encounter registry — boss panel implements `EncounterPanel` interface)

---

## Summary

The climax of a run. When Pip enters the Boss room on Floor 3, the encounter registry triggers
the boss encounter panel, which plays a cinematic intro — camera pulls back wide, a title card
names the threat, camera tightens onto the boss — before combat begins. **The Rat King** is a
named boss with 20 HP and one signature mechanic: **Enrage** at half HP, permanently raising
his attack. Defeating him marks the run as complete and routes to the Home screen via a
parchment-toned "Run Complete" banner. Pip's death during boss combat also routes to Home,
and this spec corrects the same routing for all enemy-combat defeats (currently "Main Menu").

---

## Acceptance criteria

### Encounter trigger

1. Entering a Boss room tile on Floor 3 triggers the boss encounter via the encounter registry.
   The trigger condition is `roomType === 'boss'` on the entered tile. The registry instantiates
   the boss encounter panel and begins the RISING animation per the standard lifecycle (feature 034).

### Intro sequence

2. When the boss panel enters its ACTIVE phase it immediately enters an **INTRO sub-phase**
   (~2.5 s total) before combat controls appear. The sequence:
   - At entry: the panel's declared `mapView` shifts to a **wide-zoom** configuration (whole
     room visible). This begins during or immediately after the RISING animation.
   - ~500 ms in: a **title card** fades in over the upper portion of the map zone — *"The Rat
     King"* in large gold display text, *"Ancient. Patient. Hungry."* in italic muted text below.
     The card uses a gradient scrim (not a solid fill) so tile art shows through.
   - ~1.5 s in: title card fades out; the panel's declared `mapView` transitions to a
     **tight-zoom** configuration (boss fills the upper view, Pip visible but small).
   - ~2.5 s: INTRO sub-phase ends; combat controls (HP bars, dice, action buttons) appear in
     the panel zone and the **COMBAT sub-phase** begins.

3. During INTRO no dice, action buttons, or HP bars are shown in the panel zone. No panel-zone
   input is accepted. The title card and map camera adjustments are the only activity.

### Boss stats

4. The Rat King's base stats: `maxHp: 20`, starting `hp: 20`, `baseAttack: 3`. A single
   constant `RAT_KING` in the boss panel module holds all numeric values (see AC 18). The `Enemy`
   interface from feature 006 is reused; the Rat King also carries `goldMin: 15, goldMax: 25`.

5. The Rat King's attack value each turn: `enraged ? 5 : baseAttack`. Normal is 3; enraged is 5.

6. **Enrage** triggers the first time the Rat King takes damage that brings `hp` to ≤ 10 and
   `enraged` is `false`:
   - Set `enraged = true`.
   - Append a log entry before the next enemy attack fires: *"The Rat King seethes — his fury
     grows!"* rendered in warning/red log style (matching the `'enemy'` log style from 006).
   - Boss HP bar tint changes immediately from `--room-boss` to `--boss-enraged`.
   - Enrage triggers exactly once per combat — further damage below 10 HP does not re-fire.

### Actions and Evade

7. The same three actions are available against the Rat King: **Strike** (2 🔴), **Evade**
   (2 🟢), **Focus** (1 🔵). No new actions are introduced.

8. Evade works normally against both regular and enraged attacks. The `evadeBuffer` reduces
   incoming damage as per feature 006 regardless of whether the boss is enraged.

### Boss HP display

9. During boss combat the boss HP bar spans the **full width of the panel zone** — wider and more
   prominent than the half-width enemy bar used in regular combat. The boss name **"THE RAT KING"**
   appears on a line above the bar in bold 12 px monospace, `--text-primary`. Bar fill:
   `--room-boss` (`#3a0a0a`) before enrage; `--boss-enraged` (`#c0200a`) after.

10. Pip's HP bar remains as a compact bar in the status strip throughout boss combat (same as
    regular enemy combat). The HP display for Pip does not move to the panel zone.

### Gold reward

11. On boss defeat (Rat King `hp` ≤ 0), gold is rolled using the existing `rollGoldReward`
    function (feature 019) from `RAT_KING`'s `goldMin`/`goldMax` and credited to `inventory.gold`
    immediately. `goldAwarded` is stored on the combat state so the Run Complete banner can
    display it.

### Run Complete

12. On boss defeat, the boss panel transitions to a **COMPLETE sub-phase**. Navigation does not
    resume. The run is over.

13. The **Run Complete banner** fills the panel zone. It is visually distinct from the standard
    enemy Victory banner (which uses dungeon-dark `--surface`):

    ```
    ┌──────────────────────────────────┐
    │                                  │
    │        ── VICTORY ──             │  --gold, bold 22px monospace, centred
    │                                  │
    │      The Rat King falls.         │  --text-primary, 14px system-ui, centred
    │   The dungeon holds its breath.  │  --text-muted, italic 12px system-ui, centred
    │                                  │
    │          + N gold  ◈             │  --gold, bold 14px monospace, centred
    │                                  │
    │        Tap to continue           │  --text-muted, italic 11px (fades in at 0.5 s)
    │                                  │
    └──────────────────────────────────┘
    ```

    Surface: `--surface-parchment` (`#201810`). Top border: `--gold`. The warm tone signals
    "this is different from killing a Goblin."

14. On tap anywhere in the panel zone (or after 3 s), the boss panel signals
    `onComplete('run-complete')` to the encounter registry. The registry ends the run and routes
    to the **Home screen**.

### Defeat routing correction

15. When Pip's HP reaches 0 during boss combat, the boss panel signals `onComplete('defeat')`.
    The game routes to the **Home screen** (not Main Menu).

16. When Pip's HP reaches 0 during **any** combat encounter (including regular enemy rooms), the
    game routes to the **Home screen**. This corrects the behaviour currently specified in feature
    006, which routes to "Main Menu." The Engineer reconciles the enemy combat panel's defeat path
    when implementing this feature.

### Quality

17. The boss encounter panel is a self-contained module implementing the `EncounterPanel`
    interface (034). It registers with the encounter registry via a `registry.register()` call.
    No boss-specific logic appears in `game.ts`.

18. All boss constants — `maxHp`, `baseAttack`, `enrageThreshold` (10), `enragedAttack` (5),
    `goldMin`, `goldMax`, intro timing values — live in a single `RAT_KING` constant in the
    boss panel module. No magic numbers.

19. Unit tests cover:
    - Enrage fires when HP crosses the threshold.
    - Enrage does not fire again on further damage below the threshold.
    - Attack value is `baseAttack` before enrage and `enragedAttack` after.
    - `rollGoldReward(RAT_KING)` called many times always returns an integer in [15, 25].

20. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

---

## Scope / non-goals

- **One boss type only.** Multiple boss types and boss variety are future work.
- **No boss room placement logic.** Feature 022 handles where and when the Boss room appears;
  this feature only handles what happens when Pip enters it.
- **No new actions or pip mechanics.** Strike, Evade, and Focus are unchanged.
- **No defeat-path fix for non-combat encounters** (trap, chest, etc.). Only combat defeats are
  covered by AC 16.
- **No run-summary screen.** Feature 024 is the payoff screen; this spec routes to Home as
  the temporary destination until 024 ships. When 024 lands, the `'run-complete'` outcome
  routing changes from Home to the run-summary screen — no other change to this feature needed.
- **No "cleared" flag on the boss room.** The run ends immediately on boss victory or defeat;
  there is no opportunity to re-enter.
- **No boss-specific music or sound.** Audio is out of scope.

---

## Design detail

### Boss panel sub-phases

The boss encounter panel manages three internal sub-phases during its ACTIVE lifecycle:

```
[RISING — registry animation, ~300 ms]
  Panel climbs from off-screen. mapView: wide-zoom begins.
        │
        ▼
[ACTIVE — INTRO sub-phase, ~2.5 s]
  map zone: title card overlay (fade in → hold → fade out)
  panel zone: dark surface, no controls
  mapView: wide → tight transition at ~1.5 s mark
        │ 2.5 s elapsed
        ▼
[ACTIVE — COMBAT sub-phase]
  panel zone: boss HP bar, dice pool, action buttons
  log: combat events
        │ Rat King hp ≤ 0
        ▼
[ACTIVE — COMPLETE sub-phase]
  panel zone: Run Complete banner
  On tap / 3 s → onComplete('run-complete')
        │ Pip hp ≤ 0 (at any point during COMBAT)
        ▼
  onComplete('defeat')
```

The registry sees only RISING → ACTIVE → FALLING (the standard lifecycle). Sub-phase management
is internal to the boss panel.

### Enrage state

```
RatKingCombatState extends CombatState:
  enraged: boolean     // false initially; true once hp ≤ enrageThreshold
  introElapsed: number // ms since ACTIVE phase began; drives title card timing
```

Enrage check runs immediately after any damage is applied to the Rat King:

```
if (!state.enraged && state.enemy.hp <= RAT_KING.enrageThreshold):
  state.enraged = true
  addLog("The Rat King seethes — his fury grows!", 'enemy')
  // HP bar tint update is driven by state.enraged in the renderer
```

The attack value used when the enemy fires:
```
attackDamage = state.enraged ? RAT_KING.enragedAttack : RAT_KING.baseAttack
damage = Math.max(0, attackDamage - evadeBuffer)
```

### Title card rendering

The title card is drawn by the boss panel's `draw()` call during INTRO. Because the panel has
unrestricted canvas access (feature 034 AC 6), it can draw over the map zone regardless of the
panel's physical position on screen.

Layout: centred horizontally in the canvas, positioned in the upper third of the map zone.
- Gradient scrim: a vertical `linearGradient` from `rgba(13,13,26,0)` to `rgba(13,13,26,0.75)`
  to `rgba(13,13,26,0)` — transparent at edges, semi-opaque at centre. Height ~80 px. This lets
  tile art show through at the edges.
- Boss name: `"THE RAT KING"` — bold 24 px monospace, `--gold`.
- Flavour: `"Ancient. Patient. Hungry."` — italic 13 px system-ui, `--text-muted`.
- Opacity driven by `introElapsed`: fade in 0–300 ms; hold 300–1500 ms; fade out 1500–1800 ms.

### mapView configuration

The boss panel declares its `mapView` configuration and updates it as the intro progresses:

| Sub-phase | mapView zoom | Notes |
|---|---|---|
| RISING + INTRO start | wide (e.g. 0.75×) | Whole room visible |
| INTRO ~1.5 s mark | transitions to tight (e.g. 1.5×) | Camera eases over ~400 ms |
| COMBAT + COMPLETE | tight (1.5×) | Boss large, Pip small |

Exact zoom values are the Engineer's call; these are representative. The camera transition uses
the same easing approach as existing camera moves (feature 017/030).

### Outcome routing

| Boss panel outcome | Registry action |
|---|---|
| `'run-complete'` | End run; route to Home screen |
| `'defeat'` | End run; route to Home screen |

The same `'defeat'` outcome routing applies to the existing enemy combat panel. The Engineer
updates the enemy combat panel's defeat path from "Main Menu" to "Home screen" when shipping
this feature (AC 16). The outcome string `'defeat'` itself does not change — only the routing
target.

### Edge cases

- **Pip enters boss room at 1 HP.** Combat starts normally; the intro plays; the first roll
  fires before the enemy attacks (per 006 AC 5). Player has a chance to act before taking
  damage. With 5 damage per enraged attack, a player at low HP faces extreme urgency.
- **Focus used during boss combat.** Heals 1 HP normally. No special boss interaction.
- **Evade used against enraged attack.** Reduces damage as normal — a full Evade (buffer 2)
  against a 5-damage enraged attack still results in 3 damage.
- **Intro interrupted by player tapping.** Not supported — the intro plays in full. No skip
  mechanism in this version.
- **Rat King takes damage from multiple Strikes in one turn.** Enrage check runs after each
  Strike resolves. If the first Strike brings HP to exactly 10, enrage fires. If the next Strike
  (same turn) brings HP below 10, enrage does not fire again.

---

## Visual design

### Layout wireframe — boss combat

```
┌──────────────────────────────────┐
│ ← Quit Run    PIP ██████░░ 7/10  │  ← status strip: compact Pip HP bar
├──────────────────────────────────┤
│                                  │
│   [map — tight zoom]             │
│   Boss rendered large;           │  ← live tile renderer, boss prominent
│   Pip small on opposite side     │
│                                  │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  PANEL_TOP
│ THE RAT KING                     │  ← boss name, bold 12px monospace
│ ████████████████░░░░░░  16/20    │  ← full-width HP bar, --room-boss fill
│ ────────────────────────────     │
│ [d6🔴][d4🟢][d8🟡]              │
│ [Strike 2🔴]  [Evade 2🟢]      │
│ [Focus 1🔵]                     │
│ [ battle log line ]              │
└──────────────────────────────────┘
```

During INTRO, the panel zone below PANEL_TOP is filled with `--surface` and shows nothing.
The title card appears in the map zone above.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--boss-enraged` | `#c0200a` | Rat King HP bar fill after enrage triggers |
| `--surface-parchment` | `#201810` | Run Complete banner background (warm dark amber) |

Both tokens are new. `--boss-enraged` is a brighter, hotter red than `--room-boss` (`#3a0a0a`) —
the visual shift reinforces the threat escalation. `--surface-parchment` is the first "camp
temperature" surface token; it will be reused by the run-summary screen (024) and other
parchment-toned contexts.

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| Title card boss name | bold 24px monospace | `--gold` |
| Title card flavour text | italic 13px system-ui | `--text-muted` |
| Boss name above HP bar | bold 12px monospace | `--text-primary` |
| Run Complete banner title | bold 22px monospace | `--gold` |
| Run Complete primary line | 14px system-ui | `--text-primary` |
| Run Complete flavour line | italic 12px system-ui | `--text-muted` |
| Gold reward line | bold 14px monospace | `--gold` |

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
