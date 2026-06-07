import { describe, it, expect } from 'vitest'
import {
  CHEESE_CRUMB, GOUDA_WEDGE, LUCKY_ACORN, SMOKE_PELLET, GLOWSTONE_DUST,
  CATALOG_ITEMS,
} from './catalog'

describe('item window tags', () => {
  it('Crumb of Cheese fires at post-damage window', () => {
    expect(CHEESE_CRUMB.window).toBe('post-damage')
  })

  it('Wedge of Gouda fires at post-damage window', () => {
    expect(GOUDA_WEDGE.window).toBe('post-damage')
  })

  it('Lucky Acorn fires at on-roll-luck window', () => {
    expect(LUCKY_ACORN.window).toBe('on-roll-luck')
  })

  it('Smoke Pellet fires at during-allocation window', () => {
    expect(SMOKE_PELLET.window).toBe('during-allocation')
  })

  it('Glowstone Dust fires at navigation window', () => {
    expect(GLOWSTONE_DUST.window).toBe('navigation')
  })

  it('every catalog item has a window field', () => {
    for (const item of CATALOG_ITEMS) {
      expect(typeof item.window).toBe('string')
      expect(item.window.length).toBeGreaterThan(0)
    }
  })
})

describe('luckyClass flag', () => {
  it('Lucky Acorn is luckyClass: true', () => {
    expect(LUCKY_ACORN.luckyClass).toBe(true)
  })

  it('Crumb of Cheese is luckyClass: false', () => {
    expect(CHEESE_CRUMB.luckyClass).toBe(false)
  })

  it('Wedge of Gouda is luckyClass: false', () => {
    expect(GOUDA_WEDGE.luckyClass).toBe(false)
  })

  it('Smoke Pellet is luckyClass: false', () => {
    expect(SMOKE_PELLET.luckyClass).toBe(false)
  })

  it('Glowstone Dust is luckyClass: false', () => {
    expect(GLOWSTONE_DUST.luckyClass).toBe(false)
  })

  it('every catalog item has a luckyClass boolean', () => {
    for (const item of CATALOG_ITEMS) {
      expect(typeof item.luckyClass).toBe('boolean')
    }
  })
})
