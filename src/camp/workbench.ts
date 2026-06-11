import type { DiceColour, DiceFaces, PermanentDie } from '../meta/state'

export const ADD_COST = 50
export const ENGRAVE_COST = 15

const SWAP_PATH: DiceFaces[] = [4, 6, 8, 10, 12]
const SWAP_COSTS: Partial<Record<DiceFaces, number>> = { 4: 20, 6: 30, 8: 45, 10: 60 }

const COLOUR_PREFIX: Record<DiceColour, string> = {
  red: 'r',
  green: 'g',
  blue: 'b',
  yellow: 'y',
}

export function getNextFaces(faces: DiceFaces): DiceFaces | null {
  const idx = SWAP_PATH.indexOf(faces)
  if (idx === -1 || idx === SWAP_PATH.length - 1) return null
  return SWAP_PATH[idx + 1]
}

export function getSwapCost(faces: DiceFaces): number | null {
  return SWAP_COSTS[faces] ?? null
}

export function getEngraveValues(faces: DiceFaces): number[] {
  const max = Math.floor(faces / 2)
  const result: number[] = []
  for (let v = 2; v <= max; v++) result.push(v)
  return result
}

export function makeNewDieId(pool: PermanentDie[], colour: DiceColour): string {
  const prefix = COLOUR_PREFIX[colour]
  const count = pool.filter(d => d.colour === colour).length
  return `${prefix}${count + 1}`
}
