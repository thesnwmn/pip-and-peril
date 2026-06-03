// Situated whisper timing: fade in → hold → fade out
// Total ~2.5 s; fade-in 200 ms, fade-out 500 ms.
export const WHISPER_FADE_IN_MS = 200
export const WHISPER_HOLD_END_MS = 2000
export const WHISPER_TOTAL_MS = 2500

export function whisperAlpha(elapsed: number): number {
  if (elapsed < WHISPER_FADE_IN_MS) return elapsed / WHISPER_FADE_IN_MS
  if (elapsed < WHISPER_HOLD_END_MS) return 1
  if (elapsed < WHISPER_TOTAL_MS) return 1 - (elapsed - WHISPER_HOLD_END_MS) / (WHISPER_TOTAL_MS - WHISPER_HOLD_END_MS)
  return 0
}
