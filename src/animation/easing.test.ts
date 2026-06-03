import { describe, it, expect } from 'vitest'
import { easeOut, easeIn, lerp } from './easing'

describe('easeOut', () => {
  it('returns 0 at t=0', () => {
    expect(easeOut(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeOut(1)).toBe(1)
  })

  it('returns a value greater than 0.5 at t=0.5 (fast start)', () => {
    const mid = easeOut(0.5)
    expect(mid).toBeGreaterThan(0.5)
    expect(mid).toBeCloseTo(0.875, 5)
  })
})

describe('easeIn', () => {
  it('returns 0 at t=0', () => {
    expect(easeIn(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeIn(1)).toBe(1)
  })

  it('returns a value less than 0.5 at t=0.5 (slow start)', () => {
    const mid = easeIn(0.5)
    expect(mid).toBeLessThan(0.5)
    expect(mid).toBeCloseTo(0.125, 5)
  })
})

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('works with descending range', () => {
    expect(lerp(100, 0, 0.25)).toBe(75)
  })
})
