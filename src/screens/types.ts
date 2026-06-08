export interface RunSummary {
  outcome: 'victory' | 'defeat'
  floorReached: number
  enemiesDefeated: number
  goldEarned: number
  killedBy: string | null
  killedByFloor: number | null
}
