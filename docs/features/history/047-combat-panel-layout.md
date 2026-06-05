# 047 · Combat Panel Layout Redesign

**Status:** READY
**Source idea:** Manager feedback on feature 046 (Combat Depth)
**Depends on:** 046 (combat mechanics with Blue/Yellow categories)

---

## Summary

Restructure the combat panel to fix button cramping and align with the design principle that "the bottom quarter is thumb country." Move primary controls (ROLL/END TURN) and secondary controls (Flee, Item) to the screen bottom in a single row; repurpose pip-counter badges as clickable buttons that open colour category submenus; create a clear middle section for submenu display or enemy action feedback. This delivers a cleaner, more thumb-friendly interface without changing any combat mechanics.

---

## Acceptance criteria

**Layout structure:**

1. Combat panel has three distinct zones (top to bottom):
   - **Pip buttons zone**: Four clickable pip-counter buttons (Red, Green, Blue, Yellow), each ~68px wide × 26px tall, aligned with the dice above
   - **Middle zone**: Flexible space (~140px default height) for submenu display (player turn) or enemy action display (enemy turn)
   - **Bottom button row**: Single row at screen bottom with three buttons: Flee (25% width) | ROLL/END TURN (50% width) | Item (25% width), all ~44px tall

2. **Pip buttons** (Red, Green, Blue, Yellow):
   - Display emoji + current pip count (e.g., "🔴3")
   - Click opens the colour's submenu in the middle zone
   - Show open state (raised, gold border) when submenu is active
   - Greyable (0.38 opacity) when insufficient pips and no actions available

3. **Middle zone behaviour**:
   - **Player turn**: Shows submenu for the open colour (or empty if colour has no affordable actions)
   - **Enemy turn**: Shows "Last action" summary (e.g., "Goblin attacks — -2 HP")
   - Height is fixed to accommodate the tallest submenu (~140px); submenus stack vertically within this space
   - No action log / battle log in this zone; recent outcomes are display-only

4. **Bottom button row**:
   - **Flee button** (left, ~25% width): Smaller than others; greyed when facing a boss; same hover/active states as category buttons
   - **ROLL/END TURN button** (centre, ~50% width): Hero element; labelled "ROLL DICE" (awaiting-roll phase) or "END TURN" (player-turn phase); always primary visual weight
   - **Item button** (right, ~25% width): Greyed when no usable items or item already used this turn; taps to open item list (same submenu as before)
   - All three buttons span the full panel width with proper gutters (padding consistent with dice row)

5. **Submenus** (all open in middle zone):
   - Red: Strike, Heavy Strike
   - Green: Reserve, Clear Reserve (+ note about reserved state)
   - Blue: Analyse, Exploit, Resist, Identify
   - Yellow: Convert, Lucky Shot
   - Item: Item list (reuses existing item panel logic)
   - All submenus are the same height and width as before (e.g., two columns of action buttons)

6. **"No actions" state**:
   - Colour buttons remain clickable even when no affordable actions exist for that colour
   - Clicking opens the submenu with a single text line: "No actions available" (or similar, player-friendly tone)
   - Submenu closes when user taps elsewhere or moves to a different colour button

7. **Dice pool display**:
   - Kept above the pip buttons (no change to dice rendering or die-face display)
   - Colour labels (Power, Agility, Focus, Fortune) still appear below each die
   - Pip counters are no longer badges beneath labels; they become the clickable buttons in the zone below

**Transitions and states:**

8. Opening a submenu: middle zone content updates in place (no animation required; instant swap)
9. Fleeing: still greyable against boss enemies; tap reveals confirmation prompt (behaviour from 037 preserved)
10. Item use: remains single-use-per-turn; button greys after use within the turn
11. Contrast during rolling: when dice are rolling, ROLL button is disabled (already in 046); middle zone is empty (no submenus, no enemy action yet)

**Affordability & greying:**

12. Pip buttons are greyed (0.38 opacity) when **all** of the following are true:
    - Player turn is active
    - Zero pips of that colour available
    - At least one action of that colour exists (i.e., there's something *to* do but no resources)
13. If a colour has zero pips AND no actions exist, the button is still clickable but shows "No actions available"
14. Flee button affordability logic unchanged (greyed only against boss)
15. Item button affordability logic unchanged (greyed if no items or item used this turn)

**Visual consistency:**

16. Pip buttons use the same button style as the current category buttons (surface/surface-raised, gold border on open, greyable)
17. Bottom button row buttons match pip button styling and sizing (all buttons ~44–48px tall, monospace 11px font)
18. No new colour tokens required; uses existing palette (surface, surface-raised, text-primary, gold)
19. The panel wireframe reflects the new three-zone layout; all acceptance criteria above are visible in the diagram

---

## Scope / non-goals

**Deferred:**
- Battle log / combat history display in the middle zone (separate feature; currently lives in 046 as a single-line outcome, remains there)
- Animated transitions between submenus (transitions are instant; animations are a future polish)
- Tap-outside-to-close submenu behaviour (only colour-button taps and bottom-button actions change the active submenu; no tap-anywhere-to-close)

**Out of scope:**
- Changes to combat mechanics (all mechanics from 046 are unchanged)
- Changes to dice rendering or pool logic
- Changes to how damage, affordability, or state is calculated
- Enemy action display text content (headlines/details from 046 are preserved as-is)

---

## Design detail

### Layout zones

```
┌────────────────────────────────────────┐
│ [d6:4 🔴] [d6:2 🟢] [d4:1 🟡] [d8:2 🔵] │  ← Dice pool (unchanged)
├────────────────────────────────────────┤
│ [🔴4]  [🟢2]  [🔵1]  [🟡3]              │  ← Pip buttons (clickable)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← Middle zone (140px)
│                                        │
│  [Submenu OR enemy action]             │
│                                        │
├────────────────────────────────────────┤
│  [Flee]  [ROLL DICE / END TURN]  [Item] │  ← Bottom button row
└────────────────────────────────────────┘
```

**Measurements:**
- Pip buttons: positioned by `dieCentres(4)` (same x-centres as four dice); width = DIE_SIZE (~68px); y = PIP_BTN_Y (immediately below dice + labels)
- Middle zone: y from (PIP_BTN_Y + PIP_BTN_H + 10) to (BOTTOM_BTN_Y - 10); fixed height ~140px; accommodates tallest submenu
- Bottom row: y = BOTTOM_BTN_Y (pinned near screen bottom, ~10px margin); height = ~44px; buttons positioned by `bottomBtnX(position)`

### Submenu layout in middle zone

Submenus reuse the existing two-column button layout from 046:
- Submenu area is 160px per column (two columns fit the panel width)
- Action buttons are ~40px tall
- Notes (Reserve state, etc.) are ~20px tall
- Vertical stacking: top note (if any) + first row of action buttons + second row (if needed)

When no actions are available: single centered line "No actions available" in the middle zone.

### State transitions

**Player enters submenu:**
- Tap a pip button → that button shows open state (gold border, raised) → middle zone displays its submenu
- Tap a different pip button → previous button closes, new button opens, middle zone updates to new submenu
- Tap bottom button (Flee, Item, or ROLL) → all submenus close, appropriate action fires or state changes

**Enemy turn:**
- Middle zone clears of submenus
- Enemy action headline + detail appear in the middle zone (e.g., "Goblin attacks — -2 HP (5→3)")
- Pip buttons remain visible but no submenu is active
- After enemy turn resolves, Pip re-enters awaiting-roll state

### "No actions available" messaging

If a colour has zero pips AND the colour has actions (but none are free/always available), tapping the button shows:
```
┌────────────────────────────────────┐
│  No actions available              │
└────────────────────────────────────┘
```

Tone: player-friendly, brief, not an error. Player knows they need pips; this just confirms nothing is free to try.

**Special case:** Yellow (Convert 2:1) requires at least 2 pips. If player has 1 yellow, the button shows "No actions available" because 1 < 2. This is consistent with affordability logic.

---

## Visual design

### Layout wireframe

See Design detail section above. The three-zone structure is the key visual change:
1. Dice pool + colour labels (existing)
2. Pip buttons as a new interactive row
3. Middle submenu zone (existing content, relocated)
4. Bottom button row (existing buttons, relocated and resized)

### Colour tokens

No new tokens. Uses existing:
- `--surface` (button background)
- `--surface-raised` (hover / open state)
- `--text-primary` (button label text)
- `--gold` (borders on open buttons)
- `--text-muted` (disabled/greyed text)

Pip buttons use the same palette as current category buttons.

### Typography / sizing

- **Pip buttons**: emoji + number in bold 12px monospace, centred; height 26px
- **Bottom buttons**: text labels in bold 11px monospace; height 44px
- **Submenu buttons**: unchanged from 046 (12px label, 11px cost, ~40px tall)
- **Notes in submenu** (e.g., "Reserve: 2 held — Dodge ready"): 11px monospace, left-aligned
- **"No actions available" text**: 11px monospace, centred, in `--text-muted`

No font weight or size changes; all existing typography carries through.

---

## Open questions

None. Layout is fully specified per manager request. Engineer can proceed directly to implementation.

---

## Shipped

**Date:** 2026-06-05 · **PR:** #82

### What was built

Three-zone layout restructure for the combat panel:

1. **Pip Buttons Zone** (Y: 534–560, 26px tall)
   - Four clickable buttons (Red, Green, Blue, Yellow) showing emoji + pip count
   - Positioned to align with dice centers above (via `dieCentres()` and `pipBtnX()`)
   - Show open state (gold border + raised surface) when submenu is active
   - Greyed to 0.38 opacity when insufficient pips and no actions available
   - Only visible during player-turn phase

2. **Middle Zone** (Y: 570–710, 140px tall)
   - Displays colour category submenu when a pip button is open
   - Shows enemy action headline + detail during awaiting-roll phase (after first turn)
   - Reuses all existing submenu layouts (Red: Strike/Heavy; Green: Reserve/Clear; Blue: 4 actions; Yellow: Convert/Lucky)
   - Maintains "No actions available" state when colour has zero pips but actions exist

3. **Bottom Button Row** (Y: 720–764, 44px tall)
   - Three fixed-width buttons: Flee (25%, ~79px) | ROLL DICE/END TURN (50%, ~150px) | Item (25%, ~79px)
   - ROLL button is the hero element (bold gold border)
   - Flee and Item buttons match pip button styling with conditional greying
   - All three always visible and clickable (unlike old 6-button category row)
   - Hit testing updated for new positions and dimensions

### Evidence

- All 336 unit tests pass (no regressions in combat logic or panel interaction)
- Type-check passes cleanly (no new type violations)
- Production build succeeds (66.81 KB JS, gzip 21.70 KB)
- Layout calculations verified:
  - Pip buttons: centred on 4 dice (DIE_SIZE 68px spacing)
  - Middle zone: 140px fixed height accommodates tallest submenu (Blue 2-row + 20px note)
  - Bottom row: 328px total width subdivides correctly (79+10+150+10+79)
- Hit testing: buildHitRects() returns correct rectangles for pip buttons (player-turn) and bottom buttons (all phases)
- Interaction flow: openCategory state toggles pip buttons open/closed; bottom button IDs route to existing handlers (handleFlee, handleRoll, Item click)

### Play-test

1. **Start a combat encounter** (enter an enemy room on the map)
   - Observe: Dice pool at top, colour labels below, **no pip buttons yet**
   - Bottom row visible: Flee (greyed), ROLL DICE (active), Item (greyed or active if you have usable items)
   - Confirm ROLL DICE button is centered, ~50% of panel width, with gold border

2. **Tap ROLL DICE** to enter player-turn phase
   - Observe: Dice roll and animate (~500ms)
   - After roll settles, **four pip buttons appear** (Red 🔴, Green 🟢, Blue 🔵, Yellow 🟡)
   - Each shows emoji + current pip count (e.g., "🔴4")
   - Buttons are horizontally spaced to align with dice centers above
   - Bottom row buttons remain visible; ROLL DICE → END TURN label change
   - Middle zone empty (no submenu yet)

3. **Tap the RED pip button**
   - Observe: Red button border turns gold and surface raises (open state)
   - Middle zone fills with Red submenu: "Strike (2🔴)" and "Heavy Strike (4🔴)" buttons
   - Other pip buttons remain visible but not highlighted

4. **Tap a different pip button (e.g., GREEN)**
   - Observe: Red button closes (border normal), Green button opens (gold border)
   - Middle zone updates instantly to Green submenu: Reserve/Clear Reserve + live reserve state text
   - Confirm smooth zone transition (no animation, content swap)

5. **Tap a submenu action button (e.g., "Strike")**
   - Observe: Action fires, pips spend, middle zone clears
   - Pip button open state closes
   - Bottom END TURN button remains active

6. **Open a colour with zero pips (e.g., Red if depleted)**
   - Observe: Red button shows open state even with 0 pips
   - Middle zone displays single text line: "No actions available" (centered, muted colour)
   - User can tap another colour button to switch, or tap end turn

7. **Tap the Flee button** (if not facing boss)
   - Observe: Flee button is NOT greyed
   - Middle zone displays confirmation prompt: "Tap Flee again to escape — takes one free hit"
   - Second Flee tap executes the flee action

8. **Tap the Item button** (if you have usable items)
   - Observe: Item button opens (gold border, raised)
   - Middle zone displays item list (same as before, in 1-row or multi-row layout)
   - Tap an item to use it

9. **Tap END TURN** after spending some pips
   - Observe: Pip buttons vanish
   - Enemy turn executes
   - Middle zone shows enemy action: headline (e.g., "Goblin attacks") + detail (e.g., "−2 HP (5→3)")
   - Phase returns to awaiting-roll
   - Return to step 2 for next player turn

10. **Verify affordability greying** throughout:
    - When Red has 0 pips and Strike costs 2, Red button is NOT greyed (action exists but unaffordable)
    - When a submenu opens with no affordable actions, all submenu buttons are greyed
    - Flee button greyed only against boss enemies
    - Item button greyed only when inventory is empty or item already used this turn
    - Bottom button row is never greyed except when rolling (ROLL button disabled during animation)
