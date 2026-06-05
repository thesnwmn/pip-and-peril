# 023 · Boss Encounter & Run Completion

**Status:** READY
**Source idea:** Manager request; backlog item — full revision against features 037 and 046.
**Depends on:** 037 (combat overhaul — turn loop, panel architecture, intent system), 046 (combat depth — Empower and Lunge intent kinds required by Phase 1 and Phase 2 cycles), 019 (gold reward and `rollGoldReward`), 022 (boss room placement), 034 (encounter registry — boss panel implements `EncounterPanel`)

---

## Summary

The climax of every run. When Pip enters the Boss room on Floor 3, the encounter registry
triggers the boss encounter panel, which plays a cinematic intro — camera pulls back wide, a
title card names the threat, camera tightens onto the boss — before a **fixed, learnable intent
cycle** begins. **The Rat King** is the sole boss in this feature: a warlord whose Phase 1 cycle
is patient and calculated (Attack → Guard → Empower → Attack), and whose Phase 2 cycle
(triggered at 50% HP) strips that patience away and replaces it with relentless force
(Attack → Lunge → Attack). Defeating him marks the run complete and routes to a parchment
"Run Complete" banner → Home. This spec also defines a `BossSpec` data shape that makes
adding further bosses a matter of data, not new panel logic; the randomised multi-boss draw is
deferred to a follow-up feature.

---

## Acceptance criteria

### Encounter trigger

1. Entering a Boss room tile on Floor 3 triggers the boss encounter via the encounter registry.
   The trigger condition is `roomType === 'boss'` on the entered tile. The registry instantiates
   the boss encounter panel (passing the active `BossSpec` — currently always `RAT_KING`) and
   begins the RISING animation per the standard lifecycle (feature 034).

### Intro sequence

2. When the boss panel enters its ACTIVE phase it immediately enters an **INTRO sub-phase**
   (~2.5 s total) before combat controls appear. The sequence:
   - At entry: the panel's declared `mapView` shifts to a **wide-zoom** configuration (whole
     room visible). This begins during or immediately after the RISING animation.
   - ~500 ms in: a **title card** fades in over the upper portion of the map zone — the boss's
     name in large gold display text, the flavour line in italic muted text below. The card uses
     a gradient scrim (not a solid fill) so tile art shows through.
   - ~1.5 s in: title card fades out; the panel's declared `mapView` transitions to a
     **tight-zoom** configuration (boss fills the upper view, Pip visible but small).
   - ~2.5 s: INTRO sub-phase ends; combat controls appear and the **COMBAT sub-phase** begins.

3. During INTRO no dice, action buttons, or HP bars are shown in the panel zone. No panel-zone
   input is accepted.

### Boss stats

4. The Rat King's base stats live in a single `RAT_KING` constant of type `BossSpec`:
   `maxHp: 20`, `goldMin: 15`, `goldMax: 25`, `enrageThreshold: 10`.

5. All enemy-facing fields used by the 037 combat loop — `hp`, `maxHp`, `block`, `isBoss: true`
   — are present and typed consistently with the existing `Enemy` interface from 006. `isBoss: true`
   disables Flee (037 AC 13) without any boss-specific logic in the panel.

### Phase 1 — Patient Sovereignty (HP > enrageThreshold)

6. The Rat King uses a **fixed, deterministic intent cycle**. The cycle is an ordered array; the
   active intent is `cycle[cyclePosition]`. After each enemy turn fires, `cyclePosition` advances
   by 1, wrapping modulo cycle length.

7. **Phase 1 cycle** (4 intents, starting at position 0 on combat entry):

   | Position | Intent | Value | Player read |
   |----------|--------|-------|-------------|
   | 0 | ⚔️ Attack | 4 | Opening blow — dodge or absorb |
   | 1 | 🛡️ Guard | 3 | Raising defences — Feint, Exploit, or chip through |
   | 2 | 💢 Empower | — | Warning: next attack will double |
   | 3 | ⚔️ Attack | 4 (×2 = 8) | The real strike — dodge or race to kill now |

   At position 2, Empower fires per 046 AC 1: no damage to Pip; `enemy.empowered` is set.
   At position 3, the Attack intent fires: because `enemy.empowered` is true, it resolves at
   value 8 (4 × 2) per 046 AC 1, and `enemy.empowered` clears after the attack lands.

8. On the Guard turn (position 1), Guard fires per 037 AC 11: the Rat King gains `block = 3`.
   The block accumulates: Strike/Heavy Strike damage depletes `block` before `hp`. Block carries
   until depleted; it does not regenerate at the start of the next turn.

### Phase 2 — Unrestrained Fury (HP ≤ enrageThreshold)

9. **Enrage** fires the first time damage brings the Rat King's `hp` to ≤ `enrageThreshold`
   (10), and `enraged` is `false`:
   - Set `enraged = true`.
   - Reset `cyclePosition = 0` (Phase 2 cycle starts from the beginning).
   - Append a log entry before the next enemy intent shows: *"The Rat King seethes — his fury
     grows!"* in warning/red log style.
   - The boss HP bar tint changes from `--room-boss` to `--boss-enraged` immediately.
   - Enrage fires exactly once per combat — further damage below the threshold does not re-fire.

10. **Phase 2 cycle** (3 intents, starting at position 0 on enrage):

    | Position | Intent | Value | Player read |
    |----------|--------|-------|-------------|
    | 0 | ⚔️ Attack | 5 | Escalated base strike |
    | 1 | ☠️ Lunge | 8 | Devastating charge — commit to dodge or to killing |
    | 2 | ⚔️ Attack | 5 | Relentless pressure |

    Lunge resolves per 046 AC 4: 2G = full dodge; 1G = −1; 0G = full 8 damage.
    The Phase 2 cycle is shorter (3 vs 4 intents) — the Lunge arrives every 3 turns.

11. When `cyclePosition` advances past the last index of the active phase cycle, it wraps to 0.
    When `enraged` becomes true, the active cycle switches to Phase 2 and `cyclePosition` is
    reset — independently of where in the Phase 1 cycle the enrage was triggered.

### HP display

12. During boss combat the boss HP bar spans the **full width of the panel zone** — wider and
    more prominent than the half-width enemy bar used in regular combat. The boss name appears
    on a line above the bar in bold 12 px monospace, `--text-primary`. Bar fill: `--room-boss`
    before enrage; `--boss-enraged` after.

13. Pip's HP overlay on the map zone follows the same approach as regular combat (feature 037
    AC 16-17): HP bar beneath Pip on the map, not in the panel zone.

### Gold reward

14. On boss defeat (`enemy.hp ≤ 0`), gold is rolled using the existing `rollGoldReward` function
    (feature 019) from `RAT_KING`'s `goldMin`/`goldMax` and credited to `inventory.gold`
    immediately. `goldAwarded` is stored on the combat state for the Run Complete banner.

### Run Complete

15. On boss defeat, the boss panel transitions to a **COMPLETE sub-phase**. Navigation does not
    resume — the run is over.

16. The **Run Complete banner** fills the panel zone:

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

17. On tap anywhere in the panel zone (or after 3 s auto-advance), the boss panel signals
    `onComplete('run-complete')` to the encounter registry. The registry ends the run and routes
    to the **Home screen**.

### Defeat routing

18. When Pip's HP reaches 0 during boss combat, the boss panel signals `onComplete('defeat')`.
    The game routes to the **Home screen**.

19. When Pip's HP reaches 0 during **any** combat encounter (including regular enemy rooms), the
    game routes to the **Home screen**. This corrects the behaviour in feature 006, which routes
    to "Main Menu." The Engineer updates the enemy combat panel's defeat path when implementing
    this feature.

### Quality

20. The boss encounter panel is a self-contained module implementing the `EncounterPanel`
    interface (034). It registers with the encounter registry via `registry.register()`. No
    boss-specific logic appears in `game.ts`.

21. All Rat King constants — `maxHp`, `enrageThreshold`, `goldMin`, `goldMax`, intro timing
    values, and both intent cycles — live in the `RAT_KING` constant of type `BossSpec`. No
    magic numbers scattered through the panel module.

22. Unit tests cover:
    - Phase 1 cycle advances correctly: positions 0 → 1 → 2 → 3 → 0.
    - Phase 2 cycle advances correctly: positions 0 → 1 → 2 → 0.
    - Enrage fires when HP crosses the threshold.
    - Enrage does not fire again on further damage below the threshold.
    - On enrage, `cyclePosition` resets to 0 regardless of the prior position.
    - Empower at position 2 doubles the Attack at position 3; `empowered` clears after that attack.
    - Lunge at Phase 2 position 1 follows the same mitigation rules as Attack (2G = 0 damage).
    - `rollGoldReward(RAT_KING)` always returns an integer in `[goldMin, goldMax]`.

23. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

---

## Scope / non-goals

- **One boss type only.** The `BossSpec` data shape makes adding more bosses a data change, not
  a panel rewrite — but the Rat King is the only entry in this feature. Multi-boss roster and the
  randomised run-start draw are deferred to a follow-up spec (see Design detail).
- **No new actions or pip mechanics.** All actions available against the Rat King are the same
  set that 037 + 046 install: Strike, Heavy Strike, Shove (Red); Reserve, Feint, Disengage
  (Green); Analyse, Exploit, Resist, Identify (Blue); Convert, Lucky Shot (Yellow). No in-combat
  healing action — 006's Focus action was removed by 037 and is not restored.
- **No cycle indicator in the UI.** The cycle is learnable by play, not by being shown the full
  sequence. The intent telegraph (current intent shown before each roll) is the only information
  the player gets.
- **No defeat-path fix for non-combat encounters** (trap, chest, etc.). Only combat defeats.
- **No run-summary screen.** Feature 024 is the payoff screen; this spec routes to Home as the
  temporary destination. When 024 ships, the `'run-complete'` outcome routing changes from Home
  to the run-summary screen — no other change to this feature needed.
- **No boss room placement logic.** Feature 022 handles where the Boss room appears.
- **No boss-specific audio.** Out of scope.

---

## Design detail

### Sub-phase state machine

```
[RISING — registry animation, ~300 ms]
  Panel climbs from off-screen. mapView: wide-zoom.
        │
        ▼
[ACTIVE — INTRO sub-phase, ~2.5 s]
  map zone: title card overlay (fade in → hold → fade out)
  panel zone: dark surface, no controls
  mapView: wide → tight transition at ~1.5 s mark
        │ 2.5 s elapsed
        ▼
[ACTIVE — COMBAT sub-phase]
  panel zone: boss HP bar, dice pool, category buttons (same layout as 037/046)
  map zone: HP overlays, intent overlay above boss
  log: combat events
        │ boss hp ≤ 0
        ▼
[ACTIVE — COMPLETE sub-phase]
  panel zone: Run Complete banner
  On tap / 3 s → onComplete('run-complete') → Home
        │ Pip hp ≤ 0 (any point during COMBAT)
        ▼
  onComplete('defeat') → Home
```

The registry sees only RISING → ACTIVE → FALLING. Sub-phase transitions are internal.

### BossSpec data shape

The `BossSpec` type defines all boss-specific constants. New bosses are added as additional
`BossSpec` objects; the boss panel reads only from the active spec.

```
BossSpec {
  id: string                 // e.g. 'rat-king'
  name: string               // display name: "The Rat King"
  titleCard: {
    name: string             // "THE RAT KING" (caps variant for card)
    flavour: string          // "Ancient. Patient. Hungry."
  }
  maxHp: number
  enrageThreshold: number    // hp at which Phase 2 activates
  goldMin: number
  goldMax: number
  phases: BossPhase[]        // index 0 = Phase 1, index 1 = Phase 2
}

BossPhase {
  cycle: BossIntent[]        // ordered intent list; cyclePosition wraps within this
}
```

`BossIntent` reuses the intent type from 037/046: `{ kind, value? }` where `kind` is one of
`'attack' | 'guard' | 'empower' | 'lunge' | 'recover' | 'status'`.

The panel tracks `cyclePosition: number` and `activePhase: number` (0 or 1). On combat entry,
both start at 0. Enrage sets `activePhase = 1; cyclePosition = 0`.

### Phase 1 cycle — "Patient Sovereignty"

The four-intent cycle tests Guard, Empower, and the commitment dilemma between offence and
defence:

```
Position 0 — ⚔️ Attack 4
  The Rat King opens with a measured blow. The player learns his base attack is non-trivial
  but survivable. First intent of combat: player decides whether to hold 2G or swing freely.

Position 1 — 🛡️ Guard 3
  He draws back and raises bulk defences. block = 3 is added.
  - Raw Strike (2 damage): depletes 2 block → block remains at 1, no HP damage.
  - Heavy Strike (4 damage): depletes 3 block → block at 0, 1 HP damage.
  - Feint (2G) reduces block by 2 → block at 1; then Strike → 1 HP damage; total 2G + 2R.
  - Feint + Heavy Strike: block at 1, Strike → 3 damage through; total 2G + 4R.
  - Exploit (2B, bypasses Guard): 2 HP damage direct, regardless of block.
  The player cannot simply spam Strikes. Guard forces a decision about pip routing.

Position 2 — 💢 Empower
  No damage. enemy.empowered = true. A free turn for the player in terms of incoming threat —
  but the intent telegraph says: "next hit will double." Kill him here or prepare to dodge.

Position 3 — ⚔️ Attack 4 (fires as 8 while empowered)
  The real blow. 2G = full dodge, 0 damage. 1G = 7 damage. 0G = 8 damage.
  A player at max HP (10) who takes this unmitigated is at 2 HP — effectively terminal.
  The intended read: "I warned you."
```

### Phase 2 cycle — "Unrestrained Fury"

Shorter cycle (3 intents), starts on enrage. The patient strategic character is gone — pure force.

```
Position 0 — ⚔️ Attack 5
  First hit post-enrage. The player just saw their HP bar change colour and read the log
  line. This turn gives them one roll to assess the new cycle before Lunge arrives.

Position 1 — ☠️ Lunge 8
  2G = full dodge. 1G = 7 damage. 0G = 8 damage.
  Combined with Attack 5 on the previous turn, a player who took both hits unmitigated
  has taken 13 damage — past any reasonable HP value. Lunge arrives every 3 turns;
  it must be respected every cycle.

Position 2 — ⚔️ Attack 5
  Another blow before the cycle wraps. No breather — no Guard, no Recover, no setup.
  "He stops pretending restraint."
```

### Intent cycle and Empower interaction

Empower at Phase 1 position 2 sets `enemy.empowered = true`. The Phase 1 position 3 Attack
fires with value × 2 because `empowered` is true. After the attack resolves, `empowered` clears.

If the boss enrages during position 3 (the empowered attack kills him past the threshold on the
same turn that the Attack fires), enrage is irrelevant — the combat outcome resolves first.

If the boss enrages before position 3 fires (i.e., damage at position 2 brings HP to ≤ 10
during the Empower turn), `enraged` is set, `cyclePosition` resets to 0, and the Phase 2 cycle
begins. The `empowered` flag clears as part of the phase reset (it is not carried into Phase 2).

### Title card rendering

Centred horizontally in the canvas, upper third of the map zone. Details unchanged from the
original spec:
- Gradient scrim: vertical `linearGradient`, transparent at edges, semi-opaque at centre (~80 px).
- Boss name: bold 24 px monospace, `--gold`.
- Flavour: italic 13 px system-ui, `--text-muted`.
- Opacity: fade in 0–300 ms; hold 300–1500 ms; fade out 1500–1800 ms.

The `titleCard.name` and `titleCard.flavour` fields on `BossSpec` feed this renderer directly.

### mapView configuration

| Sub-phase | mapView zoom | Notes |
|---|---|---|
| RISING + INTRO start | wide (e.g. 0.75×) | Whole room visible |
| INTRO ~1.5 s mark | transitions to tight (e.g. 1.5×) | Camera eases over ~400 ms |
| COMBAT + COMPLETE | tight (1.5×) | Boss large, Pip small |

Exact zoom values are the Engineer's call; these are representative.

### Outcome routing

| Boss panel outcome | Registry action |
|---|---|
| `'run-complete'` | End run; route to Home screen (→ run-summary when 024 ships) |
| `'defeat'` | End run; route to Home screen |

The same `'defeat'` routing applies to the existing enemy combat panel (override from 006's
"Main Menu"). The Engineer updates the enemy combat panel's defeat path when shipping this
feature (AC 19). The outcome string `'defeat'` itself does not change — only the routing target.

### Multi-boss and randomisation (deferred)

The concept doc (`docs/concept/enemies-and-bosses.md`) notes "two feels shallow; five or six
feels like real variety" and describes five additional boss candidates (Kira One-Eye, Old Gloop,
The Pale Adder, Scratch, Mother Silk). This spec builds the framework (`BossSpec`, cycle engine)
and the Rat King as the first entry. A follow-up spec should:
- Define `BossSpec` entries for at least two more bosses (Kira + Old Gloop to start).
- Add a `BOSS_POOL: BossSpec[]` and the randomised run-start draw.
- Handle boss foreshadowing (Idea 011) as a third feature or alongside the roster expansion.

Until that spec ships, `RAT_KING` is the only entry in the pool and is always selected.

### Edge cases

- **Pip enters boss room at low HP.** Combat starts normally; intro plays; first roll fires
  before any enemy attack (per 037). A player at 3 HP facing Attack 4 as the first intent has
  exactly one turn to act before they take damage. The urgency is intentional.
- **Empower + Guard interaction.** The Rat King's Phase 1 cycle does not combine Empower with
  Guard (they are at positions 2 and 1 respectively). The `empowered` flag would carry into any
  subsequent turn's Attack — if the cycle were changed to produce this combination, the empowered
  damage would stack on top of the Guard's defensive shift, not bypass Guard.
- **Block carries past a turn boundary.** If the Rat King's Phase 1 Guard turn leaves `block > 0`
  (because Pip did not fully deplete it), the remaining block carries into the Empower turn and
  the Attack turn. Pip can still deplete it on those turns.
- **Enrage during the Guard turn.** If HP drops to ≤ 10 mid-Guard-turn (while `block` is still
  being depleted by the player's attacks), enrage fires after the current enemy turn resolves.
  The `block` granted by the Guard intent is discarded when the phase resets.
- **Enrage during the Empower turn.** `empowered` flag clears as part of the phase reset.
  The doubled attack does not carry into Phase 2.

---

## Visual design

### Layout wireframe — boss combat

```
┌──────────────────────────────────┐
│ ← Quit Run    Floor 3  Depth 14  │  ← status strip (no HP here — moved to map)
├──────────────────────────────────┤
│                                  │
│  ⚔️ 4 ↑        💢 dim ↑          │  ← intent overlays: primary (bright) + next (dim)
│   [THE RAT KING  ████████░░ 16]  │  ← boss HP bar on map, full-width label
│         ≈≈ vs ≈≈                 │
│   [PIP  ████████░░ 7]            │  ← Pip HP bar on map
│                                  │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  PANEL_TOP
│ THE RAT KING                     │  ← boss name, bold 12px monospace (panel echo)
│ ████████████████░░░░░░  16/20    │  ← full-width HP bar in panel, --room-boss fill
│ ────────────────────────────     │
│ [d6🔴] [d6🟢] [d4🟡] [d4🔵]     │  ← dice pool (pool varies per run/upgrades)
│ [🔴 Red] [🟢 Green] [🔵 Blue]   │  ← category buttons (open submenus)
│ [🟡 Yellow] [Item] [Flee ✗]     │  ← Flee greyed — disabled vs boss
│ [ battle log line ]              │
└──────────────────────────────────┘
```

During INTRO, the panel zone below PANEL_TOP is `--surface` with no controls. The title card
appears in the map zone above.

During Enrage, the full-width HP bar tint switches from `--room-boss` to `--boss-enraged`. The
intent overlay also updates to the Phase 2 cycle's first intent immediately.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--boss-enraged` | `#c0200a` | Rat King HP bar fill after Enrage triggers |
| `--surface-parchment` | `#201810` | Run Complete banner background (warm dark amber) |

Both tokens are unchanged from the original spec; carried forward. `--boss-enraged` is brighter
and hotter than `--room-boss` (`#3a0a0a`) — the visual shift reinforces the threat escalation.

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| Title card boss name | bold 24px monospace | `--gold` |
| Title card flavour text | italic 13px system-ui | `--text-muted` |
| Boss name above HP bar (panel) | bold 12px monospace | `--text-primary` |
| Run Complete banner title | bold 22px monospace | `--gold` |
| Run Complete primary line | 14px system-ui | `--text-primary` |
| Run Complete flavour line | italic 12px system-ui | `--text-muted` |
| Gold reward line | bold 14px monospace | `--gold` |

---

## Open questions

None. All design choices are settled. The multi-boss randomisation question noted in Design
detail is a scope deferral, not a blocker on this feature.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
