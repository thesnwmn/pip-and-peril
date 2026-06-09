import { describe, it, expect } from 'vitest'
import { RAT_SCAVENGER, FRIGHTENED_MOUSE, OLD_HERMIT, NPC_SCRIPTS } from './npc-scripts'

describe('NPC Scripts', () => {
  it('should have all three archetypes', () => {
    expect(Object.keys(NPC_SCRIPTS)).toContain('rat-scavenger')
    expect(Object.keys(NPC_SCRIPTS)).toContain('frightened-mouse')
    expect(Object.keys(NPC_SCRIPTS)).toContain('old-hermit')
  })

  describe('Rat Scavenger', () => {
    it('should have opening line', () => {
      const root = RAT_SCAVENGER.nodes[RAT_SCAVENGER.rootNode]
      expect(root.npcLine).toContain('Oi, mouse')
    })

    it('should have exactly 2 root responses', () => {
      const root = RAT_SCAVENGER.nodes[RAT_SCAVENGER.rootNode]
      expect(root.responses.length).toBe(2)
    })

    it('should have check-gated first response', () => {
      const root = RAT_SCAVENGER.nodes[RAT_SCAVENGER.rootNode]
      expect(root.responses[0].check).toBeDefined()
      expect(root.responses[0].check!.approaches).toContain('blue')
      expect(root.responses[0].check!.approaches).toContain('yellow')
    })

    it('should have dismissal lines', () => {
      expect(RAT_SCAVENGER.dismissalLines.length).toBe(3)
      expect(RAT_SCAVENGER.dismissalLines[0]).toContain('talked')
    })

    it('should have hint pool', () => {
      expect(RAT_SCAVENGER.hintPool.length).toBeGreaterThan(0)
      expect(RAT_SCAVENGER.hintPool[0]).toMatch(/[A-Z]/)
    })
  })

  describe('Frightened Mouse', () => {
    it('should have opening line about hiding', () => {
      const root = FRIGHTENED_MOUSE.nodes[FRIGHTENED_MOUSE.rootNode]
      expect(root.npcLine).toContain('hiding')
    })

    it('should have check-gated reassurance response', () => {
      const root = FRIGHTENED_MOUSE.nodes[FRIGHTENED_MOUSE.rootNode]
      expect(root.responses[0].check).toBeDefined()
      expect(root.responses[0].check!.approaches).toContain('yellow')
      expect(root.responses[0].check!.approaches).toContain('green')
    })
  })

  describe('Old Hermit', () => {
    it('should have opening line about visitors', () => {
      const root = OLD_HERMIT.nodes[OLD_HERMIT.rootNode]
      expect(root.npcLine).toContain('third')
    })

    it('should have high difficulty check (3)', () => {
      const root = OLD_HERMIT.nodes[OLD_HERMIT.rootNode]
      expect(root.responses[0].check!.difficulty).toBe(3)
    })

    it('should have blue and red approaches', () => {
      const root = OLD_HERMIT.nodes[OLD_HERMIT.rootNode]
      expect(root.responses[0].check!.approaches).toContain('blue')
      expect(root.responses[0].check!.approaches).toContain('red')
    })
  })

  describe('Check structure', () => {
    it('should have all three outcome bands in RAT_SCAVENGER check', () => {
      const root = RAT_SCAVENGER.nodes[RAT_SCAVENGER.rootNode]
      const check = root.responses[0].check!
      expect(check.stakeSuccess).toBeDefined()
      expect(check.stakeCost).toBeDefined()
      expect(check.stakeFail).toBeDefined()
    })

    it('should have outcome lines for success, cost, fail', () => {
      const root = RAT_SCAVENGER.nodes[RAT_SCAVENGER.rootNode]
      const check = root.responses[0].check!
      expect(check.successLine).toBeDefined()
      expect(check.costLine).toBeDefined()
      expect(check.failLine).toBeDefined()
    })
  })
})
