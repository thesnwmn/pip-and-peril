import { DUNGEON } from './map/biome'
import { ARCHETYPE_VARIANT_COUNTS, drawSingleTile } from './map/renderer'
import type { Archetype, RoomType, TileCell } from './map/types'
import { E, N, S, W } from './map/types'

const ROOM_ACCENTS_LABELS: Partial<Record<RoomType, string>> = {
  enemy: 'Enemy',
  shop: 'Shop',
  npc: 'NPC',
  item: 'Item',
  chest: 'Chest',
  trap: 'Trap',
  stairwell: 'Stairwell',
  boss: 'Boss',
}

const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
const TILE_S = 72

function makeCell(parent: HTMLElement, caption: string, drawFn: (ctx: CanvasRenderingContext2D) => void): void {
  const wrap = document.createElement('div')
  wrap.className = 'cell'
  wrap.style.width = `${TILE_S}px`

  const cv = document.createElement('canvas')
  cv.width = TILE_S * DPR
  cv.height = TILE_S * DPR
  cv.style.width = `${TILE_S}px`
  cv.style.height = `${TILE_S}px`

  const ctx = cv.getContext('2d')!
  ctx.scale(DPR, DPR)
  drawFn(ctx)

  const cap = document.createElement('div')
  cap.className = 'cap'
  cap.innerHTML = caption

  wrap.appendChild(cv)
  wrap.appendChild(cap)
  parent.appendChild(wrap)
}

function sectionHead(sec: HTMLElement, title: string, sub: string): HTMLElement {
  const h = document.createElement('div')
  h.className = 'sec-head'
  h.innerHTML = `<h2>${title}</h2><span class="sub">${sub}</span>`
  sec.appendChild(h)

  const grid = document.createElement('div')
  grid.className = 'grid'
  sec.appendChild(grid)
  return grid
}

function makeTile(archetype: Archetype, exits: number, roomType: RoomType = 'corridor'): TileCell {
  return { roomType, exits, archetype }
}

// ── Section 1: Archetype Catalogue ───────────────────────────────────────────

;(() => {
  const sec = document.getElementById('sec-arch')!
  const grid = sectionHead(sec, 'Archetype Catalogue', 'every archetype × every variant')

  const CATALOGUE: { archetype: Archetype; label: string; exits: number }[] = [
    { archetype: 'chamber',  label: 'Chamber',       exits: N | E | S | W },
    { archetype: 'passage',  label: 'Passage',        exits: N | S },
    { archetype: 'cavern',   label: 'Cavern',         exits: N | E | S },
    { archetype: 'pillared', label: 'Pillared Hall',  exits: N | E | S | W },
    { archetype: 'rubble',   label: 'Rubble',         exits: N | E },
    { archetype: 'bridge',   label: 'Bridge',         exits: N | S },
    { archetype: 'well',     label: 'Well',           exits: N | E | S | W },
    { archetype: 'pool',     label: 'Magic Pool',     exits: N | E | S | W },
    { archetype: 'squeeze',  label: 'Squeeze',        exits: N | S },
  ]

  for (let ai = 0; ai < CATALOGUE.length; ai++) {
    const { archetype, label, exits } = CATALOGUE[ai]
    const count = ARCHETYPE_VARIANT_COUNTS[archetype]
    for (let v = 0; v < count; v++) {
      const cell = makeTile(archetype, exits)
      const vLabel = count > 1 ? ` · v${v}` : ''
      makeCell(grid, `<b>${label}</b>${vLabel}`, (ctx) => {
        drawSingleTile(ctx, cell, 0, 0, TILE_S, DUNGEON, v, v, ai)
      })
    }
  }
})()

// ── Section 2: Room-Type Layer ────────────────────────────────────────────────

;(() => {
  const sec = document.getElementById('sec-types')!
  const grid = sectionHead(sec, 'Room-Type Layer', 'colour + border on chamber base')

  const roomTypes: RoomType[] = ['enemy', 'shop', 'npc', 'item', 'chest', 'trap', 'stairwell', 'boss']
  for (const rt of roomTypes) {
    const cell: TileCell = { roomType: rt, exits: N | E | S | W, archetype: 'chamber' }
    const label = ROOM_ACCENTS_LABELS[rt] ?? rt
    makeCell(grid, `<b>${label}</b>`, (ctx) => {
      drawSingleTile(ctx, cell, 0, 0, TILE_S, DUNGEON, 0)
    })
  }
})()

// ── Section 3: Exit Layouts ───────────────────────────────────────────────────

;(() => {
  const sec = document.getElementById('sec-exits')!
  const grid = sectionHead(sec, 'Exit Layouts', 'doorway positions per snapping invariant')

  const layouts: { exits: number; label: string }[] = [
    { exits: N,            label: 'Dead-end · N' },
    { exits: N | S,        label: 'Straight · N/S' },
    { exits: E | W,        label: 'Straight · E/W' },
    { exits: N | E,        label: 'Corner · NE' },
    { exits: N | E | S,    label: 'T-junction' },
    { exits: N | E | S | W, label: 'Crossroads' },
  ]

  for (const { exits, label } of layouts) {
    const cell: TileCell = { roomType: 'corridor', exits, archetype: 'chamber' }
    makeCell(grid, `<b>${label}</b>`, (ctx) => {
      drawSingleTile(ctx, cell, 0, 0, TILE_S, DUNGEON, 0)
    })
  }
})()

// ── Section 4: Props placeholder ─────────────────────────────────────────────

;(() => {
  const sec = document.getElementById('sec-props')!
  const h = document.createElement('div')
  h.className = 'sec-head'
  h.innerHTML = '<h2>Props</h2><span class="sub">coming soon (feature 082)</span>'
  sec.appendChild(h)

  const placeholder = document.createElement('div')
  placeholder.className = 'placeholder'
  placeholder.textContent = 'Props — wall torches, rubble, bones, mushrooms · feature 082'
  sec.appendChild(placeholder)
})()
