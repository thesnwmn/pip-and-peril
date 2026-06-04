# 027 · Shop Encounter

**Status:** READY
**Source idea:** Backlog item 027; `docs/concept/screen-layout-and-transitions.md` (Shop section); Ideas 001 (sold-out state reference)
**Depends on:** 019 (gold to spend), 020 (item catalog, `acquireItem`, `Item` type), 034 (encounter registry, panel interface)

---

## Summary

The gold **Shop** room is the dungeon's currency sink: a warm merchant panel where Pip browses up
to three items and spends earned gold to buy them. It is an optional encounter — the player can
always Leave without buying anything. The shop's stock is fixed to the tile at placement time
(same items on re-entry), but purchased items are removed permanently from that tile's stock for
the current run. Once all stock is sold, the panel shows a sold-out state. The shop introduces
the "warm (between)" temperature into the dungeon: a parchment-and-aged-wood panel rising gently
from the bottom, a named merchant with a flavour line, and compact item cards that expand on tap
to reveal the description and Buy CTA. This is step ① of the shop (browse and buy); sell-back
and haggle dice-checks are deferred to a follow-on feature.

---

## Acceptance criteria

### Data model additions

1. The `Item` type (in `src/items/types.ts`, extended by feature 020) gains one new field:
   `shopPrice: number`. All five catalog items (`CHEESE_CRUMB`, `GOUDA_WEDGE`, `LUCKY_ACORN`,
   `SMOKE_PELLET`, `GLOWSTONE_DUST`) are updated with the prices from the price table in the
   Design detail section.

2. `TileCell` gains two optional fields:
   - `shopStock?: string[]` — array of item IDs representing remaining stock. Set at placement;
     items are removed on purchase.
   - `shopMerchant?: string` — the merchant's name. Set at placement. Neither field is set on
     non-shop tiles.

### Tile placement

3. When a Shop room tile is placed (during room selection, features 004/035), exactly **3 item
   IDs** are drawn at random from the full catalog without replacement and stored as `shopStock`
   on the `TileCell`.

4. A merchant name is drawn at random from the predefined name set (see Design detail) and stored
   as `shopMerchant`. Both assignments are fixed for the life of the tile.

### Trigger and lifecycle

5. When Pip enters a room where `roomType === 'shop'` and `shopStock` is **non-empty**, the
   encounter registry triggers the shop panel. The panel rises to `PANEL_TOP` using a normal-speed
   ease transition (~250 ms).

6. When Pip enters a room where `roomType === 'shop'` and `shopStock` is **empty**, the shop
   panel still triggers and rises — it shows the sold-out state (AC 16). The Leave button is
   present; Pip does not pass through.

7. The shop room is **never marked `cleared`**. Pip may re-enter freely on any visit; remaining
   stock persists across exits and re-entries.

8. When Pip enters the shop room, the situated whisper in the nav panel WHISPER mode reads:
   `"A merchant's lantern glows ahead."` This is the shop room's entry whisper.

### Camera

9. On trigger: the camera gently centres on the active room tile at approximately 1.2× base tile
   zoom, using normal-speed ease-in (~250 ms). No snap; no dramatic zoom change.

10. On leave: the camera returns to navigation framing using normal-speed ease-out (~250 ms).

### Panel — browsing

11. The panel uses warm-temperature styling: `--shop-surface` background, `--shop-border` top
    accent rule (4 px). See Visual design for all tokens.

12. At the top of the panel: the merchant's name (`bold 16px`, `--text-primary`) followed by
    their paired flavour line (`italic 12px`, `--text-muted`), with a `--shop-border` rule line
    beneath.

13. The main panel area displays the remaining item cards. Each compact card shows:
    - Item icon (32 × 32 px canvas area)
    - Item name (`bold 14px`, `--text-primary`)
    - Price badge (`bold 12px`, `--gold`, with coin glyph ◈)
    - If Pip cannot afford the item (gold < `item.shopPrice`), the price badge renders in
      `--shop-unaffordable` instead of `--gold`.

14. Tapping a compact card that Pip **can afford** expands it in place. Only one card may be
    expanded at a time; tapping a second card collapses the first. The expanded state shows:
    - Icon at 48 × 48 px
    - Item name and price badge (same styling as compact)
    - Description line (`italic 11px`, `--text-muted`)
    - A **"Buy (N◈)"** primary CTA button
    - A **"×"** close control that collapses the card back to compact state

15. Tapping a compact card that Pip **cannot afford** has no expansion effect. A brief
    `"Not enough coin."` line appears below the card (`11px`, `--shop-unaffordable`) and
    auto-fades after ~1.5 s.

16. The sold-out state (AC 6, or after the last item is purchased mid-visit) replaces the item
    card area with: `"Shelves are bare."` (`italic 13px`, `--text-muted`, centred). The merchant
    header remains; the Leave button remains.

17. At the bottom of the panel, always visible: Pip's current gold count (`"◈ N gold"`, `12px`,
    `--gold`) and a **Leave** button, both in the thumb zone.

### Panel — buying

18. Tapping **Buy** on an expanded card:
    - Calls `acquireItem(inventory, item)` with the item resolved from the expanded card's ID.
    - Decrements `inventory.gold` by `item.shopPrice`.
    - Removes the item's ID from `tile.shopStock`.
    - Collapses the expanded card; the item slot is removed from the card list (remaining cards
      reflow upward).
    - Shows a one-line confirmation in the top-of-item-area zone:
      `"Bought. [Item Name] added to satchel."` (`11px`, `--text-muted`, auto-fades ~2 s).

19. After a purchase, the gold count at the panel bottom updates immediately to reflect the
    new total.

20. After a purchase, any item whose `shopPrice` now exceeds Pip's updated gold immediately
    transitions its price badge to `--shop-unaffordable` styling (no re-entry required).

21. If the last item is purchased, the card area transitions immediately to the sold-out state
    (`"Shelves are bare."`). The Leave button remains and the merchant header remains.

22. Buying an item Pip already carries increments the quantity in the satchel (handled by
    `acquireItem`'s stacking logic from feature 020). The panel does not show a special state.

### Leave

23. Tapping **Leave** at any point (whether browsing, an item is expanded, or sold-out) signals
    the encounter's `left` outcome. The panel descends (~250 ms ease) and navigation resumes
    in IDLE mode. No state changes other than any purchases already completed.

### Quality

24. `npm run test`, `npm run typecheck`, and `npm run build` all pass with no new errors.

25. New unit tests cover at minimum:
    - **Placement**: a Shop tile receives a non-null `shopStock` of exactly 3 IDs; all IDs are
      valid catalog item IDs; no duplicates in the stock array; merchant name is non-empty.
    - **Buy flow**: `acquireItem` called with the correct item; `inventory.gold` decremented by
      `shopPrice`; bought item's ID removed from `shopStock`.
    - **Unaffordable guard**: attempting a purchase when `inventory.gold < item.shopPrice` does
      not call `acquireItem` and does not modify gold or `shopStock`.
    - **Sold-out trigger**: panel enters sold-out view when `shopStock` is empty (both on entry
      and after purchasing the last item).
    - **Gold update after purchase**: after buying one item, remaining items with higher prices
      are correctly flagged as unaffordable.

---

## Scope / non-goals

- **Sell items to the merchant** — Pip cannot sell items in this slice. Deferred (step ② from
  backlog suggestion).
- **Haggle dice-check** — a dice-driven price negotiation is deferred (step ② from backlog
  suggestion). When it ships it will be an additive spec on top of this one.
- **Stock depth/floor weighting** — item selection weight by dungeon depth and floor is
  feature 022's concern, not this spec.
- **Merchant personality / full NPC dialogue** — the merchant speaks only a single static
  flavour line. A richer conversation system belongs to feature 028.
- **Random sold-out spawn** — a shop tile that generates with 0 items already gone (the
  "surprise already bare" variant from Idea 001). Deferred. The sold-out state after purchase
  is covered; a randomly-bare spawn at placement is not.
- **Card expand animations** — the expand/collapse can be a simple reflow; the Engineer may
  add a smooth height transition if time allows, but it is not required.
- **Item inspect / detail view** — deeper item lore or tooltips. Deferred (noted in 020).
- **Gold from non-purchase sources in this flow** — selling, quests, or merchant gifts are out
  of scope here.

---

## Design detail

### Item type addition

`shopPrice: number` is appended to the `Item` type. This field is used exclusively by the shop
encounter. An item without this field cannot appear in a shop; since all five catalog items gain
it, the catalog is exhaustive for this slice.

### Item price table

All prices reside in `src/items/catalog.ts`. They are tuning parameters — the Engineer should
extract them into `src/dungeon/tuning.ts` alongside other constants if a tuning module exists by
the time this feature ships.

The Goblin gives 2–4 gold per combat (feature 019). Prices are set so that Pip must make choices:
a light heal is cheap enough to buy mid-floor; the escape tool requires saving across encounters.

| Item | `shopPrice` |
|---|---|
| Crumb of Cheese | 2 ◈ |
| Glowstone Dust | 3 ◈ |
| Lucky Acorn | 4 ◈ |
| Wedge of Gouda | 5 ◈ |
| Smoke Pellet | 6 ◈ |

### Merchant name set

Three names assigned at random at tile placement. Each name pairs with a static flavour line
that displays in the panel sub-header.

| Name | Flavour line |
|---|---|
| Morwhistle the Vole | `"What'll it be?"` |
| Old Nutkin | `"Coins only, mind you."` |
| Bramble Sewn | `"Fine goods, fair prices."` |

### Encounter flow

```
Pip enters Shop room
        │
        ▼
Nav panel: WHISPER mode
"A merchant's lantern glows ahead."   (fades ~2.5s, concurrent with rising)
        │
        ▼
Camera gently centres on room at ~1.2× zoom (~250ms ease-in)
Shop panel rises to PANEL_TOP (~250ms ease-in)
        │
        ▼
┌── ACTIVE ─────────────────────────────────────────────────────────┐
│                                                                    │
│  Merchant name / flavour line                                      │
│  Rule line                                                         │
│                                                                    │
│  shopStock non-empty?                                              │
│    YES → Item cards (up to 3)                                      │
│           tap affordable → expand → Buy / ×                        │
│           tap unaffordable → "Not enough coin." feedback           │
│           Buy → acquireItem, decrement gold, remove from stock     │
│           × / tap other → collapse                                 │
│           last item bought → sold-out state                        │
│    NO  → "Shelves are bare."                                       │
│                                                                    │
│  ◈ N gold                              [Leave]                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
        │
  Leave tapped (any state)
        │
        ▼
Panel descends (~250ms ease-out)
Camera returns to nav framing
Navigation resumes IDLE
```

### Item card states

```
COMPACT (default, affordable):
┌──────────────────────────────────────────────────────┐
│ [ico 32×32]  Item Name                    4◈         │
└──────────────────────────────────────────────────────┘

COMPACT (unaffordable):
┌──────────────────────────────────────────────────────┐
│ [ico 32×32]  Item Name              4◈(--shop-unaffordable)│
└──────────────────────────────────────────────────────┘

EXPANDED (affordable, tapped):
┌──────────────────────────────────────────────────────┐
│ [ico 48×48]  Item Name                    4◈         │
│              One-line flavour description here.       │
│              [Buy (4◈)]                      [×]     │
└──────────────────────────────────────────────────────┘
```

### Edge cases

- **Re-entry to partially-stocked shop**: `shopStock` reflects removed items; the panel shows
  only remaining cards.
- **Re-entry to sold-out shop**: Panel still triggers and shows sold-out state; Leave exits
  normally.
- **Gold exactly equal to item price**: Pip can afford it; purchase proceeds; gold drops to 0.
- **Gold drops to 0 after purchase**: Remaining items' price badges update to `--shop-unaffordable`
  immediately (AC 20).
- **Stacking purchase** (item already in satchel): `acquireItem` increments quantity; panel shows
  no special state.
- **Two quick taps on Buy**: Standard event dedup; lock Buy button while purchase processes.
- **Only one item affordable initially, then purchase reduces gold further**: The single affordable
  card shows in expanded state. After purchase, if no remaining items are affordable, all cards
  are in unaffordable compact state.

---

## Visual design

**Temperature:** Warm (between) — parchment and aged-wood tones contrasting with the cold dungeon
stone visible in the map zone above the panel.

**Panel rise speed:** ~250 ms ease (slightly slower than combat at ~200 ms, matching the calmer
merchant interaction).

### Layout wireframes

**Browsing — one card expanded (Pip has 3◈):**

```
┌─────────────────────────────────────────┐  ← PANEL_TOP
│  Morwhistle the Vole                    │  ← bold 16px, --text-primary
│  "What'll it be?"                       │  ← italic 12px, --text-muted
│  ─────────────────────────────────────  │  ← 1px rule, --shop-border
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ [ic] Crumb of Cheese          2◈  │ │  ← compact, affordable
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ [ic] Lucky Acorn              4◈  │ │  ← expanded
│  │      Still warm from the oak.     │ │
│  │      [Buy (4◈)]            [×]    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ [ic] Smoke Pellet          6◈(!)  │ │  ← unaffordable (price in --shop-unaffordable)
│  └────────────────────────────────────┘ │
│                                         │
│  ◈ 3 gold                   [Leave]    │  ← gold count + Leave, thumb zone
└─────────────────────────────────────────┘
```

**Sold-out state:**

```
┌─────────────────────────────────────────┐  ← PANEL_TOP
│  Old Nutkin                             │
│  "Coins only, mind you."                │
│  ─────────────────────────────────────  │
│                                         │
│                                         │
│         "Shelves are bare."             │  ← italic 13px, --text-muted, centred
│                                         │
│                                         │
│                             [Leave]    │
└─────────────────────────────────────────┘
```

### Color tokens

New tokens introduced by this feature:

| Token | Value | Used for |
|---|---|---|
| `--shop-surface` | `#1e1508` | Panel background (dark warm wood) |
| `--shop-border` | `#7a5c1a` | Panel top accent rule; item card 1px borders |
| `--shop-card-bg` | `#261c0b` | Item card background (slightly raised from panel) |
| `--shop-unaffordable` | `#8b3a3a` | Price badge and feedback text when Pip can't afford |

The panel background (`--shop-surface`) is warm amber-brown rather than the dungeon's cold blue-
black (`--surface`). The contrast is intentional: the player immediately reads "I'm in a different
kind of space." Item cards use `--shop-card-bg` to float slightly above the panel surface. All
warm tones are drawn from the amber end of the existing palette (nearest existing: `--border`
`#2a1f15`); no neon or oversaturated values.

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| Merchant name | `bold 16px monospace` | `--text-primary` |
| Merchant flavour line | `italic 12px monospace` | `--text-muted` |
| Item name (compact + expanded) | `bold 14px monospace` | `--text-primary` |
| Price badge (affordable) | `bold 12px monospace` | `--gold` |
| Price badge (unaffordable) | `bold 12px monospace` | `--shop-unaffordable` |
| Item description (expanded) | `italic 11px monospace` | `--text-muted` |
| "Buy (N◈)" label | `bold 13px monospace` | `--gold` |
| "×" close label | `12px monospace` | `--text-muted` |
| "Not enough coin." feedback | `11px monospace` | `--shop-unaffordable` |
| Purchase confirmation line | `11px monospace` | `--text-muted` |
| Gold count ("◈ N gold") | `12px monospace` | `--gold` |
| Leave button | `12px monospace` | `--text-muted`, text-link weight |
| "Shelves are bare." | `italic 13px monospace` | `--text-muted` |

**Item card sizing:**
- Compact card: min 44 px height (thumb-safe tap target), 6 px vertical padding, 8 px horizontal
  padding, 1 px `--shop-border` border, 4 px border-radius, `--shop-card-bg` background.
- Expanded card: grows to accommodate description row + button row; ~96–104 px total height.
  Buy button: min 44 px height, `--room-shop` fill at 20% opacity, 1 px `--room-shop` border
  (reuses the existing shop room token `#7a6a00`). × close: 44 px tap target, no fill.
- Gap between cards: 6 px.

**Leave button:** full-width tappable area, min 44 px height, no fill; sits at the bottom of the
panel.

---

## Open questions

None. All blocking questions resolved. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —
