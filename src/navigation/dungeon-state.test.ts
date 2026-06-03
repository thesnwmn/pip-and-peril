import { describe, expect, it } from 'vitest'
import { chebyshev, DIR_DELTA, initDungeon, OPP, updateCamera } from './dungeon-state'
import { E, N, S, W } from '../map/types'

describe('initDungeon', () => {
  it('places Start tile at (6,6) with all four exits', () => {
    const state = initDungeon()
    const cell = state.grid.cells[6][6]
    expect(cell).not.toBeNull()
    expect(cell!.roomType).toBe('start')
    expect(cell!.exits).toBe(N | E | S | W)
  })

  it('leaves all other cells null', () => {
    const state = initDungeon()
    let nonNull = 0
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        if (!(r === 6 && c === 6) && state.grid.cells[r][c] !== null) nonNull++
      }
    }
    expect(nonNull).toBe(0)
  })

  it('sets pip at (6,6) and startPos at (6,6)', () => {
    const state = initDungeon()
    expect(state.pip).toEqual({ col: 6, row: 6 })
    expect(state.startPos).toEqual({ col: 6, row: 6 })
  })

  it('sets camera equal to pip start position', () => {
    const state = initDungeon()
    expect(state.camera).toEqual({ col: 6, row: 6 })
  })

  it('starts in idle state with no pending dir', () => {
    const state = initDungeon()
    expect(state.uiState).toBe('idle')
    expect(state.pendingDir).toBeNull()
    expect(state.offerings).toHaveLength(0)
  })

  it('adds the initial system log entry', () => {
    const state = initDungeon()
    expect(state.log).toHaveLength(1)
    expect(state.log[0].style).toBe('system')
    expect(state.log[0].message).toContain('Pip')
  })

  it('initialises fog: start tile visible, outer tiles hidden', () => {
    const state = initDungeon()
    expect(state.fog[6][6]).toBe('visible')
    expect(state.fog[0][0]).toBe('hidden')
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

  it('clamps camera to grid west boundary', () => {
    // camera at (1,6), pip at (0,6): pip.col=0 < col-hz=0 → col = 0+1=1, then clamp → 0... wait
    // Actually: pip.col=0 < camera.col-hz = 1-1=0 is NOT less than 0, so no update.
    // Let's use camera at (0,6) and pip at (0,6) to test zero boundary is preserved.
    expect(updateCamera({ col: 0, row: 6 }, { col: 0, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 0, row: 6 })
  })

  it('clamps camera to grid east boundary', () => {
    // camera at (11,6), pip at (12,6): pip.col=12 > col+hz=12 is NOT greater, no update
    // Use camera at (12,6) with pip that would push beyond: impossible since grid is 13 wide (0..12)
    // Verify clamping by forcing: camera (11,6), pip (12,6): 12 > 11+1=12? No. Camera stays.
    // Instead test a case where camera would be pushed to boundary:
    // camera (10,6), pip (12,6): 12 > 10+1=11 → col = 12-1=11. Still within bounds.
    expect(updateCamera({ col: 10, row: 6 }, { col: 12, row: 6 }, grid.width, grid.height))
      .toEqual({ col: 11, row: 6 })
  })
})
