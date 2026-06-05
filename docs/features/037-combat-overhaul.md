# 037 · Combat Overhaul: Intents, Active Defence & Panel Redesign

**Status:** READY *(ships in two phases — Phase 1 below is the buildable contract; Phase 2 is documented direction)*
**Source idea:** Idea 039 (Enemy Intent System) + Idea 040 (Active Defence), consolidated; folds backlog item 036 (Raw Flee). Manager request to make the overhaul + panel one unblocker.
**Depends on:** 006 (combat encounter — the loop this replaces), 030 (elastic canvas — the panel this redesigns), 005 (dice pool), 020 (fled tile state, item action button)

## Summary

Combat today is "roll, spend everything, take damage, repeat" — there is **nothing to save pips
for**, so the only decision is which buttons to press, never *whether* to press them. This feature
installs the strategic spine the concept calls for (`docs/concept/combat-system.md`): the enemy
**telegraphs an intent** before Pip rolls, and **defence becomes active** — Pip must deliberately
*reserve* Green pips instead of spending them (2 Green fully dodges the coming hit; 1 Green shaves
1 damage). Every turn becomes one question: *hit harder now, or hold back and survive what's
coming?* The combat panel is redesigned in the same stroke to render this — an intent banner on
top, the dice pool with live face values, action buttons that show their pip cost and grey out
when unaffordable, and a defence-reserve indicator — replacing today's cramped layout so it has
room for the new actions (including **Flee**, folded in here) and future item slots. This is the
unblocker the rest of the combat roadmap (enemy roster, boss, items) builds on.

## Acceptance criteria

*Phase 1 is the contract the Engineer builds and the Reviewer checks. Phase 2 (see Design detail)
is direction, not yet a build.*

### Intent

1. On combat entry and at the start of every Pip turn, the enemy's **current intent** is computed
   and shown in the panel **before** Pip rolls. Phase-1 intent set: ⚔️ **Attack N** (will deal `N`
   damage) and 🛡️ **Guard N** (will raise `N` block on its turn instead of attacking).
2. The intent is visible during the whole of Pip's turn (banner persists through roll and
   allocation) so the player allocates pips with full information.
3. The Goblin's Phase-1 intent pattern is defined in data (not hard-coded in the renderer): an
   ordered/weighted set the encounter draws from each turn. Default Goblin: mostly Attack 2, with
   an occasional Guard 2 — simple enough to teach the system on Floor 1.

### Turn structure & active defence

4. The turn loop is: **intent shown → Pip rolls → Pip allocates (offence spent vs Green reserved)
   → offence resolves → enemy intent fires → reserved Green absorbs → damage lands → next intent
   shown.** (Diagram in Design detail.) No enemy action fires on the very first roll of a combat.
5. `CombatState` tracks **reserved Green separately from spent pips**. Reserving Green does **not**
   produce an offence action; it is held for defence and consumed when the enemy acts.
6. When an **Attack N** intent fires, damage to Pip = mitigation applied to `N`:
   - `reservedGreen >= 2` → the hit is **fully dodged** (0 damage), regardless of `N`.
   - `reservedGreen == 1` → damage reduced by 1 (`max(0, N − 1)`).
   - `reservedGreen == 0` → Pip takes the full `N`.
   Reserved Green resets to 0 after the enemy's turn resolves.
7. Spending Green on an action (Phase 1 has none that spend Green — see Flee/Phase 2) or simply not
   reserving it means **no defence that turn** — taking the full telegraphed hit is a valid, often
   correct, choice when `N` is small. The system must not auto-mitigate.

### Actions (Phase 1)

8. **Strike** — cost **2 🔴** — deal the weapon's attack value in damage (default **2**) to the
   enemy. Resolves immediately; victory checked on the spot.
9. **Heavy Strike** — cost **4 🔴** — deal weapon attack value **+2** (default **4**). More
   pip-efficient per point of damage; fewer actions per turn.
10. **Reserve (Dodge)** — moves Green pips into the **defence reserve** rather than spending them.
    The control shows the protection the current reserve yields ("Dodge ready" at ≥2, "−1" at 1).
    Reserving more Green than needed is allowed but wasted against a single hit.
11. **Enemy Guard** absorbs Pip's offence: while the enemy holds `block`, Strike/Heavy Strike
    damage depletes `block` before HP; block does not regenerate and carries until depleted. (In
    Phase 1 nothing bypasses Guard — Lucky Shot/Exploit arrive in Phase 2.)
12. Action buttons follow the existing pip-deduction/enable logic (005). A button whose cost
    exceeds the pips currently available renders in an **insufficient-pips greyed state** (visibly
    disabled, cost still legible) — never hidden.

### Flee (folds item 036)

13. A **Flee** control is present in the panel every turn, requires **no pips**, and sits in the
    allocate phase. It is **disabled against a boss** (`enemy.isBoss`).
14. Choosing Flee provokes **one unblocked hit**: the enemy deals its base `attack` value to Pip
    **ignoring any reserved Green** (reserve does not protect a flee), then combat ends.
15. After fleeing, Pip is returned to the **tile she entered the room from** (`combat.entryFrom`),
    not the room she fled, and the room is left in the **fled state** from feature 020 (red enemy
    marker; combat restarts on re-entry). If the flee hit reduces Pip to 0 HP, defeat takes
    precedence over the retreat.

### Panel redesign

16. The combat panel is rebuilt to the elastic-canvas wireframe (see Visual design): **intent
    banner** at the top of the panel; Pip and enemy **HP bars**; the **dice pool with each die's
    current face value** shown; **action buttons** with pip costs and the greyed state from AC 12;
    a **defence-reserve indicator** showing how many Green are held and the protection they give;
    a **one-line battle log** of the most recent outcome.
17. The panel uses the dungeon-dark surface (`--surface`), consistent with the elastic canvas
    (030). The map zone above stays live (medium-close combat camera) — unchanged from 030.
18. The layout must leave headroom for additional action buttons and item slots without re-crowding
    (the redesign's whole purpose) — verify by mocking the panel with Strike, Heavy Strike, Reserve
    and Flee all present plus one placeholder item slot, with no overlap on the target phone width.

### Victory / defeat / persistence

19. Victory (enemy HP ≤ 0), defeat (Pip HP ≤ 0), HP persistence across rooms, and post-combat
    return to navigation behave as in 006 — this feature changes the turn *mechanics and panel*,
    not the run-state plumbing or the victory/defeat banners.

### Quality

20. `npm run typecheck` exits with zero new errors.
21. `npm run test` passes. New/updated pure functions are unit-tested: intent selection;
    reserve-based mitigation (2G dodges any `N`; 1G = −1; 0G = full); Guard block depletion across
    turns; Strike/Heavy Strike damage and victory detection; Flee damage ignoring reserve and the
    entry-tile return; boss-Flee disabled.

## Scope / non-goals

**Phase 1 deliberately excludes** (these are Phase 2, documented in Design detail — not built yet):

- Intents beyond Attack/Guard: 💢 Empower, 😴 Recover, 🕸️ Status, ☠️ Lunge.
- **Blue** actions (Analyse → two-turn telegraph, Exploit, Resist, Identify) and **Yellow**
  (2:1 convert, Lucky Shot). Phase 1 is a Red/Green fight.
- Green *spend* actions Shove (3R), Feint (2G), Disengage (3G).
- The **Tenacity** post-spend window and the item interjection framework generally (Idea 044).
- In-combat healing. 006's Blue **Focus** heal is **removed** — healing becomes an item concern
  (post-damage window, Phase 2 / Idea 044). See Open questions on whether a stopgap is needed.

**Out of scope entirely (separate features):**

- **Rattled / Emboldened** emotional states (Idea 041 — a post-overhaul follow-up).
- **Boss intent cycles** and the boss fight itself (item 023, to be re-specced against this).
- **Enemy roster / per-tier intent sets** (item 038 — this spec only ships the Goblin's set; 038
  defines the rest).
- **Roaming enemies.** Flee establishes the fled-state + retreat cost that *seeds* roaming, but
  roaming behaviour (enemies leaving their room) is a later feature.
- **Die-type risk profiles / meta-progression** (folded into item 029).

**Coherence note:** keep **Green = agility/speed** so out-of-combat Green checks still read
naturally — feature 025 (trap agility check) and 026 (chest) use Green/Blue as plain attribute
checks; this feature must not redefine Green in a way that breaks them.

## Design detail

### State machine (Phase 1)

```
[NAVIGATION]
     │  Pip enters an uncleared 'enemy' room
     ▼
[ENCOUNTER — intent shown, 'awaiting-roll']
  Intent computed & shown. Dice 'idle'. Actions disabled. No enemy action yet.
     │  Player taps ROLL
     ▼
[ENCOUNTER — 'player-turn']
  Dice 'rolled', face values shown. Actions enabled where affordable.
  Player may: Strike / Heavy Strike (spend R) · Reserve Green (→ defence) · Flee.
     │                              │                         │
     │  offence brings enemy.hp≤0   │  Player ends turn (ROLL) │  Player taps Flee
     ▼                              ▼                         ▼
 ['victory']               [ENEMY TURN]               [enemy free hit, ignores reserve]
                            6. intent fires            Pip → entryFrom; room 'fled'
                            7. reserved Green absorbs   (defeat if HP≤0)
                            8. damage lands             ▼
                            (Guard: enemy gains block)  [NAVIGATION]
                               │              │
                          pipHp≤0          pipHp>0
                             ▼                ▼
                        ['defeat']    next intent shown → 'player-turn'
```

### `CombatState` additions (extends 006)

`src/combat/types.ts` extends the existing `CombatState`/`Enemy`:

```
CombatState (added/changed):
  intent:        Intent          ← current telegraph, recomputed each Pip turn
  reservedGreen: number          ← Green held for defence this turn; resets after enemy turn
                                    (supersedes 006's evadeBuffer)
  entryFrom:     {x,y}           ← tile Pip stepped in from, for Flee retreat
  phase:         'awaiting-roll' | 'player-turn' | 'victory' | 'defeat'

Enemy (added):
  attack:    number              ← weapon/strike damage value (existing)
  block:     number              ← current Guard block (default 0)
  isBoss:    boolean             ← gates Flee
  intents:   IntentSet           ← weighted Phase-1 set (Goblin: mostly Attack 2, some Guard 2)

Intent:
  kind:  'attack' | 'guard'      ← Phase 1; widened in Phase 2
  value: number                  ← N (damage for attack, block for guard)
```

`reservedGreen` generalises 006's `evadeBuffer`: the old **Evade** action set `evadeBuffer = 2`
and subtracted it from incoming damage; the new model holds Green as a *reserve* and applies the
2G-dodge / 1G-mitigate rule (AC 6). Migrate the mitigation in `applyEnemyAttack` accordingly.

### Mitigation function (pure, unit-tested)

```
damageToPip(intentValue, reservedGreen):
  if reservedGreen >= 2: return 0            // full dodge of one hit
  return max(0, intentValue - reservedGreen) // 1G → −1, 0G → full
```

### Guard resolution

A **Guard N** intent, when it fires on the enemy's turn, sets `enemy.block += N` (the enemy does
not attack that turn). On subsequent Pip turns, Strike/Heavy Strike damage depletes `block` before
`hp` (`absorbed = min(damage, block); block -= absorbed; hp -= (damage - absorbed)`). Block does
not regenerate. Per the concept's resolved open question, in later phases only Lucky Shot/Exploit
bypass Guard; Phase 1 has neither, so Guard simply demands more Red to break through.

### Flee resolution

Flee sits in the allocate phase (concept doc, "Where does Flee fit?"). On Flee: apply
`pipHp -= enemy.attack` **without** reserve mitigation (the "free hit"); if `pipHp <= 0` → defeat;
otherwise mark the room fled (feature 020 state) and move Pip to `combat.entryFrom`, clear
`combat`, resume navigation. Disabled when `enemy.isBoss`.

### Phase 2 — planned extensions (documented direction, not this build)

Same document, next build once Phase 1 ships and the roster (038) needs richer telegraphs:

- **Full intent set:** Empower (next attack doubled, shown a turn early), Recover (enemy heals),
  Status (debuff on hit), Lunge (damage exceeding a full reserve). Per-tier intent pools and the
  floor-depth / run-depth gating are **038**'s job to populate; this spec owns the *mechanism*.
- **Blue actions:** Analyse (reveal next intent → two-turn telegraph), Exploit (bypass Guard,
  needs prior Analyse), Resist (clear a status), Identify (exact enemy HP). Blue dice are typically
  absent early — surfacing Blue mid-run is the discovery beat.
- **Yellow:** 2:1 convert to any colour; Lucky Shot (1Y → 1 damage bypassing Guard).
- **Green spend actions:** Shove (3R, skip current intent), Feint (2G, −2 enemy Guard),
  Disengage (3G, enemy skips next attack).
- **Tenacity window** (post-spend) — a hook for Idea 044's Tenacity items.

## Visual design

Dungeon-dark panel (`--surface`), elastic-canvas register from 030. Wireframe (extends the
combat-panel sketch in `docs/concept/screen-layout-and-transitions.md`):

```
┌─────────────────────────────┐
│ [status strip]              │
├─────────────────────────────┤
│   Pip ◀────▶ Enemy in room  │  ← medium-close combat camera (live map, from 030)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← PANEL_TOP
│  ⚔️ Goblin intends: Attack 2 │  ← INTENT BANNER (kind icon + value), full width, top of panel
├─────────────────────────────┤
│ PIP ████████░░ 7/10   GOBLIN ███░ 3/6 │  ← HP bars (enemy shows block pips if Guarding)
│  [d6:4 🔴] [d6:2 🟢] [d4:1 🟡]        │  ← dice pool: each die shows its CURRENT FACE value
│  🟢 Reserve: 2 — Dodge ready          │  ← DEFENCE-RESERVE INDICATOR (held green + protection)
│  [ Strike 2🔴 ] [ Heavy 4🔴 ]         │  ← offence; greyed when unaffordable (cost stays legible)
│  [ Reserve 🟢 ]            [ Flee ]   │  ← Reserve holds green; Flee = no pips, free hit, retreat
│  Strike — 2 damage. (Goblin 5→3)      │  ← one-line battle log (most recent outcome)
└─────────────────────────────┘
```

- **Intent banner** is the panel's top strip: intent icon, enemy name, and `kind + value`
  ("Attack 2", "Guard 2"). It is the most prominent text in the panel — it is the information the
  whole turn pivots on.
- **Defence-reserve indicator** reads the live reserve: `0` → hidden/neutral; `1` → "−1 incoming";
  `≥2` → "Dodge ready" (the coming hit fully negated). Uses the existing Green pip colour.
- **Greyed action state** (AC 12): button at reduced opacity with the pip cost still legible; not
  removed, so the player learns what's possible when pips allow.
- Voice per `screen-layout` §1: "Attack", "Heavy", "Reserve", "Flee" — not shouty caps; "Not
  enough" rather than "INSUFFICIENT PIPS" for the unaffordable hint.

**Color tokens**

Extends the palette in `docs/concept/overview.md` / the tokens used by 006. Reuse existing where
possible (`--surface` #14142a panel, gold #c8941e Pip bar, `--room-enemy` #7a1a1a enemy bar,
`--room-corridor` #2a2a3a empty bar, the existing Green pip colour for the reserve indicator).

| Token | Value | Used for |
|---|---|---|
| `--intent-banner-bg` | `#1c1c34` (a touch above `--surface`) | Intent banner strip background, to lift it off the panel body |
| `--guard-steel` | `#5a6b82` | Guard intent icon/value + the enemy's block pips on its HP bar (cool steel reads as "defending") |

(Attack intent reuses `--room-enemy` red; no other new colours.)

**Typography / sizing**

- Intent banner text: `bold 13px monospace`, `textPrimary`; intent value emphasised. Larger than
  the battle-log line — it is the hero text of the panel.
- Per-die face value: `bold 11px monospace` overlaid on the die face (matches existing dice badge
  sizing from 005).
- Defence-reserve line and battle log: `11px monospace`, `textMuted` (log) / Green (reserve).
- No other deviations from the 005/006/030 type scale.

### File structure

```
src/
├── combat/
│   ├── types.ts          ← modified: Intent, IntentSet; CombatState gains intent/reservedGreen/
│   │                       entryFrom; Enemy gains block/isBoss/intents
│   ├── intents.ts        ← new: pure intent selection (weighted draw) + Goblin intent set
│   ├── encounter.ts      ← modified: damageToPip (reserve rule), Guard block depletion,
│   │                       applyHeavyStrike, applyFlee; remove applyFocus/applyEvade
│   ├── encounter.test.ts ← modified/extended: mitigation, Guard, Heavy Strike, Flee, boss-Flee
│   └── panel.ts          ← modified: intent banner, dice-face values, reserve indicator,
│                           greyed action state, Reserve + Flee controls
└── screens/
    └── game.ts           ← modified: record entryFrom on room entry; wire Reserve/Flee/Heavy;
                            fled-state + retreat on Flee; intent refresh each turn
```

## Open questions

- **Stopgap heal for Phase-1 playtest?** Removing Focus leaves no in-combat heal until items
  (Phase 2 / Idea 044). Phase 1's "race or dodge" loop is intended to work without it, but if
  Floor-1 playtests feel unfair we may want a temporary heal item before 044 lands. Does not block
  the build — flag for the first play-test.
- **Reserve UX — one tap vs per-pip?** Does "Reserve" move *all* available Green to the reserve in
  one tap, or let the player choose how many (e.g. hold 2, spend the rest later in Phase 2 on
  Feint)? Phase 1 has no Green spend action, so "reserve all Green" is simplest and recommended;
  revisit when Feint/Disengage arrive.
- **Boss-Flee feedback.** When Flee is disabled against a boss, show the control greyed with a
  one-line "No escape." rather than hiding it — confirm wording.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
