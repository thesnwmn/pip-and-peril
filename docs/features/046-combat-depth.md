# 046 · Combat Depth: Blue & Yellow, Full Intents & Advanced Actions

**Status:** READY
**Source idea:** Manager request; extends the design direction in `docs/concept/combat-system.md`
(Blue, Yellow, enemy intents, Tenacity window).
**Depends on:** 037 (combat overhaul — the turn loop, panel architecture, and type structures this extends).
*Pairs with:* 038 (enemy roster — populates the new intent kinds in per-tier sets); 044 (item framework — fires in the Tenacity window this feature installs).

---

## Summary

Feature 037 installed the spine: active defence, enemy intents (Attack / Guard), and the
category-panel architecture deliberately built to grow. This feature completes the base combat
layer. It adds the four remaining **enemy intents** (💢 Empower, 😴 Recover, 🕸️ Status/Poison,
☠️ Lunge), the **two-turn telegraph** revealed by Analyse, the **Blue category** (Analyse,
Exploit, Resist, Identify), the **Yellow category** (Convert, Lucky Shot), three new
**spend actions** (Shove on Red; Feint and Disengage on Green), and the **Tenacity
post-spend window** — an empty-but-wired hook that Idea 044's item framework will plug into.
After this feature, combat is mechanically complete at the base layer; 038 (enemy roster)
populates the new intent data and 023 (boss) wraps the fight in a fixed intent cycle.

---

## Acceptance criteria

### New enemy intents

1. **💢 Empower N** — when fired, sets `enemy.empowered = true`; the enemy's *next* Attack or
   Lunge intent deals `value × 2` instead of `value`. Empower itself deals no damage to Pip.
   The flag clears immediately after the empowered attack fires (or after a full dodge prevents
   it). The intent overlay shows 💢 N above the enemy.

2. **😴 Recover N** — when fired, `enemy.hp = min(enemy.hp + N, enemy.maxHp)`. No attack on Pip
   this turn. The HP bar animates the heal. Intent overlay shows 😴 N.

3. **🕸️ Status — Poison (N damage, M ticks)** — when fired:
   - If Pip's `reservedGreen >= 2` (full dodge): the hit and the condition are both avoided.
   - If `reservedGreen == 1` (partial): the direct damage is reduced by 1 per AC 6 of 037, but
     the poison condition **is still applied** — a partial mitigate stops damage, not venom.
   - If `reservedGreen == 0`: full direct damage lands and the condition is applied.
   Poison condition: `PipState.poison = { n, remaining: M }`. At the start of each of Pip's
   subsequent turns, while `remaining > 0`: `pip.hp -= n; remaining -= 1`. At `remaining === 0`
   the condition clears. This feature scopes Status to Poison only (N=1, M=3 as defaults).
   Intent overlay shows 🕸️ N/M.

4. **☠️ Lunge N** — a high-damage attack. Follows the same mitigation rule as Attack (2G = full
   dodge; 1G = −1; 0G = full N), with N set significantly higher than a normal Attack (e.g. 4–6
   in the enemy data). No special bypass of the dodge rule — the tension comes from N's size
   relative to the Green cost of both dodging *and* maintaining offence. Intent overlay shows ☠️ N.

5. For play-test purposes only, the Goblin's intent set gains one entry of each new kind — e.g.
   `[Empower 2, Recover 2, Status 1/3, Lunge 4]` — so all new mechanisms can be exercised before
   038 ships. These entries **must** carry a comment `// TODO 038: replace with tier-weighted
   sets` and be clearly separated from the production intent data.

### Two-turn telegraph

6. When Pip uses Analyse (AC 9), the enemy's *next* intent is computed and stored. It is rendered
   above the enemy as a **dimmed** secondary icon — same icon + value format as the primary intent
   but at 40% opacity (see Visual design). The dimmed icon persists until the current intent
   resolves; on the following Pip turn it becomes the new primary and a new next-intent may be
   revealed if Analyse is used again.

7. The dimmed icon must be legible at the narrowest target phone width without overlapping the
   primary intent icon (offset 8 px right and 4 px up from the primary, or equivalent).

### Blue category

8. A **🔵 Blue** category button appears in the panel. It greys (no actions affordable) when
   `availableBluePips < 1`. It follows the same open/collapse submenu pattern as Red and Green.

9. **Analyse (2B)** — reveals the enemy's next intent (triggering AC 6). Sets
   `combatState.analysedThisCombat = true`. Can be used at most once per turn (the button greys
   after use within an allocation phase, even if Blue pips remain); it does not reset the overlay
   already showing.

10. **Exploit (2B)** — deals 2 damage to the enemy, **bypassing Guard entirely** (`enemy.block`
    is not consulted; damage reduces `enemy.hp` directly). Available only when
    `combatState.analysedThisCombat === true`; otherwise greyed with the note "Analyse first".
    Once the combat flag is set it stays set until the combat ends — the player invests 2B in
    Analyse once and can Exploit on any subsequent turn. Each Exploit use costs 2B independently.

11. **Resist (3B)** — clears one active status condition on Pip (sets `pip.poison = null`).
    Greyed when `pip.poison === null`. Fires in the allocation phase and takes effect immediately
    (the indicator on Pip's bar disappears).

12. **Identify (1B)** — reveals the enemy's exact HP as a number overlay near their bar (e.g.
    "3/8"). Without Identify the bar shows only the fill ratio. The reveal persists for the rest
    of the combat. The button greys after the first use.

### Yellow category

13. A **🟡 Yellow** category button appears in the panel. It greys when `availableYellowPips < 1`.

14. **Convert (2Y)** — converts 2 Yellow pips into 1 pip of a chosen colour (Red, Green, or Blue).
    Opening the Convert action shows a colour-picker inline (three small buttons 🔴 / 🟢 / 🔵).
    Tapping a colour performs: `yellowPips -= 2; chosenColourPips += 1`. The converted pip joins
    the available pool immediately for use in the same allocation phase. Repeatable while ≥2Y
    remain. Converting to Blue opens (or un-greys) the Blue category on the same turn even if no
    Blue dice are in Pip's pool.

15. **Lucky Shot (1Y)** — deals 1 damage, bypasses Guard (`enemy.block` not consulted, hits `hp`
    directly). Repeatable per turn while Yellow pips remain.

### New spend actions

16. **Shove (3R)** added to the Red submenu: cancels the enemy's current intent — it does not fire
    on the enemy's turn. The *next* intent is computed and displayed immediately (the overlay
    updates in place). Pip spends 3R. Available against all enemy types including bosses.

17. **Feint (2G, spend)** added to the Green submenu: reduces `enemy.block` by 2 (minimum 0).
    These pips are spent, not reserved, and do not contribute to dodge. Greyed when
    `enemy.block === 0`, with the note "No guard to break."

18. **Disengage (3G, spend)** added to the Green submenu: cancels the enemy's current intent AND
    sets `enemy.disengaged = true`. On the enemy's next turn the intent is revealed (shown on the
    overlay) but does not fire; `enemy.disengaged` clears after that suppressed turn. Pips are
    spent, not reserved. With 3G spent Pip typically cannot also hold 2G for a full dodge on the
    same turn — this is the cost.

### Tenacity window

19. The turn loop gains a **`'tenacity-window'`** phase immediately after step 4 of 037 (offence
    resolves), before the enemy acts. Currently it passes through with no action (no items exist).
    The phase must be emitted by `encounter.ts` and acknowledged by the state machine so Idea 044
    can register handlers without touching the loop.

### Panel layout

20. The category row now holds six buttons: 🔴 Red · 🟢 Green · 🔵 Blue · 🟡 Yellow · Item · Flee.
    Preference is a single row if all six buttons can be at least 44 px wide at the narrowest
    target width; fall back to a two-row layout (colour categories top, Item + Flee bottom) if
    not. The Engineer must verify and document the chosen layout in the Shipped section.

### Quality

21. New intent handlers unit-tested (pure functions): Empower flag set/cleared; Recover capped at
    `maxHp`; Status/Poison — condition set when `reservedGreen < 2`, condition NOT set when
    `reservedGreen >= 2`, ticks decrement correctly, cleared at zero; Lunge — same mitigation
    table as Attack.

22. Blue logic tested: Exploit greyed when `!analysedThisCombat`; Exploit available (2B) after
    Analyse; Resist greyed when `pip.poison === null`; Identify greys after first use.

23. Yellow logic tested: Convert (2Y → 1R/G/B); converted pips immediately available; Lucky Shot
    each use consumes 1Y and hits HP directly regardless of block.

24. Shove, Feint, Disengage tested: Shove cancels intent + reveals next; Feint reduces block (min
    0), greyed at 0; Disengage cancels intent + sets `enemy.disengaged`, clears after suppressed turn.

25. Poison tick timing tested: ticks fire at start of Pip's turn; Resist clears immediately.

26. `npm run typecheck` exits with zero new errors.
27. `npm run test` passes.

---

## Scope / non-goals

**Deferred to later features:**

- **Status effects beyond Poison** (Slow, Stun) — the `status` intent kind is introduced, but
  only the Poison variant is wired. Slow and Stun are future additions once a creature's
  personality warrants them.
- **Rattled / Emboldened** emotional states (Idea 041) — a standalone follow-up that layers on
  this turn structure.
- **Item interjection framework** (Idea 044) — the Tenacity window hook (AC 19) is installed;
  items that fire in it are entirely 044's concern.
- **Per-tier intent pools and floor/run-depth gating** (038) — 046 ships the intent mechanisms;
  038 populates the production enemy data. The Goblin test entries (AC 5) are removed when 038
  lands.
- Fortune Track — explicitly deferred from the base system (concept doc).
- Purple dice — no action until the base system is stable.

**Out of scope entirely:**

- Boss intent cycle and boss fight redesign (023).
- Multi-colour combo actions — concept doc defers these to meta-progression skills only.
- Die-type risk profiles and meta-progression (029).

---

## Design detail

### State machine (extends 037)

```
[ENCOUNTER — 'player-turn']
  Player allocates pips across:
    Red:    Strike · Heavy Strike · Shove (3R, cancels intent)
    Green:  Reserve · Feint (2G spend, −block) · Disengage (3G spend, cancel+skip)
    Blue:   Analyse (2B, reveal next intent) · Exploit (2B, bypass Guard — after Analyse)
            Resist (3B, clear Poison) · Identify (1B, exact HP)
    Yellow: Convert (2Y → 1 any colour) · Lucky Shot (1Y, bypass Guard)
    Flee: (as 037)
     │  Player ends turn
     ▼
['tenacity-window']   ← new phase; no-op until Idea 044 registers handlers
     │
     ▼
[ENEMY TURN]
  intent fires (if not cancelled by Shove or Disengage-from-prior-turn):
    attack / lunge → damageToPip(N × empowered?2:1, reservedGreen); clear empowered
    guard          → enemy.block += N
    empower        → enemy.empowered = true; no damage
    recover        → enemy.hp = min(hp + N, maxHp)
    status/poison  → if reservedGreen >= 2: no condition; else: pip.poison = { n, remaining:M }
  if enemy.disengaged: suppress intent execution; enemy.disengaged = false
  reserved Green consumed; damage lands; poison tick at start of next Pip turn
  [victory / defeat as in 037]
     │
  next intent revealed → 'player-turn'
```

### Type additions (`src/combat/types.ts`)

```
// Intent kinds (extends 037's 'attack'|'guard')
Intent.kind: 'attack'|'guard'|'empower'|'recover'|'status'|'lunge'
// Status intents carry the condition parameters:
interface StatusIntent extends Intent { kind: 'status'; statusKind: 'poison'; ticks: number }

// Enemy state (adds to 037)
Enemy:
  empowered:   boolean    ← set by Empower intent; cleared after next attack fires
  disengaged:  boolean    ← set by Pip's Disengage; cleared after one suppressed turn
  maxHp:       number     ← needed for Recover cap (may already exist; ensure it's there)

// Pip state (adds to 037)
PipState:
  poison: { n: number; remaining: number } | null

// Combat round state (adds to 037)
CombatState:
  analysedThisCombat: boolean   ← set by Analyse; persists until combat ends
  analysedThisTurn:   boolean   ← set when Analyse fires this allocation phase; reset each turn
                                   (gates the Analyse button greying — max once per turn)
  phase: (extends 037) | 'tenacity-window'
```

### Exploit / Analyse relationship

`analysedThisCombat` persists across turns — once the player has studied the enemy (2B), the
weakness is known for the fight. `analysedThisTurn` is the per-allocation flag that greys the
Analyse button after one use. Both flags reset at combat end, not turn end.

### Yellow conversion model

Converted pips are added to the current `availablePips` map immediately. Converting to Blue
un-greys the Blue category button in the same allocation phase. The panel may need to refresh the
category row after a Convert; the existing submenu-collapse logic handles this naturally if
`availablePips` is reactive.

### Poison timing

Poison ticks fire at the **start of Pip's turn**, after intent is revealed, before Pip rolls:

```
start-of-turn:
  if pip.poison && pip.poison.remaining > 0:
    pip.hp  -= pip.poison.n
    pip.poison.remaining -= 1
    if pip.poison.remaining === 0: pip.poison = null
    if pip.hp <= 0: defeat
  reveal intent → await roll
```

This means a freshly-poisoned Pip feels the venom on the *next* turn, not immediately — the
first tick is a clock ticking down, giving Pip one turn to Resist before it bites.

### Scope note for the Engineer

If sprint capacity demands it, this feature splits cleanly at the intent boundary:
- **Part A**: Blue and Yellow categories + Shove, Feint, Disengage + Tenacity window hook.
- **Part B**: The four new enemy intents + two-turn telegraph UI.

Part A can ship without Part B; Part B cannot ship without Part A (Resist requires the Blue
category). Both parts share acceptance criteria above — the split does not change what is built,
only the order.

---

## Visual design

### Panel layout — all six categories

```
┌─────────────────────────────────────────┐
│  [status strip — depth only]            │
├─────────────────────────────────────────┤
│          💢2  ⚔️3(dimmed)               │  ← current intent (full) + next (40% opacity)
│     🐭  ◀──────────────▶  👹            │
│ PIP ████████░ 7/10  ☠×2                 │  ← ☠+tick count when Poisoned
│          GOBLIN ████░ 3/8  🛡2          │  ← exact HP after Identify; 🛡 block value
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│  [d6:4 🔴] [d6:2 🟢] [d4:1 🟡]         │  ← dice pool
│  [🔴 Red][🟢 Grn][🔵 Blu][🟡 Yel][Item][Flee]  │  ← all six — single row preferred
│  ...battle log...                       │
└─────────────────────────────────────────┘
```

Single row preferred (all six ≥44 px). If it doesn't fit, colour categories form the top row
and Item + Flee a second row below.

**Blue submenu (Analyse used — Exploit available):**

```
│  [🔵 Blu ▾]                              │
│    └ [Analyse 2🔵 ✓] [Exploit 2🔵]      │
│       [Resist 3🔵]   [Identify 1🔵]     │
```

`✓` on Analyse after first use (greyed but still visible so the player sees what was spent).

**Yellow submenu (Convert selected):**

```
│  [🟡 Yel ▾]                              │
│    └ [Convert 2🟡: [🔴] [🟢] [🔵]]     │
│       [Lucky Shot 1🟡]                  │
```

Tapping 🔴, 🟢, or 🔵 in the colour picker performs the conversion and collapses back to the
open submenu (so the player can convert again or choose Lucky Shot).

**Color tokens**

Two new tokens; all intent icons are emoji (no colour token needed for them):

| Token | Value | Used for |
|---|---|---|
| `--intent-dimmed` | `rgba(232,213,176,0.40)` | Next-intent overlay — `--text-primary` at 40% opacity |
| `--status-poison` | `#6b5a9a` | Poison indicator glyph + tick count on Pip's HP bar |

**Typography / sizing**

- Dimmed next-intent icon: same size as primary (icon ~20px, value `bold 14px monospace`) but
  at 40% opacity via `--intent-dimmed`. Offset 8px right, 4px up from primary icon's anchor.
- Poison indicator: `bold 10px monospace` in `--status-poison`, drawn on/near Pip's bar in the
  same overlay zone as the enemy's block indicator on the enemy bar.
- Identify HP readout: `bold 10px monospace` in `--text-primary`, replacing the raw-fill display
  on the enemy bar.
- Category row: unchanged `12px monospace`. No new sizes needed.
- Yellow Convert colour picker buttons: `11px monospace`, same height as submenu action rows.

### File structure additions

Extending the 037 file structure:

```
src/
├── combat/
│   ├── types.ts          ← modified: Intent kind union; StatusIntent; Enemy.empowered/disengaged;
│   │                       PipState.poison; CombatState.analysedThisCombat/analysedThisTurn +
│   │                       'tenacity-window' phase
│   ├── intents.ts        ← modified: handlers for empower/recover/status/lunge; Goblin test
│   │                       entries (TODO 038 comment)
│   ├── encounter.ts      ← modified: applyEmpower/Recover/Status/Lunge; applyShove/Feint/
│   │                       Disengage; applyAnalyse/Exploit/Resist/Identify; applyConvert/
│   │                       LuckyShot; poison tick at turn start; Tenacity window phase emit
│   ├── encounter.test.ts ← extended: all new mechanisms
│   └── panel.ts          ← modified: Blue + Yellow category buttons; Convert colour picker;
│                           dimmed second-intent rendering; Identify HP overlay; Poison indicator
```

---

## Open questions

- **Disengage cost/effect balance.** Disengage spends 3G and cancels two consecutive enemy
  intent executions. The cost (3G spent = no dodge that same turn) is the main balance lever.
  If play-test shows this is too dominant, raise the cost to 4G or limit it to cancelling the
  current intent only (reducing to a single-turn version). Confirm before building.

- **Status variants (Slow / Stun).** Scoped to Poison only here. When a creature that warrants
  Slow or Stun arrives (likely in 038), the Designer should define those variant mechanics.
  Placeholder: `statusKind: 'poison' | 'slow' | 'stun'` can be stubbed in the type but the
  `slow` and `stun` handlers are not built.

- **Shove against bosses.** The boss has a fixed intent cycle (to be specced in 023). Shove
  cancels the current intent in the cycle but does not skip the cycle position — the following
  turn the cycle advances normally. This seems correct (Shove buys a turn, not a skip in the
  pattern). Confirm with the 023 spec.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
