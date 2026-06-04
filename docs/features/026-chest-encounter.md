# 026 · Chest Encounter

**Status:** READY
**Source idea:** Manager request; `docs/concept/overview.md` (Room Types — Chest); `docs/concept/screen-layout-and-transitions.md` (Opening a Chest); Idea 001 (empty chest surprise, archived)
**Depends on:** 019 (gold/pouch model), 020 (item system, `acquireItem`, item registry), 025 (trap mechanic — trapped variant only), 030 (encounter panel framework), 034 (encounter registry)

---

## Summary

The amber **Chest** room is the richest single-room reward moment in the game: a two-beat encounter where anticipation precedes payoff. A panel rises from the screen bottom as the camera zooms tight onto the chest; the player chooses to open or leave; if they open, a loot card animates in with gold and (often) an item. Three variants add texture — **basic** chests open freely, **locked** chests require a Blue (Intellect) dice check, and **trapped** chests fire an agility check before the reveal. This feature also introduces three new **chest-tier items** — meaningfully stronger than item-room finds — that make chests feel like a genuine reward tier above common loot.

---

## Acceptance criteria

### Core encounter

1. Entering a Chest tile with `chestState === 'closed'` triggers the chest encounter: camera smoothly zooms (with easing, ~600–800 ms — slower than combat to build anticipation) to a close view of the chest within the room, then the chest panel rises from the screen bottom.

2. The chest panel has **warm encounter temperature**: `--surface` background with an amber-toned top border (`--room-chest`), distinguishing it visually from the dungeon-cold combat and trap panels.

3. The panel contains a one-line chest description (varies by variant — see Design detail), primary and secondary action buttons, and — for locked variant — a dice display.

4. Tapping **Leave** descends the panel, returns the camera to navigation zoom, and makes **no state change**. Re-entering the room presents the identical panel again; the chest is unchanged.

5. After opening resolves successfully (see variant criteria below), the **loot reveal** plays: a loot card animates into the panel (slides up, scale 0.9 → 1.0, ~300 ms). The loot card shows:
   - Gold amount with `◈` icon; the number counts up from 0 over ~500 ms.
   - Item card (name + icon + one-line description) below gold, if the loot includes an item.
   - "Empty." flavour text with no amounts, if the chest is empty (see criterion 12).
   A **[Collect]** button appears in the thumb zone once the animation settles.

6. Tapping **Collect** calls `acquireItem` for any item in the loot and adds gold to the pouch. The panel descends, camera returns to navigation framing, and the tile is marked `chestState: 'opened'`.

7. If the satchel has no free item slot when Collect is tapped, the item card shows a "Satchel full" indicator and the item is **not** acquired; only gold is taken. The player may choose to make room by discarding an item from the satchel and then re-entering the room, at which point Collect is available again — the tile is not yet marked opened.

8. A tile with `chestState === 'opened'` does **not** trigger the encounter on re-entry. The chest is visually spent (open lid; see Visual design). Pip walks through freely.

### Locked variant

9. A `locked` variant chest panel shows "A locked chest." with a lock-difficulty indicator ("Needs 🔵 N") and the player's Blue dice displayed ready to roll. [Open] is replaced by [Try the Lock]. [Leave] is present.

10. Tapping **Try the Lock** animates the dice pool. Only the **sum of Blue pips** is evaluated against `tile.lockDifficulty`.

11. **Pass (Blue pips ≥ lockDifficulty):** outcome line "Lock clicks open." holds for ~1 s, then the panel transitions directly to the loot reveal (criterion 5). The tile is not yet marked opened until Collect is tapped.

12. **Fail (Blue pips < lockDifficulty):** outcome line "The lock holds." holds for ~1.5 s, panel auto-descends. The tile is **not** marked opened. Re-entering the room presents the identical locked panel; the player may attempt the check again with no additional penalty.

### Trapped variant

13. A `trapped` variant chest panel shows "A trapped chest." with a brief danger line ("Something is rigged to this lid.") so the player can make an informed choice. Buttons: [Open Anyway] and [Leave].

14. Tapping **Open Anyway** triggers an agility check embedded within the encounter — the panel transitions to the trap-check layout (same layout as feature 025's roll phase: Green dice, [Roll] button, terse label "Spring trap!"). No navigation-level camera snap is used; the camera is already zoomed onto the chest from criterion 1.

15. After the trap check resolves, `trapFired: true` is set on the tile. If Pip is alive, the panel transitions to the loot reveal (criterion 5). If Pip dies from trap damage, the defeat path fires (same as 025's defeat routing); the chest is never opened.

16. On re-entry of a `trapped` tile where `trapFired === true` but `chestState === 'closed'`: the panel rises in **basic** style (no trap warning, no agility check) — the trap is spent. Normal open → loot reveal applies.

### Empty chest

17. A `locked: null` loot value (empty chest — basic variant only, see Design detail) produces "Empty." in the loot reveal area. No gold or item is added. The [Collect] button is replaced by an auto-advance (~1.5 s then panel descends). The tile is marked `chestState: 'opened'`.

### New chest-tier items

18. Three new items are added to the item registry with the following effects:

    | Item | Effect |
    |---|---|
    | **Stout Flask** | Restore Pip's HP to maximum. |
    | **Rabbit's Foot** | Free action in combat: reroll your entire dice pool once this encounter. |
    | **Iron Thimble** | Free action in combat: all enemy attacks this combat deal 1 less damage (min 0 per hit). |

19. The Stout Flask can be used from the Satchel during navigation (same as existing healing items) or via the ITEM action in combat.

20. The Rabbit's Foot and Iron Thimble can only be used via the ITEM action in combat — they are combat-specific buffs. They appear in the Satchel as normal inventory entries but show a "Use in combat" descriptor.

21. A weighted chest loot table is defined in `src/dungeon/tuning.ts` covering all items eligible to appear in a chest (see Design detail).

---

## Scope / non-goals

- **Chest-specific art / sprite** — the chest visual uses the established tile art approach (geometric or asset, per the unresolved D8 art decision). No new art style decisions are made here.
- **Trap disarming before approach** — Pip cannot defuse a trapped chest without opening it; the choice is always open-or-leave.
- **Locked chest with limited attempts** — retrying locked chests has no cost or cap. Attempt counting or key-item unlocks are deferred.
- **Chest depth/floor variant weighting** — `chestVariant` distribution per floor is noted in the tuning table but not gated on 022; a flat initial distribution is valid until 022 ships.
- **Stackable Iron Thimble** — using multiple Thimbles does not stack the damage reduction.
- **Rabbit's Foot in non-combat encounters** — the reroll applies in combat only; using it in a trap or lock check is deferred.
- **Chest as a floor-guaranteed reward** — the pacing guarantee (one chest minimum per floor) is 022's responsibility, not this feature's.
- **Situated whisper on chest entry** — optional; if used it fires before the panel rises and fades by the time the panel is visible, same as any other encounter.

---

## Dependencies

- **019** — gold pouch model and `addGold(n)` already shipped.
- **020** — item registry, `acquireItem`, and consumable use model already shipped.
- **025** — provides the trap check panel layout and agility-check mechanic reused by the trapped variant. The trapped chest variant should not be built until 025 ships.
- **030 / 034** — encounter panel framework and registry already shipped; this panel plugs in as a new encounter type.

---

## Design detail

### Tile data

Fields added to the Chest tile (set at placement time):

```
chestVariant:   'basic' | 'locked' | 'trapped'
chestState:     'closed' | 'opened'        // 'closed' at placement
lockDifficulty: number | undefined         // locked variant only
trapDifficulty: number | undefined         // trapped variant only
trapFired:      boolean | undefined        // trapped variant; false at placement
loot:           ChestLoot | null           // null = empty; pre-rolled at placement
```

```
type ChestLoot = {
  gold:  number
  item?: ItemId    // absent = gold-only chest
}
```

### Loot pre-roll rules (at tile placement)

```
Is basic variant AND random < 0.10?
  └─ YES → loot = null (empty chest)
  └─ NO  → loot = { gold: goldRoll(), item: random < 0.60 ? pickItem() : undefined }

goldRoll() by floor:
  Floor 1: 3–6
  Floor 2: 5–9
  Floor 3: 7–12
  (Until 022 ships, use Floor 1 range for all.)
```

### Chest loot table (in `tuning.ts`)

All items below are eligible; chest-tier items carry higher weight so a chest feels meaningfully better than an item room.

| Item | Weight | Tier |
|---|---|---|
| Crumb of Cheese | 3 | Common |
| Lucky Acorn | 3 | Common |
| Smoke Pellet | 3 | Common |
| Glowstone Dust | 3 | Common |
| Wedge of Gouda | 4 | Common |
| Stout Flask | 5 | Chest-tier |
| Rabbit's Foot | 5 | Chest-tier |
| Iron Thimble | 5 | Chest-tier |

### Chest variant distribution (flat, until 022 ships)

| Variant | Weight |
|---|---|
| Basic | 6 |
| Locked | 3 |
| Trapped | 1 |

### Lock difficulty distribution (at placement)

| Difficulty | Blue pip threshold | When |
|---|---|---|
| Easy | 2 | Shallow / floor 1 |
| Medium | 3 | Mid / floor 2 |
| Hard | 5 | Deep / floor 3 |

(Until 022 ships, use Easy for all locked chests.)

### Encounter flows

```
Pip enters Chest tile (chestState === 'closed')
          │
          ▼
  Camera smooth-zooms to chest (~600–800ms, easing)
          │
          ▼
  Chest panel RISES (~200ms)
          │
    ┌─────┴──────────────────────────────────┐
  BASIC                LOCKED              TRAPPED
    │                    │                    │
  [Open]           [Try the Lock]       [Open Anyway]
  [Leave]          [Leave]              [Leave]
    │                    │                    │
  Leave?              Leave?              Leave?
  ┌──YES→ panel descends, no state change ───┐
  │                    │                    │
  NO                   NO                   NO
  │                    │                    │
  │             Roll Blue dice        Agility check
  │                    │               (025 flow)
  │             Blue ≥ difficulty?          │
  │              YES       NO          Pip alive?
  │               │   "The lock holds"  YES     NO
  │               │   auto-descend  ────│─────→ defeat
  │               │   (can retry)       │
  └───────────────┴─────────────────────┘
                  │
          LOOT REVEAL
                  │
          loot === null?
            YES       NO
             │         │
         "Empty."   Loot card in (gold ± item)
         auto-adv   [Collect] button
             │         │
             └────┬────┘
                  │
          chestState = 'opened'
                  │
          Panel descends
          Camera returns to nav
```

### New item effects (in detail)

**Stout Flask**
Sets `pip.hp = pip.maxHp`. No pip cost. Used from Satchel (nav) or ITEM action (combat). The existing healing logic for Crumb of Cheese / Wedge of Gouda is the reference — Stout Flask is the same path, full heal.

**Rabbit's Foot**
Free action (no pip cost) used via ITEM in combat. On use: re-animate the entire dice pool as if rolling again; replace the current rolled values with the new values. The player may only use one Rabbit's Foot per combat turn. The item is consumed immediately on tap — no undo.

**Iron Thimble**
Free action (no pip cost) used via ITEM in combat. On use: sets a session flag `thimbleActive: true` on the current combat encounter. While `thimbleActive`, every incoming damage value from an enemy hit is reduced by 1 before application (minimum 0). The flag and buff expire when the combat encounter ends; they do not persist to the next room.

### Chest description lines (panel Beat 1)

| Variant | Description line |
|---|---|
| Basic | "An old chest." |
| Locked | "A locked chest." (subline: "Needs 🔵 N pips") |
| Trapped | "A trapped chest." (subline: "Something is rigged to this lid.") |
| Opened (re-entry) | No panel — encounter does not trigger |

### Edge cases

- **Pip at 0 HP from trapped chest:** standard defeat path; chest is never marked opened.
- **Empty chest, satchel full:** the empty state has no item; no conflict arises.
- **lockDifficulty = 0:** treat as an instant pass — panel shows the dice but opens immediately on roll regardless. (Should not occur from valid placement logic.)
- **Double-tap on Try the Lock / Roll:** standard input lock while animation runs.
- **Chest room re-entry with trapFired but chestState still 'closed':** the player survived the trap but left without collecting. Show the basic panel (no trap). Loot is unchanged.

---

## Visual design

**Temperature:** Warm (between dungeon-hot and camp-cool, per `screen-layout-and-transitions.md`).

**Panel surface:** `--surface` with an amber-tinted top border stripe using `--room-chest`. Not the full parchment warmth of the shop, not the stone-dark cold of combat — this is dungeon treasure, not a merchant's stall.

**Camera:** Smooth zoom (easing, not snap) to a close view of the chest — the chest tile filling roughly half the map zone above the panel. The camera does not snap; that signal belongs to traps. The approach should feel like leaning in, not startled.

---

**Layout wireframe — Beat 1 (Basic / closed)**

```
┌─────────────────────────┐
│  [status strip — thin]  │
├─────────────────────────┤
│                         │
│   close view: chest     │  ← chest prominent; room walls at edges
│   (amber border glow)   │
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← PANEL_TOP (amber-tinted top border)
│   "An old chest."       │  ← `--text-primary`, 18px, weight 500
│                         │
│  [        Open        ] │  ← amber-styled primary CTA
│  [        Leave       ] │  ← secondary; `--text-muted` styled
└─────────────────────────┘
```

**Layout wireframe — Beat 2 (Loot reveal)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "An old chest."       │
│                         │
│  ┌─────────────────────┐ │
│  │  ◈  6 gold          │ │  ← gold card; number counts up ~500ms
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │  🐇 Rabbit's Foot   │ │  ← item card (only if loot.item exists)
│  │  "Reroll dice once" │ │  ← one-line description; `--text-muted`, 13px
│  └─────────────────────┘ │
│                         │
│  [       Collect      ] │  ← appears after animation settles
└─────────────────────────┘
```

**Layout wireframe — Locked chest (roll state)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "A locked chest."     │
│   Needs 🔵 3            │  ← `--text-muted`, 14px
│                         │
│  [d6🔵]  [d4🔵]  ···   │  ← Blue dice; non-Blue dice greyed or absent
│                         │
│  [    Try the Lock    ] │  ← amber-styled; thumb zone
│  [        Leave       ] │
└─────────────────────────┘
```

**Layout wireframe — Locked chest (fail outcome)**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "A locked chest."     │
│   Needs 🔵 3            │
│                         │
│  [2🔵]  [0🔵]  ···     │  ← dice settled
│  🔵 2 vs. 3 — Fail      │  ← `--text-muted`, 14px
│  "The lock holds."      │  ← `--text-primary`, 16px, italic; auto-adv ~1.5s
└─────────────────────────┘
```

**Layout wireframe — Empty chest reveal**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│   "An old chest."       │
│                         │
│   "Empty."              │  ← `--text-muted`, 18px, centred; auto-adv ~1.5s
│                         │
└─────────────────────────┘
```

**Opened chest tile visual**

A spent chest tile should read as open and empty. Approach: a subtle tint overlay (see token below) at low opacity over the chest tile art. If tile art is geometric, the lid rendering can be swapped to an open-lid variant. Either is valid; the Engineer chooses what the art system supports.

---

**Color tokens**

| Token | Value | Used for |
|---|---|---|
| `--room-chest` | `#6a4800` | Chest room border/tint; panel top-edge stripe |
| `--chest-spent` | `#1a1400` | Tint overlay on an opened chest tile |

Both tokens follow the established pattern: room-type tokens at `#RRGGBB` dark hues, spent-state overlays nearly black.

**Typography / sizing**

- Chest description line: 18px, weight 500, `--text-primary`. Same register as the enemy name in combat.
- Subline (lock difficulty, trap warning): 14px, `--text-muted`.
- Gold amount in loot card: 22px, weight 600, `--gold`. Larger than description — this is the hero element of the reveal.
- Item name in loot card: 16px, weight 500, `--text-primary`.
- Item description in loot card: 13px, `--text-muted`.
- Outcome lines (lock hold, empty): 16px, italic, `--text-primary`. Same as trap outcome lines.

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —
