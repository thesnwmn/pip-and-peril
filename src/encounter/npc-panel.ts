import type { EncounterPanel, MapViewConfig } from './panel'
import type { TileCell } from '../map/types'
import type { DicePool } from '../dice/pool'
import type { Inventory } from '../satchel/types'
import { CATALOG_ITEMS } from '../satchel/catalog'
import { acquireItem } from '../satchel/items'
import { NPC_SCRIPTS } from './npc-scripts'
import { createCheckPanel, type CheckBand } from './check-panel'
import { colors } from '../colors'
import { PANEL_TOP, LOGICAL_W, LOGICAL_H, MAP_X, MAP_W } from '../screens/game-layout'

interface NpcPanelContext {
  getPool: () => DicePool
  getInventory: () => Inventory
  setInventory: (inv: Inventory) => void
  getDungeonState: () => import('../navigation/dungeon-state').DungeonState
  setDungeonState: (s: import('../navigation/dungeon-state').DungeonState) => void
}

type PanelPhase = 'dialogue' | 'check' | 'reward' | 'dismissal'

interface ActiveReward {
  gold?: number
  item?: string
  hint?: string
}

// ── Portrait — right-aligned, straddles PANEL_TOP ────────────────────────────

const PORTRAIT_R = 26           // radius (52px diameter)
const PORTRAIT_CX = LOGICAL_W - 16 - PORTRAIT_R   // 348: right-aligned with 16px margin
const PORTRAIT_CY = PANEL_TOP                      // straddles map/panel boundary

function getPortraitColor(archetypeId: string): string {
  const map: Record<string, string> = {
    'rat-scavenger':   '#8b6f47',
    'frightened-mouse': '#9aaa9a',
    'old-hermit':       '#5a5a7a',
  }
  return map[archetypeId] ?? '#888888'
}

// Head-and-shoulders silhouette clipped to a badge circle
function drawPortrait(ctx: CanvasRenderingContext2D, archetypeId: string): void {
  const cx = PORTRAIT_CX
  const cy = PORTRAIT_CY
  const r = PORTRAIT_R
  const color = getPortraitColor(archetypeId)

  // Badge background
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = colors.surfaceRaised
  ctx.fill()
  ctx.strokeStyle = colors.roomNpc
  ctx.lineWidth = 2
  ctx.stroke()

  // Clip silhouette inside badge
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2)
  ctx.clip()

  // Shoulders: upper semicircle below center
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.5, r * 0.72, Math.PI, 0, false)
  ctx.fillStyle = color
  ctx.fill()

  // Head: circle
  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.1, r * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()
}

// ── Dialogue layout ───────────────────────────────────────────────────────────

const SIDE_MARGIN = 16
const CONTENT_LEFT = MAP_X + SIDE_MARGIN                 // 26
const CONTENT_W = MAP_W - SIDE_MARGIN * 2                // 328

// Text starts below portrait's lower edge (PORTRAIT_CY + PORTRAIT_R = PANEL_TOP + 26)
const DIALOGUE_TOP = PANEL_TOP + 34
const BUTTON_TOP = PANEL_TOP + 94   // leave room for 2 dialogue lines + gap
const BUTTON_H = 48
const BUTTON_GAP = 8

const REWARD_TOP = PANEL_TOP + 50
const ITEM_CARD_W = 220
const ITEM_CARD_H = 74
const ITEM_CARD_X = MAP_X + (MAP_W - ITEM_CARD_W) / 2

// ── Panel factory ─────────────────────────────────────────────────────────────

export function createNpcEncounterPanel(
  onComplete: (outcome: string) => void,
  cell: TileCell,
  mapView: MapViewConfig,
  context: NpcPanelContext,
): EncounterPanel {
  const npcType = cell.npcType ?? 'rat-scavenger'
  const script = NPC_SCRIPTS[npcType]
  if (!script) throw new Error(`Unknown NPC type: ${npcType}`)

  let phase: PanelPhase = cell.npcState === 'completed' ? 'dismissal' : 'dialogue'
  let currentNodeId = script.rootNode
  let completed = false
  let checkPanel: ReturnType<typeof createCheckPanel> | null = null
  let activeReward: ActiveReward | null = null
  let rewardStartTime: DOMHighResTimeStamp | null = null
  let hoveredButton: number | null = null

  // Pick dismissal line once at init (not every frame)
  const dismissalLine = script.dismissalLines[Math.floor(Math.random() * script.dismissalLines.length)]
  let dismissalTime: DOMHighResTimeStamp | null = cell.npcState === 'completed' ? performance.now() : null

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
    // Do NOT skip to reward here — let the dialogue node show first.
    // Terminal response taps in handleResponseClick set phase = 'reward'.
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
        onResult: (band: CheckBand) => { handleCheckResult(response, band) },
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
      activeReward = response.reward ?? null
      rewardStartTime = performance.now()
      phase = 'reward'
    }
  }

  function handleCheckResult(response: any, band: CheckBand): void {
    const nextNodeId =
      band === 'critical' ? (response.nextCrit ?? response.nextSuccess ?? response.next) :
      band === 'success'  ? (response.nextSuccess ?? response.next) :
      band === 'cost'     ? (response.nextCost ?? response.nextSuccess ?? response.next) :
      response.nextFail

    activeReward = null
    if (band === 'critical' && response.reward) {
      const base = response.reward
      activeReward = response.check?.critBonus
        ? { gold: (base.gold ?? 0) + (response.check.critBonus.gold ?? 0), item: base.item, hint: response.check.critBonus.hint ?? base.hint }
        : base
    } else if ((band === 'success' || band === 'cost') && response.reward) {
      activeReward = response.reward
    }

    if (nextNodeId) {
      transitionToNode(nextNodeId)
    } else {
      rewardStartTime = performance.now()
      phase = 'reward'
    }
  }

  function applyReward(): void {
    if (!activeReward) return
    const reward = activeReward
    let inv = context.getInventory()

    if (reward.gold) inv = { ...inv, gold: inv.gold + reward.gold }

    if (reward.item) {
      const item = CATALOG_ITEMS.find(i => i.id === reward.item)
      if (item && inv.items.length < 6) inv = acquireItem(inv, item)
    }

    context.setInventory(inv)
    // TODO: journal hint append when journal feature ships
    activeReward = null
  }

  function markCompleted(): void {
    if (cell.npcState === 'active') {
      const state = context.getDungeonState()
      const updatedGrid = state.grid.cells.map(row =>
        row.map(c => c === cell ? { ...cell, npcState: 'completed' as const } : c),
      )
      context.setDungeonState({ ...state, grid: { ...state.grid, cells: updatedGrid } })
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    ctx.save()
    ctx.globalAlpha = 1

    // Background — always
    ctx.fillStyle = colors.surface
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, LOGICAL_H - PANEL_TOP)

    // Top border stripe — always
    ctx.fillStyle = colors.roomNpc
    ctx.fillRect(0, PANEL_TOP, LOGICAL_W, 3)

    // Phase-specific content
    if (phase === 'check' && checkPanel) {
      checkPanel.draw(ctx, timestamp)
    } else if (phase === 'dismissal') {
      ctx.font = '16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      wrapText(ctx, dismissalLine, CONTENT_W - PORTRAIT_R * 2 - 8).forEach((line, i) => {
        ctx.fillText(line, CONTENT_LEFT, DIALOGUE_TOP + i * 22)
      })
      if (dismissalTime && timestamp - dismissalTime > 2000) signalComplete('dismissed')
    } else if (phase === 'reward') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      let ry = REWARD_TOP

      const reward = activeReward
      if (reward?.gold) {
        ctx.font = 'bold 18px monospace'
        ctx.fillStyle = colors.gold
        ctx.fillText(`+ ${reward.gold} ◈`, MAP_X + MAP_W / 2, ry)
        ry += 32
      }

      if (reward?.item) {
        const item = CATALOG_ITEMS.find(i => i.id === reward.item)
        if (item) {
          ctx.fillStyle = 'rgba(200,180,150,0.1)'
          ctx.fillRect(ITEM_CARD_X, ry, ITEM_CARD_W, ITEM_CARD_H)
          ctx.strokeStyle = colors.textMuted
          ctx.lineWidth = 1
          ctx.strokeRect(ITEM_CARD_X, ry, ITEM_CARD_W, ITEM_CARD_H)
          ctx.font = '15px monospace'
          ctx.fillStyle = colors.textPrimary
          ctx.fillText(item.name, MAP_X + MAP_W / 2, ry + 12)
          ctx.font = '13px monospace'
          ctx.fillStyle = colors.textMuted
          ctx.fillText(item.description, MAP_X + MAP_W / 2, ry + 36)
          ry += ITEM_CARD_H + 16
        }
      }

      if (reward?.hint) {
        ctx.font = 'italic 14px monospace'
        ctx.fillStyle = colors.textMuted
        wrapText(ctx, reward.hint, CONTENT_W).forEach((line, i) => {
          ctx.fillText(line, MAP_X + MAP_W / 2, ry + i * 20)
        })
      }

      if (rewardStartTime && timestamp - rewardStartTime > 2000) {
        applyReward()
        markCompleted()
        signalComplete('completed')
      }
    } else {
      // Dialogue
      const node = getCurrentNode()

      ctx.font = '16px monospace'
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const textW = CONTENT_W - PORTRAIT_R * 2 - 8    // leave room for portrait at top
      wrapText(ctx, node.npcLine, textW).slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, CONTENT_LEFT, DIALOGUE_TOP + i * 22)
      })

      // Response buttons — full width, vertically stacked
      const maxResponses = Math.min(3, node.responses.length)
      node.responses.slice(0, maxResponses).forEach((response, idx) => {
        const by = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        const hovered = hoveredButton === idx

        ctx.fillStyle = hovered ? 'rgba(200,180,150,0.18)' : 'rgba(200,180,150,0.08)'
        ctx.fillRect(CONTENT_LEFT, by, CONTENT_W, BUTTON_H)
        ctx.strokeStyle = hovered ? colors.textPrimary : 'rgba(200,180,150,0.25)'
        ctx.lineWidth = 1
        ctx.strokeRect(CONTENT_LEFT, by, CONTENT_W, BUTTON_H)

        const isCheckGated = !!response.check
        const glyphs: Record<string, string> = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' }
        const label = isCheckGated
          ? `${glyphs[response.check!.approaches[0]] ?? ''} ${response.label}`
          : response.label

        ctx.font = '16px monospace'
        ctx.fillStyle = response.isLeave ? colors.textMuted : colors.textPrimary
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, CONTENT_LEFT + 14, by + BUTTON_H / 2)
      })
    }

    // Portrait drawn last — always on top, straddles the boundary
    drawPortrait(ctx, script.archetypeId)

    ctx.restore()
  }

  function drawMapOverlay(_ctx: CanvasRenderingContext2D): void {
    // reserved for future map-zone NPC indicators
  }

  function handleClick(x: number, y: number): void {
    if (phase === 'dialogue') {
      const node = getCurrentNode()
      const maxResponses = Math.min(3, node.responses.length)
      for (let idx = 0; idx < maxResponses; idx++) {
        const by = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        if (x >= CONTENT_LEFT && x <= CONTENT_LEFT + CONTENT_W && y >= by && y <= by + BUTTON_H) {
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
      hoveredButton = null
      const node = getCurrentNode()
      const maxResponses = Math.min(3, node.responses.length)
      for (let idx = 0; idx < maxResponses; idx++) {
        const by = BUTTON_TOP + idx * (BUTTON_H + BUTTON_GAP)
        if (x >= CONTENT_LEFT && x <= CONTENT_LEFT + CONTENT_W && y >= by && y <= by + BUTTON_H) {
          hoveredButton = idx
          break
        }
      }
    } else if (phase === 'check' && checkPanel) {
      checkPanel.handlePointerMove(x, y)
    }
  }

  return { draw, drawMapOverlay, handleClick, handlePointerMove, mapView, snapCamera: true }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word }
    else current = test
  }
  if (current) lines.push(current)
  return lines
}
