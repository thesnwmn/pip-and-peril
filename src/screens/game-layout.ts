import { MAP_X, MAP_W, MAP_Y, TILE_SIZE } from '../map/renderer'

export const LOGICAL_W = 390
export const LOGICAL_H = 844
export const STATUS_BAR_H = 50

// Map zone: 5×5 tiles at TILE_SIZE 72 = 360 px, starting at MAP_Y=50 → bottom at 410
export const MAP_BOTTOM = MAP_Y + 5 * TILE_SIZE  // 410

// Room selection panel — sits 20 px below map
export const PANEL_TOP = MAP_BOTTOM + 20         // 430
export const PANEL_CORNER = 8
export const PANEL_HEADER_H = 28
export const PANEL_SIDE_MARGIN = 4
export const PANEL_GAP = 8
export const CARD_W = 112
export const CARD_H = 163
export const CARD_TILE_SIZE = 88
export const CARD_BORDER = 2.5

export const VIEWPORT_COLS = 5
export const VIEWPORT_ROWS = 5

export const ARROW_HALF = 13

// Encounter register geometry
export const ENCOUNTER_PANEL_GAP = 8
export const COMBAT_PANEL_TOP = PANEL_TOP + ENCOUNTER_PANEL_GAP  // 438
export const TRANSITION_DURATION = 450
export const COMBAT_MAP_CENTER_Y = MAP_Y + (COMBAT_PANEL_TOP - MAP_Y) / 2
export const COMBAT_MAP_CENTER_X = MAP_X + MAP_W / 2

export { MAP_X, MAP_W, MAP_Y, TILE_SIZE }
