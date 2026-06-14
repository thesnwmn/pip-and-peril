import type { MetaState } from './state'

export type SkillSpec = {
  id: string
  name: string
  effectLine: string
}

export const SKILL_LIBRARY: readonly SkillSpec[] = [
  {
    id: 'careful-eye',
    name: 'Careful Eye',
    effectLine: "See the enemy's first two intents at the start of every fight.",
  },
  {
    id: 'counter-strike',
    name: 'Counter-Strike',
    effectLine: 'A perfect dodge (2G) deals 1 damage back.',
  },
  {
    id: 'desperate-swing',
    name: 'Desperate Swing',
    effectLine: 'While Rattled, Strike costs 1 Red less.',
  },
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    effectLine: 'Emboldened lasts two turns instead of one.',
  },
  {
    id: 'stout-heart',
    name: 'Stout Heart',
    effectLine: 'Rattled takes three missed turns to trigger, not two.',
  },
]

export function getSkill(id: string): SkillSpec | undefined {
  return SKILL_LIBRARY.find(s => s.id === id)
}

export function skillSlotCount(runCount: number): number {
  return runCount >= 5 ? 2 : 1
}

export function unlockSkill(meta: MetaState, skillId: string): MetaState {
  const unlocked = meta.unlockedSkillIds ?? []
  if (unlocked.includes(skillId)) return meta
  return { ...meta, unlockedSkillIds: [...unlocked, skillId] }
}

export function sanitiseLoadout(meta: MetaState): MetaState {
  const cap = skillSlotCount(meta.runCount)
  const unlocked = meta.unlockedSkillIds ?? []
  const loadout = (meta.activeLoadout ?? [])
    .filter(id => unlocked.includes(id))
    .slice(0, cap)
  return { ...meta, unlockedSkillIds: unlocked, activeLoadout: loadout }
}
