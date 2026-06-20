import type { Archetype, ExitMask, GameMap, GridPos, RoomType, TileCell } from '../map/types'
import { E, N, S, W } from '../map/types'
import { DUNGEON_TUNING } from './tuning'
import type { DepthPhase } from './tuning'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { ENEMY_ROSTER } from '../combat/roster'

// ── Seeded RNG (xorshift32) ───────────────────────────────────────────────────

class SeededRng {
  private s: number
  constructor(seed: number) {
    this.s = ((seed * 1664525 + 1013904223) | 0) >>> 0 || 1
  }
  next(): number {
    this.s ^= this.s << 13
    this.s ^= this.s >>> 17
    this.s ^= this.s << 5
    this.s = this.s >>> 0
    return this.s / 0x100000000
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  intRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
}

// ── Internal build types ──────────────────────────────────────────────────────

interface BuildNode {
  col: number
  row: number
  exits: ExitMask
  roomType: RoomType
  archetype?: Archetype
  spineIndex: number
  totalSpine: number
}

// ── Connectivity helpers ──────────────────────────────────────────────────────

const OPP: Record<number, ExitMask> = { [N]: S, [S]: N, [E]: W, [W]: E }
const DELTA: Record<number, { dc: number; dr: number }> = {
  [N]: { dc: 0, dr: -1 },
  [S]: { dc: 0, dr: 1 },
  [E]: { dc: 1, dr: 0 },
  [W]: { dc: -1, dr: 0 },
}

function connect(a: BuildNode, b: BuildNode): void {
  const dc = b.col - a.col
  const dr = b.row - a.row
  if (dc === 0 && dr === -1) { a.exits |= N; b.exits |= S }
  else if (dc === 0 && dr === 1) { a.exits |= S; b.exits |= N }
  else if (dc === 1 && dr === 0) { a.exits |= E; b.exits |= W }
  else if (dc === -1 && dr === 0) { a.exits |= W; b.exits |= E }
}

function posKey(col: number, row: number): number {
  return col * 100 + row
}

// ── Phase / weight helpers ────────────────────────────────────────────────────

function phaseFromSpine(spineIndex: number, totalSpine: number): DepthPhase {
  const t = totalSpine <= 1 ? 1 : spineIndex / (totalSpine - 1)
  if (t < 0.35) return 'early'
  if (t < 0.75) return 'mid'
  return 'late'
}

function weightedPick(rng: SeededRng, weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (total <= 0) return Object.keys(weights)[0]
  let r = rng.next() * total
  for (const [key, w] of Object.entries(weights)) {
    r -= w
    if (r <= 0) return key
  }
  return Object.keys(weights)[0]
}

function pickRoomType(
  rng: SeededRng,
  phase: DepthPhase,
  floor: 1 | 2 | 3,
  shopPlaced: boolean,
  forceShop: boolean,
): RoomType {
  if (forceShop) return 'shop'
  const base = { ...DUNGEON_TUNING.roomWeights[floor][phase] }
  if (shopPlaced) base.shop = 0
  // stairwell and boss are never picked by weight — placed explicitly
  base.stairwell = 0
  base.boss = 0
  const types: RoomType[] = ['corridor', 'enemy', 'shop', 'npc', 'item', 'chest', 'trap']
  const filteredWeights: Record<string, number> = {}
  for (const t of types) filteredWeights[t] = base[t] ?? 0
  return weightedPick(rng, filteredWeights) as RoomType
}

function pickArchetypeFor(rng: SeededRng, roomType: RoomType, phase: DepthPhase): Archetype {
  const typeWeights = DUNGEON_TUNING.archetypeWeights[roomType]
  if (!typeWeights) return 'chamber'
  const phaseWeights = typeWeights[phase]
  const entries = Object.entries(phaseWeights) as [Archetype, number][]
  if (!entries.length) return 'chamber'
  const weights: Record<string, number> = {}
  for (const [arch, w] of entries) weights[arch] = w
  return weightedPick(rng, weights) as Archetype
}

// ── Content population ────────────────────────────────────────────────────────

function populateCell(rng: SeededRng, node: BuildNode, floor: 1 | 2 | 3): TileCell {
  const phase = phaseFromSpine(node.spineIndex, node.totalSpine)
  const cell: TileCell = {
    roomType: node.roomType,
    exits: node.exits,
    archetype: node.archetype ?? pickArchetypeFor(rng, node.roomType, phase),
  }

  if (node.roomType === 'enemy') {
    const tierWeights = DUNGEON_TUNING.enemyTierWeights[floor][phase]
    const w: Record<string, number> = { t1: tierWeights.t1, t2: tierWeights.t2, t3: tierWeights.t3 }
    const t = parseInt(weightedPick(rng, w).slice(1)) as 1 | 2 | 3
    const candidates = ENEMY_ROSTER.filter(e => e.tier === t)
    cell.enemyId = rng.pick(candidates).id
  }

  if (node.roomType === 'boss') {
    cell.enemyId = 'rat-king'
    cell.archetype = 'chamber'
  }

  if (node.roomType === 'trap') {
    const range = DUNGEON_TUNING.trapDifficultyRange[floor][phase]
    cell.trapDifficulty = rng.intRange(range.min, range.max)
  }

  if (node.roomType === 'shop') {
    const MERCHANTS = [
      { name: 'Morwhistle the Vole', flavor: "What'll it be?" },
      { name: 'Old Nutkin', flavor: 'Coins only, mind you.' },
      { name: 'Bramble Sewn', flavor: 'Fine goods, fair prices.' },
    ]
    const merchant = rng.pick(MERCHANTS)
    cell.shopMerchant = merchant.name
    const shopItems = CATALOG_ITEMS.filter(
      item => !['saints-acorn', 'nine-lives-token', 'stolen-idol'].includes(item.id),
    )
    const shuffled = [...shopItems].sort(() => rng.next() - 0.5)
    cell.shopStock = shuffled.slice(0, 3).map(i => i.id)
  }

  if (node.roomType === 'item') {
    const itemRoomItems = CATALOG_ITEMS.filter(
      item => !['leather-jerkin', 'padded-coat', 'saints-acorn', 'nine-lives-token', 'stolen-idol'].includes(item.id),
    )
    cell.itemId = rng.pick(itemRoomItems).id
  }

  if (node.roomType === 'npc') {
    const npcWeights = DUNGEON_TUNING.npcArchetypeWeights
    const w: Record<string, number> = { ...npcWeights }
    cell.npcType = weightedPick(rng, w) as TileCell['npcType']
    cell.npcState = 'active'
  }

  if (node.roomType === 'chest') {
    const vw = DUNGEON_TUNING.chestVariantWeights
    const vWeights: Record<string, number> = { basic: vw.basic, locked: vw.locked, trapped: vw.trapped }
    const variant = weightedPick(rng, vWeights) as 'basic' | 'locked' | 'trapped'
    cell.chestVariant = variant
    cell.chestState = 'closed'
    if (variant === 'locked') {
      cell.lockDifficulty = DUNGEON_TUNING.lockDifficultyThresholds.easy
    }
    if (variant === 'trapped') {
      const range = DUNGEON_TUNING.trapDifficultyRange[floor][phase]
      cell.trapDifficulty = rng.intRange(range.min, range.max)
    }
    const goldRange = DUNGEON_TUNING.chestGoldRange[floor]
    const gold = rng.intRange(goldRange.min, goldRange.max)
    let loot: { gold: number; item?: string } = { gold }
    if (rng.next() < DUNGEON_TUNING.chestHasItemChance) {
      loot.item = weightedPick(rng, DUNGEON_TUNING.chestLootWeights)
    }
    cell.loot = loot
  }

  return cell
}

// ── Floor skeleton (retained on state for future features) ───────────────────

export interface FloorSkeleton {
  spine: GridPos[]
  spurRoots: GridPos[]
  spurCaps: GridPos[]
}

// ── Generated floor output ────────────────────────────────────────────────────

export interface GeneratedFloor {
  map: GameMap
  startPos: GridPos
  skeleton: FloorSkeleton
}

// ── Shape: Gauntlet ───────────────────────────────────────────────────────────

function buildGauntlet(rng: SeededRng, floor: 1 | 2 | 3): GeneratedFloor {
  const GW = 13
  const GH = 13

  const SPINE_LEN = floor === 3 ? 11 : floor === 2 ? 9 : 8
  const SPUR_LEN = () => rng.intRange(2, 3)

  // Walk spine from bottom-center going north
  const spine: BuildNode[] = []
  const occupied = new Set<number>()
  let col = 6
  let row = 10
  let heading: ExitMask = N

  for (let i = 0; i < SPINE_LEN; i++) {
    if (occupied.has(posKey(col, row))) break
    occupied.add(posKey(col, row))
    spine.push({
      col, row, exits: 0,
      roomType: 'corridor',
      spineIndex: i,
      totalSpine: SPINE_LEN,
    })
    if (i < SPINE_LEN - 1) {
      // Maybe turn: 20% chance at non-first steps
      if (i > 1 && rng.next() < 0.20) {
        const turns = (heading === N || heading === S) ? [E, W] as const : [N, S] as const
        const candidate = rng.pick([...turns])
        const { dc: tdc, dr: tdr } = DELTA[candidate]
        const tnc = col + tdc
        const tnr = row + tdr
        if (tnc >= 1 && tnc <= 11 && tnr >= 1 && tnr <= 11 && !occupied.has(posKey(tnc, tnr))) {
          heading = candidate
        }
      }
      // Ensure next step stays in bounds
      let { dc, dr } = DELTA[heading]
      let nc = col + dc
      let nr = row + dr
      if (nc < 1 || nc > 11 || nr < 1 || nr > 11 || occupied.has(posKey(nc, nr))) {
        // Try to turn
        const alts = [N, E, S, W].filter(d => {
          const { dc: adc, dr: adr } = DELTA[d]
          const anc = col + adc
          const anr = row + adr
          return anc >= 1 && anc <= 11 && anr >= 1 && anr <= 11 && !occupied.has(posKey(anc, anr))
        })
        if (alts.length === 0) break
        heading = alts[0]
        ;({ dc, dr } = DELTA[heading])
        nc = col + dc
        nr = row + dr
      }
      col = nc
      row = nr
    }
  }

  if (spine.length < 4) throw new Error('Gauntlet spine too short')

  // Connect spine nodes
  for (let i = 1; i < spine.length; i++) {
    connect(spine[i - 1], spine[i])
  }

  // Place start and terminus
  spine[0].roomType = 'start'
  spine[spine.length - 1].roomType = floor === 3 ? 'boss' : 'stairwell'

  // Two spur junctions
  const jIdx1 = Math.max(1, Math.floor(spine.length * 0.30))
  const jIdx2 = Math.max(jIdx1 + 2, Math.floor(spine.length * 0.65))

  const spurRoots: GridPos[] = []
  const spurCaps: GridPos[] = []
  const allNodes = new Map<number, BuildNode>(spine.map(n => [posKey(n.col, n.row), n]))

  function addSpur(junctionNode: BuildNode, perpDir: ExitMask, len: number): void {
    const { dc: pdc, dr: pdr } = DELTA[perpDir]
    let pc = junctionNode.col + pdc
    let pr = junctionNode.row + pdr
    if (pc < 1 || pc > 11 || pr < 1 || pr > 11 || occupied.has(posKey(pc, pr))) return

    const spurNodes: BuildNode[] = []
    for (let k = 0; k < len; k++) {
      if (occupied.has(posKey(pc, pr)) || pc < 1 || pc > 11 || pr < 1 || pr > 11) break
      occupied.add(posKey(pc, pr))
      const sn: BuildNode = {
        col: pc, row: pr, exits: 0,
        roomType: 'corridor',
        spineIndex: junctionNode.spineIndex,
        totalSpine: junctionNode.totalSpine,
      }
      spurNodes.push(sn)
      allNodes.set(posKey(pc, pr), sn)

      if (k < len - 1) {
        const { dc: ndc, dr: ndr } = DELTA[perpDir]
        const nc = pc + ndc
        const nr = pr + ndr
        if (nc < 1 || nc > 11 || nr < 1 || nr > 11 || occupied.has(posKey(nc, nr))) break
        pc = nc
        pr = nr
      }
    }
    if (spurNodes.length === 0) return

    // Connect spur to junction
    connect(junctionNode, spurNodes[0])
    for (let k = 1; k < spurNodes.length; k++) {
      connect(spurNodes[k - 1], spurNodes[k])
    }
    spurRoots.push({ col: junctionNode.col, row: junctionNode.row })
    spurCaps.push({ col: spurNodes[spurNodes.length - 1].col, row: spurNodes[spurNodes.length - 1].row })
  }

  // Determine perpendicular direction for each junction
  function perpendicular(junction: BuildNode, spineArr: BuildNode[]): [ExitMask, ExitMask] {
    const idx = spineArr.indexOf(junction)
    if (idx > 0 && idx < spineArr.length - 1) {
      const prev = spineArr[idx - 1]
      const next = spineArr[idx + 1]
      // spine direction
      const sdc = next.col - prev.col
      if (sdc !== 0) return [N, S]  // spine goes E/W → perp is N/S
      return [E, W]  // spine goes N/S → perp is E/W
    }
    return [E, W]
  }

  const [pA, pB] = perpendicular(spine[jIdx1], spine)
  const dir1 = rng.next() < 0.5 ? pA : pB
  addSpur(spine[jIdx1], dir1, SPUR_LEN())

  const [pC, pD] = perpendicular(spine[jIdx2], spine)
  const dir2 = rng.next() < 0.5 ? pC : pD
  addSpur(spine[jIdx2], dir2, SPUR_LEN())

  // Assign room types — must have exactly 1 shop
  let shopPlaced = false
  const nodes = Array.from(allNodes.values())

  // Assign shop to a spur-cap if not yet placed by mid-spine
  const shopTarget = spurCaps.length > 0
    ? allNodes.get(posKey(spurCaps[0].col, spurCaps[0].row))
    : undefined

  for (const node of nodes) {
    if (node.roomType === 'start' || node.roomType === 'stairwell' || node.roomType === 'boss') continue
    const isShopTarget = shopTarget !== undefined && node === shopTarget
    const phase = phaseFromSpine(node.spineIndex, node.totalSpine)
    const forceShop = !shopPlaced && isShopTarget
    node.roomType = pickRoomType(rng, phase, floor, shopPlaced, forceShop)
    if (node.roomType === 'shop') shopPlaced = true
  }

  // If shop still not placed, force it on first available spur cap or mid-spine room
  if (!shopPlaced) {
    for (const node of nodes) {
      if (node.roomType === 'corridor') {
        node.roomType = 'shop'
        shopPlaced = true
        break
      }
    }
  }

  // Build GameMap
  const cells: (TileCell | null)[][] = Array.from({ length: GH }, () => Array(GW).fill(null))
  for (const node of nodes) {
    cells[node.row][node.col] = populateCell(rng, node, floor)
  }

  const startPos = { col: spine[0].col, row: spine[0].row }

  return {
    map: { cells, width: GW, height: GH },
    startPos,
    skeleton: {
      spine: spine.map(n => ({ col: n.col, row: n.row })),
      spurRoots,
      spurCaps,
    },
  }
}

// ── Shape: Hub ────────────────────────────────────────────────────────────────

function buildHub(rng: SeededRng, floor: 1 | 2 | 3): GeneratedFloor {
  const GW = 13
  const GH = 13
  const centerCol = 6
  const centerRow = 6

  const allNodes = new Map<number, BuildNode>()
  const occupied = new Set<number>()

  function addNode(col: number, row: number, spineIndex: number, totalSpine: number): BuildNode | null {
    if (col < 1 || col > 11 || row < 1 || row > 11) return null
    const k = posKey(col, row)
    if (occupied.has(k)) return null
    occupied.add(k)
    const n: BuildNode = { col, row, exits: 0, roomType: 'corridor', spineIndex, totalSpine }
    allNodes.set(k, n)
    return n
  }

  // Spoke lengths
  const southLen = rng.intRange(3, 4)  // start → center
  const northLen = rng.intRange(2, 3)  // center → stairwell/boss
  const eastLen = rng.intRange(2, 3)
  const westLen = 2
  const totalSpine = southLen + 1 + northLen

  // Center node (hub)
  const center = addNode(centerCol, centerRow, southLen, totalSpine)!
  center.roomType = 'corridor'

  // South spoke: entry path from bottom to center
  const southSpoke: BuildNode[] = []
  for (let i = southLen; i >= 1; i--) {
    const row = centerRow + i
    const n = addNode(centerCol, row, southLen - i, totalSpine)
    if (!n) break
    southSpoke.push(n)
  }
  southSpoke.reverse()  // now ordered entry→center

  // Connect south spoke
  for (let i = 0; i < southSpoke.length; i++) {
    if (i === 0) connect(southSpoke[i], center)
    else connect(southSpoke[i - 1], southSpoke[i])
  }
  // Fix: connect last south spoke to center
  if (southSpoke.length > 0) {
    const last = southSpoke[southSpoke.length - 1]
    if (last !== center) connect(last, center)
  }

  // North spoke: center → stairwell/boss
  const northSpoke: BuildNode[] = []
  for (let i = 1; i <= northLen; i++) {
    const row = centerRow - i
    const n = addNode(centerCol, row, southLen + i, totalSpine)
    if (!n) break
    northSpoke.push(n)
    connect(i === 1 ? center : northSpoke[i - 2], n)
  }

  // East spoke
  const eastSpoke: BuildNode[] = []
  for (let i = 1; i <= eastLen; i++) {
    const col = centerCol + i
    const n = addNode(col, centerRow, southLen, totalSpine)  // same phase as center
    if (!n) break
    eastSpoke.push(n)
    connect(i === 1 ? center : eastSpoke[i - 2], n)
  }

  // West spoke
  const westSpoke: BuildNode[] = []
  for (let i = 1; i <= westLen; i++) {
    const col = centerCol - i
    const n = addNode(col, centerRow, southLen, totalSpine)
    if (!n) break
    westSpoke.push(n)
    connect(i === 1 ? center : westSpoke[i - 2], n)
  }

  // Optional ring: connect N and E spoke tips with a short bridging path
  // N spoke last node at (centerCol, centerRow-northLen); E spoke last node at (centerCol+eastLen, centerRow)
  // Bridge via (centerCol+eastLen, centerRow-northLen+1) if room
  if (northSpoke.length > 0 && eastSpoke.length >= 2) {
    const bridgeCol = centerCol + eastLen
    const bridgeRow = centerRow - (northLen - 1)
    const n1 = addNode(bridgeCol, bridgeRow, southLen + northLen - 1, totalSpine)
    if (n1) {
      // Connect from E spoke tip northward to bridgeRow
      connect(eastSpoke[eastSpoke.length - 1], n1)
      // Connect to last N spoke node if adjacent
      const lastN = northSpoke[northSpoke.length - 1]
      if (Math.abs(lastN.col - bridgeCol) === 1 && lastN.row === bridgeRow) {
        connect(lastN, n1)
      } else if (lastN.row === bridgeRow && Math.abs(lastN.col - bridgeCol) === 1) {
        connect(lastN, n1)
      }
    }
  }

  // Assign types
  const startNode = southSpoke.length > 0 ? southSpoke[0] : center
  startNode.roomType = 'start'

  const terminusNode = northSpoke.length > 0 ? northSpoke[northSpoke.length - 1] : center
  terminusNode.roomType = floor === 3 ? 'boss' : 'stairwell'

  const spurRoots: GridPos[] = [{ col: centerCol, row: centerRow }]
  const spurCaps: GridPos[] = []
  if (eastSpoke.length > 0) spurCaps.push({ col: eastSpoke[eastSpoke.length - 1].col, row: eastSpoke[eastSpoke.length - 1].row })
  if (westSpoke.length > 0) spurCaps.push({ col: westSpoke[westSpoke.length - 1].col, row: westSpoke[westSpoke.length - 1].row })

  let shopPlaced = false
  const nodes = Array.from(allNodes.values())

  // Put shop on first east spur cap
  const shopCandidate = spurCaps.length > 0
    ? allNodes.get(posKey(spurCaps[0].col, spurCaps[0].row))
    : undefined

  for (const node of nodes) {
    if (node.roomType === 'start' || node.roomType === 'stairwell' || node.roomType === 'boss') continue
    const phase = phaseFromSpine(node.spineIndex, node.totalSpine)
    const forceShop = !shopPlaced && node === shopCandidate
    node.roomType = pickRoomType(rng, phase, floor, shopPlaced, forceShop)
    if (node.roomType === 'shop') shopPlaced = true
  }

  if (!shopPlaced) {
    for (const node of nodes) {
      if (node.roomType === 'corridor') {
        node.roomType = 'shop'
        shopPlaced = true
        break
      }
    }
  }

  const cells: (TileCell | null)[][] = Array.from({ length: GH }, () => Array(GW).fill(null))
  for (const node of nodes) {
    cells[node.row][node.col] = populateCell(rng, node, floor)
  }

  const spine = [
    ...southSpoke.map(n => ({ col: n.col, row: n.row })),
    { col: centerCol, row: centerRow },
    ...northSpoke.map(n => ({ col: n.col, row: n.row })),
  ]

  return {
    map: { cells, width: GW, height: GH },
    startPos: { col: startNode.col, row: startNode.row },
    skeleton: { spine, spurRoots, spurCaps },
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(floor: GeneratedFloor): boolean {
  const { map, startPos } = floor
  const { cells, width, height } = map

  // BFS from start to check connectivity and find stairwell/boss
  const visited = new Set<number>()
  const queue: GridPos[] = [startPos]
  visited.add(posKey(startPos.col, startPos.row))
  let foundExit = false
  let forkCount = 0

  while (queue.length > 0) {
    const cur = queue.shift()!
    const cell = cells[cur.row][cur.col]
    if (!cell) return false

    if (cell.roomType === 'stairwell' || cell.roomType === 'boss') foundExit = true

    // Count genuine forks (more than 1 unbacktracked exit from any non-start room)
    let exitCount = 0
    for (const [dir, { dc, dr }] of Object.entries({
      [N]: { dc: 0, dr: -1 },
      [S]: { dc: 0, dr: 1 },
      [E]: { dc: 1, dr: 0 },
      [W]: { dc: -1, dr: 0 },
    })) {
      if (cell.exits & Number(dir)) exitCount++
    }
    if (exitCount > 2 || (cell.roomType !== 'start' && exitCount >= 2)) forkCount++

    for (const [dir, { dc, dr }] of Object.entries({
      [N]: { dc: 0, dr: -1 },
      [S]: { dc: 0, dr: 1 },
      [E]: { dc: 1, dr: 0 },
      [W]: { dc: -1, dr: 0 },
    })) {
      if (!(cell.exits & Number(dir))) continue
      const nc = cur.col + dc
      const nr = cur.row + dr
      if (nc < 0 || nc >= width || nr < 0 || nr >= height) return false  // OOB exit
      const nbr = cells[nr][nc]
      if (!nbr) return false  // exit into void

      // Snapping check
      const opp: Record<string, number> = { [N]: S, [S]: N, [E]: W, [W]: E }
      if (!(nbr.exits & opp[dir])) return false

      const k = posKey(nc, nr)
      if (!visited.has(k)) {
        visited.add(k)
        queue.push({ col: nc, row: nr })
      }
    }
  }

  // All non-null cells must be reachable
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c] !== null && !visited.has(posKey(c, r))) return false
    }
  }

  if (!foundExit) return false
  if (forkCount < 1) return false  // at least 1 fork (2 spurs give 2 junctions)

  // One shop must exist
  let shopCount = 0
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c]?.roomType === 'shop') shopCount++
    }
  }
  if (shopCount !== 1) return false

  return true
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateFloor(runSeed: number, floor: 1 | 2 | 3): GeneratedFloor {
  for (let attempt = 0; attempt < 5; attempt++) {
    const seed = runSeed * 1000 + floor * 7 + attempt * 13
    const rng = new SeededRng(seed)
    const useGauntlet = floor === 3 || attempt % 2 === 0 ? rng.next() < 0.55 : rng.next() < 0.45
    try {
      const result = useGauntlet ? buildGauntlet(rng, floor) : buildHub(rng, floor)
      if (validate(result)) return result
    } catch {
      // retry
    }
  }
  // Final fallback: forced gauntlet with fixed seed
  const rng = new SeededRng(runSeed * 1000 + floor * 7)
  return buildGauntlet(rng, floor)
}
