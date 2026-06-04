import type { TileCell } from '../map/types'
import type { EncounterPanel } from './panel'
import { LOGICAL_H, PANEL_TOP, COMBAT_PANEL_TOP, TRANSITION_DURATION } from '../screens/game-layout'
import { easeIn, easeOut, lerp } from '../animation/easing'

// EncounterRegistration: everything the registry needs to manage one encounter type.
// trigger: given the cell Pip just entered, should this encounter activate?
// factory: creates the panel, receiving the onComplete callback.
// handlers: outcome name → side-effect applied to game state when FALLING completes.
//   Unrecognised outcomes log a visible error in development.
export interface EncounterRegistration {
  trigger: (cell: TileCell) => boolean
  factory: (onComplete: (outcome: string) => void) => EncounterPanel
  handlers: Record<string, () => void>
}

export interface MapRenderState {
  panelTop: number
  zoom: number
  pipTargetX: number
  pipTargetY: number
}

// Internal phase state machine:
//   idle → rising (trigger fires) → active (rise complete) → falling (outcome signalled) → idle
type Phase =
  | { tag: 'idle' }
  | { tag: 'rising'; startTime: number; panel: EncounterPanel; handlers: Record<string, () => void> }
  | { tag: 'active'; panel: EncounterPanel; handlers: Record<string, () => void> }
  | { tag: 'falling'; startTime: number; panel: EncounterPanel; outcome: string; handlers: Record<string, () => void> }

// getNow is injectable for testing; defaults to performance.now in production.
export function createEncounterRegistry(getNow: () => DOMHighResTimeStamp = () => performance.now()) {
  const registrations: EncounterRegistration[] = []
  let phase: Phase = { tag: 'idle' }

  // Last panelTop computed by computeMapState — used by draw/handleClick/handlePointerMove.
  // computeMapState MUST be called before these in each frame.
  let cachedPanelTop = LOGICAL_H

  function register(reg: EncounterRegistration): void {
    registrations.push(reg)
  }

  function checkTrigger(cell: TileCell): void {
    if (phase.tag !== 'idle') return
    for (const reg of registrations) {
      if (reg.trigger(cell)) {
        const panel = reg.factory((outcome) => {
          if (phase.tag === 'active') {
            phase = {
              tag: 'falling',
              startTime: getNow(),
              panel: phase.panel,
              outcome,
              handlers: phase.handlers,
            }
          }
        })
        phase = {
          tag: 'rising',
          startTime: getNow(),
          panel,
          handlers: reg.handlers,
        }
        return
      }
    }
  }

  function isActive(): boolean {
    return phase.tag !== 'idle'
  }

  function isTransitioning(): boolean {
    return phase.tag === 'rising' || phase.tag === 'falling'
  }

  // Should game.ts draw the nav panel this frame?
  // During RISING: draw nav until encounter panel covers it (cachedPanelTop reaches PANEL_TOP).
  // During FALLING on victory: always draw the clean nav panel as background layer.
  // During FALLING on defeat: no nav panel (exits to menu).
  // computeMapState must be called first to update cachedPanelTop.
  function shouldDrawNavPanel(): boolean {
    if (phase.tag === 'idle') return true
    if (phase.tag === 'active') return false
    if (phase.tag === 'rising') return cachedPanelTop > PANEL_TOP
    if (phase.tag === 'falling') return phase.outcome !== 'defeat'
    return false
  }

  // Advance the transition state machine and return the animated map render state.
  // Must be called once per frame before draw/shouldDrawNavPanel/handleClick/handlePointerMove.
  function computeMapState(
    timestamp: DOMHighResTimeStamp,
    pipNatX: number,
    pipNatY: number,
  ): MapRenderState {
    // Complete transitions when elapsed
    if (phase.tag === 'rising') {
      const elapsed = timestamp - phase.startTime
      if (elapsed >= TRANSITION_DURATION) {
        phase = { tag: 'active', panel: phase.panel, handlers: phase.handlers }
      }
    }
    if (phase.tag === 'falling') {
      const elapsed = timestamp - phase.startTime
      if (elapsed >= TRANSITION_DURATION) {
        const { outcome, handlers } = phase
        phase = { tag: 'idle' }
        cachedPanelTop = LOGICAL_H
        const handler = handlers[outcome]
        if (handler) {
          handler()
        } else {
          console.error(`[EncounterRegistry] Unknown outcome: "${outcome}"`)
        }
        return { panelTop: LOGICAL_H, zoom: 1.0, pipTargetX: pipNatX, pipTargetY: pipNatY }
      }
    }

    if (phase.tag === 'idle') {
      cachedPanelTop = LOGICAL_H
      return { panelTop: LOGICAL_H, zoom: 1.0, pipTargetX: pipNatX, pipTargetY: pipNatY }
    }

    const mapView = phase.panel.mapView
    const targetZoom = mapView?.zoom ?? 1.0
    const targetPipX = mapView?.pipTargetX ?? pipNatX
    const targetPipY = mapView?.pipTargetY ?? pipNatY

    if (phase.tag === 'active') {
      cachedPanelTop = COMBAT_PANEL_TOP
      return {
        panelTop: COMBAT_PANEL_TOP,
        zoom: targetZoom,
        pipTargetX: targetPipX,
        pipTargetY: targetPipY,
      }
    }

    if (phase.tag === 'rising') {
      const elapsed = timestamp - phase.startTime
      const t = Math.min(1, elapsed / TRANSITION_DURATION)
      const easedT = easeOut(t)
      const panelTop = Math.round(lerp(LOGICAL_H, COMBAT_PANEL_TOP, easedT))
      cachedPanelTop = panelTop
      return {
        panelTop,
        zoom: lerp(1.0, targetZoom, easedT),
        pipTargetX: lerp(pipNatX, targetPipX, easedT),
        pipTargetY: lerp(pipNatY, targetPipY, easedT),
      }
    }

    // falling
    const elapsed = timestamp - phase.startTime
    const t = Math.min(1, elapsed / TRANSITION_DURATION)
    const easedT = easeIn(t)
    const panelTop = Math.round(lerp(COMBAT_PANEL_TOP, LOGICAL_H, easedT))
    cachedPanelTop = panelTop
    return {
      panelTop,
      zoom: lerp(targetZoom, 1.0, easedT),
      pipTargetX: lerp(targetPipX, pipNatX, easedT),
      pipTargetY: lerp(targetPipY, pipNatY, easedT),
    }
  }

  // Draw the active encounter panel at its animated position.
  // The panel is translated vertically so it starts off-screen (cachedPanelTop = LOGICAL_H)
  // and rises to its natural position (cachedPanelTop = PANEL_TOP). The panel draws at
  // natural coordinates; the registry applies the offset.
  function draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void {
    if (phase.tag === 'idle') return
    const offset = cachedPanelTop - PANEL_TOP
    ctx.save()
    ctx.translate(0, offset)
    phase.panel.draw(ctx, timestamp)
    ctx.restore()
  }

  // Pass input to the active panel during ACTIVE phase only.
  // Coordinates are un-translated into the panel's natural space.
  function handleClick(x: number, y: number): boolean {
    if (phase.tag !== 'active') return false
    const panelY = y - (cachedPanelTop - PANEL_TOP)
    phase.panel.handleClick(x, panelY)
    return true
  }

  function handlePointerMove(x: number, y: number): boolean {
    if (phase.tag !== 'active') return false
    const panelY = y - (cachedPanelTop - PANEL_TOP)
    phase.panel.handlePointerMove(x, panelY)
    return true
  }

  return {
    register,
    checkTrigger,
    isActive,
    isTransitioning,
    shouldDrawNavPanel,
    computeMapState,
    draw,
    handleClick,
    handlePointerMove,
  }
}
