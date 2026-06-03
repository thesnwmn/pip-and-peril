export type CameraTarget = 'room' | 'pip'
export type TransitionSpeed = 'normal' | 'snap'

export interface EncounterConfig {
  panelHeightFraction: number
  cameraZoom: number
  cameraTarget: CameraTarget
  transitionSpeed: TransitionSpeed
}

export const COMBAT_CONFIG: EncounterConfig = {
  panelHeightFraction: 0.50,
  cameraZoom: 1.0,
  cameraTarget: 'room',
  transitionSpeed: 'normal',
}
