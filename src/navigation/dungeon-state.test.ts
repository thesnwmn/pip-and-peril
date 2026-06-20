import { describe, expect, it } from 'vitest'
import { chebyshev, DIR_DELTA, initDungeon, OPP, updateCamera } from './dungeon-state'
import { E, N, S, W } from '../map/types'

describe('initDungeon', () => {
  it('generates a non-null start cell at startPos', () => {
    const state = initDungeon()
    const cell = state.grid.cells[state.startPos.row][state.startPos.col]
    expect(cell).not.toBeNull()
    expect(cell!.roomType).toBe('start')
  })

  it('generates a multi-cell floor', () => {
    const state = initDungeon()
    let nonNull = 0
    for (let r = 0; r < state.grid.height; r++) {
      for (let c = 0; c < state.grid.width; c++) {
        if (state.grid.cells[r][c] !== null) nonNull++
      }
    }
    expect(nonNull).toBeGreaterThan(1)
  })

  it('sets pip and startPos to the same position', () => {
    const state = initDungeon()
    expect(state.pip).toEqual(state.startPos)
  })

  it('sets camera equal to pip start position', () => {
    const state = initDungeon()
    expect(state.camera).toEqual(state.pip)
  })

  it('initialises fog: pip cell is live, far cells are hidden', () => {
    const state = initDungeon()
    expect(state.fog[state.pip.row][state.pip.col]).toBe('live')
    const farRow = state.pip.row > 5 ? 0 : 12
    const farCol = state.pip.col > 5 ? 0 : 12
    expect(state.fog[farRow][farCol]).toBe('hidden')
  })

  it('has a 13×13 grid', () => {
    const state = initDungeon()
    expect(state.grid.width).toBe(13)
    expect(state.grid.height).toBe(13)
    expect(state.grid.cells.length).toBe(13)
    expect(state.grid.cells[0].length).toBe(13)
  })

  it('starts with stepCount 0', () => {
    const state = initDungeon()
    expect(state.stepCount).toBe(0)
  })

  it('initialises run-tracking fields to zero/false/empty', () => {
    const state = initDungeon()
    expect(state.healingItemsUsed).toBe(0)
    expect(state.rattledKillingBlow).toBe(false)
    expect(state.weaponId).toBe('')
  })

  it('has a numeric runSeed', () => {
    const state = initDungeon()
    expect(typeof state.runSeed).toBe('number')
    expect(state.runSeed).toBeGreaterThanOrEqual(0)
  })
})

describe('chebyshev', () => {
  it('returns 0 for same position', () => {
    expect(chebyshev({ col: 3, row: 3 }, { col: 3, row: 3 })).toBe(0)
  })

  it('returns correct distance for axis-aligned moves', () => {
    expect(chebyshev({ col: 6, row: 6 }, { col: 6, row: 3 })).toBe(3)
    expect(chebyshev({ col: 6, row: 6 }, { col: 9, row: 6 })).toBe(3)
  })

  it('returns max of row/col deltas (Chebyshev)', () => {
    expect(chebyshev({ col: 0, row: 0 }, { col: 3, row: 2 })).toBe(3)
    expect(chebyshev({ col: 0, row: 0 }, { col: 2, row: 5 })).toBe(5)
  })
})

describe('OPP', () => {
  it('maps each direction to its opposite', () => {
    expect(OPP[N]).toBe(S)
    expect(OPP[S]).toBe(N)
    expect(OPP[E]).toBe(W)
    expect(OPP[W]).toBe(E)
  })
})

describe('DIR_DELTA', () => {
  it('gives correct deltas for each direction', () => {
    expect(DIR_DELTA[N]).toEqual({ dc: 0, dr: -1 })
    expect(DIR_DELTA[S]).toEqual({ dc: 0, dr: 1 })
    expect(DIR_DELTA[E]).toEqual({ dc: 1, dr: 0 })
    expect(DIR_DELTA[W]).toEqual({ dc: -1, dr: 0 })
  })
})

describe('updateCamera', () => {
  const grid = { width: 13, height: 13 }

  it('returns camera unchanged when pip is at camera position', () => {
    expect(updateCamera({ col: 6, row: 6 }, { col: 6, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 6, row: 6 })
  })

  it('returns camera unchanged when pip is within dead zone (1 tile away)', () => {
    const camera = { col: 6, row: 6 }
    // hz=1: pip can be at col 5,6,7 and row 5,6,7 without camera moving
    expect(updateCamera(camera, { col: 7, row: 6 }, grid.width, grid.height)).toEqual(camera)
    expect(updateCamera(camera, { col: 5, row: 6 }, grid.width, grid.height)).toEqual(camera)
    expect(updateCamera(camera, { col: 6, row: 7 }, grid.width, grid.height)).toEqual(camera)
    expect(updateCamera(camera, { col: 6, row: 5 }, grid.width, grid.height)).toEqual(camera)
  })

  it('shifts camera east when pip exits dead zone east', () => {
    // pip.col=8 > camera.col+hz=7 → camera.col = 8-1 = 7
    expect(updateCamera({ col: 6, row: 6 }, { col: 8, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 7, row: 6 })
  })

  it('shifts camera west when pip exits dead zone west', () => {
    // pip.col=4 < camera.col-hz=5 → camera.col = 4+1 = 5
    expect(updateCamera({ col: 6, row: 6 }, { col: 4, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 5, row: 6 })
  })

  it('shifts camera south when pip exits dead zone south', () => {
    // pip.row=8 > camera.row+hz=7 → camera.row = 8-1 = 7
    expect(updateCamera({ col: 6, row: 6 }, { col: 6, row: 8 }, grid.width, grid.height))
      .toEqual({ col: 6, row: 7 })
  })

  it('shifts camera north when pip exits dead zone north', () => {
    // pip.row=4 < camera.row-hz=5 → camera.row = 4+1 = 5
    expect(updateCamera({ col: 6, row: 6 }, { col: 6, row: 4 }, grid.width, grid.height))
      .toEqual({ col: 6, row: 5 })
  })

  it('clamps camera so dungeon west edge is flush with viewport left edge', () => {
    // vpHalf=2, so min camera col = 2. A pip at col 0 would push camera to 0+1=1,
    // but clamp raises it to 2, putting the dungeon west edge at viewport column 0.
    expect(updateCamera({ col: 3, row: 6 }, { col: 0, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 2, row: 6 })
  })

  it('clamps camera so dungeon east edge is flush with viewport right edge', () => {
    // vpHalf=2, so max camera col = 13-1-2 = 10. A pip at col 12 would push camera
    // to 12-1=11, but clamp lowers it to 10, putting the dungeon east edge at viewport column 4.
    expect(updateCamera({ col: 9, row: 6 }, { col: 12, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 10, row: 6 })
  })
})
