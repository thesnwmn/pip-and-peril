export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeIn(t: number): number {
  return t ** 3
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
