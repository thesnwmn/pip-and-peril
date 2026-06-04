export function iconGlyph(iconType: string): string {
  switch (iconType) {
    case 'cheese':    return '⬡'
    case 'gouda':     return '⬡'
    case 'acorn':     return '◐'
    case 'smoke':     return '✦'
    case 'glowstone': return '★'
    case 'charm':     return '◈'
    case 'potion':    return '⚗'
    default:          return '?'
  }
}
