import type { MetaState } from '../meta/state'

export interface RunSummary {
  outcome: 'victory' | 'defeat'
  floorReached: number
  enemiesDefeated: number
  goldEarned: number
  killedBy: string | null
  killedByFloor: number | null
  abandoned?: boolean
  newMarkIds?: string[]     // marks earned this run (empty or absent = no marks section shown)
  metaWithMarks?: MetaState // MetaState with marks applied, used as base in run-summary
}
