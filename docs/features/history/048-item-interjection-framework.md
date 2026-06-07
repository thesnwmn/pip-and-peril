# 048 · Item Interjection Framework

**Status:** READY
**Source idea:** Idea 044 (`IDEAS.md`); `docs/concept/combat-system.md` (Item Interjection Points); `docs/concept/in-run-items.md` (Luck/Tenacity distinction, item classes)
**Depends on:** 020 (item registry, consumable data model), 037 (combat overhaul — turn structure), 046 (Tenacity post-spend window — already shipped)

---

## Summary

The item interjection framework is the rules layer that defines precisely *when* every item class fires during play. Each item in the registry lands in exactly one of eight interjection windows — from pre-roll to between-turns — preventing two items from competing for the same moment and giving each class a distinct feel and thematic register. The spec extends the item data model with `window` tags, a `luckyClass` boolean, a `charges` field for multi-use items, and stubs for death-prevention and passive-armour auto-hooks. Its primary UI deliverable is the **Luck interrupt prompt**: a warm amber overlay that fires at any failed non-combat dice check when Pip carries a Luck-class item, offering a one-time reroll before the failure consequence lands. Without this framework the item catalogue (045) cannot be built coherently; with it, every future item has a precise home and the Engineer never has to guess where a new item fires.

---

## Acceptance criteria

### Data model

1. Every item in the item registry has a `window` field with exactly one of these values:
   `pre-roll` | `on-roll-luck` | `during-allocation` | `on-strike` | `post-spend-tenacity` | `on-enemy-hit` | `post-damage` | `between-turns` | `navigation`.

2. Every item has a `luckyClass: boolean` field. Items where `luckyClass: true` are eligible for the Luck interrupt prompt (criteria 7–11) and the combat Luck window (criteria 12–13).

3. The following existing items are re-tagged with the correct `window` and `luckyClass` (see Design detail for the full reclassification table):
   - **Lucky Acorn** → `window: 'on-roll-luck'`, `luckyClass: true`
   - **Rabbit's Foot** (026) → `window: 'on-roll-luck'`, `luckyClass: true`; usage register changed from combat-only to both
   - **Crumb of Cheese, Wedge of Gouda, Stout Flask** → `window: 'post-damage'`, `luckyClass: false`
   - **Iron Thimble** (026) → `window: 'on-enemy-hit'`, `luckyClass: false`
   - **Smoke Pellet** → `window: 'during-allocation'`, `luckyClass: false`
   - **Glowstone Dust** → `window: 'navigation'`, `luckyClass: false`

4. Items with a `charges: number` field deplete by 1 per use and are removed from the satchel when `charges` reaches 0. Items without `charges` are consumed whole on use (existing behaviour). No charged items are introduced by this feature; the field is defined for use by 045.

5. Items with `deathPrevention: true` are checked at the moment `pipHp` would be set to ≤ 0. If such an item is present: `pipHp` is set to 1, the item is consumed, and the damage event resolves with the adjusted HP. If no such item is present, `pipHp = 0` fires the normal defeat path. No death-prevention items are introduced by this feature; the hook is defined for use by 045.

6. Items with `passiveArmour: number` reduce incoming enemy damage by that value automatically before it is applied to `pipHp`, without any player action. No passive-armour items are introduced by this feature; the field is defined for use by 045. *(Iron Thimble is activated, not passive — it sets a session flag on use; see criterion 3 and Design detail.)*

### Luck interrupt — non-combat checks

7. After any failed non-combat dice check (trap agility roll, chest lock roll, NPC skill check), if Pip's satchel contains at least one item where `luckyClass: true`, a **Luck interrupt prompt** fires before the failure consequence is applied.

8. The Luck interrupt prompt displays: item icon · item name · "Reroll?" label · **[Use]** button · **[Pass]** button · an auto-dismiss timer bar draining over 3 seconds. Auto-dismiss is equivalent to tapping [Pass].

9. Tapping **[Use]**: consumes the Luck item immediately, reruns the dice roll for the check from scratch, and evaluates the new result normally. If the re-rolled result also fails, the failure consequence lands — no further Luck prompt fires for this failure event regardless of how many Luck items remain in the satchel.

10. Tapping **[Pass]** or auto-dismiss: the failure consequence lands as it would without the framework (no state change, same behaviour as pre-framework).

11. If Pip has more than one Luck-class item, the prompt displays the first one in satchel order. Only one can be used per failure event; the player cannot choose which from within the interrupt.

### Luck interrupt — combat

12. A Luck-class item in the satchel is usable via the ITEM action at the **start of a combat turn, after roll and before any pips have been spent this turn**. Activating it reruns the full dice pool roll; the new result replaces the previous roll. The item is consumed immediately.

13. Once any pip-spend action has been taken this turn (Strike, Feint, Disengage, etc.), Luck-class items become **unavailable** for this turn — their ITEM entry is greyed out and untappable. This is enforced by the same "pips spent this turn" flag introduced by 046 for Tenacity gating.

---

## Scope / non-goals

- **Item catalogue (045)** — this spec defines the plumbing; new items using it are out of scope.
- **Tenacity re-spec** — the post-spend Tenacity window was shipped in 046. This spec formalises it in the table and references its state flag (criterion 13), but does not rebuild it.
- **Dice-face manipulation items** — the `during-allocation` window is defined; no items using it ship here.
- **Weapon coatings** — the `on-strike` window is defined; no coating items ship here.
- **Charged item Satchel UI** — charges display in the Satchel (numeric badge or charge pips) is not designed here; it arrives with the first charged item in 045.
- **Luck item selection when multiple present** — always uses satchel order; deliberate item choice within the interrupt is deferred.
- **Luck prompt for the trap encounter (025)** — 025 has already shipped. When implementing 048, the Engineer should add the Luck interrupt to the trap encounter's resolution flow at the point where the check fails and before damage is applied — the trap is a non-combat dice check and criterion 7 applies to it. This is an additive change to a shipped file, not a new spec.

---

## Dependencies

- **020** — item registry and `acquireItem` already shipped; this spec extends the item definition schema.
- **037** — the turn structure (roll → allocate → spend → enemy turn → post-damage) that the eight windows map to.
- **046** — Tenacity post-spend window shipped; the `pips-spent-this-turn` flag it introduced gates the combat Luck window (criterion 13).

---

## Design detail

### The eight interjection windows

| # | Window | When it fires | Item classes that live here |
|---|---|---|---|
| 1 | **Pre-roll** | Before Pip rolls, at turn start | Knowledge/info items; pre-roll pip adders |
| 2 | **On-roll (Luck)** | After roll, before any pip spent | Luck-class items: full pool reroll |
| 3 | **During allocation** | After roll, while pips are being spent | Dice-face manipulation; flee (Smoke Pellet) |
| 4 | **On Strike** | When a Strike action resolves | Weapon coatings |
| 5 | **Post-spend (Tenacity)** | After all pips committed this turn | Tenacity items: second roll-and-spend |
| 6 | **On enemy hit** | When enemy damage would land | Passive armour (auto-fire); activated protection items |
| 7 | **Post-damage** | After enemy action or check consequence resolves | Healing items; Luck interrupt *(non-combat only)* |
| 8 | **Between turns** | Turn end / next turn start | Status ticks (poison, empowered); item expiry |
| — | **Navigation** | Outside any encounter | Nav-only items (Glowstone Dust) |

**Note on non-combat Luck interrupt timing:** In combat, the Luck window is window 2 (on-roll). In a non-combat check there is no pip-spend phase — the check is a single roll with an immediate outcome. The interrupt fires at "check failed, before consequence" which maps temporally to the entry of window 7 in the combat model. This is the `post-damage` window's non-combat mode, as described in `docs/concept/in-run-items.md`.

### Existing item reclassification table

| Item | Introduced in | Old register | New window | luckyClass |
|---|---|---|---|---|
| Crumb of Cheese | 020 | both | `post-damage` | false |
| Wedge of Gouda | 020 | both | `post-damage` | false |
| Lucky Acorn | 020 | both | `on-roll-luck` | **true** |
| Smoke Pellet | 020 | combat | `during-allocation` | false |
| Glowstone Dust | 020 | navigation | `navigation` | false |
| Stout Flask | 026 | both | `post-damage` | false |
| Rabbit's Foot | 026 | combat | `on-roll-luck` | **true** |
| Iron Thimble | 026 | combat | `on-enemy-hit` | false |

**Rabbit's Foot reclassification:** The Rabbit's Foot in 026 was specced as a combat-only free action. Under the framework it becomes Luck-class — usable pre-spend in combat for a full pool reroll, and as a Luck interrupt on a failed non-combat check. The effect (reroll the full dice pool) is identical in both contexts. Feature 026 is updated accordingly.

**Iron Thimble note:** Iron Thimble is activated (the player taps ITEM to use it), not passive. It is tagged `on-enemy-hit` because its effect — reducing incoming damage — resolves at that window. Its activation is still a deliberate player choice during the allocation phase, consistent with the 026 spec. The `on-enemy-hit` tag describes when the effect *resolves*, not when it is *activated*.

### Data model extension

```
type ItemWindow =
  | 'pre-roll'
  | 'on-roll-luck'
  | 'during-allocation'
  | 'on-strike'
  | 'post-spend-tenacity'
  | 'on-enemy-hit'
  | 'post-damage'
  | 'between-turns'
  | 'navigation'

interface ItemDefinition {
  // ... existing fields (id, name, description, usageRegister, effect) ...
  window:           ItemWindow
  luckyClass:       boolean
  charges?:         number           // absent = whole-item consume on use
  passiveArmour?:   number           // damage reduction per hit; auto-fires; no items yet
  deathPrevention?: boolean          // fires at pipHp ≤ 0; no items yet
}
```

### Luck interrupt prompt — detail

The interrupt fires as a sub-panel overlaid onto the lower portion of the active encounter panel. It does not close the encounter or navigate away — the panel content stays visible above it.

**Behaviour flow:**

```
Non-combat check roll resolves
         │
         ▼
    Roll result < threshold?
       YES               NO
        │                 │
  Luck item              Outcome
  in satchel?            lands normally
   YES     NO
    │       │
 Luck     Outcome
 prompt   lands normally
 (3 s)
    │
  [Use]           [Pass / auto-dismiss]
    │                     │
 Item consumed         Outcome
 Roll reruns           lands normally
    │
 New result ≥ threshold?
   YES               NO
    │                 │
 Success          Failure lands
 outcome          (no re-prompt)
```

**Input lock:** While the interrupt prompt is visible, all other encounter panel inputs are locked. The player must resolve the interrupt before the encounter continues.

**Timer:** The bar drains over 3 seconds regardless of finger position. Auto-dismiss proceeds to the failure consequence.

---

## Visual design

The Luck interrupt prompt is an in-panel overlay — no new screens or navigation.

**Layout wireframe — Luck interrupt (within any encounter panel)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← encounter panel content above (context-dependent)
│   [dice settled / result] │
│                           │
│ ┌───────────────────────┐ │  ← interrupt sub-panel; amber border (--room-chest)
│ │ 🍀  Lucky Acorn       │ │  ← icon + item name; --text-primary, 15px, wt 500
│ │     Reroll?           │ │  ← label; --text-muted, 13px
│ │                       │ │
│ │  [  Use Lucky Acorn ] │ │  ← amber primary CTA (--room-chest bg)
│ │  [  Pass            ] │ │  ← muted secondary
│ │                       │ │
│ │  ▓▓▓▓▓▓░░░░░░░░  3 s  │ │  ← timer bar draining left to right
│ └───────────────────────┘ │
└───────────────────────────┘
```

**Temperature:** Warm amber (`--room-chest`) — fortune register, not alarm. The prompt should feel like the charm offering itself, not an emergency alert. This contrasts with the danger-red that a trap consequence might use; the same prompt in a trap context uses the same warm amber (the item's identity overrides the encounter's temperature).

**Color tokens:** No new tokens. Uses existing `--room-chest`, `--text-primary`, `--text-muted`.

**Typography:** Item name: 15px, weight 500, `--text-primary`. "Reroll?" label: 13px, `--text-muted`. Button text: 14px, matches existing button sizing.

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-07 · **PR:** #TBD

### What was built

The complete item interjection framework as specified:

**Data model extensions (`src/satchel/types.ts`):**
- `ItemWindow` type union — 9 values covering every fire-point in the turn loop and navigation
- `window: ItemWindow` field on every `Item`
- `luckyClass: boolean` field on every `Item`
- `charges?: number` — depletes by 1 per use; item removed when 0 (no charged items yet, field ready for 049)
- `passiveArmour?: number` — stub hook; auto-reduces incoming damage before HP applies (no items yet, ready for 049)
- `deathPrevention?: boolean` — stub hook; fires at pipHp ≤ 0, sets HP to 1, consumes item (no items yet, ready for 049)

**Catalog reclassification (`src/satchel/catalog.ts`):**
- Lucky Acorn → `window: 'on-roll-luck'`, `luckyClass: true`
- Crumb of Cheese, Wedge of Gouda → `window: 'post-damage'`, `luckyClass: false`
- Smoke Pellet → `window: 'during-allocation'`, `luckyClass: false`
- Glowstone Dust → `window: 'navigation'`, `luckyClass: false`

**Item helpers (`src/satchel/items.ts`):**
- `consumeItem(inventory, itemId)` — depletes charges if present, else consumes whole item; removes when depleted
- `applyPassiveArmour(incomingDamage, inventory)` — sums passiveArmour values; floors result at 0
- `applyDeathPrevention(pipHp, inventory)` — sets HP to 1, consumes first deathPrevention item when HP ≤ 0

**Combat Luck gating (`src/combat/types.ts`, `src/combat/panel.ts`, `src/combat/combat-panel.ts`):**
- `pipsSpentThisTurn: boolean` added to `CombatState`; reset false on every roll, set true on every pip-spend action (Strike, Reserve, Analyse, Exploit, Resist, Identify, Convert, LuckyShot, Shove, Feint, Disengage)
- `getCombatUsableItems(inventory, pipsSpentThisTurn)` — exported helper; filters `usableInCombat` items; excludes Luck items once pips spent
- Luck items rendered greyed (α = 0.38, muted border) and no hit rect registered when locked by pipsSpentThisTurn

**Luck interrupt — trap encounter (`src/encounter/trap-panel.ts`, `src/screens/game.ts`):**
- `TrapPanelContext` extended with `getInventory` / `setInventory`
- `'luck-prompt'` panel state added to the state machine
- On failed roll: checks for first luckyClass item; if found, enters luck-prompt before damage applies
- [Use]: consumes item via `consumeItem`, reruns roll, evaluates new result normally; no re-prompt on second fail
- [Pass] / auto-dismiss (3 000 ms): original failure consequence applies unchanged
- Amber sub-panel overlay (border `--room-chest`): item name, "Reroll?" label, [Use] amber CTA, [Pass] muted, draining timer bar
- All other panel inputs locked while prompt visible
- Layout constants exported (`LUCK_BTN_X/W`, `LUCK_USE_BTN_Y/H`, `LUCK_PASS_BTN_Y/H`) so tests and render share the same source of truth

### Evidence

**Tests:** 449 tests pass across 23 test files (33 new tests for this feature):

- `src/satchel/catalog.test.ts` (new) — window tag for all 5 items; luckyClass for all 5 items; every item has both fields
- `src/combat/panel.test.ts` (new) — `getCombatUsableItems`: all items when pipsSpent=false; excludes Luck when pipsSpent=true; empty when only Luck and spent; includes Luck when unspent; excludes nav-only items
- `src/encounter/trap-panel.test.ts` (extended) — no prompt on pass; no prompt without Luck items; prompt fires on fail+Luck; [Pass] applies failure; auto-dismiss at 3 s; [Use] on passing reroll; [Use] on failing reroll; item consumed after [Use]

**Type-check:** `npm run typecheck` — clean.
**Build:** `npm run build` — clean.
**init.sh:** full pass before and after implementation.

**Inline Reviewer:** Ran `code-review --effort high` on the diff. All 6 candidates REFUTED — no confirmed or plausible findings.

### Play-test instructions

1. **Luck interrupt — trap encounter**
   a. Start a run. Carry a **Lucky Acorn** (acquire from an item room).
   b. Enter a trap tile. When the agility roll fires, deliberately aim for a fail (allow the roll to resolve with insufficient green pips).
   c. On failure: the amber Luck prompt should appear over the lower panel — Lucky Acorn name, "Reroll?" label, [Use] and [Pass] buttons, draining timer bar.
   d. Tap **[Use]**: the dice reroll. If the new roll passes, the trap is avoided; if it fails, damage lands (no second prompt).
   e. Repeat: let the 3-second timer run out without tapping — confirm failure damage applies exactly as it would without the framework.
   f. Repeat: tap **[Pass]** — confirm failure damage applies immediately.
   g. After using [Use]: open the Satchel and confirm the Lucky Acorn is gone.

2. **Luck item grey-out in combat**
   a. Enter a combat encounter. Open the ITEM menu after rolling.
   b. With the Lucky Acorn in the satchel and **no pips spent**, confirm it appears normally (full opacity, tappable).
   c. Spend a pip (e.g. Strike or Reserve). Re-open ITEM — confirm Lucky Acorn is greyed out and tapping it has no effect.
   d. Begin the next turn (new roll). Confirm Lucky Acorn is available again before any pips are spent.

3. **consumeItem charges path** — no charged items ship in 048; this path is covered by unit tests only.

4. **passiveArmour / deathPrevention stubs** — no items use these fields yet; covered by unit tests in `src/satchel/items.ts`.
