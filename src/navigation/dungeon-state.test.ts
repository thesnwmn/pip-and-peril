import { describe, expect, it } from 'vitest'
import { chebyshev, DIR_DELTA, initDungeon, OPP } from './dungeon-state'
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
