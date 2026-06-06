// MapViewConfig: a panel may optionally declare preferred map camera settings.
// If absent, the registry uses default navigation view (zoom 1.0, pip-centred).
export interface MapViewConfig {
  zoom: number
  pipTargetX: number
  pipTargetY: number
}

// EncounterPanel: the contract all encounter panels must implement.
//
// The registry calls draw() after the map has been rendered, with no canvas
// clipping restriction — the panel may draw anywhere, including over the map zone.
// Coordinates passed to handleClick/handlePointerMove are in the panel's natural
// space: origin at (0,0) of the un-animated canvas (i.e. as if panelTop = PANEL_TOP).
//
// drawMapOverlay (optional): called at screen coordinates without the panel
// translation, so content always lands in the map zone regardless of animation.
// Only called when the encounter is fully active (no rising/falling transition).
export interface EncounterPanel {
  draw(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void
  drawMapOverlay?(ctx: CanvasRenderingContext2D, timestamp: DOMHighResTimeStamp): void
  handleClick(x: number, y: number): void
  handlePointerMove(x: number, y: number): void
  // Optional map-view override. Absent = default navigation view.
  readonly mapView?: MapViewConfig
  // When true, the registry applies the target mapView zoom/pip instantly (no interpolation)
  // during the rising phase — camera snaps to position before the panel finishes rising.
  readonly snapCamera?: boolean
}
