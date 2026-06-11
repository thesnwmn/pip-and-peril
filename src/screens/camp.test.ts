import { describe, it, expect } from 'vitest'
import {
  LOGICAL_W,
  LOGICAL_H,
  SCENE_BOTTOM,
  ACTIVITY_BTN_H,
  ACTIVITY_BTN_Y,
  DESCEND_H,
  DESCEND_Y,
  getActivityButtonRect,
  getDescendStripRect,
  getAnimatedPanelY,
  getCloseBtnRect,
  inRect,
  WB_DIE_SIZE,
  WB_DICE_PER_ROW,
  getWbDieRect,
  getWbOpsTop,
  getWbDoneRect,
  getWbAddBtnRect,
} from './camp'

// ── Layout invariants ──────────────────────────────────────────────────────────

describe('zone split', () => {
  it('SCENE_BOTTOM is at least 55% of LOGICAL_H', () => {
    expect(SCENE_BOTTOM).toBeGreaterThanOrEqual(0.55 * LOGICAL_H)
  })

  it('SCENE_BOTTOM is at most 80% of LOGICAL_H (sanity bound)', () => {
    expect(SCENE_BOTTOM).toBeLessThanOrEqual(0.80 * LOGICAL_H)
  })

  it('activity bar starts at SCENE_BOTTOM', () => {
    expect(ACTIVITY_BTN_Y).toBeGreaterThanOrEqual(SCENE_BOTTOM)
  })
})

describe('activity buttons', () => {
  it('ACTIVITY_BTN_H is at least 44 px', () => {
    expect(ACTIVITY_BTN_H).toBeGreaterThanOrEqual(44)
  })

  it('five buttons span full canvas width', () => {
    const btn0 = getActivityButtonRect(0)
    const btn4 = getActivityButtonRect(4)
    expect(btn0.x).toBe(0)
    expect(btn4.x + btn4.w).toBeGreaterThanOrEqual(LOGICAL_W - 4)  // allow rounding
  })

  it('buttons do not overlap horizontally', () => {
    for (let i = 0; i < 4; i++) {
      const a = getActivityButtonRect(i)
      const b = getActivityButtonRect(i + 1)
      expect(a.x + a.w).toBeLessThanOrEqual(b.x + 1)  // allow rounding
    }
  })

  it('all buttons have the same height', () => {
    const heights = [0, 1, 2, 3, 4].map((i) => getActivityButtonRect(i).h)
    expect(heights.every((h) => h === heights[0])).toBe(true)
  })

  it('buttons are positioned below SCENE_BOTTOM', () => {
    for (let i = 0; i < 5; i++) {
      const r = getActivityButtonRect(i)
      expect(r.y).toBeGreaterThanOrEqual(SCENE_BOTTOM)
    }
  })
})

describe('Descend strip', () => {
  it('DESCEND_H is at least 56 px', () => {
    expect(DESCEND_H).toBeGreaterThanOrEqual(56)
  })

  it('Descend strip reaches the bottom of the canvas', () => {
    const strip = getDescendStripRect()
    expect(strip.y + strip.h).toBe(LOGICAL_H)
  })

  it('Descend strip is full canvas width', () => {
    const strip = getDescendStripRect()
    expect(strip.x).toBe(0)
    expect(strip.w).toBe(LOGICAL_W)
  })

  it('DESCEND_Y equals LOGICAL_H minus DESCEND_H', () => {
    expect(DESCEND_Y).toBe(LOGICAL_H - DESCEND_H)
  })
})

describe('activity buttons do not overlap Descend strip', () => {
  it('button bottoms are above Descend strip top', () => {
    const strip = getDescendStripRect()
    for (let i = 0; i < 5; i++) {
      const r = getActivityButtonRect(i)
      expect(r.y + r.h).toBeLessThanOrEqual(strip.y)
    }
  })
})

// ── Sub-panel animation ────────────────────────────────────────────────────────

describe('getAnimatedPanelY', () => {
  it('returns LOGICAL_H at progress=0 (off-screen)', () => {
    expect(getAnimatedPanelY(0)).toBe(LOGICAL_H)
  })

  it('returns SCENE_BOTTOM at progress=1 (fully open — panels rise to activity bar boundary)', () => {
    const y = getAnimatedPanelY(1)
    expect(y).toBe(SCENE_BOTTOM)
  })

  it('is monotonically decreasing as progress increases', () => {
    let prev = getAnimatedPanelY(0)
    for (let t = 0.1; t <= 1.0; t += 0.1) {
      const curr = getAnimatedPanelY(t)
      expect(curr).toBeLessThanOrEqual(prev + 1)  // allow rounding
      prev = curr
    }
  })
})

// ── Close button geometry ──────────────────────────────────────────────────────

describe('getCloseBtnRect', () => {
  it('is at least 44×44 px', () => {
    const r = getCloseBtnRect(100)
    expect(r.w).toBeGreaterThanOrEqual(44)
    expect(r.h).toBeGreaterThanOrEqual(44)
  })

  it('right edge is at LOGICAL_W', () => {
    const r = getCloseBtnRect(100)
    expect(r.x + r.w).toBe(LOGICAL_W)
  })

  it('top edge matches panelY', () => {
    const panelY = 150
    const r = getCloseBtnRect(panelY)
    expect(r.y).toBe(panelY)
  })
})

// ── inRect helper ──────────────────────────────────────────────────────────────

// ── Workbench geometry ─────────────────────────────────────────────────────────

describe('WB_DIE_SIZE', () => {
  it('is at least 44px (minimum tap target)', () => {
    expect(WB_DIE_SIZE).toBeGreaterThanOrEqual(44)
  })
})

describe('getWbDieRect', () => {
  const panelY = 400

  it('first die is within panel bounds', () => {
    const r = getWbDieRect(0, panelY, 4)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeGreaterThanOrEqual(panelY)
    expect(r.w).toBe(WB_DIE_SIZE)
    expect(r.h).toBe(WB_DIE_SIZE)
  })

  it('adjacent dice in same row do not overlap', () => {
    const r0 = getWbDieRect(0, panelY, 4)
    const r1 = getWbDieRect(1, panelY, 4)
    expect(r0.x + r0.w).toBeLessThanOrEqual(r1.x)
  })

  it('all dice fit within canvas width', () => {
    for (let i = 0; i < 4; i++) {
      const r = getWbDieRect(i, panelY, 4)
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(LOGICAL_W)
    }
  })

  it('wraps to next row after WB_DICE_PER_ROW dice', () => {
    const r0 = getWbDieRect(0, panelY, WB_DICE_PER_ROW + 1)
    const rWrap = getWbDieRect(WB_DICE_PER_ROW, panelY, WB_DICE_PER_ROW + 1)
    expect(rWrap.y).toBeGreaterThan(r0.y)
  })

  it('die rects move down as panelY increases', () => {
    const r1 = getWbDieRect(0, 300, 4)
    const r2 = getWbDieRect(0, 400, 4)
    expect(r2.y).toBeGreaterThan(r1.y)
  })
})

describe('getWbOpsTop', () => {
  it('returns a y-value below the die row', () => {
    const panelY = 400
    const opsTop = getWbOpsTop(panelY, 4)
    const lastDie = getWbDieRect(3, panelY, 4)
    expect(opsTop).toBeGreaterThanOrEqual(lastDie.y + lastDie.h)
  })

  it('is inside the panel (above LOGICAL_H)', () => {
    const opsTop = getWbOpsTop(400, 4)
    expect(opsTop).toBeLessThan(LOGICAL_H)
  })
})

describe('getWbDoneRect', () => {
  it('is at least 44px tall', () => {
    const r = getWbDoneRect(SCENE_BOTTOM)
    expect(r.h).toBeGreaterThanOrEqual(44)
  })

  it('is full canvas width', () => {
    const r = getWbDoneRect(SCENE_BOTTOM)
    expect(r.x).toBe(0)
    expect(r.w).toBe(LOGICAL_W)
  })

  it('bottom edge reaches LOGICAL_H when panel is fully open', () => {
    const r = getWbDoneRect(SCENE_BOTTOM)
    expect(r.y + r.h).toBe(LOGICAL_H)
  })
})

describe('getWbAddBtnRect', () => {
  it('has positive height', () => {
    const r = getWbAddBtnRect(SCENE_BOTTOM)
    expect(r.h).toBeGreaterThan(0)
  })

  it('is above the Done strip', () => {
    const addBtn = getWbAddBtnRect(SCENE_BOTTOM)
    const done = getWbDoneRect(SCENE_BOTTOM)
    expect(addBtn.y + addBtn.h).toBeLessThanOrEqual(done.y)
  })

  it('fits within canvas width', () => {
    const r = getWbAddBtnRect(SCENE_BOTTOM)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.w).toBeLessThanOrEqual(LOGICAL_W)
  })
})

describe('inRect', () => {
  const r = { x: 10, y: 20, w: 50, h: 30 }

  it('returns true for point inside rect', () => {
    expect(inRect(r, 30, 35)).toBe(true)
  })

  it('returns true on left/top boundary', () => {
    expect(inRect(r, 10, 20)).toBe(true)
  })

  it('returns true on right/bottom boundary', () => {
    expect(inRect(r, 60, 50)).toBe(true)
  })

  it('returns false for point left of rect', () => {
    expect(inRect(r, 9, 35)).toBe(false)
  })

  it('returns false for point above rect', () => {
    expect(inRect(r, 30, 19)).toBe(false)
  })

  it('returns false for point right of rect', () => {
    expect(inRect(r, 61, 35)).toBe(false)
  })

  it('returns false for point below rect', () => {
    expect(inRect(r, 30, 51)).toBe(false)
  })
})
