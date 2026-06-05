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
coming?* The combat panel is redesigned in the same stroke: **HP bars and the intent telegraph
move onto the map** as an overlay (Pip and the enemy rendered facing off, a health bar beneath
each, the intent icon above the enemy), which frees the panel to be pure controls — the **dice
pool** plus a small set of **category buttons** (Red / Green / Item / Flee) that open submenus,
instead of a cramped row of every action at once. This makes the dice pool the panel's hero
element, and leaves clean room for the actions and item slots still to come (Blue, Yellow,
coatings). This is the unblocker the rest of the combat roadmap (enemy roster, boss, items) builds
on.

## Acceptance criteria

*Phase 1 is the contract the Engineer builds and the Reviewer checks. Phase 2 (see Design detail)
is direction, not yet a build.*

### Intent

1. On combat entry and at the start of every Pip turn, the enemy's **current intent** is computed
   and shown **on the map as an overlay above the enemy**, **before** Pip rolls. Phase-1 intent
   set: ⚔️ **Attack N** (will deal `N` damage) and 🛡️ **Guard N** (will raise `N` block on its
   turn instead of attacking).
2. The intent overlay is visible during the whole of Pip's turn (persists through roll and
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
10. **Reserve (Dodge)** — opening the **Green category** moves Green pips into the **defence
    reserve** rather than spending them, and shows a live note of what the current reserve yields
    against the telegraphed hit ("hold 2 → Dodge ready", "hold 1 → −1", "0 → full hit"). Reserving
    more Green than needed is allowed but wasted against a single hit.
11. **Enemy Guard** absorbs Pip's offence: while the enemy holds `block`, Strike/Heavy Strike
    damage depletes `block` before HP; block does not regenerate and carries until depleted. (In
    Phase 1 nothing bypasses Guard — Lucky Shot/Exploit arrive in Phase 2.)
12. Action buttons (inside the category submenus) follow the existing pip-deduction/enable logic
    (005). A button whose cost exceeds the pips currently available renders in an **insufficient-
    pips greyed state** (visibly disabled, cost still legible) — never hidden. A whole **category
    button** is greyed when *none* of its actions are affordable (e.g. Red greys with <2🔴).

### Flee (folds item 036)

13. A top-level **Flee** category button is present every turn, requires **no pips**, and sits in
    the allocate phase. Unlike the colour categories it has no submenu — tapping it confirms the
    flee (with a brief confirm beat). It is **disabled against a boss** (`enemy.isBoss`).
14. Choosing Flee provokes **one unblocked hit**: the enemy deals its base `attack` value to Pip
    **ignoring any reserved Green** (reserve does not protect a flee), then combat ends.
15. After fleeing, Pip is returned to the **tile she entered the room from** (`combat.entryFrom`),
    not the room she fled, and the room is left in the **fled state** from feature 020 (red enemy
    marker; combat restarts on re-entry). If the flee hit reduces Pip to 0 HP, defeat takes
    precedence over the retreat.

### Combat staging — map overlay (HP + intent)

16. During combat the map zone renders Pip and the enemy **facing off** (medium-close camera from
    030), with status drawn **as overlays on the map**, not in the panel:
    - a **health bar** beneath (or beside) each combatant — Pip's and the enemy's, each labelled;
    - the **intent icon + value** floating **above the enemy** (e.g. ⚔️2), updated each Pip turn;
    - an enemy holding Guard shows its **block** value on/near its bar (see `--guard-steel`).
17. Overlay text/icons sit over a subtle scrim so they stay legible against any tile art (same
    technique as the world-narration whisper in `screen-layout-and-transitions.md`). Because the
    map now owns HP, the **status strip drops its HP readout during combat** (resolving that
    concept open question) — the strip keeps only the back link / depth.

### Panel — dice & category buttons

18. With HP/intent on the map, the panel holds only: the **dice pool with each die's current face
    value**, a row of **category buttons** (Red / Green / Item / Flee), and the **one-line battle
    log**. Dungeon-dark surface (`--surface`), consistent with the elastic canvas (030). The dice
    pool is the panel's hero element.
19. **Category → submenu interaction:** tapping a colour category opens its submenu of actions in
    place (Red → Strike, Heavy Strike; Green → Reserve with the live note from AC 10; later Blue/
    Yellow). Tapping the category again, choosing an action, or tapping the dice area collapses the
    submenu. Only one submenu is open at a time. **Item** opens the held-items list (empty for now
    — the slot exists; items arrive with Idea 044). **Flee** has no submenu (AC 13). Greying of
    categories and of submenu actions follows AC 12.
20. The layout must leave clean room to add categories (Blue, Yellow) and item entries without
    re-crowding — verify by mocking the panel with all four top-level categories plus an open Red
    submenu (Strike + Heavy) and no overlap on the target phone width.

### Victory / defeat / persistence

21. Victory (enemy HP ≤ 0), defeat (Pip HP ≤ 0), HP persistence across rooms, and post-combat
    return to navigation behave as in 006 — this feature changes the turn *mechanics, staging and
    panel*, not the run-state plumbing or the victory/defeat banners.

### Quality

22. `npm run typecheck` exits with zero new errors.
23. `npm run test` passes. New/updated pure functions are unit-tested: intent selection;
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

The combat staging splits across two zones: **status lives on the map** (HP + intent overlays on
the facing-off composition), and the **panel is pure controls** (dice + categories + log).
Dungeon-dark panel (`--surface`), elastic-canvas register from 030.

**Default state — categories collapsed:**

```
┌─────────────────────────────┐
│ [status strip — depth only] │  ← HP dropped from the strip during combat (now on the map)
├─────────────────────────────┤
│                  ⚔️2         │  ← INTENT overlay floats above the enemy (icon + value)
│        🐭  ◀────▶  👹        │  ← Pip & enemy facing off (medium-close camera, live map)
│   PIP ███████░░ 7/10         │  ← health bars overlaid on the map, beneath each combatant
│            GOBLIN ███░ 3/6 🛡2│  ← enemy bar; 🛡 block shown when Guarding (--guard-steel)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← PANEL_TOP
│   [d6:4 🔴] [d6:2 🟢] [d4:1 🟡]  │  ← dice pool — each die shows its CURRENT FACE value (hero)
│   [ 🔴 Red ] [ 🟢 Green ] [ Item ] [ Flee ]  │  ← CATEGORY buttons (one submenu open at a time)
│   Strike — 2 damage. (Goblin 5→3)            │  ← one-line battle log
└─────────────────────────────┘
```

**Red category open** (offence submenu):

```
│   [d6:4 🔴] [d6:2 🟢] [d4:1 🟡]   │
│   [ 🔴 Red ▾ ]                    │  ← active category highlighted
│     └ [ Strike 2🔴 ] [ Heavy 4🔴 ]│  ← submenu actions; greyed if unaffordable (cost legible)
│   [ 🟢 Green ] [ Item ] [ Flee ]  │
│   Strike — 2 damage. (Goblin 5→3) │
```

**Green category open** (defence — reserve with live note):

```
│   [ 🟢 Green ▾ ]                          │
│     └ Reserve: 2🟢 held — Dodge ready     │  ← live note vs the telegraphed hit (AC 10)
│       [ +Reserve 🟢 ] [ Clear ]           │  ← move green into / out of the reserve
```

- **Intent overlay** floats above the enemy: intent icon + value (⚔️2, 🛡2). It is the information
  the whole turn pivots on; on a Guard turn the icon reads 🛡 and the value is the block it will
  raise. Two-turn telegraphs (Phase 2, via Analyse) add a second, dimmer icon behind it.
- **Health bars** are drawn on the map under each combatant (not in the panel). Reuse the 006 bar
  styling (gold fill for Pip, `--room-enemy` for the enemy, `--room-corridor` empty). The enemy's
  current **block** shows as a small 🛡 + number in `--guard-steel` next to its bar.
- **Category buttons** are the only persistent controls. A category greys whole when none of its
  actions are affordable (Red greys with <2🔴). The open category is highlighted with a ▾ and its
  actions appear directly beneath it; the others stay collapsed. **Item** opens the held-items list
  (empty placeholder now; populated by Idea 044). **Flee** has no submenu — it asks a one-tap
  confirm, and is greyed with "No escape." against a boss.
- **Green category note** reads the live reserve against the current intent: `0` → "0 held — full
  hit"; `1` → "1 held — −1"; `≥2` → "Dodge ready". This is where the offence-vs-defence trade is
  made legible.
- **Greyed action state** (AC 12): reduced opacity, pip cost still legible — never removed, so the
  player learns what becomes possible with more pips.
- Voice per `screen-layout` §1: "Red", "Green", "Strike", "Heavy", "Reserve", "Flee" — not shouty
  caps; "Not enough" rather than "INSUFFICIENT PIPS" for the unaffordable hint.

**Color tokens**

Extends the palette in `docs/concept/overview.md` / the tokens used by 006. Reuse existing where
possible (`--surface` #14142a panel, gold #c8941e Pip bar, `--room-enemy` #7a1a1a enemy bar,
`--room-corridor` #2a2a3a empty bar, the existing Green pip colour for the reserve note).

| Token | Value | Used for |
|---|---|---|
| `--overlay-scrim` | `rgba(13,13,26,0.55)` (`--bg` at ~55%) | Soft gradient behind the map HP bars + intent icon so they stay legible over tile art (same idea as the world-narration whisper) |
| `--guard-steel` | `#5a6b82` | Guard intent icon/value + the enemy's block indicator on its bar (cool steel reads as "defending") |

(Attack intent reuses `--room-enemy` red; the open-category highlight reuses `--surface-raised`; no
other new colours.)

**Typography / sizing**

- Intent overlay: icon ~20px, value `bold 14px monospace` `textPrimary` over `--overlay-scrim`. It
  is the highest-priority readout on screen — sized to be read at a glance above the enemy.
- Map HP bars: reuse 006's bar dimensions/labels (`bold 10px monospace` label, `10px` count).
- Per-die face value: `bold 11px monospace` overlaid on the die face (matches the 005 dice badge).
- Category buttons: `12px monospace`; submenu actions `11px monospace` with the pip cost emphasised.
- Green reserve note + battle log: `11px monospace`, `textMuted` (log) / Green (note).
- No other deviations from the 005/006/030 type scale.

### Map overlay rendering

The facing-off composition and overlays render in the combat camera (030) above `PANEL_TOP`. Pip
and the enemy are positioned in the room (Pip one side, enemy the other); HP bars draw under each
with an `--overlay-scrim` gradient; the intent icon draws above the enemy. This is a draw concern
in the combat renderer — no change to the map tile model. If sprite work (D8) is not yet done, the
combatants can be simple tokens/labels; the overlays are the functional part.

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
│   ├── overlay.ts        ← new: map overlays (facing-off HP bars + intent icon over the scrim)
│   └── panel.ts          ← modified: dice-face values; category buttons + submenu open/collapse
│                           state; greyed category/action states; battle log
└── screens/
    └── game.ts           ← modified: record entryFrom on room entry; wire categories/submenus,
                            Reserve/Flee/Heavy; fled-state + retreat on Flee; intent refresh
```

## Open questions

- **Stopgap heal for Phase-1 playtest?** Removing Focus leaves no in-combat heal until items
  (Phase 2 / Idea 044). Phase 1's "race or dodge" loop is intended to work without it, but if
  Floor-1 playtests feel unfair we may want a temporary heal item before 044 lands. Does not block
  the build — flag for the first play-test.
- **Reserve granularity.** The Green submenu offers `+Reserve` / `Clear` so the player can hold
  some Green and (in Phase 2) spend the rest on Feint. For Phase 1, is incremental worth it or
  should `+Reserve` just hold *all* Green in one tap? Recommend incremental (it teaches the trade
  and is forward-compatible), but a one-tap "hold all" is acceptable for the MVP — confirm.
- **Overlay vs small screens.** HP bars + intent over the map must not crowd the facing-off art on
  the narrowest target width. If it gets tight, the fallback is a thin status ribbon just below the
  camera (still above `PANEL_TOP`), not back into the control panel — confirm the threshold in
  play-test.
- **Boss-Flee feedback.** Confirm the greyed Flee wording "No escape." against a boss.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
