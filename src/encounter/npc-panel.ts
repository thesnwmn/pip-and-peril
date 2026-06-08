import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { DicePool } from '../dice/pool'
import type { Inventory } from '../satchel/types'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { acquireItem } from '../satchel/items'
import { NPC_SCRIPTS } from './npc-scripts'
import { createCheckPanel, type CheckBand } from './check-panel'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H, MAP_X, MAP_Y, MAP_W, TILE_SIZE, VIEWPORT_COLS, VIEWPORT_ROWS } from '../screens/game-layout'

interface NpcPanelContext {
  getPool: () => DicePool
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}

type PanelPhase = 'dialogue' | 'check' | 'outcome' | 'reward' | 'dismissal'

interface ActiveReward {
  gold?: number
  item?: string
  hint?: string
}

const PORTRAIT_SIZE = 36
const PORTRAIT_Y = PANEL_TOP - PORTRAIT_SIZE / 2
const PORTRAIT_X = LOGICAL_W / 2 - PORTRAIT_SIZE / 2

const DIALOGUE_TOP = PANEL_TOP + 20
const BUTTON_TOP = DIALOGUE_TOP + 80
const BUTTON_H = 44
const BUTTON_GAP = 8
const BUTTON_W = LOGICAL_W - 32
const BUTTON_X = 16

const REWARD_TOP = PANEL_TOP + 100
const ITEM_CARD_W = 160
const ITEM_CARD_H = 80
const ITEM_CARD_X = LOGICAL_W / 2 - ITEM_CARD_W / 2

function getPortraitColor(archetypeId: string): string {
  const colors_map: Record<string, string> = {
    'rat-scavenger': '#8b6f47',
    'frightened-mouse': '#aaaaaa',
    'old-hermit': '#4a4a66',
  }
  return colors_map[archetypeId] ?? '#888888'
}

export function createNpcEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: NpcPanelContext,
): EncounterPanel {
  const npcType = cell.npcType ?? 'rat-scavenger'
  const script = NPC_SCRIPTS[npcType]
  if (!script) {
    throw new Error(`Unknown NPC type: ${npcType}`)
  }

  let phase: PanelPhase = cell.npcState === 'completed' ? 'dismissal' : 'dialogue'
  let currentNodeId = script.rootNode
  let completed = false
  let checkPanel: ReturnType<typeof createCheckPanel> | null = null
  let activeReward: ActiveReward | null = null
  let rewardStartTime: DOMHighResTimeStamp | null = null
  let dismissalTime: DOMHighResTimeStamp | null = cell.npcState === 'completed' ? performance.now() : null
  let hoveredButton: number | null = null

  function signalComplete(outcome: string): void {
    if (completed) return
    completed = true
    onComplete(outcome)
  }

  function getCurrentNode() {
    return script.nodes[currentNodeId]
  }

  function transitionToNode(nodeId: string): void {
    currentNodeId = nodeId
    phase = 'dialogue'
    checkPanel = null
    const node = getCurrentNode()
    if (node.responses.length === 0 || node.responses.some(r => r.isTerminal)) {
      // This is a terminal node - prepare to auto-advance after reward
      rewardStartTime = performance.now()
      phase = 'reward'
    }
  }

  function handleResponseClick(responseIdx: number): void {
    if (phase !== 'dialogue') return

    const node = getCurrentNode()
    const response = node.responses[responseIdx]

    if (response.isLeave) {
      signalComplete('left')
      return
    }

    if (response.check) {
      checkPanel = createCheckPanel(response.check, {
        getPool: context.getPool,
        onResult: (band: CheckBand) => {
          handleCheckResult(response, band)
        },
        allowBack: false,
      })
      phase = 'check'
      return
    }

    if (response.next) {
      transitionToNode(response.next)
      return
    }

    if (response.isTerminal) {
      activeReward = response.reward ?? {}
      rewardStartTime = performance.now()
      phase = 'reward'
      return
    }
  }

  function handleCheckResult(response: any, band: CheckBand): void {
    const nextNodeId =
      band === 'critical' ? (response.nextCrit ?? response.nextSuccess ?? response.next) :
      band === 'success' ? (response.nextSuccess ?? response.next) :
      band === 'cost' ? (response.nextCost ?? response.nextSuccess ?? response.next) :
      response.nextFail

    if (nextNodeId) {
      // Handle reward
      activeReward = null
      if (band === 'critical' && response.reward) {
        const baseReward = response.reward
        if (response.check?.critBonus) {
          activeReward = {
            gold: (baseReward.gold ?? 0) + (response.check.critBonus.gold ?? 0),
            item: baseReward.item,
            hint: response.check.critBonus.hint ?? baseReward.hint,
          }
        } else {
          activeReward = baseReward
        }
      } else if ((band === 'success' || band === 'cost') && response.reward) {
        activeReward = response.reward
      }

      transitionToNode(nextNodeId)
    } else {
      // Terminal node
      activeReward = response.reward ?? {}
      rewardStartTime = performance.now()
      phase = 'reward'
    }
  }

  function applyReward(): void {
    if (!activeReward) return

    const reward = activeReward
    let inv = context.getInventory()

    if (reward.gold) {
      inv = { ...inv, gold: inv.gold + reward.gold }
    }

    if (reward.item) {
      const item = CATALOG_ITEMS.find(i => i.id === reward.item)
      if (item && inv.items.length < 6) {
        inv = acquireItem(inv, item)
      }
    }

    context.setInventory(inv)

    if (reward.hint) {
      // TODO: wire up journal append when journal is ready
    }

    activeReward = null
  }

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    ctx.save()
    ctx.globalAlpha = 1

    // Background
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, LOGICAL_H - PANEL_TOP)

    // Top border stripe
    ctx.fillStyle = colors.roomNpc
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, 3)

    // Portrait
    const portraitColor = getPortraitColor(script.archetypeId)
    ctx.fillStyle = portraitColor
    ctx.beginPath()
    ctx.arc(PORTRAIT_X + PORTRAIT_SIZE / 2, PORTRAIT_Y + PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = colors.roomNpc
    ctx.lineWidth = 2
    ctx.stroke()

    if (phase === 'dismissal') {
      const node = getCurrentNode()
      const dismissalIdx = Math.floor(Math.random() * script.dismissalLines.length)
      const dismissalLine = script.dismissalLines[dismissalIdx]

      ctx.font = '16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const lines = wrapText(ctx, dismissalLine, LOGICAL_W - 32)
      lines.forEach((line, idx) => {
        ctx.fillText(line, 16, DIALOGUE_TOP + idx * 20)
      })

      if (dismissalTime && timestamp - dismissalTime > 2000) {
        signalComplete('dismissed')
      }
    } else if (phase === 'check' && checkPanel) {
      checkPanel.draw(ctx)
    } else if (phase === 'reward') {
      if (activeReward?.gold || activeReward?.item || activeReward?.hint) {
        // Draw reward display
        ctx.font = '14px monospace'
        ctx.fillStyle = colors.textMuted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        let rewardY = REWARD_TOP

        if (activeReward?.gold) {
          ctx.fillStyle = colors.gold
          ctx.font = '16px monospace'
          ctx.fillText(`+ ${activeReward.gold} ◈`, LOGICAL_W / 2, rewardY)
          rewardY += 30
        }

        if (activeReward?.item) {
          const item = CATALOG_ITEMS.find(i => i.id === activeReward!.item)
          if (item) {
            // Draw item card
            ctx.fillStyle = 'rgba(200, 180, 150, 0.1)'
            ctx.fillRect(ITEM_CARD_X, rewardY, ITEM_CARD_W, ITEM_CARD_H)
            ctx.strokeStyle = colors.textMuted
            ctx.lineWidth = 1
            ctx.strokeRect(ITEM_CARD_X, rewardY, ITEM_CARD_W, ITEM_CARD_H)

            ctx.font = '15px monospace'
            ctx.fillStyle = colors.textPrimary
            ctx.textAlign = 'center'
            ctx.fillText(item.name, LOGICAL_W / 2, rewardY + 10)

            ctx.font = '13px monospace'
            ctx.fillStyle = colors.textMuted
            ctx.fillText(item.description, LOGICAL_W / 2, rewardY + 35)

            rewardY += ITEM_CARD_H + 20
          }
        }

        if (activeReward?.hint) {
          ctx.font = '14px italic monospace'
          ctx.fillStyle = colors.textMuted
          ctx.textAlign = 'center'
          const hintLines = wrapText(ctx, activeReward.hint, LOGICAL_W - 32)
          hintLines.forEach((line, idx) => {
            ctx.fillText(line, LOGICAL_W / 2, rewardY + idx * 20)
          })
        }

        // Auto-advance after 2s
        if (rewardStartTime && timestamp - rewardStartTime > 2000) {
          applyReward()
          if (cell.npcState === 'active') {
            const state = context.getDungeonState()
            const updatedCell = { ...cell, npcState: 'completed' as const }
            const updatedGrid = state.grid.cells.map(row =>
              row.map(c => c === cell ? updatedCell : c)
            )
            context.setDungeonState({ ...state, grid: { ...state.grid, cells: updatedGrid } })
          }
          signalComplete('completed')
        }
      } else {
        // No reward, just terminal
        applyReward()
        if (cell.npcState === 'active') {
          const state = context.getDungeonState()
          const updatedCell = { ...cell, npcState: 'completed' as const }
          const updatedGrid = state.grid.cells.map(row =>
            row.map(c => c === cell ? updatedCell : c)
          )
          context.setDungeonState({ ...state, grid: { ...state.grid, cells: updatedGrid } })
        }
        signalComplete('completed')
      }
    } else {
      // Dialogue phase
      const node = getCurrentNode()

      ctx.font = '16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const lines = wrapText(ctx, node.npcLine, LOGICAL_W - 32)
      lines.forEach((line, idx) => {
        ctx.fillText(line, 16, DIALOGUE_TOP + idx * 20)
      })

      // Response buttons
      const maxResponses = Math.min(3, node.responses.length)
      node.responses.slice(0, maxResponses).forEach((response, idx) => {
        const y = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        const hovered = hoveredButton === idx
        const isCheckGated = !!response.check

        ctx.fillStyle = hovered ? 'rgba(200, 180, 150, 0.2)' : 'rgba(200, 180, 150, 0.1)'
        ctx.fillRect(BUTTON_X, y, BUTTON_W, BUTTON_H)
        ctx.strokeStyle = hovered ? colors.textPrimary : 'rgba(200, 180, 150, 0.3)'
        ctx.lineWidth = 1
        ctx.strokeRect(BUTTON_X, y, BUTTON_W, BUTTON_H)

        ctx.font = '16px monospace'
        ctx.fillStyle = response.isLeave ? colors.textMuted : colors.textPrimary
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'

        const label = isCheckGated
          ? `${response.check!.approaches[0] === 'red' ? '🔴' : response.check!.approaches[0] === 'blue' ? '🔵' : response.check!.approaches[0] === 'green' ? '🟢' : '🟡'} ${response.label}`
          : response.label

        ctx.fillText(label, BUTTON_X + 16, y + BUTTON_H / 2)
      })
    }

    ctx.restore()
  }

  function drawMapOverlay(ctx: CanvasRenderingContext2D): void {
    // Optional: draw NPC silhouette in map zone
  }

  function handleClick(x: number, y: number): void {
    if (phase === 'dialogue') {
      const node = getCurrentNode()
      const maxResponses = Math.min(3, node.responses.length)

      for (let idx = 0; idx < maxResponses; idx++) {
        const buttonY = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        if (y >= buttonY && y <= buttonY + BUTTON_H && x >= BUTTON_X && x <= BUTTON_X + BUTTON_W) {
          handleResponseClick(idx)
          return
        }
      }
    } else if (phase === 'check' && checkPanel) {
      checkPanel.handleClick(x, y)
    } else if (phase === 'dismissal') {
      signalComplete('dismissed')
    }
  }

  function handlePointerMove(x: number, y: number): void {
    if (phase === 'dialogue') {
      const node = getCurrentNode()
      const maxResponses = Math.min(3, node.responses.length)

      hoveredButton = null
      for (let idx = 0; idx < maxResponses; idx++) {
        const buttonY = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        if (y >= buttonY && y <= buttonY + BUTTON_H && x >= BUTTON_X && x <= BUTTON_X + BUTTON_W) {
          hoveredButton = idx
          break
        }
      }
    } else if (phase === 'check' && checkPanel) {
      checkPanel.handlePointerMove(x, y)
    }
  }

  return {
    draw,
    drawMapOverlay,
    handleClick,
    handlePointerMove,
    mapView,
    snapCamera: true,
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}
