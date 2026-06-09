# 029 · Camp Screen, Meta Persistence & Weapon Selection

**Status:** READY
**Source idea:** Backlog item 029 (absorbed Idea 042 · Die Type Risk Profiles)
**Depends on:** 024 (run summary — exit CTA modified to return to camp), 019 (gold earned model), 016 (RunState gold)

---

## Summary

The **camp screen** is Pip's home between runs — a warm, candlelit mouse-hole carved near the
dungeon mouth. This feature closes the outer roguelike loop: a completed run delivers
**shiny scraps** (the meta currency, converted one-for-one from remaining gold at run end), returns
the player to camp, and from camp they choose a weapon before descending again. The four starting
weapons are always available; each contributes dice and a strike action to the run pool. A **live
pool preview** shows exactly what Pip carries in before he commits. Everything is built on a new
cross-run persistence layer (`MetaState`) that will grow to hold all between-run upgrades. The
workbench (dice swap, add, engrave) is visible at camp but not yet operational — that is
feature 088.

---

## Acceptance criteria

### Meta state and persistence

1. A `MetaState` object is loaded from `localStorage` on every page load. If no saved state
   exists, the game creates a **default MetaState** (3-die permanent pool; Shortsword selected;
   all four starting weapons unlocked; 0 scraps) and stores it immediately. The default state is
   deterministic — the same every first launch.

2. `MetaState` is written to `localStorage` on every mutation: when the active weapon changes
   and when scraps are transferred at run end. Writes are synchronous before any navigation.

3. If `localStorage` is unavailable (private browsing, storage full, or security error), the
   session continues with the in-memory default MetaState. No crash, no visible error — a silent
   console warning is sufficient.

### Screen flow

4. The **title screen** primary CTA reads **"Begin"** on first launch (no saved MetaState). On
   subsequent launches it reads **"Return to Camp"**. If a run is in progress (non-empty RunState
   persisted), a secondary **"Continue"** CTA appears and resumes the run directly without
   visiting camp.

5. Tapping "Begin" or "Return to Camp" navigates to the Camp Screen. The camp is the
   **permanent hub** between all runs; there is no other route from a completed run back to the
   title screen during normal play.

6. After a run ends (boss victory or Pip's death) and the run summary is dismissed, the game:
   (a) adds `RunState.gold` to `MetaState.scraps`,
   (b) persists MetaState,
   (c) clears RunState,
   (d) navigates to the Camp Screen.
   The run summary exit CTA is relabelled **"Return to Camp"** (replacing any prior
   "Back to Main Menu" label from feature 024).

7. On the Camp Screen, tapping either the **"Descend"** CTA or the **weapon rack** tap target
   opens the Weapon Selection sub-screen. The run does not begin until the player confirms a
   weapon.

### Camp screen

8. The Camp Screen renders as a **full-canvas, warm/cool temperature** layout. Its palette is
   distinct from the dungeon: warmer, darker background tones with amber accents. The dungeon
   entrance arch is visible in the background — a dark stone opening suggesting depth — but it is
   **not a tap target**.

9. The following elements are rendered at camp:
   - **Workbench** (lower-left area): Pip's dice laid out on a small wooden bench, visible as
     coloured die objects.
   - **Weapon Rack** (right wall): weapon silhouettes on wooden pegs.
   - **Scroll Wall** (upper wall): rolled parchments, sealed.
   - **Visitor stool** (lower-centre): a small empty stool — no visitor present yet.
   - **Descent Record** (upper-right corner): a pinned parchment chip.
   - **Scraps counter** (prominent, near the workbench or top area): a pouch icon with a
     numeric label showing `MetaState.scraps`.

10. The **scraps counter** updates immediately on return from a run (after the scraps transfer).
    It must be legible at phone scale — minimum 16px, `--gold` colour.

11. Tap targets and their responses:
    - **Weapon Rack** → opens Weapon Selection sub-screen (see criteria 13–19).
    - **Workbench** → rises a brief warm stub panel: *"Pip tinkers with his dice. Upgrades
      coming soon."* Auto-dismisses after ~2 s or on tap.
    - **Scroll Wall** → stub: *"Sealed scrolls. Nothing readable yet."*
    - **Descent Record** → stub: *"Pip's marks of descent. Nothing recorded yet."*
    - **Visitor stool** → no interaction (stool is decorative; visitor system ships in 051).
    - Tapping anywhere outside a tap target does nothing.
    Stub panels rise from the bottom, matching the panel gesture pattern.

12. A **"Descend"** button is always visible at the bottom of the camp screen (thumb country),
    full-width, amber/warm. Tapping it opens the Weapon Selection sub-screen.

### Weapon selection sub-screen

13. The Weapon Selection sub-screen is a **warm-temperature panel** that rises from the bottom
    of the camp screen. The camp dims slightly behind it (a scrim over the camp canvas).

14. The panel shows the four starting weapons as cards in a **2×2 grid**:
    - **Dagger** — *"Quick and quiet — Pip prefers two."* — +2×d4🔴 — Strike: 1🔴
    - **Shortsword** — *"Reliable. The workhorse."* — +1×d6🔴 — Strike: 2🔴
    - **Broadsword** — *"Heavy. Each swing matters."* — +1×d8🔴 — Strike: 3🔴
    - **Whisker Staff** — *"No blade — just Pip's wits."* — +1×d4🔵, +1×d4🔵 — *(no Strike)*

15. Each card shows: name (bold, 14px), flavour line (12px, muted), dice added as die-colour
    glyphs, and strike action cost — or **"—"** for the Whisker Staff.

16. The **currently selected weapon** (defaulting to `MetaState.activeWeaponId`) is highlighted
    with a gold/amber border. Tapping a different card updates the selection immediately; no
    confirm step is required to change selection.

17. A **live pool preview** labelled *"Your dice this run"* sits below the weapon cards. It
    renders the full run pool: `MetaState.permanentPool` dice + the selected weapon's added dice,
    each shown as a coloured die object with its face count. The preview updates **immediately**
    when a weapon card is tapped — no delay, no animation required.

18. A **"Descend into the Dark"** CTA occupies the bottom strip (thumb country). Tapping it:
    (a) sets `MetaState.activeWeaponId` to the selected weapon,
    (b) persists MetaState,
    (c) composes the run pool from permanentPool + weapon dice,
    (d) sets the run's Strike action from the weapon's spec (`null` for Whisker Staff),
    (e) starts the run.

19. A **back affordance** (a "← Back" label or left-chevron icon) in the top-left of the panel
    returns to the Camp Screen without starting the run and without mutating MetaState.

### Dynamic pool at run start

20. On run start, the dice pool is **no longer hardcoded**. It is composed dynamically:
    `MetaState.permanentPool` dice + the active weapon's added dice. The existing hardcoded pool
    initialisation is removed.

21. The **Strike action** (label and Red pip cost) is drawn from the active weapon's spec. The
    Whisker Staff has no Strike action; its equipped run has no Strike button in the combat panel.
    The combat panel must handle a null Strike action without error.

22. The Whisker Staff's added Blue dice make Blue actions (Analyse, Exploit, Resist) available
    in that run's combat even if no permanent Blue die exists. This is intentional — the Staff
    is the intelligence-first weapon.

### Scraps at run end

23. The scraps transfer is **one-to-one**: `MetaState.scraps += RunState.gold`. Gold spent in
    shops during the run is **not** recovered — only the remaining balance at run end converts.

24. The Run Summary screen (feature 024) is updated to include a **scraps line** after the gold
    count-up animation: *"→ N scraps to carry home"* (12px, `--text-muted`), where N is
    `RunState.gold`. This line appears once the count-up finishes; it does not animate
    separately. If `RunState.gold` is 0, the line reads *"→ no scraps this run"*.

---

## Scope / non-goals

- **Workbench upgrade mechanics** (swap, add, engrave dice): deferred to feature 088. The workbench
  renders at camp with Pip's permanent dice visible, but tapping it shows a stub only.
- **Engrave operation**: deferred to feature 088.
- **Skills screen and skill loadout**: deferred to feature 051.
- **Visitors and visitor interaction**: deferred to feature 051.
- **Notice Board content generation**: deferred to feature 053.
- **Marks of Descent tracking and unlock logic**: deferred to feature 052.
- **Additional weapons beyond the four starting set**: unlocking via boss kills or Marks is
  deferred to features 052+. The `unlockedWeaponIds` field exists now for forward compatibility
  but only contains the four starting weapons.
- **Weapon lock UI**: locked weapon slots visible on the rack are **not** specced here — the rack
  only needs to show the four starting weapons. Locks arrive with 052.
- **Named dice / die provenance** (Idea 050): deferred.
- **Charm board**: visible at camp (decorative) but not a tap target.
- **Scraps economy fine-tuning**: upgrade costs are defined in feature 088. The 1:1 exchange rate
  (remaining gold → scraps) may be adjusted during playtesting.
- **Floor-clear scraps bonuses**: scraps currently come only from `RunState.gold`. Floor-clear
  bonuses are deferred.
- **Purple dice**: not in the weapon specs or permanent pool. Purple is future expansion.

---

## Design detail

### MetaState data model

MetaState lives in `localStorage` under a **versioned key** (e.g. `pip-meta-v1`) so future
breaking schema changes can migrate cleanly rather than corrupting saves. Version 1 is defined
here; subsequent versions must carry forward or convert v1 data.

```
MetaState (version 1)
├── version: 1
├── scraps: number
├── permanentPool: PermanentDie[]
│   └── { id: string, colour: DiceColour, faces: DiceFaces }
├── activeWeaponId: WeaponId
└── unlockedWeaponIds: WeaponId[]
```

Default MetaState:
```
version: 1
scraps: 0
permanentPool: [
  { id: 'r1', colour: 'red',    faces: 6 },
  { id: 'g1', colour: 'green',  faces: 6 },
  { id: 'y1', colour: 'yellow', faces: 4 }
]
activeWeaponId: 'shortsword'
unlockedWeaponIds: ['dagger', 'shortsword', 'broadsword', 'whiskerStaff']
```

`PermanentDie.id` must be **stable across sessions** — the workbench (088) will use it to target
specific dice for upgrade and engrave. Simple strings (`r1`, `g1`, etc.) are sufficient; they do
not need to be UUIDs. Newly added dice should use sequential suffixes (`r2`, `r3`…) within a
colour.

`unlockedWeaponIds` is populated now for forward compatibility. Feature 052 will add weapons by
writing to this field; the weapon selection sub-screen will filter available cards against it.

`DiceFaces` is one of: `4 | 6 | 8 | 10 | 12`. `DiceColour` is one of:
`'red' | 'green' | 'blue' | 'yellow'`.

### Weapon specs

Four `WeaponSpec` records are **static game data** (not stored in MetaState — they don't vary
per player). They should live in a weapon data module (e.g. `src/meta/weapons.ts`).

| ID | Name | Flavour | Added dice | Strike action |
|---|---|---|---|---|
| `dagger` | Dagger | *"Quick and quiet — Pip prefers two."* | 2× d4 🔴 | Strike: 1🔴 |
| `shortsword` | Shortsword | *"Reliable. The workhorse."* | 1× d6 🔴 | Strike: 2🔴 |
| `broadsword` | Broadsword | *"Heavy. Each swing matters."* | 1× d8 🔴 | Strike: 3🔴 |
| `whiskerStaff` | Whisker Staff | *"No blade — just Pip's wits."* | 2× d4 🔵 | *(none)* |

The **Dagger's Strike cost is 1🔴** (cheaper than the current hardcoded 2🔴), reflecting its
speed advantage. If the existing combat system hard-codes Strike as `2R`, it must be
parameterised from the active weapon's spec. This parameterisation is in-scope for this feature.

The **Whisker Staff** has a `null` strike action. The combat panel must hide the Strike button
when `strikeAction` is null rather than showing a zero-cost button or erroring.

### Run pool composition

```
run pool = MetaState.permanentPool (as runtime dice)
         + WEAPON_SPECS[MetaState.activeWeaponId].addedDice (as runtime dice)
```

The existing `DicePool` model (feature 005) presumably accepts an array of `{ colour, faces }`
objects. If so, the composition is purely additive — no DicePool API change is needed, only the
source of the input array changes.

The Strike action must be threaded from the weapon spec into the combat panel. The cleanest
approach is to attach it to RunState at run start so the combat panel reads it from RunState
(same as HP, floor, etc.) rather than looking up MetaState mid-run.

### Camp screen layout

The camp is a **single canvas scene** — all objects visible simultaneously, interactions via tap.
No navigation between areas; tap opens a bottom panel.

```
Conceptual zones (top → bottom, left → right):

  [Scraps pouch + count]         [Descent Record chip]
  ──────────────────────────────────────────────────
  [Scroll Wall — rolled parchments across upper wall]
  ──────────────────────────────────────────────────
  [Notice Board]              [Weapon Rack]
  (left wall)                 (right wall, peg-mounted)
  ──────────────────────────────────────────────────
  [Workbench + dice objects]  [Charm Board]
  (lower left)                (lower right, decorative)
  ──────────────────────────────────────────────────
              [Visitor stool — empty]
              [Dungeon entrance arch — background]
  ══════════════════════════════════════════════════
              [ Descend ] (full-width CTA)
```

**Atmosphere notes:**
- A warm light source (candle or lantern, offscreen) casts amber gradients on surfaces. This is
  achieved with a warm tint overlay, not a separate sprite.
- The dungeon entrance arch is in the lower-centre background — rendered as a dark stone arch
  with `--bg` depth behind it, a faint cool glow suggesting the dungeon beyond. It is purely
  atmospheric.
- Pip's dice on the workbench are the only physical dice visible at camp. They should be
  recognisable as the die-colour objects from the combat panel — same visual language, smaller
  scale.
- The visitor stool is present and empty. Its emptiness is its own visual statement.

**Art approach:** Camp objects are drawn using canvas primitives (consistent with D8 decision).
The goal is "cosy mouse-hole study" — warm rectangles for surfaces, amber glows, readable
silhouettes for weapons on the rack. No external sprites required.

### Weapon selection pool preview

The pool preview is the **hero element** of the weapon selection sub-screen.

Render each die in the run pool as a coloured square die face with its face-count label — the
same visual style as the dice in the combat panel (established in feature 005). Permanent pool
dice and weapon-contributed dice share the same style; the preview shows the final pool, not
which dice came from where.

Layout: a horizontal row of die objects, centred beneath the weapon cards. At the default pool
size (3 permanent + 1–2 weapon = 4–5 dice), a single row fits. If the pool grows beyond ~7 dice
in future sessions, this may need to wrap — but that is 088's problem.

Die objects in the preview should be **~28px** — large enough to read colour and face count on
a phone screen without overwhelming the weapon cards above.

### Behaviour edge cases

- **No gold earned (Pip died on floor 1):** `RunState.gold` is 0. `scraps += 0` is a valid
  no-op. The player still returns to camp; losing has a clear loop. The scraps line reads
  *"→ no scraps this run"*.
- **First run — weapon selection default:** Shortsword is pre-selected. The player may change it
  or tap Descend immediately. There is no "skip weapon selection" path — the first weapon choice
  is part of the camp experience.
- **Whisker Staff with no permanent Blue:** The run pool has 1d6🔴 + 1d6🟢 + 1d4🟡 + 1d4🔵 +
  1d4🔵. No Strike button in combat. Blue actions (Analyse, Exploit, Resist) are available. This
  is the intentional "hard mode" starting weapon; it is not an error state.
- **localStorage write fails mid-session:** MetaState mutations are in-memory only for that
  session. No mid-session write failure should crash or corrupt state — the write attempt is
  fire-and-forget (with a console warning on failure). On next load, the game resumes from the
  last successfully persisted state.
- **Corrupted or unrecognisable saved state:** If the data under the versioned key cannot be
  parsed or fails a version check, the game discards it and initialises from the default MetaState.
  The player effectively starts fresh. A console warning is appropriate.

---

## Visual design

### Camp screen wireframe

```
┌─────────────────────────────┐  ← full portrait canvas, ~390×844px
│ ◈ 42 scraps          [Marks]│  ← scraps counter (left, ~16px gold) + record chip (right)
├─────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← scroll wall: rolled parchment cylinders on stone
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                             │
│  ╔══════╗       [Weapon Rack]│  ← notice board stub (left), weapon silhouettes (right)
│  ║      ║    🗡  🗡  ⚔  🪄  │
│  ╚══════╝                   │
│                             │
│  ╔═══════════╗    [🍀 charm]│  ← workbench with dice (left), charm board (right, decorative)
│  ║ 🎲🎲🎲   ║              │
│  ║ Workbench ║              │
│  ╚═══════════╝              │
│                             │
│          [  stool  ]        │  ← visitor stool, empty
│                             │
│       ╔═══════════╗         │  ← dungeon entrance arch (background, dark/cool)
│       ║  ·  ·  ·  ║         │
│       ╚═══════════╝         │
│                             │
╞═════════════════════════════╡
│         [ Descend ]         │  ← amber CTA, always visible, full-width strip
└─────────────────────────────┘
```

### Weapon selection panel wireframe

```
                     ↑ camp dims (scrim)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel rises
│← Back      Choose Your Weapon│  ← back affordance (left) + title (right-aligned or centred)
├─────────────────────────────┤
│  ┌────────────┐┌────────────┐│
│  │ Dagger     ││ Shortsword ││  ← selected card has gold border
│  │"Quick…"   ││"Reliable…" ││
│  │+[d4🔴]×2  ││+[d6🔴]     ││
│  │Strike: 1🔴││Strike: 2🔴 ││
│  └────────────┘└────────────┘│
│  ┌────────────┐┌────────────┐│
│  │ Broadsword ││Whisker     ││
│  │"Heavy…"   ││Staff       ││
│  │+[d8🔴]    ││"No blade…" ││
│  │Strike: 3🔴││+[d4🔵]×2   ││
│  └────────────┘│    —       ││
│                └────────────┘│
├─────────────────────────────┤
│  Your dice this run:         │
│  [d6🔴][d6🟢][d4🟡][d6🔴]  │  ← permanentPool + weapon dice, live-updating
├─────────────────────────────┤
│   [ Descend into the Dark ] │  ← amber, full-width
└─────────────────────────────┘
```

### Colour tokens

New tokens introduced by this feature. Reuse existing tokens where semantically appropriate;
these are added only where the camp's warmth requires a distinct value.

| Token | Value | Used for |
|---|---|---|
| `--camp-bg` | `#1a1208` | Camp canvas background — warm dark, distinct from dungeon `--bg` (#0d0d1a) |
| `--camp-surface` | `#2e1d0d` | Camp panel and card surfaces — warm brown/parchment |
| `--camp-border` | `#5a3d1a` | Camp panel borders — warm amber-brown |
| `--camp-accent` | `#c8781e` | Candle-light accent — richer/warmer than `--gold` (#c8941e) |

The `--gold` token is reused for the scraps counter and "Descend" CTA — it already reads as
treasure and action in the established palette. Die colour tokens (`--room-enemy`, `--room-npc`,
`--room-item`, `--room-shop`) are reused in the weapon cards and pool preview for die glyphs.

### Typography / sizing

No new font sizes. Reuse the established scale:

| Element | Size | Weight | Colour |
|---|---|---|---|
| Scraps counter | 18px | bold | `--gold` |
| Weapon card name | 14px | bold | `--text-primary` |
| Weapon card flavour | 12px | regular | `--text-muted` |
| Weapon card die glyphs | 12px | regular | die colour |
| Pool preview die labels | 12px | regular | die colour |
| "Descend into the Dark" CTA | 16px | bold | `--camp-accent` |
| Pool preview section label | 12px | regular | `--text-muted` |

---

## Open questions

None blocking — the spec is `READY`. Tuning questions to watch during playtesting:

- **Scraps economy calibration:** feature 088 will define upgrade costs. These must be
  cross-tested against gold-drop rates from features 019 and 026. Target: one meaningful upgrade
  every 2–3 runs for a player who reaches floor 2 consistently. The 1:1 exchange rate may need
  a multiplier if shop spending leaves players with too few scraps.
- **Whisker Staff balance at run start:** available from run 1 but rewards Blue-heavy play that
  the default permanent pool doesn't support (no permanent Blue die until a Mark in feature 052).
  It may feel frustratingly weak until Blue is unlocked. Watch for this in early playtesting —
  the fix is either a tooltip ("Unlock Blue to get the most from this weapon") or delaying the
  Staff's availability until after first Blue unlock. Neither change requires a spec revision.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —

### What was built

### Evidence

### Play-test
