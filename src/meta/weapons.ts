import type { Die, DieColor } from '../dice/pool'

export interface WeaponSpec {
  id: string
  name: string
  flavour: string
  addedDice: Die[]
  strikeAction: { cost: Record<DieColor, number> } | null
}

export const WEAPON_SPECS: Record<string, WeaponSpec> = {
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    flavour: 'Quick and quiet — Pip prefers two.',
    addedDice: [
      { color: 'red', sides: 4 },
      { color: 'red', sides: 4 },
    ],
    strikeAction: { cost: { red: 1, blue: 0, green: 0, yellow: 0 } },
  },
  shortsword: {
    id: 'shortsword',
    name: 'Shortsword',
    flavour: 'Reliable. The workhorse.',
    addedDice: [{ color: 'red', sides: 6 }],
    strikeAction: { cost: { red: 2, blue: 0, green: 0, yellow: 0 } },
  },
  broadsword: {
    id: 'broadsword',
    name: 'Broadsword',
    flavour: 'Heavy. Each swing matters.',
    addedDice: [{ color: 'red', sides: 8 }],
    strikeAction: { cost: { red: 3, blue: 0, green: 0, yellow: 0 } },
  },
  whiskerStaff: {
    id: 'whiskerStaff',
    name: 'Whisker Staff',
    flavour: 'No blade — just Pip\'s wits.',
    addedDice: [
      { color: 'blue', sides: 4 },
      { color: 'blue', sides: 4 },
    ],
    strikeAction: null,
  },
}

export function getWeaponSpec(weaponId: string): WeaponSpec | undefined {
  return WEAPON_SPECS[weaponId]
}
